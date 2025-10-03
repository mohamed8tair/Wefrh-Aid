import React, { useState, useEffect } from 'react';
import { Users, UserPlus, CheckCircle, XCircle, Clock, Key, RefreshCw, Copy, Check } from 'lucide-react';
import { Card, Button, Badge } from '../ui';
import { FamilyJoinService } from '../../services/family/familyJoinService';
import { mockFamilies, mockBeneficiaries } from '../../data/mockData';

interface JoinRequest {
  id: string;
  familyId: string;
  familyName: string;
  requesterId: string;
  requesterName: string;
  requesterPhone: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  notes?: string;
}

export default function FamilyJoinRequestsPage() {
  const [activeTab, setActiveTab] = useState<'requests' | 'codes'>('requests');
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [familyCodes, setFamilyCodes] = useState<Map<string, string>>(new Map());
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadMockData();
  }, []);

  const loadMockData = () => {
    const mockRequests: JoinRequest[] = [
      {
        id: 'REQ001',
        familyId: 'FAM001',
        familyName: 'عائلة الغزاوي',
        requesterId: 'BEN005',
        requesterName: 'محمد أحمد الغزاوي',
        requesterPhone: '0591234567',
        status: 'pending',
        requestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'أريد الانضمام إلى عائلتي'
      },
      {
        id: 'REQ002',
        familyId: 'FAM002',
        familyName: 'عائلة الصالح',
        requesterId: 'BEN008',
        requesterName: 'فاطمة محمود الصالح',
        requesterPhone: '0599876543',
        status: 'pending',
        requestDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'REQ003',
        familyId: 'FAM003',
        familyName: 'عائلة النجار',
        requesterId: 'BEN012',
        requesterName: 'أحمد علي النجار',
        requesterPhone: '0597654321',
        status: 'approved',
        requestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    setJoinRequests(mockRequests);

    mockFamilies.forEach(family => {
      const code = FamilyJoinService.generateJoinCode(family.id);
      setFamilyCodes(prev => new Map(prev).set(family.id, code));
    });
  };

  const handleApproveRequest = (requestId: string) => {
    setJoinRequests(prev =>
      prev.map(req =>
        req.id === requestId ? { ...req, status: 'approved' as const } : req
      )
    );
  };

  const handleRejectRequest = (requestId: string) => {
    setJoinRequests(prev =>
      prev.map(req =>
        req.id === requestId ? { ...req, status: 'rejected' as const } : req
      )
    );
  };

  const handleGenerateNewCode = (familyId: string) => {
    const newCode = FamilyJoinService.generateJoinCode(familyId);
    setFamilyCodes(prev => new Map(prev).set(familyId, newCode));
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const pendingRequests = joinRequests.filter(r => r.status === 'pending');
  const approvedRequests = joinRequests.filter(r => r.status === 'approved');
  const rejectedRequests = joinRequests.filter(r => r.status === 'rejected');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="warning" size="sm">
            <Clock className="w-3 h-3 ml-1" />
            قيد المراجعة
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="success" size="sm">
            <CheckCircle className="w-3 h-3 ml-1" />
            موافق عليه
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="danger" size="sm">
            <XCircle className="w-3 h-3 ml-1" />
            مرفوض
          </Badge>
        );
      default:
        return null;
    }
  };

  const getDaysSinceRequest = (dateString: string) => {
    const requestDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - requestDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">طلبات الانضمام للعائلات</h1>
          <p className="text-gray-600 mt-2">إدارة طلبات انضمام المستفيدين إلى العائلات ورموز الدعوة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="sm" className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-yellow-100 p-3 rounded-xl">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-yellow-700">طلبات قيد المراجعة</p>
              <p className="text-2xl font-bold text-yellow-900">{pendingRequests.length}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm" className="bg-green-50 border-green-200">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-green-100 p-3 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-700">طلبات موافق عليها</p>
              <p className="text-2xl font-bold text-green-900">{approvedRequests.length}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm" className="bg-red-50 border-red-200">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-red-100 p-3 rounded-xl">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-700">طلبات مرفوضة</p>
              <p className="text-2xl font-bold text-red-900">{rejectedRequests.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex space-x-2 space-x-reverse border-b border-gray-200">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'requests'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <UserPlus className="w-5 h-5 inline ml-2" />
          طلبات الانضمام
        </button>
        <button
          onClick={() => setActiveTab('codes')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'codes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Key className="w-5 h-5 inline ml-2" />
          رموز الدعوة
        </button>
      </div>

      {activeTab === 'requests' ? (
        <div className="space-y-4">
          {pendingRequests.length > 0 && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Clock className="w-6 h-6 ml-2 text-yellow-600" />
                طلبات قيد المراجعة ({pendingRequests.length})
              </h2>
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 space-x-reverse mb-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <UserPlus className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{request.requesterName}</h3>
                            <p className="text-sm text-gray-600">{request.requesterPhone}</p>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">العائلة المطلوبة:</span>
                            <span className="font-medium text-gray-900 mr-2">{request.familyName}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">تاريخ الطلب:</span>
                            <span className="font-medium text-gray-900 mr-2">
                              منذ {getDaysSinceRequest(request.requestDate)} يوم
                            </span>
                          </div>
                        </div>
                        {request.notes && (
                          <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-700">{request.notes}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2 space-x-reverse mr-4">
                        <Button
                          size="sm"
                          variant="success"
                          icon={CheckCircle}
                          iconPosition="right"
                          onClick={() => handleApproveRequest(request.id)}
                        >
                          قبول
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={XCircle}
                          iconPosition="right"
                          onClick={() => handleRejectRequest(request.id)}
                        >
                          رفض
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {approvedRequests.length > 0 && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="w-6 h-6 ml-2 text-green-600" />
                الطلبات الموافق عليها ({approvedRequests.length})
              </h2>
              <div className="space-y-3">
                {approvedRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{request.requesterName}</h3>
                        <p className="text-sm text-gray-600">
                          انضم إلى {request.familyName} • منذ {getDaysSinceRequest(request.requestDate)} يوم
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {joinRequests.length === 0 && (
            <Card>
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">لا توجد طلبات انضمام</p>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Key className="w-6 h-6 ml-2 text-blue-600" />
            رموز الدعوة للعائلات
          </h2>
          <div className="space-y-4">
            {mockFamilies.map((family) => {
              const code = familyCodes.get(family.id) || '';
              const isCopied = copiedCode === code;

              return (
                <div
                  key={family.id}
                  className="bg-blue-50 border border-blue-200 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 space-x-reverse flex-1">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{family.familyName}</h3>
                        <p className="text-sm text-gray-600">
                          {family.membersCount} أفراد • رب الأسرة: {family.headName}
                        </p>
                        <div className="mt-2 flex items-center space-x-2 space-x-reverse">
                          <span className="text-sm text-gray-600">رمز الانضمام:</span>
                          <code className="bg-white border border-blue-300 px-3 py-1 rounded-lg font-mono font-bold text-blue-700">
                            {code}
                          </code>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 space-x-reverse mr-4">
                      <Button
                        size="sm"
                        variant={isCopied ? 'success' : 'outline'}
                        icon={isCopied ? Check : Copy}
                        iconPosition="right"
                        onClick={() => handleCopyCode(code)}
                      >
                        {isCopied ? 'تم النسخ' : 'نسخ'}
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        icon={RefreshCw}
                        iconPosition="right"
                        onClick={() => handleGenerateNewCode(family.id)}
                      >
                        رمز جديد
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start space-x-3 space-x-reverse">
              <Key className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">كيفية استخدام رموز الدعوة</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• يمكن لأفراد العائلة استخدام رمز الدعوة للانضمام إلى عائلتهم</li>
                  <li>• كل رمز فريد ومرتبط بعائلة واحدة فقط</li>
                  <li>• يمكن إنشاء رمز جديد في أي وقت لأسباب أمنية</li>
                  <li>• الرمز القديم يتوقف عن العمل عند إنشاء رمز جديد</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
