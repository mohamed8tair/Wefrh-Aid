import { supabase } from '../../lib/supabaseClient';
import type { Database } from '../../types/database';

type Beneficiary = Database['public']['Tables']['beneficiaries']['Row'];

export type UserType = 'admin' | 'organization' | 'family' | 'beneficiary';

export interface FieldPriority {
  fieldName: keyof Beneficiary;
  level: 1 | 2 | 3 | 4;
  allowedUsers: UserType[];
  requiresApproval: boolean;
  requiresOTP: boolean;
  description: string;
}

export const FIELD_PRIORITIES: Record<string, FieldPriority> = {
  national_id: {
    fieldName: 'national_id',
    level: 1,
    allowedUsers: ['admin'],
    requiresApproval: false,
    requiresOTP: false,
    description: 'الرقم الوطني - محمي للغاية، Admin فقط',
  },

  phone: {
    fieldName: 'phone',
    level: 2,
    allowedUsers: ['admin', 'beneficiary'],
    requiresApproval: false,
    requiresOTP: true,
    description: 'رقم الهاتف - يتطلب تحقق OTP',
  },

  address: {
    fieldName: 'address',
    level: 3,
    allowedUsers: ['admin', 'organization', 'family'],
    requiresApproval: true,
    requiresOTP: false,
    description: 'العنوان - يتطلب موافقة الإدارة',
  },

  detailed_address: {
    fieldName: 'detailed_address',
    level: 3,
    allowedUsers: ['admin', 'organization', 'family'],
    requiresApproval: true,
    requiresOTP: false,
    description: 'العنوان التفصيلي - يتطلب موافقة',
  },

  profession: {
    fieldName: 'profession',
    level: 3,
    allowedUsers: ['admin', 'organization', 'family', 'beneficiary'],
    requiresApproval: true,
    requiresOTP: false,
    description: 'المهنة - يتطلب موافقة',
  },

  marital_status: {
    fieldName: 'marital_status',
    level: 3,
    allowedUsers: ['admin', 'beneficiary'],
    requiresApproval: true,
    requiresOTP: false,
    description: 'الحالة الاجتماعية - يتطلب موافقة',
  },

  economic_level: {
    fieldName: 'economic_level',
    level: 3,
    allowedUsers: ['admin', 'organization'],
    requiresApproval: true,
    requiresOTP: false,
    description: 'المستوى الاقتصادي - يتطلب موافقة',
  },

  members_count: {
    fieldName: 'members_count',
    level: 3,
    allowedUsers: ['admin', 'organization', 'beneficiary'],
    requiresApproval: true,
    requiresOTP: false,
    description: 'عدد أفراد الأسرة - يتطلب موافقة',
  },

  eligibility_status: {
    fieldName: 'eligibility_status',
    level: 2,
    allowedUsers: ['admin'],
    requiresApproval: false,
    requiresOTP: false,
    description: 'حالة الأهلية - Admin فقط',
  },

  status: {
    fieldName: 'status',
    level: 2,
    allowedUsers: ['admin'],
    requiresApproval: false,
    requiresOTP: false,
    description: 'حالة الحساب - Admin فقط',
  },

  notes: {
    fieldName: 'notes',
    level: 4,
    allowedUsers: ['admin', 'organization', 'family', 'beneficiary'],
    requiresApproval: false,
    requiresOTP: false,
    description: 'ملاحظات - الجميع يمكنه التعديل',
  },
};

export interface PendingUpdate {
  id: string;
  beneficiary_id: string;
  field_name: string;
  current_value: string | null;
  proposed_value: string;
  proposed_by_type: string;
  proposed_by_id: string;
  proposed_by_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  reviewed_by_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export class PriorityService {
  static canEditField(
    fieldName: keyof Beneficiary,
    userType: UserType
  ): boolean {
    const priority = FIELD_PRIORITIES[fieldName];
    if (!priority) {
      return userType === 'admin';
    }

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

  static getFieldDescription(fieldName: keyof Beneficiary): string {
    return FIELD_PRIORITIES[fieldName]?.description || 'حقل عام';
  }

  static async createPendingUpdate(
    beneficiaryId: string,
    fieldName: string,
    currentValue: string | null,
    proposedValue: string,
    proposedBy: {
      type: UserType;
      id: string;
      name: string;
    }
  ): Promise<PendingUpdate> {
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

    if (error) {
      console.error('Error creating pending update:', error);
      throw new Error('فشل في إنشاء طلب التعديل: ' + error.message);
    }

    return data as PendingUpdate;
  }

  static async getPendingUpdates(beneficiaryId?: string): Promise<PendingUpdate[]> {
    let query = supabase
      .from('pending_updates')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (beneficiaryId) {
      query = query.eq('beneficiary_id', beneficiaryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pending updates:', error);
      throw new Error('فشل في جلب التعديلات المعلقة: ' + error.message);
    }

    return (data as PendingUpdate[]) || [];
  }

  static async approvePendingUpdate(
    updateId: string,
    reviewedById: string
  ): Promise<void> {
    const { data: update, error: fetchError } = await supabase
      .from('pending_updates')
      .select('*')
      .eq('id', updateId)
      .single();

    if (fetchError || !update) {
      console.error('Error fetching pending update:', fetchError);
      throw new Error('لم يتم العثور على طلب التعديل');
    }

    const updateData: Record<string, any> = {
      [update.field_name]: update.proposed_value
    };

    const { error: updateError } = await supabase
      .from('beneficiaries')
      .update(updateData)
      .eq('id', update.beneficiary_id);

    if (updateError) {
      console.error('Error updating beneficiary:', updateError);
      throw new Error('فشل في تطبيق التعديل: ' + updateError.message);
    }

    const { error: approveError } = await supabase
      .from('pending_updates')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by_id: reviewedById,
      })
      .eq('id', updateId);

    if (approveError) {
      console.error('Error approving update:', approveError);
      throw new Error('فشل في تحديث حالة الطلب: ' + approveError.message);
    }
  }

  static async rejectPendingUpdate(
    updateId: string,
    reviewedById: string,
    reason: string
  ): Promise<void> {
    const { error } = await supabase
      .from('pending_updates')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by_id: reviewedById,
        rejection_reason: reason,
      })
      .eq('id', updateId);

    if (error) {
      console.error('Error rejecting update:', error);
      throw new Error('فشل في رفض الطلب: ' + error.message);
    }
  }

  static async getAllPendingUpdatesWithDetails(): Promise<any[]> {
    const { data, error } = await supabase
      .from('pending_updates')
      .select(`
        *,
        beneficiaries:beneficiary_id (
          name,
          national_id,
          phone
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending updates with details:', error);
      throw new Error('فشل في جلب التعديلات المعلقة: ' + error.message);
    }

    return data || [];
  }

  static getFieldDisplayValue(fieldName: string, value: any): string {
    if (value === null || value === undefined) return '-';

    switch (fieldName) {
      case 'marital_status':
        const statusMap: Record<string, string> = {
          single: 'أعزب',
          married: 'متزوج',
          divorced: 'مطلق',
          widowed: 'أرمل',
        };
        return statusMap[value] || value;

      case 'economic_level':
        const levelMap: Record<string, string> = {
          very_poor: 'فقير جدا',
          poor: 'فقير',
          moderate: 'متوسط',
          good: 'جيد',
        };
        return levelMap[value] || value;

      case 'status':
        const beneficiaryStatusMap: Record<string, string> = {
          active: 'نشط',
          pending: 'معلق',
          suspended: 'موقوف',
        };
        return beneficiaryStatusMap[value] || value;

      case 'eligibility_status':
        const eligibilityMap: Record<string, string> = {
          eligible: 'مؤهل',
          under_review: 'قيد المراجعة',
          rejected: 'مرفوض',
        };
        return eligibilityMap[value] || value;

      case 'gender':
        return value === 'male' ? 'ذكر' : 'أنثى';

      default:
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
    }
  }

  static getFieldDisplayName(fieldName: string): string {
    const nameMap: Record<string, string> = {
      national_id: 'الرقم الوطني',
      phone: 'رقم الهاتف',
      address: 'العنوان',
      detailed_address: 'العنوان التفصيلي',
      profession: 'المهنة',
      marital_status: 'الحالة الاجتماعية',
      economic_level: 'المستوى الاقتصادي',
      members_count: 'عدد أفراد الأسرة',
      eligibility_status: 'حالة الأهلية',
      status: 'حالة الحساب',
      notes: 'ملاحظات',
      name: 'الاسم',
      full_name: 'الاسم الكامل',
      date_of_birth: 'تاريخ الميلاد',
      gender: 'الجنس',
    };

    return nameMap[fieldName] || fieldName;
  }
}
