import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useErrorLogger } from '../utils/errorLogger';
import type { Database } from '../types/database';

type BeneficiaryRow = Database['public']['Tables']['beneficiaries']['Row'];

export interface Beneficiary {
  id: string;
  name: string;
  fullName: string;
  nationalId: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  phone: string;
  address: string;
  detailedAddress: {
    governorate: string;
    city: string;
    district: string;
    street: string;
    additionalInfo: string;
  };
  location: { lat: number; lng: number };
  organizationId?: string;
  familyId?: string;
  relationToFamily?: string;
  profession: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  economicLevel: 'very_poor' | 'poor' | 'moderate' | 'good';
  membersCount: number;
  additionalDocuments: any[];
  identityStatus: 'verified' | 'pending' | 'rejected';
  identityImageUrl?: string;
  status: 'active' | 'pending' | 'suspended';
  eligibilityStatus: 'eligible' | 'under_review' | 'rejected';
  lastReceived: string;
  totalPackages: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  spouseId?: string;
  parentId?: string;
  childrenIds?: string[];
  isHeadOfFamily?: boolean;
  medicalConditions?: string[];
}

interface UseBeneficiariesOptions {
  organizationId?: string;
  familyId?: string;
  searchTerm?: string;
  statusFilter?: string;
  identityStatusFilter?: string;
  advancedFilters?: {
    governorate?: string;
    city?: string;
    district?: string;
    familyStatus?: string;
    familySize?: string;
    ageGroup?: string;
    economicLevel?: string;
    displacementStatus?: string;
    profession?: string;
    healthStatus?: string;
    medicalCondition?: string;
  };
}

function mapDatabaseRowToBeneficiary(row: BeneficiaryRow): Beneficiary {
  return {
    id: row.id,
    name: row.name,
    fullName: row.full_name,
    nationalId: row.national_id,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    phone: row.phone,
    address: row.address,
    detailedAddress: row.detailed_address || {
      governorate: '',
      city: '',
      district: '',
      street: '',
      additionalInfo: ''
    },
    location: row.location || { lat: 31.3469, lng: 34.3029 },
    organizationId: row.organization_id || undefined,
    familyId: row.family_id || undefined,
    relationToFamily: row.relation_to_family || undefined,
    profession: row.profession,
    maritalStatus: row.marital_status,
    economicLevel: row.economic_level,
    membersCount: row.members_count,
    additionalDocuments: row.additional_documents || [],
    identityStatus: row.identity_status,
    identityImageUrl: row.identity_image_url || undefined,
    status: row.status,
    eligibilityStatus: row.eligibility_status,
    lastReceived: row.last_received,
    totalPackages: row.total_packages,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

export const useBeneficiaries = (options: UseBeneficiariesOptions = {}) => {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logInfo, logError } = useErrorLogger();

  useEffect(() => {
    fetchBeneficiaries();
  }, [options.organizationId, options.familyId]);

  const fetchBeneficiaries = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('beneficiaries')
        .select('*')
        .order('created_at', { ascending: false });

      if (options.organizationId) {
        query = query.eq('organization_id', options.organizationId);
      }

      if (options.familyId) {
        query = query.eq('family_id', options.familyId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const mappedData = (data || []).map(mapDatabaseRowToBeneficiary);
      setBeneficiaries(mappedData);
      logInfo(`تم تحميل ${mappedData.length} مستفيد من Supabase`, 'useBeneficiaries');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في تحميل المستفيدين';
      setError(errorMessage);
      logError(new Error(errorMessage), 'useBeneficiaries');
    } finally {
      setLoading(false);
    }
  };

  const filteredBeneficiaries = useMemo(() => {
    let filtered = [...beneficiaries];

    if (options.searchTerm) {
      const searchLower = options.searchTerm.toLowerCase();
      filtered = filtered.filter(b =>
        b.name.toLowerCase().includes(searchLower) ||
        b.nationalId.includes(options.searchTerm!) ||
        b.phone.includes(options.searchTerm!)
      );
    }

    if (options.statusFilter && options.statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === options.statusFilter);
    }

    if (options.identityStatusFilter && options.identityStatusFilter !== 'all') {
      filtered = filtered.filter(b => b.identityStatus === options.identityStatusFilter);
    }

    if (options.advancedFilters) {
      const filters = options.advancedFilters;

      if (filters.governorate) {
        filtered = filtered.filter(b => b.detailedAddress.governorate === filters.governorate);
      }
      if (filters.city) {
        filtered = filtered.filter(b => b.detailedAddress.city === filters.city);
      }
      if (filters.district) {
        filtered = filtered.filter(b => b.detailedAddress.district === filters.district);
      }

      if (filters.familyStatus) {
        switch (filters.familyStatus) {
          case 'head_of_family':
            filtered = filtered.filter(b => b.isHeadOfFamily);
            break;
          case 'spouse':
            filtered = filtered.filter(b => b.spouseId && !b.isHeadOfFamily);
            break;
          case 'child':
            filtered = filtered.filter(b => b.parentId);
            break;
          case 'orphan_guardian':
            filtered = filtered.filter(b => b.childrenIds && b.childrenIds.length > 0 && b.maritalStatus === 'widowed');
            break;
          case 'family_with_orphans':
            filtered = filtered.filter(b => b.childrenIds && b.childrenIds.length > 0);
            break;
          case 'elderly':
            filtered = filtered.filter(b => {
              const age = new Date().getFullYear() - new Date(b.dateOfBirth).getFullYear();
              return age >= 60;
            });
            break;
          case 'disabled':
            filtered = filtered.filter(b => b.medicalConditions && b.medicalConditions.length > 0);
            break;
        }
      }

      if (filters.familySize) {
        switch (filters.familySize) {
          case 'small':
            filtered = filtered.filter(b => b.membersCount >= 1 && b.membersCount <= 3);
            break;
          case 'medium':
            filtered = filtered.filter(b => b.membersCount >= 4 && b.membersCount <= 7);
            break;
          case 'large':
            filtered = filtered.filter(b => b.membersCount >= 8);
            break;
        }
      }

      if (filters.ageGroup) {
        filtered = filtered.filter(b => {
          const age = new Date().getFullYear() - new Date(b.dateOfBirth).getFullYear();
          switch (filters.ageGroup) {
            case 'child':
              return age < 18;
            case 'adult':
              return age >= 18 && age < 60;
            case 'elderly':
              return age >= 60;
            default:
              return true;
          }
        });
      }

      if (filters.economicLevel) {
        filtered = filtered.filter(b => b.economicLevel === filters.economicLevel);
      }

      if (filters.profession) {
        filtered = filtered.filter(b =>
          b.profession.toLowerCase().includes(filters.profession!.toLowerCase())
        );
      }

      if (filters.healthStatus) {
        switch (filters.healthStatus) {
          case 'has_medical':
            filtered = filtered.filter(b => b.medicalConditions && b.medicalConditions.length > 0);
            break;
          case 'healthy':
            filtered = filtered.filter(b => !b.medicalConditions || b.medicalConditions.length === 0);
            break;
          default:
            if (filters.healthStatus) {
              filtered = filtered.filter(b =>
                b.medicalConditions &&
                b.medicalConditions.some(condition =>
                  condition.toLowerCase().includes(filters.healthStatus!.toLowerCase())
                )
              );
            }
        }
      }

      if (filters.medicalCondition) {
        filtered = filtered.filter(b =>
          b.medicalConditions &&
          b.medicalConditions.some(condition =>
            condition.toLowerCase().includes(filters.medicalCondition!.toLowerCase())
          )
        );
      }
    }
    return filtered;
  }, [beneficiaries, options.searchTerm, options.statusFilter, options.identityStatusFilter, options.advancedFilters]);

  const statistics = useMemo(() => {
    return {
      total: beneficiaries.length,
      verified: beneficiaries.filter(b => b.identityStatus === 'verified').length,
      pending: beneficiaries.filter(b => b.identityStatus === 'pending').length,
      rejected: beneficiaries.filter(b => b.identityStatus === 'rejected').length,
      active: beneficiaries.filter(b => b.status === 'active').length,
      suspended: beneficiaries.filter(b => b.status === 'suspended').length
    };
  }, [beneficiaries]);

  const addBeneficiary = async (beneficiaryData: Partial<Beneficiary>) => {
    try {
      setLoading(true);

      const { data, error: insertError } = await supabase
        .from('beneficiaries')
        .insert({
          name: beneficiaryData.name || '',
          full_name: beneficiaryData.fullName || '',
          national_id: beneficiaryData.nationalId || '',
          date_of_birth: beneficiaryData.dateOfBirth || '',
          gender: beneficiaryData.gender || 'male',
          phone: beneficiaryData.phone || '',
          address: beneficiaryData.address || '',
          detailed_address: beneficiaryData.detailedAddress,
          location: beneficiaryData.location,
          organization_id: beneficiaryData.organizationId,
          family_id: beneficiaryData.familyId,
          relation_to_family: beneficiaryData.relationToFamily,
          profession: beneficiaryData.profession || '',
          marital_status: beneficiaryData.maritalStatus || 'single',
          economic_level: beneficiaryData.economicLevel || 'poor',
          members_count: beneficiaryData.membersCount || 1,
          additional_documents: beneficiaryData.additionalDocuments || [],
          identity_status: 'pending',
          identity_image_url: beneficiaryData.identityImageUrl,
          status: 'active',
          eligibility_status: 'under_review',
          last_received: new Date().toISOString().split('T')[0],
          total_packages: 0,
          notes: beneficiaryData.notes || '',
          created_by: 'admin',
          updated_by: 'admin'
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      const newBeneficiary = mapDatabaseRowToBeneficiary(data);
      setBeneficiaries(prev => [newBeneficiary, ...prev]);
      logInfo(`تم إضافة مستفيد جديد: ${newBeneficiary.name}`, 'useBeneficiaries');
      return newBeneficiary;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في إضافة المستفيد';
      setError(errorMessage);
      logError(new Error(errorMessage), 'useBeneficiaries');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateBeneficiary = async (id: string, updates: Partial<Beneficiary>) => {
    try {
      setLoading(true);

      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.fullName) updateData.full_name = updates.fullName;
      if (updates.nationalId) updateData.national_id = updates.nationalId;
      if (updates.phone) updateData.phone = updates.phone;
      if (updates.address) updateData.address = updates.address;
      if (updates.detailedAddress) updateData.detailed_address = updates.detailedAddress;
      if (updates.profession) updateData.profession = updates.profession;
      if (updates.maritalStatus) updateData.marital_status = updates.maritalStatus;
      if (updates.economicLevel) updateData.economic_level = updates.economicLevel;
      if (updates.membersCount !== undefined) updateData.members_count = updates.membersCount;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.status) updateData.status = updates.status;
      if (updates.identityStatus) updateData.identity_status = updates.identityStatus;

      updateData.updated_by = 'admin';

      const { error: updateError } = await supabase
        .from('beneficiaries')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await fetchBeneficiaries();
      logInfo(`تم تحديث المستفيد: ${id}`, 'useBeneficiaries');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في تحديث المستفيد';
      setError(errorMessage);
      logError(new Error(errorMessage), 'useBeneficiaries');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteBeneficiary = async (id: string) => {
    try {
      setLoading(true);

      const { error: deleteError } = await supabase
        .from('beneficiaries')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setBeneficiaries(prev => prev.filter(b => b.id !== id));
      logInfo(`تم حذف المستفيد: ${id}`, 'useBeneficiaries');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في حذف المستفيد';
      setError(errorMessage);
      logError(new Error(errorMessage), 'useBeneficiaries');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchBeneficiaries();
  };

  return {
    beneficiaries: filteredBeneficiaries,
    allBeneficiaries: beneficiaries,
    loading,
    error,
    statistics,
    addBeneficiary,
    updateBeneficiary,
    deleteBeneficiary,
    refetch
  };
};

export const useBeneficiary = (id: string) => {
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchBeneficiary();
    }
  }, [id]);

  const fetchBeneficiary = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setBeneficiary(data ? mapDatabaseRowToBeneficiary(data) : null);
      setError(data ? null : 'المستفيد غير موجود');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في تحميل المستفيد');
    } finally {
      setLoading(false);
    }
  };

  return { beneficiary, loading, error };
};
