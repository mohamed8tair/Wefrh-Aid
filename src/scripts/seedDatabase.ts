import { supabase } from '../lib/supabaseClient';
import {
  mockOrganizations,
  mockFamilies,
  mockBeneficiaries,
  mockPackages,
  mockTasks,
  mockAlerts,
  mockActivityLog,
  mockCouriers,
  mockPackageTemplates,
  mockRoles,
  mockSystemUsers,
  mockPermissions
} from '../data/mockData';

export async function seedDatabase() {
  console.log('🌱 بدء عملية ملء قاعدة البيانات...');

  try {
    console.log('📝 إضافة الصلاحيات...');
    const { error: permError } = await supabase
      .from('permissions')
      .upsert(mockPermissions.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category
      })), { onConflict: 'id' });
    if (permError) console.error('خطأ في الصلاحيات:', permError);
    else console.log(`✅ تم إضافة ${mockPermissions.length} صلاحية`);

    console.log('👥 إضافة الأدوار...');
    const { error: rolesError } = await supabase
      .from('roles')
      .upsert(mockRoles.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions,
        user_count: r.userCount,
        is_active: r.isActive
      })), { onConflict: 'id' });
    if (rolesError) console.error('خطأ في الأدوار:', rolesError);
    else console.log(`✅ تم إضافة ${mockRoles.length} دور`);

    console.log('🏢 إضافة المؤسسات...');
    const { error: orgsError } = await supabase
      .from('organizations')
      .upsert(mockOrganizations.map(o => ({
        id: o.id,
        name: o.name,
        type: o.type,
        location: o.location,
        contact_person: o.contactPerson,
        phone: o.phone,
        email: o.email,
        beneficiaries_count: o.beneficiariesCount,
        packages_count: o.packagesCount,
        completion_rate: o.completionRate,
        status: o.status,
        packages_available: o.packagesAvailable,
        templates_count: o.templatesCount,
        is_popular: o.isPopular
      })), { onConflict: 'id' });
    if (orgsError) console.error('خطأ في المؤسسات:', orgsError);
    else console.log(`✅ تم إضافة ${mockOrganizations.length} مؤسسة`);

    console.log('👨‍👩‍👧‍👦 إضافة العائلات...');
    for (const family of mockFamilies) {
      const joinCode = await generateJoinCode();
      const { error: famError } = await supabase
        .from('families')
        .upsert({
          id: family.id,
          name: family.name,
          head_of_family: family.headOfFamily,
          head_of_family_id: family.headOfFamilyId,
          phone: family.phone,
          members_count: family.membersCount,
          packages_distributed: family.packagesDistributed,
          completion_rate: family.completionRate,
          location: family.location,
          join_code: joinCode,
          join_code_updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      if (famError) console.error(`خطأ في العائلة ${family.name}:`, famError);
    }
    console.log(`✅ تم إضافة ${mockFamilies.length} عائلة`);

    console.log('👤 إضافة المستفيدين...');
    const { error: benError } = await supabase
      .from('beneficiaries')
      .upsert(mockBeneficiaries.map(b => ({
        id: b.id,
        name: b.name,
        full_name: b.fullName,
        national_id: b.nationalId,
        date_of_birth: b.dateOfBirth,
        gender: b.gender,
        phone: b.phone,
        address: b.address,
        detailed_address: b.detailedAddress,
        location: b.location,
        organization_id: b.organizationId,
        family_id: b.familyId,
        relation_to_family: b.relationToFamily,
        profession: b.profession,
        marital_status: b.maritalStatus,
        economic_level: b.economicLevel,
        members_count: b.membersCount,
        additional_documents: b.additionalDocuments,
        identity_status: b.identityStatus,
        identity_image_url: b.identityImageUrl,
        status: b.status,
        eligibility_status: b.eligibilityStatus,
        last_received: b.lastReceived,
        total_packages: b.totalPackages,
        notes: b.notes,
        created_by: b.createdBy,
        updated_by: b.updatedBy
      })), { onConflict: 'id' });
    if (benError) console.error('خطأ في المستفيدين:', benError);
    else console.log(`✅ تم إضافة ${mockBeneficiaries.length} مستفيد`);

    console.log('📦 إضافة الطرود...');
    const { error: pkgError } = await supabase
      .from('packages')
      .upsert(mockPackages.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        description: p.description,
        value: p.value,
        funder: p.funder,
        organization_id: p.organizationId,
        family_id: p.familyId,
        beneficiary_id: p.beneficiaryId,
        status: p.status,
        delivered_at: p.deliveredAt,
        expiry_date: p.expiryDate
      })), { onConflict: 'id' });
    if (pkgError) console.error('خطأ في الطرود:', pkgError);
    else console.log(`✅ تم إضافة ${mockPackages.length} طرد`);

    console.log('🚗 إضافة المناديب...');
    const { error: courierError } = await supabase
      .from('couriers')
      .upsert(mockCouriers.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        status: c.status,
        rating: c.rating,
        completed_tasks: c.completedTasks,
        current_location: c.currentLocation,
        is_humanitarian_approved: c.isHumanitarianApproved
      })), { onConflict: 'id' });
    if (courierError) console.error('خطأ في المناديب:', courierError);
    else console.log(`✅ تم إضافة ${mockCouriers.length} مندوب`);

    console.log('📋 إضافة المهام...');
    const { error: taskError } = await supabase
      .from('tasks')
      .upsert(mockTasks.map(t => ({
        id: t.id,
        package_id: t.packageId,
        beneficiary_id: t.beneficiaryId,
        courier_id: t.courierId,
        batch_id: t.batchId,
        status: t.status,
        scheduled_at: t.scheduledAt,
        delivered_at: t.deliveredAt,
        delivery_location: t.deliveryLocation,
        notes: t.notes,
        courier_notes: t.courierNotes,
        delivery_proof_image_url: t.deliveryProofImageUrl,
        digital_signature_image_url: t.digitalSignatureImageUrl,
        estimated_arrival_time: t.estimatedArrivalTime,
        remaining_distance: t.remainingDistance,
        photo_url: t.photoUrl,
        failure_reason: t.failureReason
      })), { onConflict: 'id' });
    if (taskError) console.error('خطأ في المهام:', taskError);
    else console.log(`✅ تم إضافة ${mockTasks.length} مهمة`);

    console.log('🔔 إضافة التنبيهات...');
    const { error: alertError } = await supabase
      .from('alerts')
      .upsert(mockAlerts.map(a => ({
        id: a.id,
        type: a.type,
        title: a.title,
        description: a.description,
        related_id: a.relatedId,
        related_type: a.relatedType,
        priority: a.priority,
        is_read: a.isRead
      })), { onConflict: 'id' });
    if (alertError) console.error('خطأ في التنبيهات:', alertError);
    else console.log(`✅ تم إضافة ${mockAlerts.length} تنبيه`);

    console.log('📝 إضافة سجل الأنشطة...');
    const { error: actError } = await supabase
      .from('activity_log')
      .upsert(mockActivityLog.map(a => ({
        id: a.id,
        action: a.action,
        user_name: a.user,
        role: a.role,
        timestamp: a.timestamp,
        type: a.type,
        beneficiary_id: a.beneficiaryId,
        details: a.details
      })), { onConflict: 'id' });
    if (actError) console.error('خطأ في سجل الأنشطة:', actError);
    else console.log(`✅ تم إضافة ${mockActivityLog.length} نشاط`);

    console.log('📄 إضافة قوالب الطرود...');
    const { error: tplError } = await supabase
      .from('package_templates')
      .upsert(mockPackageTemplates.map(t => ({
        id: t.id,
        name: t.name,
        type: t.type,
        organization_id: t.organization_id,
        description: t.description,
        contents: t.contents,
        status: t.status,
        usage_count: t.usageCount,
        total_weight: t.totalWeight,
        estimated_cost: t.estimatedCost
      })), { onConflict: 'id' });
    if (tplError) console.error('خطأ في القوالب:', tplError);
    else console.log(`✅ تم إضافة ${mockPackageTemplates.length} قالب`);

    console.log('👨‍💼 إضافة مستخدمي النظام...');
    const { error: userError } = await supabase
      .from('system_users')
      .upsert(mockSystemUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role_id: u.roleId,
        associated_id: u.associatedId,
        associated_type: u.associatedType,
        status: u.status,
        last_login: u.lastLogin
      })), { onConflict: 'id' });
    if (userError) console.error('خطأ في المستخدمين:', userError);
    else console.log(`✅ تم إضافة ${mockSystemUsers.length} مستخدم`);

    console.log('🎉 تم ملء قاعدة البيانات بنجاح!');
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ عام في ملء قاعدة البيانات:', error);
    return { success: false, error };
  }
}

async function generateJoinCode(): Promise<string> {
  const { data, error } = await supabase.rpc('generate_family_join_code');
  if (error) {
    console.error('خطأ في توليد كود الانضمام:', error);
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  return data as string;
}
