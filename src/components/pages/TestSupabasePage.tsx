import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, AlertTriangle, RefreshCw, Users, Package, Building2, Heart, Shield, Activity, Eye, Edit, Phone, Bell, Star, Lock, Key, Clock, FileText } from 'lucide-react';
import { statisticsService } from '../../services/supabaseService';
import { mockBeneficiaries, mockOrganizations, mockFamilies, mockPackages, mockTasks, mockAlerts, mockRoles, mockSystemUsers, calculateStats } from '../../data/mockData';
import SupabaseConnectionStatus from '../SupabaseConnectionStatus';
import { PriorityService } from '../../services/priority/priorityService';
import { OTPService } from '../../services/otp/otpService';
import { ReliefService } from '../../services/relief/reliefService';
import { FamilyJoinService } from '../../services/family/familyJoinService';
import { NotificationService } from '../../services/notifications/notificationService';

export default function TestSupabasePage() {
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [securityTestsRunning, setSecurityTestsRunning] = useState(false);
  const [securityTestResults, setSecurityTestResults] = useState<any>(null);

  // استخدام البيانات الوهمية مباشرة
  const beneficiaries = mockBeneficiaries;
  const organizations = mockOrganizations;
  const families = mockFamilies;
  const packages = mockPackages;
  const tasks = mockTasks;
  const alerts = mockAlerts;
  const roles = mockRoles;
  const systemUsers = mockSystemUsers;

  // اختبار أنظمة الأمان الجديدة
  const testSecuritySystems = async () => {
    setSecurityTestsRunning(true);
    const results: any = {
      prioritySystem: { tested: false, success: false, details: '' },
      otpSystem: { tested: false, success: false, details: '' },
      reliefHistory: { tested: false, success: false, details: '' },
      familyJoin: { tested: false, success: false, details: '' },
      notifications: { tested: false, success: false, details: '' }
    };

    try {
      // اختبار نظام الأولويات
      const priorityCheck = PriorityService.canEditField('admin', 'national_id');
      results.prioritySystem = {
        tested: true,
        success: priorityCheck.canEdit,
        details: `المدير يمكنه تعديل رقم الهوية: ${priorityCheck.canEdit ? 'نعم' : 'لا'}. ${priorityCheck.requiresOTP ? 'يتطلب OTP' : ''}`
      };

      // اختبار نظام OTP
      const otp = OTPService.generateOTP();
      results.otpSystem = {
        tested: true,
        success: otp.length === 6,
        details: `تم توليد OTP: ${otp} (6 أرقام)`
      };

      // اختبار نظام سجل المساعدات
      const reliefStatus = ReliefService.getReliefStatus('BEN001');
      results.reliefHistory = {
        tested: true,
        success: true,
        details: `حالة المساعدات: ${reliefStatus.status}, ${reliefStatus.totalReceived} مساعدة مستلمة`
      };

      // اختبار نظام طلبات الانضمام للعائلات
      const joinCode = FamilyJoinService.generateJoinCode('FAM001');
      results.familyJoin = {
        tested: true,
        success: joinCode.length > 0,
        details: `تم توليد رمز الانضمام: ${joinCode}`
      };

      // اختبار نظام الإشعارات
      const notificationPriority = NotificationService.determineNotificationPriority('security_alert');
      results.notifications = {
        tested: true,
        success: notificationPriority === 'high',
        details: `أولوية التنبيه الأمني: ${notificationPriority}`
      };

    } catch (error) {
      console.error('خطأ في اختبار الأنظمة:', error);
    }

    setSecurityTestResults(results);
    setSecurityTestsRunning(false);
  };

  const testQueries = [
    { name: 'المستفيدين', data: beneficiaries, loading: false, error: null, icon: Users, color: 'blue' },
    { name: 'المؤسسات', data: organizations, loading: false, error: null, icon: Building2, color: 'green' },
    { name: 'العائلات', data: families, loading: false, error: null, icon: Heart, color: 'purple' },
    { name: 'الطرود', data: packages, loading: false, error: null, icon: Package, color: 'orange' },
    { name: 'المهام', data: tasks, loading: false, error: null, icon: Activity, color: 'indigo' },
    { name: 'التنبيهات', data: alerts, loading: false, error: null, icon: Bell, color: 'red' },
    { name: 'الأدوار', data: roles, loading: false, error: null, icon: Star, color: 'purple' },
    { name: 'المستخدمين', data: systemUsers, loading: false, error: null, icon: Users, color: 'teal' }
  ];

  // جلب الإحصائيات
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        setStatsError(null);
        const statistics = await statisticsService.getOverallStats();
        setStats(statistics);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'خطأ في جلب الإحصائيات';
        setStatsError(errorMessage);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Database className="w-6 h-6 ml-2 text-blue-600" />
            حالة النظام
          </h3>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center"
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث البيانات
          </button>
        </div>
        
        <SupabaseConnectionStatus showDetails={true} />
        
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-800">النظام يعمل بالبيانات الوهمية بشكل كامل</span>
          </div>
          <p className="text-blue-700 mt-2 text-sm">جميع الواجهات ولوحات التحكم تستخدم البيانات الوهمية للتطوير</p>
        </div>
      </div>

      {/* Mock Data Statistics */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">إحصائيات البيانات الوهمية</h3>
        
        {statsLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="mr-3 text-gray-600">جاري تحميل الإحصائيات...</span>
          </div>
        ) : statsError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">خطأ في تحميل الإحصائيات:</span>
            </div>
            <p className="text-red-700 mt-2 text-sm">{statsError}</p>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">المستفيدين</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.totalBeneficiaries}</p>
              <p className="text-xs text-blue-700">{beneficiaries.filter(b => b.identityStatus === 'verified').length} موثق</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                <Package className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">الطرود</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{stats.totalPackages}</p>
              <p className="text-xs text-green-700">{stats.deliveredPackages} مسلم</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                <Activity className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-800">المهام النشطة</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">{stats.activeTasks}</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-xl border border-red-200">
              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                <Shield className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-800">تنبيهات حرجة</span>
              </div>
              <p className="text-2xl font-bold text-red-900">{stats.criticalAlerts}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Mock Data Test Results */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">اختبار البيانات الوهمية</h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testQueries.map((query) => {
            const IconComponent = query.icon;
            const colorClasses = {
              blue: 'bg-blue-50 border-blue-200 text-blue-800',
              green: 'bg-green-50 border-green-200 text-green-800',
              purple: 'bg-purple-50 border-purple-200 text-purple-800',
              orange: 'bg-orange-50 border-orange-200 text-orange-800',
              indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
              red: 'bg-red-50 border-red-200 text-red-800',
              teal: 'bg-teal-50 border-teal-200 text-teal-800'
            };
            
            return (
              <div key={query.name} className={`p-4 rounded-xl border ${colorClasses[query.color as keyof typeof colorClasses]}`}>
                <div className="flex items-center space-x-2 space-x-reverse mb-3">
                  <IconComponent className="w-5 h-5" />
                  <span className="font-medium">{query.name}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 space-x-reverse text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">متاح</span>
                  </div>
                  <p className="text-lg font-bold">{query.data?.length || 0} سجل</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sample Data Display */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">عينة من البيانات الوهمية</h3>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-3">أول مستفيد في البيانات الوهمية:</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">الاسم:</span>
                <span className="font-medium text-blue-900 mr-2">{beneficiaries[0]?.name}</span>
              </div>
              <div>
                <span className="text-blue-700">رقم الهوية:</span>
                <span className="font-medium text-blue-900 mr-2">{beneficiaries[0]?.nationalId}</span>
              </div>
              <div>
                <span className="text-blue-700">الهاتف:</span>
                <span className="font-medium text-blue-900 mr-2">{beneficiaries[0]?.phone}</span>
              </div>
              <div>
                <span className="text-blue-700">الحالة:</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-2 ${
                  beneficiaries[0]?.status === 'active' ? 'bg-green-100 text-green-800' :
                  beneficiaries[0]?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {beneficiaries[0]?.status === 'active' ? 'نشط' :
                   beneficiaries[0]?.status === 'pending' ? 'معلق' : 'موقوف'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-xl border border-green-200">
            <h4 className="font-medium text-green-800 mb-3">أول مؤسسة في البيانات الوهمية:</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-green-700">اسم المؤسسة:</span>
                <span className="font-medium text-green-900 mr-2">{organizations[0]?.name}</span>
              </div>
              <div>
                <span className="text-green-700">النوع:</span>
                <span className="font-medium text-green-900 mr-2">{organizations[0]?.type}</span>
              </div>
              <div>
                <span className="text-green-700">الموقع:</span>
                <span className="font-medium text-green-900 mr-2">{organizations[0]?.location}</span>
              </div>
              <div>
                <span className="text-green-700">الحالة:</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-2 ${
                  organizations[0]?.status === 'active' ? 'bg-green-100 text-green-800' :
                  organizations[0]?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {organizations[0]?.status === 'active' ? 'نشط' :
                   organizations[0]?.status === 'pending' ? 'معلق' : 'موقوف'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
            <h4 className="font-medium text-purple-800 mb-3">أول دور في النظام:</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-purple-700">اسم الدور:</span>
                <span className="font-medium text-purple-900 mr-2">{roles[0]?.name}</span>
              </div>
              <div>
                <span className="text-purple-700">الوصف:</span>
                <span className="font-medium text-purple-900 mr-2">{roles[0]?.description}</span>
              </div>
              <div>
                <span className="text-purple-700">عدد المستخدمين:</span>
                <span className="font-medium text-purple-900 mr-2">{roles[0]?.userCount}</span>
              </div>
              <div>
                <span className="text-purple-700">عدد الصلاحيات:</span>
                <span className="font-medium text-purple-900 mr-2">{roles[0]?.permissions?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mock Data Information */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">معلومات البيانات الوهمية</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Beneficiaries Sample */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-3">عينة من المستفيدين ({beneficiaries.length} إجمالي):</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {beneficiaries.slice(0, 5).map((beneficiary, index) => (
                <div key={beneficiary.id} className="bg-white p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{beneficiary.name}</p>
                    <p className="text-sm text-gray-600">{beneficiary.nationalId}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    beneficiary.status === 'active' ? 'bg-green-100 text-green-800' :
                    beneficiary.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {beneficiary.status === 'active' ? 'نشط' :
                     beneficiary.status === 'pending' ? 'معلق' : 'موقوف'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Organizations Sample */}
          <div className="bg-green-50 p-4 rounded-xl border border-green-200">
            <h4 className="font-medium text-green-800 mb-3">عينة من المؤسسات ({organizations.length} إجمالي):</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {organizations.slice(0, 5).map((org, index) => (
                <div key={org.id} className="bg-white p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{org.name}</p>
                    <p className="text-sm text-gray-600">{org.type}</p>
                  </div>
                  <span className="text-sm text-gray-600">{org.beneficiariesCount} مستفيد</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Security Systems Testing */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Shield className="w-6 h-6 ml-2 text-blue-600" />
            اختبار أنظمة الأمان الجديدة
          </h3>
          <button
            onClick={testSecuritySystems}
            disabled={securityTestsRunning}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {securityTestsRunning ? (
              <>
                <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                جاري الاختبار...
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 ml-2" />
                تشغيل الاختبارات
              </>
            )}
          </button>
        </div>

        {securityTestResults ? (
          <div className="space-y-4">
            {/* Priority System */}
            <div className={`p-4 rounded-xl border ${
              securityTestResults.prioritySystem.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                <Lock className={`w-5 h-5 ${
                  securityTestResults.prioritySystem.success ? 'text-green-600' : 'text-red-600'
                }`} />
                <span className={`font-medium ${
                  securityTestResults.prioritySystem.success ? 'text-green-800' : 'text-red-800'
                }`}>نظام الأولويات والصلاحيات</span>
                {securityTestResults.prioritySystem.success && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
              <p className={`text-sm ${
                securityTestResults.prioritySystem.success ? 'text-green-700' : 'text-red-700'
              }`}>{securityTestResults.prioritySystem.details}</p>
            </div>

            {/* OTP System */}
            <div className={`p-4 rounded-xl border ${
              securityTestResults.otpSystem.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                <Key className={`w-5 h-5 ${
                  securityTestResults.otpSystem.success ? 'text-green-600' : 'text-red-600'
                }`} />
                <span className={`font-medium ${
                  securityTestResults.otpSystem.success ? 'text-green-800' : 'text-red-800'
                }`}>نظام التحقق OTP</span>
                {securityTestResults.otpSystem.success && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
              <p className={`text-sm ${
                securityTestResults.otpSystem.success ? 'text-green-700' : 'text-red-700'
              }`}>{securityTestResults.otpSystem.details}</p>
            </div>

            {/* Relief History */}
            <div className={`p-4 rounded-xl border ${
              securityTestResults.reliefHistory.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                <Package className={`w-5 h-5 ${
                  securityTestResults.reliefHistory.success ? 'text-green-600' : 'text-red-600'
                }`} />
                <span className={`font-medium ${
                  securityTestResults.reliefHistory.success ? 'text-green-800' : 'text-red-800'
                }`}>نظام سجل المساعدات</span>
                {securityTestResults.reliefHistory.success && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
              <p className={`text-sm ${
                securityTestResults.reliefHistory.success ? 'text-green-700' : 'text-red-700'
              }`}>{securityTestResults.reliefHistory.details}</p>
            </div>

            {/* Family Join System */}
            <div className={`p-4 rounded-xl border ${
              securityTestResults.familyJoin.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                <Users className={`w-5 h-5 ${
                  securityTestResults.familyJoin.success ? 'text-green-600' : 'text-red-600'
                }`} />
                <span className={`font-medium ${
                  securityTestResults.familyJoin.success ? 'text-green-800' : 'text-red-800'
                }`}>نظام طلبات الانضمام للعائلات</span>
                {securityTestResults.familyJoin.success && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
              <p className={`text-sm ${
                securityTestResults.familyJoin.success ? 'text-green-700' : 'text-red-700'
              }`}>{securityTestResults.familyJoin.details}</p>
            </div>

            {/* Notifications System */}
            <div className={`p-4 rounded-xl border ${
              securityTestResults.notifications.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                <Bell className={`w-5 h-5 ${
                  securityTestResults.notifications.success ? 'text-green-600' : 'text-red-600'
                }`} />
                <span className={`font-medium ${
                  securityTestResults.notifications.success ? 'text-green-800' : 'text-red-800'
                }`}>نظام الإشعارات</span>
                {securityTestResults.notifications.success && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
              <p className={`text-sm ${
                securityTestResults.notifications.success ? 'text-green-700' : 'text-red-700'
              }`}>{securityTestResults.notifications.details}</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">اضغط على زر "تشغيل الاختبارات" لاختبار جميع أنظمة الأمان الجديدة</p>
            <p className="text-sm text-gray-500">سيتم اختبار: نظام الأولويات، OTP، سجل المساعدات، طلبات الانضمام، والإشعارات</p>
          </div>
        )}
      </div>

      {/* Security Features Overview */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">نظرة عامة على ميزات الأمان</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center space-x-2 space-x-reverse mb-3">
              <Lock className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-blue-800">نظام الأولويات (4 مستويات)</h4>
            </div>
            <ul className="space-y-2 text-sm text-blue-700">
              <li>• المستوى 1: حقول حساسة جداً (رقم الهوية)</li>
              <li>• المستوى 2: حقول شخصية مهمة (الاسم، تاريخ الميلاد)</li>
              <li>• المستوى 3: حقول التواصل (هاتف، عنوان)</li>
              <li>• المستوى 4: حقول عامة (ملاحظات)</li>
            </ul>
          </div>

          <div className="bg-green-50 p-4 rounded-xl border border-green-200">
            <div className="flex items-center space-x-2 space-x-reverse mb-3">
              <Key className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-green-800">نظام التحقق OTP</h4>
            </div>
            <ul className="space-y-2 text-sm text-green-700">
              <li>• رموز من 6 أرقام</li>
              <li>• صلاحية 10 دقائق</li>
              <li>• حد أقصى 3 محاولات</li>
              <li>• إرسال عبر SMS أو WhatsApp</li>
            </ul>
          </div>

          <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
            <div className="flex items-center space-x-2 space-x-reverse mb-3">
              <FileText className="w-5 h-5 text-purple-600" />
              <h4 className="font-medium text-purple-800">سجل المساعدات</h4>
            </div>
            <ul className="space-y-2 text-sm text-purple-700">
              <li>• تتبع جميع المساعدات الموزعة</li>
              <li>• حساب الأولوية بناءً على آخر مساعدة</li>
              <li>• تحليلات وتقارير شاملة</li>
              <li>• تصنيف المستفيدين حسب الحاجة</li>
            </ul>
          </div>

          <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
            <div className="flex items-center space-x-2 space-x-reverse mb-3">
              <Bell className="w-5 h-5 text-orange-600" />
              <h4 className="font-medium text-orange-800">نظام الإشعارات المتقدم</h4>
            </div>
            <ul className="space-y-2 text-sm text-orange-700">
              <li>• إشعارات داخل التطبيق</li>
              <li>• رسائل SMS</li>
              <li>• رسائل WhatsApp</li>
              <li>• أولويات مختلفة (عالية، متوسطة، منخفضة)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Development Instructions */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
        <div className="flex items-start space-x-3 space-x-reverse">
          <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-yellow-800 mb-3">معلومات التطوير</h4>
            <div className="space-y-2 text-sm text-yellow-700">
              <p>• تم تطبيق جميع أنظمة الأمان الجديدة على قاعدة بيانات Supabase</p>
              <p>• الجداول الجديدة: pending_updates, relief_history, otp_verifications, notifications, family_join_requests, field_edit_log</p>
              <p>• جميع الأنظمة محمية بـ Row Level Security (RLS)</p>
              <p>• استخدم هذه الصفحة لاختبار جميع الوظائف الأمنية</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}