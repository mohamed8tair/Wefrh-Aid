import { useMemo } from 'react';
import { PriorityService, type UserType } from '../services/priority/priorityService';
import { useAuth } from '../context/AuthContext';
import type { Database } from '../types/database';

type Beneficiary = Database['public']['Tables']['beneficiaries']['Row'];

export function useFieldProtection() {
  const { loggedInUser } = useAuth();

  const userType: UserType = useMemo(() => {
    if (!loggedInUser) return 'beneficiary';

    const roleId = loggedInUser.roleId?.toLowerCase() || '';

    if (roleId.includes('admin') || roleId === 'admin') {
      return 'admin';
    }

    if (loggedInUser.associatedType === 'organization') {
      return 'organization';
    }

    if (loggedInUser.associatedType === 'family') {
      return 'family';
    }

    return 'beneficiary';
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

  const getFieldDescription = (fieldName: keyof Beneficiary): string => {
    return PriorityService.getFieldDescription(fieldName);
  };

  const isAdmin = userType === 'admin';
  const isOrganization = userType === 'organization';
  const isFamily = userType === 'family';
  const isBeneficiary = userType === 'beneficiary';

  return {
    canEdit,
    needsApproval,
    needsOTP,
    getFieldLevel,
    getFieldDescription,
    userType,
    isAdmin,
    isOrganization,
    isFamily,
    isBeneficiary,
    userId: loggedInUser?.id || '',
    userName: loggedInUser?.name || '',
  };
}
