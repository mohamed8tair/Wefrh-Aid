import { supabase } from '../lib/supabaseClient';
import type { Beneficiary, Organization, Family, Package as PackageType, Task, Alert, ActivityLog, Courier, PackageTemplate, Role, SystemUser, Permission } from '../data/mockData';

export const beneficiariesService = {
  async getAll(): Promise<Beneficiary[]> {
    const { data, error } = await supabase
      .from('beneficiaries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapBeneficiaryFromDb);
  },

  async getAllDetailed(): Promise<Beneficiary[]> {
    return this.getAll();
  },

  async search(searchTerm: string): Promise<Beneficiary[]> {
    const { data, error } = await supabase
      .from('beneficiaries')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,national_id.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .limit(50);

    if (error) throw error;
    return (data || []).map(mapBeneficiaryFromDb);
  },

  async getById(id: string): Promise<Beneficiary | null> {
    const { data, error } = await supabase
      .from('beneficiaries')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapBeneficiaryFromDb(data) : null;
  },

  async getByOrganization(organizationId: string): Promise<Beneficiary[]> {
    const { data, error } = await supabase
      .from('beneficiaries')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) throw error;
    return (data || []).map(mapBeneficiaryFromDb);
  },

  async getByFamily(familyId: string): Promise<Beneficiary[]> {
    const { data, error } = await supabase
      .from('beneficiaries')
      .select('*')
      .eq('family_id', familyId);

    if (error) throw error;
    return (data || []).map(mapBeneficiaryFromDb);
  },

  async create(beneficiary: any): Promise<Beneficiary> {
    const { data, error } = await supabase
      .from('beneficiaries')
      .insert({
        name: beneficiary.name,
        full_name: beneficiary.fullName,
        national_id: beneficiary.nationalId,
        date_of_birth: beneficiary.dateOfBirth,
        gender: beneficiary.gender,
        phone: beneficiary.phone,
        address: beneficiary.address,
        detailed_address: beneficiary.detailedAddress,
        location: beneficiary.location || { lat: 31.3469, lng: 34.3029 },
        organization_id: beneficiary.organizationId,
        family_id: beneficiary.familyId,
        relation_to_family: beneficiary.relationToFamily,
        profession: beneficiary.profession,
        marital_status: beneficiary.maritalStatus,
        economic_level: beneficiary.economicLevel,
        members_count: beneficiary.membersCount || 1,
        additional_documents: beneficiary.additionalDocuments || [],
        identity_image_url: beneficiary.identityImageUrl,
        notes: beneficiary.notes,
        created_by: 'admin',
        updated_by: 'admin'
      })
      .select()
      .single();

    if (error) throw error;
    return mapBeneficiaryFromDb(data);
  },

  async update(id: string, updates: any): Promise<Beneficiary> {
    const { data, error } = await supabase
      .from('beneficiaries')
      .update({
        ...updates,
        updated_by: 'admin'
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapBeneficiaryFromDb(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('beneficiaries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

export const organizationsService = {
  async getAll(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapOrganizationFromDb);
  },

  async getActive(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (error) throw error;
    return (data || []).map(mapOrganizationFromDb);
  },

  async getById(id: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapOrganizationFromDb(data) : null;
  }
};

export const familiesService = {
  async getAll(): Promise<Family[]> {
    const { data, error } = await supabase
      .from('families')
      .select('*')
      .order('created_at', { ascending: false});

    if (error) throw error;
    return (data || []).map(mapFamilyFromDb);
  },

  async getById(id: string): Promise<Family | null> {
    const { data, error } = await supabase
      .from('families')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapFamilyFromDb(data) : null;
  }
};

export const packagesService = {
  async getAll(): Promise<PackageType[]> {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapPackageFromDb);
  },

  async getByBeneficiary(beneficiaryId: string): Promise<PackageType[]> {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('beneficiary_id', beneficiaryId);

    if (error) throw error;
    return (data || []).map(mapPackageFromDb);
  },

  async create(packageData: any): Promise<PackageType> {
    const { data, error } = await supabase
      .from('packages')
      .insert({
        name: packageData.name,
        type: packageData.type,
        description: packageData.description,
        value: packageData.value,
        funder: packageData.funder,
        organization_id: packageData.organizationId,
        family_id: packageData.familyId,
        beneficiary_id: packageData.beneficiaryId,
        delivered_at: packageData.deliveredAt,
        expiry_date: packageData.expiryDate
      })
      .select()
      .single();

    if (error) throw error;
    return mapPackageFromDb(data);
  }
};

export const tasksService = {
  async getAll(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapTaskFromDb);
  },

  async getByBeneficiary(beneficiaryId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('beneficiary_id', beneficiaryId);

    if (error) throw error;
    return (data || []).map(mapTaskFromDb);
  },

  async updateStatus(id: string, status: Task['status'], updates?: any): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status, ...updates })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapTaskFromDb(data);
  }
};

export const alertsService = {
  async getAll(): Promise<Alert[]> {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapAlertFromDb);
  },

  async getUnread(): Promise<Alert[]> {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapAlertFromDb);
  },

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;
  }
};

export const couriersService = {
  async getAll(): Promise<Courier[]> {
    const { data, error } = await supabase
      .from('couriers')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []).map(mapCourierFromDb);
  },

  async getAllWithPerformance(): Promise<Courier[]> {
    return this.getAll();
  },

  async updateLocation(courierId: string, location: any): Promise<any> {
    const { error } = await supabase
      .from('couriers')
      .update({
        current_location: { lat: location.latitude, lng: location.longitude }
      })
      .eq('id', courierId);

    if (error) throw error;
    return { success: true };
  }
};

export const rolesService = {
  async getAll(): Promise<Role[]> {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []).map(mapRoleFromDb);
  }
};

export const systemUsersService = {
  async getAll(): Promise<SystemUser[]> {
    const { data, error } = await supabase
      .from('system_users')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []).map(mapSystemUserFromDb);
  }
};

export const permissionsService = {
  async getAll(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []).map(mapPermissionFromDb);
  }
};

export const statisticsService = {
  async getOverallStats(): Promise<any> {
    const { data, error } = await supabase
      .from('system_statistics')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error fetching stats:', error);
      return {
        totalBeneficiaries: 0,
        verifiedBeneficiaries: 0,
        activeBeneficiaries: 0,
        totalPackages: 0,
        deliveredPackages: 0,
        activeTasks: 0,
        criticalAlerts: 0,
        activeOrganizations: 0,
        activeCouriers: 0,
        deliveryRate: 0
      };
    }

    return {
      totalBeneficiaries: data?.total_beneficiaries || 0,
      verifiedBeneficiaries: data?.verified_beneficiaries || 0,
      activeBeneficiaries: data?.active_beneficiaries || 0,
      totalPackages: data?.total_packages || 0,
      deliveredPackages: data?.delivered_packages || 0,
      activeTasks: data?.active_tasks || 0,
      criticalAlerts: data?.critical_alerts || 0,
      activeOrganizations: data?.active_organizations || 0,
      activeCouriers: data?.active_couriers || 0,
      deliveryRate: data?.total_packages > 0
        ? Math.round((data.delivered_packages / data.total_packages) * 100)
        : 0
    };
  }
};

// Mapping functions
function mapBeneficiaryFromDb(data: any): Beneficiary {
  return {
    id: data.id,
    name: data.name,
    fullName: data.full_name,
    nationalId: data.national_id,
    dateOfBirth: data.date_of_birth,
    gender: data.gender,
    phone: data.phone,
    address: data.address,
    detailedAddress: data.detailed_address,
    location: data.location,
    organizationId: data.organization_id,
    familyId: data.family_id,
    relationToFamily: data.relation_to_family,
    profession: data.profession,
    maritalStatus: data.marital_status,
    economicLevel: data.economic_level,
    membersCount: data.members_count,
    additionalDocuments: data.additional_documents,
    identityStatus: data.identity_status,
    identityImageUrl: data.identity_image_url,
    status: data.status,
    eligibilityStatus: data.eligibility_status,
    lastReceived: data.last_received,
    totalPackages: data.total_packages,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    createdBy: data.created_by,
    updatedBy: data.updated_by
  };
}

function mapOrganizationFromDb(data: any): Organization {
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    location: data.location,
    contactPerson: data.contact_person,
    phone: data.phone,
    email: data.email,
    beneficiariesCount: data.beneficiaries_count,
    packagesCount: data.packages_count,
    completionRate: data.completion_rate,
    status: data.status,
    createdAt: data.created_at,
    packagesAvailable: data.packages_available,
    templatesCount: data.templates_count,
    isPopular: data.is_popular
  };
}

function mapFamilyFromDb(data: any): Family {
  return {
    id: data.id,
    name: data.name,
    headOfFamily: data.head_of_family,
    headOfFamilyId: data.head_of_family_id,
    familyMembers: [],
    totalChildren: 0,
    totalMedicalCases: 0,
    averageAge: 0,
    phone: data.phone,
    membersCount: data.members_count,
    packagesDistributed: data.packages_distributed,
    completionRate: data.completion_rate,
    location: data.location,
    createdAt: data.created_at
  };
}

function mapPackageFromDb(data: any): PackageType {
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    description: data.description,
    value: data.value,
    funder: data.funder,
    organizationId: data.organization_id,
    familyId: data.family_id,
    beneficiaryId: data.beneficiary_id,
    status: data.status,
    createdAt: data.created_at,
    deliveredAt: data.delivered_at,
    expiryDate: data.expiry_date
  };
}

function mapTaskFromDb(data: any): Task {
  return {
    id: data.id,
    packageId: data.package_id,
    beneficiaryId: data.beneficiary_id,
    courierId: data.courier_id,
    batchId: data.batch_id,
    status: data.status,
    createdAt: data.created_at,
    scheduledAt: data.scheduled_at,
    deliveredAt: data.delivered_at,
    deliveryLocation: data.delivery_location,
    notes: data.notes,
    courierNotes: data.courier_notes,
    deliveryProofImageUrl: data.delivery_proof_image_url,
    digitalSignatureImageUrl: data.digital_signature_image_url,
    estimatedArrivalTime: data.estimated_arrival_time,
    remainingDistance: data.remaining_distance,
    photoUrl: data.photo_url,
    failureReason: data.failure_reason
  };
}

function mapAlertFromDb(data: any): Alert {
  return {
    id: data.id,
    type: data.type,
    title: data.title,
    description: data.description,
    relatedId: data.related_id,
    relatedType: data.related_type,
    priority: data.priority,
    isRead: data.is_read,
    createdAt: data.created_at
  };
}

function mapCourierFromDb(data: any): Courier {
  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    status: data.status,
    rating: data.rating,
    completedTasks: data.completed_tasks,
    currentLocation: data.current_location,
    isHumanitarianApproved: data.is_humanitarian_approved
  };
}

function mapRoleFromDb(data: any): Role {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    userCount: data.user_count,
    isActive: data.is_active,
    createdAt: data.created_at
  };
}

function mapSystemUserFromDb(data: any): SystemUser {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    roleId: data.role_id,
    associatedId: data.associated_id,
    associatedType: data.associated_type,
    status: data.status,
    lastLogin: data.last_login,
    createdAt: data.created_at
  };
}

function mapPermissionFromDb(data: any): Permission {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    category: data.category
  };
}

export const activityLogService = {
  async getAll(): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;
    return (data || []).map((d: any) => ({
      id: d.id,
      action: d.action,
      user: d.user_name,
      role: d.role,
      timestamp: d.timestamp,
      type: d.type,
      beneficiaryId: d.beneficiary_id,
      details: d.details
    }));
  },

  async getByBeneficiary(beneficiaryId: string): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return (data || []).map((d: any) => ({
      id: d.id,
      action: d.action,
      user: d.user_name,
      role: d.role,
      timestamp: d.timestamp,
      type: d.type,
      beneficiaryId: d.beneficiary_id,
      details: d.details
    }));
  }
};

export const packageTemplatesService = {
  async getAll(): Promise<PackageTemplate[]> {
    const { data, error } = await supabase
      .from('package_templates')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      organization_id: d.organization_id,
      description: d.description,
      contents: d.contents,
      status: d.status,
      createdAt: d.created_at,
      usageCount: d.usage_count,
      totalWeight: d.total_weight,
      estimatedCost: d.estimated_cost
    }));
  },

  async getByOrganization(organizationId: string): Promise<PackageTemplate[]> {
    const { data, error } = await supabase
      .from('package_templates')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) throw error;
    return (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      organization_id: d.organization_id,
      description: d.description,
      contents: d.contents,
      status: d.status,
      createdAt: d.created_at,
      usageCount: d.usage_count,
      totalWeight: d.total_weight,
      estimatedCost: d.estimated_cost
    }));
  },

  async createWithItems(template: any, items: any[]): Promise<PackageTemplate> {
    const { data, error } = await supabase
      .from('package_templates')
      .insert({
        name: template.name,
        type: template.type,
        organization_id: template.organization_id,
        description: template.description,
        contents: items,
        total_weight: items.reduce((sum, item) => sum + (item.weight || 0), 0),
        estimated_cost: template.estimatedCost || 0
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      organization_id: data.organization_id,
      description: data.description,
      contents: data.contents,
      status: data.status,
      createdAt: data.created_at,
      usageCount: data.usage_count,
      totalWeight: data.total_weight,
      estimatedCost: data.estimated_cost
    };
  }
};
