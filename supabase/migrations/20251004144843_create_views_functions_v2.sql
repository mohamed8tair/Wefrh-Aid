/*
  # إنشاء Views والدوال المساعدة - النسخة 2
*/

-- View: حالة الإغاثة للمستفيدين
CREATE OR REPLACE VIEW beneficiaries_relief_status AS
SELECT
  b.id,
  b.name,
  b.national_id,
  b.phone,
  b.address,
  b.members_count as family_size,
  MAX(rh.relief_date) as last_relief_date,
  COUNT(rh.id) as total_reliefs,
  CASE
    WHEN MAX(rh.relief_date) IS NULL THEN 'never'
    WHEN MAX(rh.relief_date) > NOW() - INTERVAL '30 days' THEN 'recent'
    WHEN MAX(rh.relief_date) > NOW() - INTERVAL '60 days' THEN 'medium'
    ELSE 'old'
  END as relief_status,
  EXTRACT(DAY FROM (NOW() - MAX(rh.relief_date)))::INTEGER as days_since_last_relief
FROM beneficiaries b
LEFT JOIN relief_history rh ON b.id = rh.beneficiary_id
GROUP BY b.id, b.name, b.national_id, b.phone, b.address, b.members_count;

-- View: إحصائيات النظام
CREATE OR REPLACE VIEW system_statistics AS
SELECT
  (SELECT COUNT(*) FROM beneficiaries) as total_beneficiaries,
  (SELECT COUNT(*) FROM beneficiaries WHERE identity_status = 'verified') as verified_beneficiaries,
  (SELECT COUNT(*) FROM beneficiaries WHERE status = 'active') as active_beneficiaries,
  (SELECT COUNT(*) FROM packages) as total_packages,
  (SELECT COUNT(*) FROM packages WHERE status = 'delivered') as delivered_packages,
  (SELECT COUNT(*) FROM tasks WHERE status IN ('pending', 'assigned', 'in_progress')) as active_tasks,
  (SELECT COUNT(*) FROM alerts WHERE priority = 'critical' AND is_read = FALSE) as critical_alerts,
  (SELECT COUNT(*) FROM organizations WHERE status = 'active') as active_organizations,
  (SELECT COUNT(*) FROM couriers WHERE status = 'active') as active_couriers;

-- View: أداء المناديب
CREATE OR REPLACE VIEW courier_performance AS
SELECT
  c.id,
  c.name,
  c.phone,
  c.email,
  c.status,
  c.rating,
  COUNT(t.id) as total_tasks,
  COUNT(CASE WHEN t.status = 'delivered' THEN 1 END) as successful_deliveries,
  COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as failed_deliveries,
  CASE 
    WHEN COUNT(t.id) > 0 THEN 
      ROUND((COUNT(CASE WHEN t.status = 'delivered' THEN 1 END)::NUMERIC / COUNT(t.id)::NUMERIC) * 100, 2)
    ELSE 0
  END as success_rate_calculated
FROM couriers c
LEFT JOIN tasks t ON c.id = t.courier_id
GROUP BY c.id, c.name, c.phone, c.email, c.status, c.rating;

-- دالة: توليد كود انضمام عشوائي للعائلة
CREATE FUNCTION generate_family_join_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM families WHERE join_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- دالة: الحصول على آخر إغاثة للمستفيد
CREATE FUNCTION get_last_relief_date(p_beneficiary_id UUID)
RETURNS TIMESTAMP AS $$
DECLARE
  last_date TIMESTAMP;
BEGIN
  SELECT MAX(relief_date) INTO last_date
  FROM relief_history
  WHERE beneficiary_id = p_beneficiary_id;
  RETURN last_date;
END;
$$ LANGUAGE plpgsql;

-- دالة: عدد الأيام منذ آخر إغاثة
CREATE FUNCTION days_since_last_relief(p_beneficiary_id UUID)
RETURNS INT AS $$
DECLARE
  last_date TIMESTAMP;
  days INT;
BEGIN
  last_date := get_last_relief_date(p_beneficiary_id);
  IF last_date IS NULL THEN
    RETURN NULL;
  END IF;
  days := EXTRACT(DAY FROM (NOW() - last_date))::INT;
  RETURN days;
END;
$$ LANGUAGE plpgsql;

-- دالة: حساب المسافة
CREATE FUNCTION calculate_distance(lat1 NUMERIC, lon1 NUMERIC, lat2 NUMERIC, lon2 NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  R NUMERIC := 6371;
  dLat NUMERIC;
  dLon NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  dLat := RADIANS(lat2 - lat1);
  dLon := RADIANS(lon2 - lon1);
  a := SIN(dLat/2) * SIN(dLat/2) +
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
       SIN(dLon/2) * SIN(dLon/2);
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));
  RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- دالة: توليد رقم تتبع
CREATE FUNCTION generate_tracking_number()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  random_part TEXT;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  random_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN 'TRK-' || date_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- دالة: زيادة محاولات OTP
CREATE FUNCTION increment_otp_attempts(p_phone TEXT, p_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE otp_verifications
  SET attempts = attempts + 1
  WHERE phone = p_phone
    AND code = p_code
    AND is_verified = FALSE
    AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger: تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_beneficiaries_updated_at ON beneficiaries;
CREATE TRIGGER update_beneficiaries_updated_at
BEFORE UPDATE ON beneficiaries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
