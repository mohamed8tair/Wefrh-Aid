import { supabase } from '../../lib/supabaseClient';

export interface ReliefHistory {
  id: string;
  beneficiary_id: string;
  package_id: string | null;
  provider_type: 'organization' | 'family' | 'admin';
  provider_id: string;
  provider_name: string;
  package_type: string | null;
  package_description: string | null;
  relief_date: string;
  created_at: string;
  notes: string | null;
}

export interface ReliefStatus {
  id: string;
  name: string;
  national_id: string;
  phone: string;
  governorate: string;
  city: string;
  family_size: number;
  last_relief_date: string | null;
  total_reliefs: number;
  relief_status: 'never' | 'recent' | 'medium' | 'old';
  days_since_last_relief: number | null;
}

export class ReliefService {
  static async addReliefRecord(
    beneficiaryId: string,
    packageId: string | null,
    provider: {
      type: 'organization' | 'family' | 'admin';
      id: string;
      name: string;
    },
    packageDetails: {
      type?: string;
      description?: string;
    },
    reliefDate: Date = new Date(),
    notes?: string
  ): Promise<ReliefHistory> {
    const { data, error } = await supabase
      .from('relief_history')
      .insert({
        beneficiary_id: beneficiaryId,
        package_id: packageId,
        provider_type: provider.type,
        provider_id: provider.id,
        provider_name: provider.name,
        package_type: packageDetails.type || null,
        package_description: packageDetails.description || null,
        relief_date: reliefDate.toISOString(),
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding relief record:', error);
      throw new Error('فشل في إضافة سجل الإغاثة: ' + error.message);
    }

    console.log('[Relief] Added relief record for beneficiary:', beneficiaryId);
    return data as ReliefHistory;
  }

  static async getBeneficiaryReliefHistory(
    beneficiaryId: string
  ): Promise<ReliefHistory[]> {
    const { data, error } = await supabase
      .from('relief_history')
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .order('relief_date', { ascending: false });

    if (error) {
      console.error('Error fetching relief history:', error);
      throw new Error('فشل في جلب سجل الإغاثات: ' + error.message);
    }

    return (data as ReliefHistory[]) || [];
  }

  static async getLastReliefDate(beneficiaryId: string): Promise<Date | null> {
    const { data, error } = await supabase
      .from('relief_history')
      .select('relief_date')
      .eq('beneficiary_id', beneficiaryId)
      .order('relief_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching last relief date:', error);
      return null;
    }

    return data ? new Date(data.relief_date) : null;
  }

  static async getDaysSinceLastRelief(beneficiaryId: string): Promise<number | null> {
    const lastDate = await this.getLastReliefDate(beneficiaryId);

    if (!lastDate) {
      return null;
    }

    const now = new Date();
    const diffTime = now.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  static async getBeneficiariesByReliefStatus(
    status: 'never' | 'recent' | 'medium' | 'old' | null = null,
    governorate?: string,
    city?: string
  ): Promise<any[]> {
    let query = supabase.from('relief_history').select(`
      beneficiary_id,
      relief_date
    `);

    const { data: reliefData, error: reliefError } = await query;

    if (reliefError) {
      console.error('Error fetching relief status:', reliefError);
      throw new Error('فشل في جلب حالة الإغاثات: ' + reliefError.message);
    }

    const beneficiaryReliefs = new Map<string, Date>();

    reliefData?.forEach((record: any) => {
      const currentDate = beneficiaryReliefs.get(record.beneficiary_id);
      const recordDate = new Date(record.relief_date);

      if (!currentDate || recordDate > currentDate) {
        beneficiaryReliefs.set(record.beneficiary_id, recordDate);
      }
    });

    let beneficiariesQuery = supabase
      .from('beneficiaries')
      .select('*');

    if (governorate) {
      beneficiariesQuery = beneficiariesQuery.eq('governorate', governorate);
    }

    if (city) {
      beneficiariesQuery = beneficiariesQuery.eq('city', city);
    }

    const { data: beneficiaries, error: benError } = await beneficiariesQuery;

    if (benError) {
      console.error('Error fetching beneficiaries:', benError);
      throw new Error('فشل في جلب المستفيدين: ' + benError.message);
    }

    const now = new Date();
    const results = beneficiaries?.map((ben: any) => {
      const lastReliefDate = beneficiaryReliefs.get(ben.id);
      let daysSince: number | null = null;
      let reliefStatus: 'never' | 'recent' | 'medium' | 'old' = 'never';

      if (lastReliefDate) {
        daysSince = Math.floor((now.getTime() - lastReliefDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSince <= 30) {
          reliefStatus = 'recent';
        } else if (daysSince <= 60) {
          reliefStatus = 'medium';
        } else {
          reliefStatus = 'old';
        }
      }

      return {
        ...ben,
        last_relief_date: lastReliefDate?.toISOString() || null,
        days_since_last_relief: daysSince,
        relief_status: reliefStatus,
      };
    }) || [];

    if (status) {
      return results.filter((b: any) => b.relief_status === status);
    }

    return results;
  }

  static async getReliefStatistics(providerId?: string, providerType?: string) {
    let query = supabase.from('relief_history').select('*', { count: 'exact' });

    if (providerId && providerType) {
      query = query
        .eq('provider_id', providerId)
        .eq('provider_type', providerType);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error fetching relief statistics:', error);
      return { totalReliefs: 0 };
    }

    return { totalReliefs: count || 0 };
  }

  static getStatusBadgeColor(status: 'never' | 'recent' | 'medium' | 'old'): string {
    switch (status) {
      case 'never':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'old':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'recent':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  static getStatusLabel(status: 'never' | 'recent' | 'medium' | 'old'): string {
    switch (status) {
      case 'never':
        return 'لم يستلم إغاثة';
      case 'old':
        return 'أكثر من شهرين';
      case 'medium':
        return '30-60 يوم';
      case 'recent':
        return 'خلال 30 يوم';
      default:
        return 'غير محدد';
    }
  }

  static formatDate(date: string | Date | null): string {
    if (!date) return '-';

    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  static formatDaysSince(days: number | null): string {
    if (days === null) return 'لم يستلم إغاثة';
    if (days === 0) return 'اليوم';
    if (days === 1) return 'أمس';
    if (days < 30) return `منذ ${days} يوم`;
    if (days < 60) return `منذ ${Math.floor(days / 30)} شهر`;
    return `منذ ${Math.floor(days / 30)} شهر`;
  }
}
