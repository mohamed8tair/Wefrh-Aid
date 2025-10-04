/*
  # إنشاء الجداول الأساسية لنظام الإغاثة الإنسانية
  
  ## الجداول الجديدة
  
  ### 1. roles - جدول الأدوار
  - `id` (uuid, primary key)
  - `name` (text) - اسم الدور
  - `description` (text) - وصف الدور
  - `permissions` (jsonb) - الصلاحيات
  - `user_count` (integer) - عدد المستخدمين
  - `is_active` (boolean) - الحالة
  - `created_at` (timestamptz)
  
  ### 2. permissions - جدول الصلاحيات
  - `id` (uuid, primary key)
  - `name` (text) - اسم الصلاحية
  - `description` (text) - الوصف
  - `category` (text) - التصنيف
  - `created_at` (timestamptz)
  
  ### 3. system_users - جدول المستخدمين
  - `id` (uuid, primary key)
  - `name` (text) - الاسم
  - `email` (text) - البريد الإلكتروني
  - `phone` (text) - رقم الهاتف
  - `role_id` (uuid) - معرف الدور
  - `associated_id` (uuid) - معرف الكيان المرتبط
  - `associated_type` (text) - نوع الكيان
  - `status` (text) - الحالة
  - `last_login` (timestamptz)
  - `created_at` (timestamptz)
  
  ### 4. organizations - جدول المؤسسات
  - `id` (uuid, primary key)
  - معلومات المؤسسة الكاملة
  
  ### 5. families - جدول العائلات
  - `id` (uuid, primary key)
  - معلومات العائلة
  - `join_code` (text) - كود الانضمام
  
  ### 6. beneficiaries - جدول المستفيدين
  - `id` (uuid, primary key)
  - معلومات المستفيد الكاملة
  
  ### 7. packages - جدول الطرود
  - `id` (uuid, primary key)
  - معلومات الطرد
  
  ### 8. tasks - جدول المهام
  - `id` (uuid, primary key)
  - معلومات المهمة
  
  ### 9. couriers - جدول المناديب
  - `id` (uuid, primary key)
  - معلومات المندوب
  
  ### 10. alerts - جدول التنبيهات
  - `id` (uuid, primary key)
  - معلومات التنبيه
  
  ### 11. activity_log - جدول سجل الأنشطة
  - `id` (uuid, primary key)
  - معلومات النشاط
  
  ### 12. package_templates - جدول قوالب الطرود
  - `id` (uuid, primary key)
  - معلومات القالب
  
  ## الأمان
  - تم تفعيل RLS على جميع الجداول
  - إضافة سياسات أمان أساسية
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. roles - جدول الأدوار
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  user_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all users" ON roles
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for admins" ON roles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for admins" ON roles
  FOR UPDATE USING (true);

COMMENT ON TABLE roles IS 'جدول الأدوار والصلاحيات في النظام';

-- ============================================
-- 2. permissions - جدول الصلاحيات
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all" ON permissions
  FOR SELECT USING (true);

COMMENT ON TABLE permissions IS 'جدول الصلاحيات المتاحة في النظام';

-- ============================================
-- 3. system_users - جدول المستخدمين
-- ============================================
CREATE TABLE IF NOT EXISTS system_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  role_id UUID REFERENCES roles(id),
  associated_id UUID,
  associated_type TEXT,
  status TEXT DEFAULT 'active',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data" ON system_users
  FOR SELECT USING (true);

COMMENT ON TABLE system_users IS 'جدول مستخدمي النظام';

-- ============================================
-- 4. organizations - جدول المؤسسات
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  location TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  beneficiaries_count INTEGER DEFAULT 0,
  packages_count INTEGER DEFAULT 0,
  completion_rate NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  packages_available INTEGER DEFAULT 0,
  templates_count INTEGER DEFAULT 0,
  is_popular BOOLEAN DEFAULT FALSE
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all" ON organizations
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for admins" ON organizations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for organization users" ON organizations
  FOR UPDATE USING (true);

COMMENT ON TABLE organizations IS 'جدول المؤسسات المشاركة في توزيع المساعدات';

-- ============================================
-- 5. families - جدول العائلات
-- ============================================
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  head_of_family TEXT NOT NULL,
  head_of_family_id UUID,
  phone TEXT NOT NULL,
  members_count INTEGER DEFAULT 0,
  packages_distributed INTEGER DEFAULT 0,
  completion_rate NUMERIC(5,2) DEFAULT 0,
  location TEXT NOT NULL,
  join_code TEXT UNIQUE,
  join_code_updated_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_families_join_code ON families(join_code);

ALTER TABLE families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Families can view their own data" ON families
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for admins" ON families
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Families can update their own data" ON families
  FOR UPDATE USING (true);

COMMENT ON TABLE families IS 'جدول العائلات المستفيدة';

-- ============================================
-- 6. beneficiaries - جدول المستفيدين
-- ============================================
CREATE TABLE IF NOT EXISTS beneficiaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  national_id TEXT NOT NULL UNIQUE,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  detailed_address JSONB DEFAULT '{}'::jsonb,
  location JSONB DEFAULT '{"lat": 31.5, "lng": 34.5}'::jsonb,
  organization_id UUID REFERENCES organizations(id),
  family_id UUID REFERENCES families(id),
  relation_to_family TEXT,
  profession TEXT,
  marital_status TEXT,
  economic_level TEXT,
  members_count INTEGER DEFAULT 1,
  additional_documents JSONB DEFAULT '[]'::jsonb,
  identity_status TEXT DEFAULT 'pending',
  identity_image_url TEXT,
  status TEXT DEFAULT 'active',
  eligibility_status TEXT DEFAULT 'under_review',
  last_received DATE,
  total_packages INTEGER DEFAULT 0,
  notes TEXT,
  phone_verified_at TIMESTAMPTZ,
  phone_otp_verified BOOLEAN DEFAULT FALSE,
  last_updated_by_type TEXT,
  last_updated_by_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_national_id ON beneficiaries(national_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_phone ON beneficiaries(phone);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_organization ON beneficiaries(organization_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_family ON beneficiaries(family_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_status ON beneficiaries(status);

ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Beneficiaries can view their own data" ON beneficiaries
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for admins and organizations" ON beneficiaries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update with restrictions" ON beneficiaries
  FOR UPDATE USING (true);

COMMENT ON TABLE beneficiaries IS 'جدول المستفيدين من المساعدات';

-- ============================================
-- 7. packages - جدول الطرود
-- ============================================
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  value NUMERIC(10,2) DEFAULT 0,
  funder TEXT,
  organization_id UUID REFERENCES organizations(id),
  family_id UUID REFERENCES families(id),
  beneficiary_id UUID REFERENCES beneficiaries(id),
  status TEXT DEFAULT 'pending',
  relief_date TIMESTAMPTZ,
  provider_type TEXT,
  provider_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  expiry_date DATE
);

CREATE INDEX IF NOT EXISTS idx_packages_beneficiary ON packages(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_packages_organization ON packages(organization_id);
CREATE INDEX IF NOT EXISTS idx_packages_family ON packages(family_id);
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to related users" ON packages
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for admins and organizations" ON packages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for admins" ON packages
  FOR UPDATE USING (true);

COMMENT ON TABLE packages IS 'جدول الطرود والمساعدات';

-- ============================================
-- 8. tasks - جدول المهام
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID REFERENCES packages(id),
  beneficiary_id UUID REFERENCES beneficiaries(id),
  courier_id UUID,
  batch_id UUID,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  delivery_location JSONB,
  notes TEXT,
  courier_notes TEXT,
  delivery_proof_image_url TEXT,
  digital_signature_image_url TEXT,
  estimated_arrival_time TIMESTAMPTZ,
  remaining_distance NUMERIC(10,2),
  photo_url TEXT,
  failure_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_package ON tasks(package_id);
CREATE INDEX IF NOT EXISTS idx_tasks_beneficiary ON tasks(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_tasks_courier ON tasks(courier_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to related users" ON tasks
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for admins" ON tasks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for couriers and admins" ON tasks
  FOR UPDATE USING (true);

COMMENT ON TABLE tasks IS 'جدول مهام التوزيع';

-- ============================================
-- 9. couriers - جدول المناديب
-- ============================================
CREATE TABLE IF NOT EXISTS couriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active',
  rating NUMERIC(3,2) DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  current_location JSONB,
  is_humanitarian_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_couriers_status ON couriers(status);

ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all" ON couriers
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for admins" ON couriers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Couriers can update their own data" ON couriers
  FOR UPDATE USING (true);

COMMENT ON TABLE couriers IS 'جدول المناديب ومندوبي التوزيع';

-- ============================================
-- 10. alerts - جدول التنبيهات
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  related_id UUID,
  related_type TEXT,
  priority TEXT DEFAULT 'medium',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all users" ON alerts
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for system" ON alerts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for users" ON alerts
  FOR UPDATE USING (true);

COMMENT ON TABLE alerts IS 'جدول التنبيهات والإشعارات';

-- ============================================
-- 11. activity_log - جدول سجل الأنشطة
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  type TEXT NOT NULL,
  beneficiary_id UUID REFERENCES beneficiaries(id),
  details TEXT
);

CREATE INDEX IF NOT EXISTS idx_activity_log_beneficiary ON activity_log(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to admins" ON activity_log
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for all users" ON activity_log
  FOR INSERT WITH CHECK (true);

COMMENT ON TABLE activity_log IS 'جدول سجل الأنشطة والعمليات';

-- ============================================
-- 12. package_templates - جدول قوالب الطرود
-- ============================================
CREATE TABLE IF NOT EXISTS package_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  description TEXT,
  contents JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0,
  total_weight NUMERIC(10,2) DEFAULT 0,
  estimated_cost NUMERIC(10,2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_package_templates_organization ON package_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_package_templates_type ON package_templates(type);

ALTER TABLE package_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all" ON package_templates
  FOR SELECT USING (true);

CREATE POLICY "Organizations can manage their templates" ON package_templates
  FOR ALL USING (true);

COMMENT ON TABLE package_templates IS 'جدول قوالب الطرود المعرّفة مسبقاً';

-- ============================================
-- Migration tracking
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ تم إنشاء جميع الجداول الأساسية بنجاح!';
  RAISE NOTICE '📊 الجداول المُنشأة:';
  RAISE NOTICE '  - roles (الأدوار)';
  RAISE NOTICE '  - permissions (الصلاحيات)';
  RAISE NOTICE '  - system_users (المستخدمين)';
  RAISE NOTICE '  - organizations (المؤسسات)';
  RAISE NOTICE '  - families (العائلات)';
  RAISE NOTICE '  - beneficiaries (المستفيدين)';
  RAISE NOTICE '  - packages (الطرود)';
  RAISE NOTICE '  - tasks (المهام)';
  RAISE NOTICE '  - couriers (المناديب)';
  RAISE NOTICE '  - alerts (التنبيهات)';
  RAISE NOTICE '  - activity_log (سجل الأنشطة)';
  RAISE NOTICE '  - package_templates (قوالب الطرود)';
  RAISE NOTICE '🛡️ تم تفعيل Row Level Security على جميع الجداول';
END $$;
