import { supabase } from '../../lib/supabaseClient';

export interface FamilyJoinRequest {
  id: string;
  family_id: string;
  beneficiary_id: string;
  previous_family_id: string | null;
  requested_by_id: string;
  requested_by_type: 'beneficiary' | 'family' | 'admin';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason: string | null;
  reviewed_at: string | null;
  reviewed_by_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export class FamilyJoinService {
  static async generateJoinCode(familyId: string): Promise<string> {
    const { data, error } = await supabase.rpc('generate_family_join_code');

    if (error) {
      console.error('Error generating join code:', error);
      throw new Error('فشل في توليد كود الانضمام');
    }

    const joinCode = data as string;

    const { error: updateError } = await supabase
      .from('families')
      .update({
        join_code: joinCode,
        join_code_updated_at: new Date().toISOString(),
      })
      .eq('id', familyId);

    if (updateError) {
      console.error('Error updating family join code:', updateError);
      throw new Error('فشل في تحديث كود الانضمام');
    }

    return joinCode;
  }

  static async validateJoinCode(joinCode: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('families')
      .select('id, status')
      .eq('join_code', joinCode)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Error validating join code:', error);
      return null;
    }

    return data?.id || null;
  }

  static async createJoinRequest(
    familyId: string,
    beneficiaryId: string,
    previousFamilyId: string | null,
    requestedBy: {
      id: string;
      type: 'beneficiary' | 'family' | 'admin';
    },
    reason?: string
  ): Promise<FamilyJoinRequest> {
    const { data, error } = await supabase
      .from('family_join_requests')
      .insert({
        family_id: familyId,
        beneficiary_id: beneficiaryId,
        previous_family_id: previousFamilyId,
        requested_by_id: requestedBy.id,
        requested_by_type: requestedBy.type,
        status: 'pending',
        reason: reason || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating join request:', error);
      throw new Error('فشل في إنشاء طلب الانضمام: ' + error.message);
    }

    return data as FamilyJoinRequest;
  }

  static async getPendingRequests(familyId?: string): Promise<any[]> {
    let query = supabase
      .from('family_join_requests')
      .select(`
        *,
        families:family_id (
          name,
          contact_name
        ),
        beneficiaries:beneficiary_id (
          name,
          national_id,
          phone
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (familyId) {
      query = query.eq('family_id', familyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pending requests:', error);
      throw new Error('فشل في جلب الطلبات المعلقة: ' + error.message);
    }

    return data || [];
  }

  static async approveJoinRequest(
    requestId: string,
    reviewedById: string
  ): Promise<void> {
    const { data: request, error: fetchError } = await supabase
      .from('family_join_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      throw new Error('لم يتم العثور على طلب الانضمام');
    }

    const { error: updateBeneficiaryError } = await supabase
      .from('beneficiaries')
      .update({ family_id: request.family_id })
      .eq('id', request.beneficiary_id);

    if (updateBeneficiaryError) {
      console.error('Error updating beneficiary family:', updateBeneficiaryError);
      throw new Error('فشل في تحديث عائلة المستفيد: ' + updateBeneficiaryError.message);
    }

    const { error: approveError } = await supabase
      .from('family_join_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by_id: reviewedById,
      })
      .eq('id', requestId);

    if (approveError) {
      console.error('Error approving request:', approveError);
      throw new Error('فشل في الموافقة على الطلب: ' + approveError.message);
    }

    console.log('[Family Join] Approved request:', requestId);
  }

  static async rejectJoinRequest(
    requestId: string,
    reviewedById: string,
    reason: string
  ): Promise<void> {
    const { error } = await supabase
      .from('family_join_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by_id: reviewedById,
        rejection_reason: reason,
      })
      .eq('id', requestId);

    if (error) {
      console.error('Error rejecting request:', error);
      throw new Error('فشل في رفض الطلب: ' + error.message);
    }

    console.log('[Family Join] Rejected request:', requestId);
  }

  static async cancelJoinRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('family_join_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId);

    if (error) {
      console.error('Error cancelling request:', error);
      throw new Error('فشل في إلغاء الطلب: ' + error.message);
    }
  }

  static async getFamilyJoinRequests(beneficiaryId: string): Promise<FamilyJoinRequest[]> {
    const { data, error } = await supabase
      .from('family_join_requests')
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching beneficiary join requests:', error);
      throw new Error('فشل في جلب طلبات الانضمام: ' + error.message);
    }

    return (data as FamilyJoinRequest[]) || [];
  }

  static getStatusBadgeColor(status: 'pending' | 'approved' | 'rejected' | 'cancelled'): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  static getStatusLabel(status: 'pending' | 'approved' | 'rejected' | 'cancelled'): string {
    switch (status) {
      case 'pending':
        return 'قيد المراجعة';
      case 'approved':
        return 'تمت الموافقة';
      case 'rejected':
        return 'مرفوض';
      case 'cancelled':
        return 'ملغي';
      default:
        return 'غير محدد';
    }
  }
}
