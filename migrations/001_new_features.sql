-- ============================================
-- Migration: إضافة الميزات الجديدة
-- التاريخ: 2024-12-20
-- النسخة: 1.0
-- الوصف: إضافة جداول وحقول لنظام الأولويات، OTP، الإغاثة، والإشعارات
-- ============================================

-- تمكين UUID extension إذا لم تكن موجودة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PART 1: تحديث الجداول الموجودة
-- ============================================

-- 1. إضافة حقول جديدة لجدول beneficiaries
ALTER TABLE beneficiaries
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS phone_otp_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_updated_by_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS last_updated_by_id UUID;

COMMENT ON COLUMN beneficiaries.phone_verified_at IS 'تاريخ تأكيد رقم الهاتف عبر OTP';
COMMENT ON COLUMN beneficiaries.phone_otp_verified IS 'هل تم تأكيد رقم الهاتف؟';
COMMENT ON COLUMN beneficiaries.last_updated_by_type IS 'نوع المستخدم الذي عدل آخر مرة: admin, family, organization, beneficiary';
COMMENT ON COLUMN beneficiaries.last_updated_by_id IS 'معرف المستخدم الذي عدل آخر مرة';

-- 2. إضافة حقول جديدة لجدول families
ALTER TABLE families
ADD COLUMN IF NOT EXISTS join_code VARCHAR(10) UNIQUE,
ADD COLUMN IF NOT EXISTS join_code_updated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_families_join_code ON families(join_code);

COMMENT ON COLUMN families.join_code IS 'كود الانضمام للعائلة (فريد)';
COMMENT ON COLUMN families.join_code_updated_at IS 'آخر تحديث لكود الانضمام';
COMMENT ON COLUMN families.status IS 'حالة العائلة: active, inactive';

-- 3. إضافة حقول جديدة لجدول packages
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS relief_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS provider_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255);

COMMENT ON COLUMN packages.relief_date IS 'تاريخ تقديم الإغاثة';
COMMENT ON COLUMN packages.provider_type IS 'نوع مقدم الإغاثة: organization, family, admin';
COMMENT ON COLUMN packages.provider_name IS 'اسم مقدم الإغاثة';

-- ============================================
-- PART 2: إنشاء الجداول الجديدة
-- ============================================

-- 1. جدول التعديلات المعلقة (pending_updates)
CREATE TABLE IF NOT EXISTS pending_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  current_value TEXT,
  proposed_value TEXT,
  proposed_by_type VARCHAR(20) NOT NULL,
  proposed_by_id UUID NOT NULL,
  proposed_by_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_at TIMESTAMP,
  reviewed_by_id UUID,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_updates_beneficiary ON pending_updates(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_pending_updates_status ON pending_updates(status);
CREATE INDEX IF NOT EXISTS idx_pending_updates_created ON pending_updates(created_at DESC);

COMMENT ON TABLE pending_updates IS 'جدول التعديلات المعلقة التي تحتاج موافقة من الإدارة';
COMMENT ON COLUMN pending_updates.proposed_by_type IS 'نوع المستخدم: family, organization, beneficiary';
COMMENT ON COLUMN pending_updates.status IS 'حالة الطلب: pending, approved, rejected';

-- 2. جدول سجل الإغاثات (relief_history)
CREATE TABLE IF NOT EXISTS relief_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  provider_type VARCHAR(20) NOT NULL,
  provider_id UUID NOT NULL,
  provider_name VARCHAR(255) NOT NULL,
  package_type VARCHAR(100),
  package_description TEXT,
  relief_date TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_relief_history_beneficiary ON relief_history(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_relief_history_date ON relief_history(relief_date DESC);
CREATE INDEX IF NOT EXISTS idx_relief_history_beneficiary_date ON relief_history(beneficiary_id, relief_date DESC);
CREATE INDEX IF NOT EXISTS idx_relief_history_provider ON relief_history(provider_type, provider_id);

COMMENT ON TABLE relief_history IS 'سجل كامل لجميع الإغاثات المقدمة للمستفيدين';
COMMENT ON COLUMN relief_history.provider_type IS 'نوع مقدم الإغاثة: organization, family, admin';

-- 3. جدول رموز OTP (otp_verifications)
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  user_id UUID,
  user_type VARCHAR(20),
  purpose VARCHAR(50) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_otp_code ON otp_verifications(code);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_user ON otp_verifications(user_id, user_type);

COMMENT ON TABLE otp_verifications IS 'جدول رموز التحقق OTP للحقول الحساسة';
COMMENT ON COLUMN otp_verifications.purpose IS 'الغرض من OTP: phone_verification, password_reset';
COMMENT ON COLUMN otp_verifications.user_type IS 'نوع المستخدم: beneficiary, family, organization';

-- 4. جدول الإشعارات (notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL,
  recipient_type VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  delivery_method VARCHAR(20) NOT NULL,
  delivery_status VARCHAR(20) DEFAULT 'pending',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  failed_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id) WHERE is_read = FALSE;

COMMENT ON TABLE notifications IS 'جدول الإشعارات متعدد القنوات (SMS, WhatsApp, In-App)';
COMMENT ON COLUMN notifications.type IS 'نوع الإشعار: otp, delivery, approval, update, alert';
COMMENT ON COLUMN notifications.priority IS 'الأولوية: low, normal, high, critical';
COMMENT ON COLUMN notifications.delivery_method IS 'طريقة التوصيل: sms, whatsapp, in_app';

-- 5. جدول طلبات الانضمام للعائلات (family_join_requests)
CREATE TABLE IF NOT EXISTS family_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  previous_family_id UUID REFERENCES families(id),
  requested_by_id UUID NOT NULL,
  requested_by_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  reason TEXT,
  reviewed_at TIMESTAMP,
  reviewed_by_id UUID,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_join_requests_family ON family_join_requests(family_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_beneficiary ON family_join_requests(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON family_join_requests(status);
CREATE INDEX IF NOT EXISTS idx_join_requests_created ON family_join_requests(created_at DESC);

COMMENT ON TABLE family_join_requests IS 'طلبات الانضمام والنقل بين العائلات';
COMMENT ON COLUMN family_join_requests.requested_by_type IS 'من قام بالطلب: beneficiary, family, admin';
COMMENT ON COLUMN family_join_requests.status IS 'حالة الطلب: pending, approved, rejected, cancelled';

-- 6. جدول سجل تعديل الحقول (field_edit_log)
CREATE TABLE IF NOT EXISTS field_edit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  edited_by_id UUID NOT NULL,
  edited_by_type VARCHAR(20) NOT NULL,
  edited_by_name VARCHAR(255),
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_edit_log_record ON field_edit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_field_edit_log_created ON field_edit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_field_edit_log_editor ON field_edit_log(edited_by_type, edited_by_id);

COMMENT ON TABLE field_edit_log IS 'سجل تفصيلي لكل تعديل يحدث على أي حقل في النظام';

-- ============================================
-- PART 3: إنشاء VIEWS (طرق العرض)
-- ============================================

-- View: حالة الإغاثة للمستفيدين
CREATE OR REPLACE VIEW beneficiaries_relief_status AS
SELECT
  b.id,
  b.name,
  b.national_id,
  b.phone,
  b.governorate,
  b.city,
  b.family_size,
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
GROUP BY b.id, b.name, b.national_id, b.phone, b.governorate, b.city, b.family_size;

COMMENT ON VIEW beneficiaries_relief_status IS 'عرض شامل لحالة الإغاثة لكل مستفيد';

-- ============================================
-- PART 4: إنشاء FUNCTIONS (الدوال)
-- ============================================

-- دالة: توليد كود انضمام عشوائي للعائلة
CREATE OR REPLACE FUNCTION generate_family_join_code()
RETURNS VARCHAR(10) AS $$
DECLARE
  new_code VARCHAR(10);
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

COMMENT ON FUNCTION generate_family_join_code IS 'توليد كود انضمام فريد للعائلة';

-- دالة: الحصول على آخر إغاثة للمستفيد
CREATE OR REPLACE FUNCTION get_last_relief_date(p_beneficiary_id UUID)
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

COMMENT ON FUNCTION get_last_relief_date IS 'الحصول على تاريخ آخر إغاثة للمستفيد';

-- دالة: عدد الأيام منذ آخر إغاثة
CREATE OR REPLACE FUNCTION days_since_last_relief(p_beneficiary_id UUID)
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

COMMENT ON FUNCTION days_since_last_relief IS 'حساب عدد الأيام منذ آخر إغاثة';

-- دالة: زيادة محاولات OTP
CREATE OR REPLACE FUNCTION increment_otp_attempts(p_phone VARCHAR, p_code VARCHAR)
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

COMMENT ON FUNCTION increment_otp_attempts IS 'زيادة عدد محاولات OTP الفاشلة';

-- ============================================
-- PART 5: إنشاء TRIGGERS (المشغلات)
-- ============================================

-- Trigger: تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق على pending_updates
DROP TRIGGER IF EXISTS update_pending_updates_updated_at ON pending_updates;
CREATE TRIGGER update_pending_updates_updated_at
BEFORE UPDATE ON pending_updates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- تطبيق على family_join_requests
DROP TRIGGER IF EXISTS update_family_join_requests_updated_at ON family_join_requests;
CREATE TRIGGER update_family_join_requests_updated_at
BEFORE UPDATE ON family_join_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: حماية رقم الهاتف المؤكد بـ OTP
CREATE OR REPLACE FUNCTION protect_verified_phone()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.phone_otp_verified = TRUE AND NEW.phone != OLD.phone THEN
    IF NULLIF(current_setting('app.user_type', TRUE), '') NOT IN ('admin', 'beneficiary') THEN
      RAISE EXCEPTION 'لا يمكن تعديل رقم هاتف مؤكد. يرجى التواصل مع الإدارة.';
    END IF;

    NEW.phone_otp_verified := FALSE;
    NEW.phone_verified_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS verify_phone_protection ON beneficiaries;
CREATE TRIGGER verify_phone_protection
BEFORE UPDATE ON beneficiaries
FOR EACH ROW
EXECUTE FUNCTION protect_verified_phone();

COMMENT ON FUNCTION protect_verified_phone IS 'حماية رقم الهاتف المؤكد من التعديل غير المصرح';

-- Trigger: تسجيل التعديلات في field_edit_log
CREATE OR REPLACE FUNCTION log_field_edits()
RETURNS TRIGGER AS $$
DECLARE
  field_record RECORD;
  old_val TEXT;
  new_val TEXT;
BEGIN
  FOR field_record IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = TG_TABLE_NAME
      AND column_name NOT IN ('id', 'created_at', 'updated_at')
  LOOP
    EXECUTE format('SELECT ($1).%I::TEXT', field_record.column_name) INTO old_val USING OLD;
    EXECUTE format('SELECT ($1).%I::TEXT', field_record.column_name) INTO new_val USING NEW;

    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO field_edit_log (
        table_name,
        record_id,
        field_name,
        old_value,
        new_value,
        edited_by_id,
        edited_by_type,
        edited_by_name
      ) VALUES (
        TG_TABLE_NAME,
        NEW.id,
        field_record.column_name,
        old_val,
        new_val,
        NULLIF(current_setting('app.user_id', TRUE), '')::UUID,
        NULLIF(current_setting('app.user_type', TRUE), ''),
        NULLIF(current_setting('app.user_name', TRUE), '')
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق Trigger على جدول beneficiaries
DROP TRIGGER IF EXISTS log_beneficiary_edits ON beneficiaries;
CREATE TRIGGER log_beneficiary_edits
AFTER UPDATE ON beneficiaries
FOR EACH ROW
EXECUTE FUNCTION log_field_edits();

COMMENT ON FUNCTION log_field_edits IS 'تسجيل تلقائي لجميع التعديلات على الحقول';

-- ============================================
-- PART 6: ROW LEVEL SECURITY (RLS)
-- ============================================

-- تمكين Row Level Security
ALTER TABLE pending_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE relief_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_edit_log ENABLE ROW LEVEL SECURITY;

-- سياسات pending_updates
DROP POLICY IF EXISTS "المستفيدون يمكنهم رؤية تعديلاتهم المعلقة" ON pending_updates;
CREATE POLICY "المستفيدون يمكنهم رؤية تعديلاتهم المعلقة"
  ON pending_updates FOR SELECT
  USING (
    beneficiary_id::TEXT = NULLIF(current_setting('app.user_id', TRUE), '')
    OR NULLIF(current_setting('app.user_type', TRUE), '') = 'admin'
  );

DROP POLICY IF EXISTS "الإدارة يمكنها إدارة التعديلات المعلقة" ON pending_updates;
CREATE POLICY "الإدارة يمكنها إدارة التعديلات المعلقة"
  ON pending_updates FOR ALL
  USING (NULLIF(current_setting('app.user_type', TRUE), '') = 'admin');

-- سياسات relief_history
DROP POLICY IF EXISTS "المستفيدون يمكنهم رؤية سجل إغاثاتهم" ON relief_history;
CREATE POLICY "المستفيدون يمكنهم رؤية سجل إغاثاتهم"
  ON relief_history FOR SELECT
  USING (
    beneficiary_id::TEXT = NULLIF(current_setting('app.user_id', TRUE), '')
    OR NULLIF(current_setting('app.user_type', TRUE), '') IN ('admin', 'organization', 'family')
  );

DROP POLICY IF EXISTS "المؤسسات والعائلات يمكنها إضافة سجل إغاثة" ON relief_history;
CREATE POLICY "المؤسسات والعائلات يمكنها إضافة سجل إغاثة"
  ON relief_history FOR INSERT
  WITH CHECK (NULLIF(current_setting('app.user_type', TRUE), '') IN ('admin', 'organization', 'family'));

-- سياسات notifications
DROP POLICY IF EXISTS "المستخدمون يمكنهم رؤية إشعاراتهم فقط" ON notifications;
CREATE POLICY "المستخدمون يمكنهم رؤية إشعاراتهم فقط"
  ON notifications FOR SELECT
  USING (
    recipient_id::TEXT = NULLIF(current_setting('app.user_id', TRUE), '')
    OR NULLIF(current_setting('app.user_type', TRUE), '') = 'admin'
  );

DROP POLICY IF EXISTS "تحديث حالة القراءة" ON notifications;
CREATE POLICY "تحديث حالة القراءة"
  ON notifications FOR UPDATE
  USING (recipient_id::TEXT = NULLIF(current_setting('app.user_id', TRUE), ''))
  WITH CHECK (recipient_id::TEXT = NULLIF(current_setting('app.user_id', TRUE), ''));

-- سياسات otp_verifications
DROP POLICY IF EXISTS "الإدارة فقط يمكنها الوصول لـ OTP" ON otp_verifications;
CREATE POLICY "الإدارة فقط يمكنها الوصول لـ OTP"
  ON otp_verifications FOR ALL
  USING (NULLIF(current_setting('app.user_type', TRUE), '') = 'admin');

-- سياسات family_join_requests
DROP POLICY IF EXISTS "العائلات والمستفيدون يمكنهم رؤية طلبات الانضمام" ON family_join_requests;
CREATE POLICY "العائلات والمستفيدون يمكنهم رؤية طلبات الانضمام"
  ON family_join_requests FOR SELECT
  USING (
    family_id::TEXT = NULLIF(current_setting('app.user_id', TRUE), '')
    OR beneficiary_id::TEXT = NULLIF(current_setting('app.user_id', TRUE), '')
    OR NULLIF(current_setting('app.user_type', TRUE), '') = 'admin'
  );

DROP POLICY IF EXISTS "الإدارة يمكنها إدارة طلبات الانضمام" ON family_join_requests;
CREATE POLICY "الإدارة يمكنها إدارة طلبات الانضمام"
  ON family_join_requests FOR ALL
  USING (NULLIF(current_setting('app.user_type', TRUE), '') = 'admin');

-- سياسات field_edit_log
DROP POLICY IF EXISTS "الإدارة فقط يمكنها رؤية سجل التعديلات" ON field_edit_log;
CREATE POLICY "الإدارة فقط يمكنها رؤية سجل التعديلات"
  ON field_edit_log FOR SELECT
  USING (NULLIF(current_setting('app.user_type', TRUE), '') = 'admin');

-- ============================================
-- PART 7: SEED DATA (بيانات أولية)
-- ============================================

-- توليد أكواد انضمام للعائلات الموجودة
DO $$
BEGIN
  UPDATE families
  SET join_code = generate_family_join_code(),
      join_code_updated_at = NOW()
  WHERE join_code IS NULL;
END $$;

-- ============================================
-- PART 8: VERSION TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW(),
  description TEXT
);

INSERT INTO schema_migrations (version, description)
VALUES ('001', 'إضافة جداول الميزات الجديدة: نظام الأولويات، OTP، الإغاثة، الإشعارات')
ON CONFLICT (version) DO NOTHING;

COMMENT ON TABLE schema_migrations IS 'تتبع إصدارات وتحديثات قاعدة البيانات';

-- ============================================
-- تم الانتهاء من Migration
-- ============================================

-- عرض ملخص الجداول الجديدة
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 001 completed successfully!';
  RAISE NOTICE '📊 New Tables Created:';
  RAISE NOTICE '  - pending_updates';
  RAISE NOTICE '  - relief_history';
  RAISE NOTICE '  - otp_verifications';
  RAISE NOTICE '  - notifications';
  RAISE NOTICE '  - family_join_requests';
  RAISE NOTICE '  - field_edit_log';
  RAISE NOTICE '';
  RAISE NOTICE '📈 Views Created:';
  RAISE NOTICE '  - beneficiaries_relief_status';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ Functions Created: 4';
  RAISE NOTICE '🔒 Triggers Created: 4';
  RAISE NOTICE '🛡️ RLS Policies Enabled';
END $$;
