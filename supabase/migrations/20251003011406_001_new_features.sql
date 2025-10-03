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

-- 1. إضافة حقول جديدة لجدول beneficiaries (إذا كان موجوداً)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'beneficiaries') THEN
    ALTER TABLE beneficiaries
    ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS phone_otp_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_updated_by_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS last_updated_by_id UUID;
  END IF;
END $$;

-- 2. إضافة حقول جديدة لجدول families (إذا كان موجوداً)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'families') THEN
    ALTER TABLE families
    ADD COLUMN IF NOT EXISTS join_code VARCHAR(10) UNIQUE,
    ADD COLUMN IF NOT EXISTS join_code_updated_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
    
    CREATE INDEX IF NOT EXISTS idx_families_join_code ON families(join_code);
  END IF;
END $$;

-- 3. إضافة حقول جديدة لجدول packages (إذا كان موجوداً)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'packages') THEN
    ALTER TABLE packages
    ADD COLUMN IF NOT EXISTS relief_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS provider_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255);
  END IF;
END $$;

-- ============================================
-- PART 2: إنشاء الجداول الجديدة
-- ============================================

-- 1. جدول التعديلات المعلقة
CREATE TABLE IF NOT EXISTS pending_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  beneficiary_id UUID NOT NULL,
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

-- 2. جدول سجل الإغاثات
CREATE TABLE IF NOT EXISTS relief_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  beneficiary_id UUID NOT NULL,
  package_id UUID,
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

-- 3. جدول رموز OTP
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

-- 4. جدول الإشعارات
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

-- 5. جدول طلبات الانضمام للعائلات
CREATE TABLE IF NOT EXISTS family_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL,
  beneficiary_id UUID NOT NULL,
  previous_family_id UUID,
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

-- 6. جدول سجل تعديل الحقول
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

-- ============================================
-- PART 3: إنشاء FUNCTIONS
-- ============================================

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

-- ============================================
-- PART 4: إنشاء TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pending_updates_updated_at ON pending_updates;
CREATE TRIGGER update_pending_updates_updated_at
BEFORE UPDATE ON pending_updates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_family_join_requests_updated_at ON family_join_requests;
CREATE TRIGGER update_family_join_requests_updated_at
BEFORE UPDATE ON family_join_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 5: ROW LEVEL SECURITY
-- ============================================

ALTER TABLE pending_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE relief_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_edit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 6: VERSION TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW(),
  description TEXT
);

INSERT INTO schema_migrations (version, description)
VALUES ('001', 'إضافة جداول الميزات الجديدة: نظام الأولويات، OTP، الإغاثة، الإشعارات')
ON CONFLICT (version) DO NOTHING;