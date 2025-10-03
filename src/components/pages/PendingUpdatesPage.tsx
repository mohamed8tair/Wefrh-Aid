import React, { useState, useEffect } from 'react';
import { Card, Button, Modal } from '../ui';
import { PriorityService, type PendingUpdate } from '../../services/priority/priorityService';
import { useAuth } from '../../context/AuthContext';
import { Clock, CheckCircle, XCircle, AlertTriangle, User, Calendar, Shield, RefreshCw } from 'lucide-react';

export default function PendingUpdatesPage() {
  const { loggedInUser } = useAuth();
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUpdate, setSelectedUpdate] = useState<any | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPendingUpdates();
  }, []);

  const fetchPendingUpdates = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await PriorityService.getAllPendingUpdatesWithDetails();
      setUpdates(data);
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل التعديلات المعلقة');
      console.error('Error fetching pending updates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (updateId: string) => {
    if (!loggedInUser?.id) return;

    setActionLoading(true);
    try {
      await PriorityService.approvePendingUpdate(updateId, loggedInUser.id);
      await fetchPendingUpdates();
      alert('تمت الموافقة على التعديل بنجاح');
    } catch (err: any) {
      alert('فشل في الموافقة على التعديل: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUpdate || !loggedInUser?.id || !rejectionReason.trim()) {
      alert('يرجى إدخال سبب الرفض');
      return;
    }

    setActionLoading(true);
    try {
      await PriorityService.rejectPendingUpdate(
        selectedUpdate.id,
        loggedInUser.id,
        rejectionReason
      );
      await fetchPendingUpdates();
      setShowRejectModal(false);
      setSelectedUpdate(null);
      setRejectionReason('');
      alert('تم رفض التعديل');
    } catch (err: any) {
      alert('فشل في رفض التعديل: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (update: any) => {
    setSelectedUpdate(update);
    setShowRejectModal(true);
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 ml-3" />
          <span className="text-gray-600">جاري تحميل التعديلات المعلقة...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <div className="flex items-center space-x-3 space-x-reverse text-red-800">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </Card>
    );
  }

  if (updates.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد تعديلات معلقة</h3>
          <p className="text-gray-600">جميع التعديلات تمت معالجتها</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">التعديلات المعلقة</h2>
          <p className="text-gray-600 mt-1">
            {updates.length} تعديل بانتظار المراجعة
          </p>
        </div>
        <Button
          onClick={fetchPendingUpdates}
          variant="outline"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      <div className="grid gap-4">
        {updates.map((update) => (
          <Card key={update.id} className="hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 space-x-reverse mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {PriorityService.getFieldDisplayName(update.field_name)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        مستفيد: {update.beneficiaries?.name || 'غير معروف'}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs text-red-600 font-medium mb-1">القيمة الحالية</p>
                      <p className="text-sm text-red-900 font-mono">
                        {PriorityService.getFieldDisplayValue(
                          update.field_name,
                          update.current_value
                        )}
                      </p>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs text-green-600 font-medium mb-1">القيمة المقترحة</p>
                      <p className="text-sm text-green-900 font-mono">
                        {PriorityService.getFieldDisplayValue(
                          update.field_name,
                          update.proposed_value
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 space-x-reverse mt-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <User className="w-4 h-4" />
                      <span>
                        {update.proposed_by_name || 'غير معروف'} ({update.proposed_by_type})
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(update.created_at).toLocaleDateString('ar')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Clock className="w-4 h-4" />
                      <span>
                        منذ {Math.floor((Date.now() - new Date(update.created_at).getTime()) / (1000 * 60 * 60 * 24))} يوم
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-200">
                <Button
                  onClick={() => handleApprove(update.id)}
                  disabled={actionLoading}
                  variant="primary"
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 ml-2" />
                  موافقة
                </Button>
                <Button
                  onClick={() => openRejectModal(update)}
                  disabled={actionLoading}
                  variant="danger"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 ml-2" />
                  رفض
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedUpdate(null);
          setRejectionReason('');
        }}
        title="رفض التعديل"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            هل أنت متأكد من رفض هذا التعديل؟ يرجى تقديم سبب الرفض.
          </p>

          {selectedUpdate && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900 mb-1">
                {PriorityService.getFieldDisplayName(selectedUpdate.field_name)}
              </p>
              <p className="text-xs text-gray-600">
                {selectedUpdate.beneficiaries?.name}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              سبب الرفض *
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="أدخل سبب رفض هذا التعديل..."
              disabled={actionLoading}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason.trim()}
              variant="danger"
              className="flex-1"
            >
              {actionLoading ? 'جاري الرفض...' : 'تأكيد الرفض'}
            </Button>
            <Button
              onClick={() => {
                setShowRejectModal(false);
                setSelectedUpdate(null);
                setRejectionReason('');
              }}
              disabled={actionLoading}
              variant="outline"
            >
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
