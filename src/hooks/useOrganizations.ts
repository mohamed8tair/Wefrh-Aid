import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useErrorLogger } from '../utils/errorLogger';
import type { Database } from '../types/database';

type OrganizationRow = Database['public']['Tables']['organizations']['Row'];

export interface Organization {
  id: string;
  name: string;
  type: string;
  location: string;
  contactPerson: string;
  phone: string;
  email: string;
  beneficiariesCount: number;
  packagesCount: number;
  completionRate: number;
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
  packagesAvailable: number;
  templatesCount: number;
  isPopular: boolean;
}

interface UseOrganizationsOptions {
  searchTerm?: string;
  statusFilter?: string;
  typeFilter?: string;
}

function mapDatabaseRowToOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    location: row.location,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    beneficiariesCount: row.beneficiaries_count,
    packagesCount: row.packages_count,
    completionRate: row.completion_rate,
    status: row.status,
    createdAt: row.created_at,
    packagesAvailable: row.packages_available,
    templatesCount: row.templates_count,
    isPopular: row.is_popular,
  };
}

export const useOrganizations = (options: UseOrganizationsOptions = {}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logInfo, logError } = useErrorLogger();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const mappedData = (data || []).map(mapDatabaseRowToOrganization);
      setOrganizations(mappedData);
      logInfo(`تم تحميل ${mappedData.length} مؤسسة من Supabase`, 'useOrganizations');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في تحميل المؤسسات';
      setError(errorMessage);
      logError(new Error(errorMessage), 'useOrganizations');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizations = useMemo(() => {
    let filtered = [...organizations];

    if (options.searchTerm) {
      const searchLower = options.searchTerm.toLowerCase();
      filtered = filtered.filter(org =>
        org.name.toLowerCase().includes(searchLower) ||
        org.type.toLowerCase().includes(searchLower) ||
        org.location.toLowerCase().includes(searchLower)
      );
    }

    if (options.statusFilter && options.statusFilter !== 'all') {
      filtered = filtered.filter(org => org.status === options.statusFilter);
    }

    if (options.typeFilter && options.typeFilter !== 'all') {
      filtered = filtered.filter(org => org.type.includes(options.typeFilter!));
    }

    return filtered;
  }, [organizations, options.searchTerm, options.statusFilter, options.typeFilter]);

  const statistics = useMemo(() => {
    return {
      total: organizations.length,
      active: organizations.filter(org => org.status === 'active').length,
      pending: organizations.filter(org => org.status === 'pending').length,
      suspended: organizations.filter(org => org.status === 'suspended').length,
      totalBeneficiaries: organizations.reduce((sum, org) => sum + org.beneficiariesCount, 0),
      totalPackages: organizations.reduce((sum, org) => sum + org.packagesCount, 0)
    };
  }, [organizations]);

  const addOrganization = async (orgData: Partial<Organization>) => {
    try {
      setLoading(true);

      const { data, error: insertError } = await supabase
        .from('organizations')
        .insert({
          name: orgData.name || '',
          type: orgData.type || '',
          location: orgData.location || '',
          contact_person: orgData.contactPerson || '',
          phone: orgData.phone || '',
          email: orgData.email || '',
          beneficiaries_count: 0,
          packages_count: 0,
          completion_rate: 0,
          status: 'pending',
          packages_available: 0,
          templates_count: 0,
          is_popular: false
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      const newOrganization = mapDatabaseRowToOrganization(data);
      setOrganizations(prev => [newOrganization, ...prev]);
      logInfo(`تم إضافة مؤسسة جديدة: ${newOrganization.name}`, 'useOrganizations');
      return newOrganization;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في إضافة المؤسسة';
      setError(errorMessage);
      logError(new Error(errorMessage), 'useOrganizations');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateOrganization = async (id: string, updates: Partial<Organization>) => {
    try {
      setLoading(true);

      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.type) updateData.type = updates.type;
      if (updates.location) updateData.location = updates.location;
      if (updates.contactPerson) updateData.contact_person = updates.contactPerson;
      if (updates.phone) updateData.phone = updates.phone;
      if (updates.email) updateData.email = updates.email;
      if (updates.status) updateData.status = updates.status;
      if (updates.beneficiariesCount !== undefined) updateData.beneficiaries_count = updates.beneficiariesCount;
      if (updates.packagesCount !== undefined) updateData.packages_count = updates.packagesCount;
      if (updates.completionRate !== undefined) updateData.completion_rate = updates.completionRate;
      if (updates.packagesAvailable !== undefined) updateData.packages_available = updates.packagesAvailable;
      if (updates.templatesCount !== undefined) updateData.templates_count = updates.templatesCount;
      if (updates.isPopular !== undefined) updateData.is_popular = updates.isPopular;

      const { error: updateError } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await fetchOrganizations();
      logInfo(`تم تحديث المؤسسة: ${id}`, 'useOrganizations');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في تحديث المؤسسة';
      setError(errorMessage);
      logError(new Error(errorMessage), 'useOrganizations');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteOrganization = async (id: string) => {
    try {
      setLoading(true);

      const { error: deleteError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setOrganizations(prev => prev.filter(org => org.id !== id));
      logInfo(`تم حذف المؤسسة: ${id}`, 'useOrganizations');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في حذف المؤسسة';
      setError(errorMessage);
      logError(new Error(errorMessage), 'useOrganizations');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchOrganizations();
  };

  return {
    organizations: filteredOrganizations,
    allOrganizations: organizations,
    loading,
    error,
    statistics,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    refetch
  };
};

export const useOrganization = (id: string) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchOrganization();
    }
  }, [id]);

  const fetchOrganization = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setOrganization(data ? mapDatabaseRowToOrganization(data) : null);
      setError(data ? null : 'المؤسسة غير موجودة');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في تحميل المؤسسة');
    } finally {
      setLoading(false);
    }
  };

  return { organization, loading, error };
};
