# خطة التنفيذ التفصيلية
## دمج الميزات الجديدة في النظام

**تاريخ الإنشاء:** 2024-12-20
**النسخة:** 1.0
**الحالة:** جاهزة للتنفيذ

---

## 📋 جدول المحتويات

1. [المرحلة 0: التحضير والإعداد](#المرحلة-0)
2. [المرحلة 1: تفعيل البنية التحتية](#المرحلة-1)
3. [المرحلة 2: نظام الأولويات](#المرحلة-2)
4. [المرحلة 3: نظام OTP والحماية](#المرحلة-3)
5. [المرحلة 4: نظام العائلات المحدث](#المرحلة-4)
6. [المرحلة 5: نظام الإغاثة بالفلاتر](#المرحلة-5)
7. [المرحلة 6: نظام الإشعارات](#المرحلة-6)
8. [المرحلة 7: نظام التوثيق](#المرحلة-7)
9. [المرحلة 8: التقارير المحدثة](#المرحلة-8)
10. [المرحلة 9: استبدال Mock Data](#المرحلة-9)
11. [المرحلة 10: التحسينات والتنظيف](#المرحلة-10)
12. [المرحلة 11: الاختبار النهائي](#المرحلة-11)

---

## المرحلة 0: التحضير والإعداد

### الهدف:
إنشاء البنية الأساسية للتحديثات الجديدة

### المدة المتوقعة: 3-4 أيام

### الخطوات:

#### 0.1 تحديث TypeScript Types
- إضافة types الجديدة في `src/types/database.ts`
- إضافة interfaces للجداول الجديدة
- تحديث Beneficiary و Family types

#### 0.2 إنشاء هيكل المجلدات
```
src/services/
├── priority/
│   ├── priorityService.ts
│   ├── fieldProtection.ts
│   └── pendingUpdatesService.ts
│
├── relief/
│   ├── reliefHistoryService.ts
│   ├── reliefValidation.ts
│   └── reliefFilters.ts
│
├── security/
│   ├── otpService.ts
│   ├── phoneVerification.ts
│   └── authValidation.ts
│
└── notifications/
    ├── notificationsService.ts
    ├── smsService.ts
    └── whatsappService.ts
```

#### 0.3 تجهيز Migration Files
- إنشاء مجلد `migrations/`
- إنشاء ملف `001_new_features.sql`

---

## المرحلة 1: تفعيل البنية التحتية

### الهدف:
تفعيل Supabase وإنشاء الجداول الأساسية

### المدة المتوقعة: 2-3 أيام

### 1.1 تفعيل Supabase Client

**الملف:** `src/lib/supabaseClient.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'relief-management-system',
    },
  },
});

export type SupabaseClient = typeof supabase;
```

### 1.2 تطبيق SQL Migration

**تنفيذ Migration عبر Supabase:**

1. فتح Supabase Dashboard
2. الذهاب إلى SQL Editor
3. تشغيل محتوى `migrations/001_new_features.sql`
4. التحقق من إنشاء الجداول بنجاح

**البديل - استخدام MCP Tool:**
```typescript
// استخدام mcp__supabase__apply_migration
```

### 1.3 اختبار الاتصال

**الملف:** `src/components/pages/TestSupabasePage.tsx`

إضافة اختبارات للجداول الجديدة:
- pending_updates
- relief_history
- otp_verifications
- notifications
- family_join_requests

---

## المرحلة 2: نظام الأولويات

### الهدف:
بناء نظام حماية الحقول حسب الأولويات

### المدة المتوقعة: 5-6 أيام

### 2.1 إنشاء Priority Service

**الملف:** `src/services/priority/priorityService.ts`

```typescript
import { supabase } from '../../lib/supabaseClient';
import type { Beneficiary } from '../../types/database';

export type UserType = 'admin' | 'organization' | 'family' | 'beneficiary';

export interface FieldPriority {
  fieldName: keyof Beneficiary;
  level: 1 | 2 | 3 | 4;
  allowedUsers: UserType[];
  requiresApproval: boolean;
  requiresOTP: boolean;
}

export const FIELD_PRIORITIES: Record<string, FieldPriority> = {
  // المستوى 1: حقول محمية للغاية (Admin فقط)
  national_id: {
    fieldName: 'national_id',
    level: 1,
    allowedUsers: ['admin'],
    requiresApproval: false,
    requiresOTP: false,
  },

  // المستوى 2: حقول حساسة (Admin + تحقق OTP)
  phone: {
    fieldName: 'phone',
    level: 2,
    allowedUsers: ['admin', 'beneficiary'],
    requiresApproval: false,
    requiresOTP: true,
  },

  // المستوى 3: حقول قابلة للتعديل بموافقة
  address: {
    fieldName: 'address',
    level: 3,
    allowedUsers: ['admin', 'organization', 'family'],
    requiresApproval: true,
    requiresOTP: false,
  },

  // المستوى 4: حقول عامة (الجميع)
  notes: {
    fieldName: 'notes',
    level: 4,
    allowedUsers: ['admin', 'organization', 'family', 'beneficiary'],
    requiresApproval: false,
    requiresOTP: false,
  },
};

export class PriorityService {
  static canEditField(
    fieldName: keyof Beneficiary,
    userType: UserType
  ): boolean {
    const priority = FIELD_PRIORITIES[fieldName];
    if (!priority) return false;

    return priority.allowedUsers.includes(userType);
  }

  static requiresApproval(fieldName: keyof Beneficiary): boolean {
    const priority = FIELD_PRIORITIES[fieldName];
    return priority?.requiresApproval || false;
  }

  static requiresOTP(fieldName: keyof Beneficiary): boolean {
    const priority = FIELD_PRIORITIES[fieldName];
    return priority?.requiresOTP || false;
  }

  static getFieldLevel(fieldName: keyof Beneficiary): number {
    return FIELD_PRIORITIES[fieldName]?.level || 4;
  }

  static async createPendingUpdate(
    beneficiaryId: string,
    fieldName: string,
    currentValue: string,
    proposedValue: string,
    proposedBy: {
      type: UserType;
      id: string;
      name: string;
    }
  ) {
    const { data, error } = await supabase
      .from('pending_updates')
      .insert({
        beneficiary_id: beneficiaryId,
        field_name: fieldName,
        current_value: currentValue,
        proposed_value: proposedValue,
        proposed_by_type: proposedBy.type,
        proposed_by_id: proposedBy.id,
        proposed_by_name: proposedBy.name,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getPendingUpdates(beneficiaryId?: string) {
    let query = supabase
      .from('pending_updates')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (beneficiaryId) {
      query = query.eq('beneficiary_id', beneficiaryId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async approvePendingUpdate(
    updateId: string,
    reviewedById: string
  ) {
    const { data: update, error: fetchError } = await supabase
      .from('pending_updates')
      .select('*')
      .eq('id', updateId)
      .single();

    if (fetchError) throw fetchError;

    const { error: updateError } = await supabase
      .from('beneficiaries')
      .update({ [update.field_name]: update.proposed_value })
      .eq('id', update.beneficiary_id);

    if (updateError) throw updateError;

    const { error: approveError } = await supabase
      .from('pending_updates')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by_id: reviewedById,
      })
      .eq('id', updateId);

    if (approveError) throw approveError;
  }

  static async rejectPendingUpdate(
    updateId: string,
    reviewedById: string,
    reason: string
  ) {
    const { error } = await supabase
      .from('pending_updates')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by_id: reviewedById,
        rejection_reason: reason,
      })
      .eq('id', updateId);

    if (error) throw error;
  }
}
```

### 2.2 إنشاء Field Protection Hook

**الملف:** `src/hooks/useFieldProtection.ts`

```typescript
import { useMemo } from 'react';
import { PriorityService, type UserType } from '../services/priority/priorityService';
import { useAuth } from '../context/AuthContext';
import type { Beneficiary } from '../types/database';

export function useFieldProtection() {
  const { loggedInUser } = useAuth();

  const userType: UserType = useMemo(() => {
    if (!loggedInUser) return 'beneficiary';

    switch (loggedInUser.role) {
      case 'admin':
      case 'super_admin':
        return 'admin';
      case 'organization':
        return 'organization';
      case 'family':
        return 'family';
      default:
        return 'beneficiary';
    }
  }, [loggedInUser]);

  const canEdit = (fieldName: keyof Beneficiary): boolean => {
    return PriorityService.canEditField(fieldName, userType);
  };

  const needsApproval = (fieldName: keyof Beneficiary): boolean => {
    return PriorityService.requiresApproval(fieldName);
  };

  const needsOTP = (fieldName: keyof Beneficiary): boolean => {
    return PriorityService.requiresOTP(fieldName);
  };

  const getFieldLevel = (fieldName: keyof Beneficiary): number => {
    return PriorityService.getFieldLevel(fieldName);
  };

  return {
    canEdit,
    needsApproval,
    needsOTP,
    getFieldLevel,
    userType,
  };
}
```

### 2.3 تحديث BeneficiaryForm

إضافة منطق الحماية:
- فحص الصلاحيات قبل التعديل
- إنشاء pending update إذا لزم الأمر
- عرض رسائل توضيحية للمستخدم

---

## المرحلة 3: نظام OTP والحماية

### الهدف:
بناء نظام التحقق بالرمز OTP

### المدة المتوقعة: 4-5 أيام

### 3.1 إنشاء OTP Service

**الملف:** `src/services/security/otpService.ts`

```typescript
import { supabase } from '../../lib/supabaseClient';

export class OTPService {
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async createOTP(
    phone: string,
    userId: string,
    userType: string,
    purpose: 'phone_verification' | 'password_reset'
  ) {
    const code = this.generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const { data, error } = await supabase
      .from('otp_verifications')
      .insert({
        phone,
        code,
        user_id: userId,
        user_type: userType,
        purpose,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { otpId: data.id, code };
  }

  static async verifyOTP(
    phone: string,
    code: string,
    purpose: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('purpose', purpose)
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return false;

    if (data.attempts >= data.max_attempts) {
      return false;
    }

    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (updateError) return false;

    if (purpose === 'phone_verification' && data.user_id) {
      await supabase
        .from('beneficiaries')
        .update({
          phone_otp_verified: true,
          phone_verified_at: new Date().toISOString(),
        })
        .eq('id', data.user_id);
    }

    return true;
  }

  static async incrementAttempts(phone: string, code: string) {
    const { error } = await supabase.rpc('increment_otp_attempts', {
      p_phone: phone,
      p_code: code,
    });

    if (error) throw error;
  }
}
```

### 3.2 إنشاء OTP Modal Component

**الملف:** `src/components/modals/OTPVerificationModal.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { OTPService } from '../../services/security/otpService';

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  userId: string;
  userType: string;
  purpose: 'phone_verification' | 'password_reset';
  onVerified: () => void;
}

export function OTPVerificationModal({
  isOpen,
  onClose,
  phone,
  userId,
  userType,
  purpose,
  onVerified,
}: OTPVerificationModalProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(600);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (isOpen && !otpSent) {
      sendOTP();
    }
  }, [isOpen]);

  useEffect(() => {
    if (countdown > 0 && otpSent) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, otpSent]);

  const sendOTP = async () => {
    setLoading(true);
    setError('');

    try {
      const { code } = await OTPService.createOTP(phone, userId, userType, purpose);

      console.log('OTP Code (للتجربة):', code);

      setOtpSent(true);
      setCountdown(600);
    } catch (err) {
      setError('فشل إرسال رمز التحقق');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setError('الرجاء إدخال رمز مكون من 6 أرقام');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isValid = await OTPService.verifyOTP(phone, otp, purpose);

      if (isValid) {
        onVerified();
        onClose();
      } else {
        setError('رمز التحقق غير صحيح أو منتهي الصلاحية');
        await OTPService.incrementAttempts(phone, otp);
      }
    } catch (err) {
      setError('حدث خطأ أثناء التحقق');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تحقق من رقم الهاتف"
    >
      <div className="space-y-4">
        <p className="text-gray-600">
          تم إرسال رمز التحقق إلى الرقم: <strong>{phone}</strong>
        </p>

        <Input
          label="رمز التحقق"
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          disabled={loading}
        />

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <div className="text-sm text-gray-500">
          الوقت المتبقي: {formatTime(countdown)}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={verifyOTP}
            disabled={loading || otp.length !== 6}
            className="flex-1"
          >
            {loading ? 'جاري التحقق...' : 'تحقق'}
          </Button>

          <Button
            onClick={sendOTP}
            variant="outline"
            disabled={loading || countdown > 0}
          >
            إعادة إرسال
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

---

## المرحلة 4: نظام العائلات المحدث

### الهدف:
إضافة نظام Join Code وطلبات الانضمام

### المدة المتوقعة: 3-4 أيام

### 4.1 إنشاء Family Join Service

**الملف:** `src/services/family/familyJoinService.ts`

```typescript
import { supabase } from '../../lib/supabaseClient';

export class FamilyJoinService {
  static async generateJoinCode(familyId: string): Promise<string> {
    const { data, error } = await supabase.rpc('generate_family_join_code');

    if (error) throw error;

    const { error: updateError } = await supabase
      .from('families')
      .update({
        join_code: data,
        join_code_updated_at: new Date().toISOString(),
      })
      .eq('id', familyId);

    if (updateError) throw updateError;

    return data;
  }

  static async createJoinRequest(
    familyId: string,
    beneficiaryId: string,
    requestedById: string,
    requestedByType: string,
    reason?: string
  ) {
    const { data: beneficiary } = await supabase
      .from('beneficiaries')
      .select('family_id')
      .eq('id', beneficiaryId)
      .single();

    const { data, error } = await supabase
      .from('family_join_requests')
      .insert({
        family_id: familyId,
        beneficiary_id: beneficiaryId,
        previous_family_id: beneficiary?.family_id || null,
        requested_by_id: requestedById,
        requested_by_type: requestedByType,
        reason,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async approveJoinRequest(
    requestId: string,
    reviewedById: string
  ) {
    const { data: request } = await supabase
      .from('family_join_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!request) throw new Error('طلب غير موجود');

    const { error: updateBeneficiary } = await supabase
      .from('beneficiaries')
      .update({ family_id: request.family_id })
      .eq('id', request.beneficiary_id);

    if (updateBeneficiary) throw updateBeneficiary;

    const { error: updateRequest } = await supabase
      .from('family_join_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by_id: reviewedById,
      })
      .eq('id', requestId);

    if (updateRequest) throw updateRequest;
  }

  static async rejectJoinRequest(
    requestId: string,
    reviewedById: string,
    reason: string
  ) {
    const { error } = await supabase
      .from('family_join_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by_id: reviewedById,
        rejection_reason: reason,
      })
      .eq('id', requestId);

    if (error) throw error;
  }

  static async findFamilyByJoinCode(joinCode: string) {
    const { data, error } = await supabase
      .from('families')
      .select('*')
      .eq('join_code', joinCode)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getPendingRequests(familyId?: string) {
    let query = supabase
      .from('family_join_requests')
      .select('*, beneficiaries(*), families(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (familyId) {
      query = query.eq('family_id', familyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}
```

---

## المرحلة 5: نظام الإغاثة بالفلاتر

### الهدف:
بناء نظام تتبع الإغاثات وفلترة المستفيدين

### المدة المتوقعة: 5-6 أيام

### 5.1 إنشاء Relief History Service

**الملف:** `src/services/relief/reliefHistoryService.ts`

```typescript
import { supabase } from '../../lib/supabaseClient';

export interface ReliefFilter {
  minDays?: number;
  maxDays?: number;
  neverReceived?: boolean;
  governorate?: string;
  city?: string;
  familySize?: { min?: number; max?: number };
}

export class ReliefHistoryService {
  static async addReliefRecord(
    beneficiaryId: string,
    packageId: string | null,
    provider: {
      type: 'organization' | 'family' | 'admin';
      id: string;
      name: string;
    },
    packageInfo: {
      type: string;
      description?: string;
    },
    notes?: string
  ) {
    const { data, error } = await supabase
      .from('relief_history')
      .insert({
        beneficiary_id: beneficiaryId,
        package_id: packageId,
        provider_type: provider.type,
        provider_id: provider.id,
        provider_name: provider.name,
        package_type: packageInfo.type,
        package_description: packageInfo.description,
        relief_date: new Date().toISOString(),
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getReliefHistory(beneficiaryId: string) {
    const { data, error } = await supabase
      .from('relief_history')
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .order('relief_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getLastReliefDate(beneficiaryId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('relief_history')
      .select('relief_date')
      .eq('beneficiary_id', beneficiaryId)
      .order('relief_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data?.relief_date || null;
  }

  static async filterBeneficiariesByRelief(filters: ReliefFilter) {
    let query = supabase
      .from('beneficiaries_relief_status')
      .select('*');

    if (filters.neverReceived) {
      query = query.is('last_relief_date', null);
    } else {
      if (filters.minDays !== undefined) {
        query = query.or(`last_relief_date.is.null,days_since_last_relief.gte.${filters.minDays}`);
      }

      if (filters.maxDays !== undefined) {
        query = query.lte('days_since_last_relief', filters.maxDays);
      }
    }

    if (filters.governorate) {
      query = query.eq('governorate', filters.governorate);
    }

    if (filters.city) {
      query = query.eq('city', filters.city);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async getBeneficiariesNeedingRelief(minDays: number = 30) {
    const { data, error } = await supabase
      .from('beneficiaries_relief_status')
      .select('*')
      .or(`last_relief_date.is.null,days_since_last_relief.gte.${minDays}`)
      .order('days_since_last_relief', { ascending: false, nullsFirst: true });

    if (error) throw error;
    return data;
  }

  static calculateDaysSinceLastRelief(lastReliefDate: string | null): number | null {
    if (!lastReliefDate) return null;

    const lastDate = new Date(lastReliefDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }
}
```

### 5.2 إنشاء Relief Filters Component

**الملف:** `src/components/relief/ReliefFilters.tsx`

```typescript
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export interface ReliefFilterValues {
  minDays?: number;
  maxDays?: number;
  neverReceived: boolean;
  governorate?: string;
  city?: string;
}

interface ReliefFiltersProps {
  onFilter: (filters: ReliefFilterValues) => void;
  governorates: string[];
}

export function ReliefFilters({ onFilter, governorates }: ReliefFiltersProps) {
  const [filters, setFilters] = useState<ReliefFilterValues>({
    neverReceived: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilter(filters);
  };

  const handleReset = () => {
    setFilters({ neverReceived: false });
    onFilter({ neverReceived: false });
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold mb-4">فلترة المستفيدين حسب الإغاثة</h3>

        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.neverReceived}
              onChange={(e) => setFilters({ ...filters, neverReceived: e.target.checked })}
              className="rounded"
            />
            <span>لم يتلقوا إغاثة من قبل</span>
          </label>

          {!filters.neverReceived && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="الحد الأدنى (أيام)"
                  type="number"
                  value={filters.minDays || ''}
                  onChange={(e) => setFilters({ ...filters, minDays: Number(e.target.value) || undefined })}
                  placeholder="30"
                />

                <Input
                  label="الحد الأقصى (أيام)"
                  type="number"
                  value={filters.maxDays || ''}
                  onChange={(e) => setFilters({ ...filters, maxDays: Number(e.target.value) || undefined })}
                  placeholder="60"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">المحافظة</label>
            <select
              value={filters.governorate || ''}
              onChange={(e) => setFilters({ ...filters, governorate: e.target.value || undefined })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">الكل</option>
              {governorates.map((gov) => (
                <option key={gov} value={gov}>{gov}</option>
              ))}
            </select>
          </div>

          <Input
            label="المدينة"
            type="text"
            value={filters.city || ''}
            onChange={(e) => setFilters({ ...filters, city: e.target.value || undefined })}
            placeholder="أدخل اسم المدينة"
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" className="flex-1">
            تطبيق الفلتر
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            إعادة تعيين
          </Button>
        </div>
      </form>
    </Card>
  );
}
```

---

## المرحلة 6: نظام الإشعارات

### الهدف:
بناء نظام إشعارات متعدد القنوات

### المدة المتوقعة: 4-5 أيام

### 6.1 إنشاء Notifications Service

**الملف:** `src/services/notifications/notificationsService.ts`

```typescript
import { supabase } from '../../lib/supabaseClient';

export interface NotificationPayload {
  recipientId: string;
  recipientType: 'beneficiary' | 'family' | 'organization' | 'admin';
  title: string;
  message: string;
  type: 'otp' | 'delivery' | 'approval' | 'update' | 'alert';
  priority?: 'low' | 'normal' | 'high' | 'critical';
  deliveryMethod: 'sms' | 'whatsapp' | 'in_app';
  metadata?: any;
}

export class NotificationsService {
  static async create(notification: NotificationPayload) {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: notification.recipientId,
        recipient_type: notification.recipientType,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority || 'normal',
        delivery_method: notification.deliveryMethod,
        delivery_status: 'pending',
        metadata: notification.metadata,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async sendOTPNotification(
    phone: string,
    code: string,
    recipientId: string,
    recipientType: string
  ) {
    const message = `رمز التحقق الخاص بك هو: ${code}\nصالح لمدة 10 دقائق`;

    return this.create({
      recipientId,
      recipientType: recipientType as any,
      title: 'رمز التحقق',
      message,
      type: 'otp',
      priority: 'high',
      deliveryMethod: 'sms',
      metadata: { phone, code },
    });
  }

  static async sendDeliveryNotification(
    beneficiaryId: string,
    packageInfo: string
  ) {
    const message = `تم تسجيل استلامك للطرد: ${packageInfo}\nشكراً لك`;

    return this.create({
      recipientId: beneficiaryId,
      recipientType: 'beneficiary',
      title: 'إشعار توصيل',
      message,
      type: 'delivery',
      priority: 'normal',
      deliveryMethod: 'sms',
    });
  }

  static async sendApprovalNotification(
    recipientId: string,
    recipientType: string,
    fieldName: string,
    status: 'approved' | 'rejected'
  ) {
    const message = status === 'approved'
      ? `تم الموافقة على تعديل حقل: ${fieldName}`
      : `تم رفض تعديل حقل: ${fieldName}`;

    return this.create({
      recipientId,
      recipientType: recipientType as any,
      title: 'إشعار موافقة',
      message,
      type: 'approval',
      priority: 'normal',
      deliveryMethod: 'in_app',
    });
  }

  static async getUnreadNotifications(recipientId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', recipientId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async markAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) throw error;
  }

  static async markAllAsRead(recipientId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('recipient_id', recipientId)
      .eq('is_read', false);

    if (error) throw error;
  }
}
```

---

## المرحلة 7: نظام التوثيق

### الهدف:
تسجيل جميع التعديلات في field_edit_log

### المدة المتوقعة: 2-3 أيام

تم إنشاء هذا النظام في SQL Migration (triggers تلقائية)

---

## المرحلة 8: التقارير المحدثة

### الهدف:
تحديث صفحات التقارير لتشمل البيانات الجديدة

### المدة المتوقعة: 3-4 أيام

### 8.1 تحديث ComprehensiveReportsPage

إضافة تقارير:
- المستفيدون حسب آخر إغاثة
- التعديلات المعلقة
- طلبات الانضمام للعائلات
- سجل التعديلات الحقلية

---

## المرحلة 9: استبدال Mock Data

### الهدف:
استبدال جميع Mock Data بـ Supabase

### المدة المتوقعة: 5-6 أيام

### الخطوات:
1. تحديث useBeneficiaries Hook
2. تحديث useOrganizations Hook
3. تحديث جميع الـ Services
4. حذف mockData.ts
5. اختبار شامل

---

## المرحلة 10: التحسينات والتنظيف

### الهدف:
تحسين الأداء وتنظيف الكود

### المدة المتوقعة: 4-5 أيام

### المهام:
- تقسيم المكونات الكبيرة
- إضافة Loading States
- إضافة Error Boundaries
- تحسين الـ Performance
- إضافة Caching

---

## المرحلة 11: الاختبار النهائي

### الهدف:
اختبار شامل لجميع الميزات

### المدة المتوقعة: 5-7 أيام

### سيناريوهات الاختبار:
1. اختبار نظام الأولويات
2. اختبار نظام OTP
3. اختبار نظام العائلات
4. اختبار نظام الإغاثة
5. اختبار نظام الإشعارات
6. اختبار التقارير
7. اختبار الأداء
8. اختبار الأمان

---

## 📊 الجدول الزمني الإجمالي

| المرحلة | المدة | الحالة |
|---------|-------|--------|
| 0. التحضير | 3-4 أيام | ⏳ قيد الانتظار |
| 1. البنية التحتية | 2-3 أيام | ⏳ قيد الانتظار |
| 2. نظام الأولويات | 5-6 أيام | ⏳ قيد الانتظار |
| 3. نظام OTP | 4-5 أيام | ⏳ قيد الانتظار |
| 4. نظام العائلات | 3-4 أيام | ⏳ قيد الانتظار |
| 5. نظام الإغاثة | 5-6 أيام | ⏳ قيد الانتظار |
| 6. نظام الإشعارات | 4-5 أيام | ⏳ قيد الانتظار |
| 7. نظام التوثيق | 2-3 أيام | ⏳ قيد الانتظار |
| 8. التقارير | 3-4 أيام | ⏳ قيد الانتظار |
| 9. استبدال Mock | 5-6 أيام | ⏳ قيد الانتظار |
| 10. التحسينات | 4-5 أيام | ⏳ قيد الانتظار |
| 11. الاختبار | 5-7 أيام | ⏳ قيد الانتظار |

**الإجمالي:** 45-58 يوم عمل (9-12 أسبوع)

---

## 🎯 نقاط حرجة يجب الانتباه لها

1. **Data Migration:** نقل البيانات من Mock إلى Supabase يجب أن يكون تدريجي
2. **Testing:** اختبار كل ميزة قبل الانتقال للتالية
3. **Backward Compatibility:** التأكد من عدم كسر الميزات الموجودة
4. **Performance:** مراقبة الأداء مع كل إضافة
5. **Security:** مراجعة RLS policies باستمرار

---

*تم إنشاء هذه الخطة بتاريخ 2024-12-20*
*آخر تحديث: 2024-12-20*
