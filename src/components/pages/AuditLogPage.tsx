import React, { useState, useEffect } from 'react';
import { Activity, Search, Filter, Calendar, User, FileText, Eye, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, Button, Badge } from '../ui';
import { activityLogService } from '../../services/supabaseService';

interface AuditLog {
  id: string;
  action: string;
  user: string;
  role: string;
  timestamp: string;
  type: 'create' | 'verify' | 'approve' | 'update' | 'deliver' | 'review';
  beneficiaryId?: string;
  details?: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await activityLogService.getAll();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل سجل المراجعة');
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'all' || log.type === typeFilter;

    let matchesDate = true;
    if (dateRange !== 'all') {
      const logDate = new Date(log.timestamp);
      const now = new Date();
      const diffTime = now.getTime() - logDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (dateRange === 'today' && diffDays > 1) matchesDate = false;
      if (dateRange === 'week' && diffDays > 7) matchesDate = false;
      if (dateRange === 'month' && diffDays > 30) matchesDate = false;
    }

    return matchesSearch && matchesType && matchesDate;
  });

  const stats = {
    total: logs.length,
    today: logs.filter(l => {
      const logDate = new Date(l.timestamp);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    }).length,
    thisWeek: logs.filter(l => {
      const logDate = new Date(l.timestamp);
      const now = new Date();
      const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    }).length,
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'create':
        return <Badge variant="success" size="sm">إنشاء</Badge>;
      case 'update':
        return <Badge variant="warning" size="sm">تحديث</Badge>;
      case 'verify':
        return <Badge variant="info" size="sm">توثيق</Badge>;
      case 'approve':
        return <Badge variant="success" size="sm">موافقة</Badge>;
      case 'deliver':
        return <Badge variant="info" size="sm">تسليم</Badge>;
      case 'review':
        return <Badge variant="warning" size="sm">مراجعة</Badge>;
      default:
        return <Badge variant="default" size="sm">{type}</Badge>;
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل سجل المراجعة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center space-x-3 space-x-reverse text-red-800">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <p className="font-medium">حدث خطأ في تحميل البيانات</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={loadLogs} className="mt-4">
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium mb-1">إجمالي العمليات</p>
              <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-700" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium mb-1">عمليات اليوم</p>
              <p className="text-3xl font-bold text-green-900">{stats.today}</p>
            </div>
            <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-700" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium mb-1">عمليات الأسبوع</p>
              <p className="text-3xl font-bold text-purple-900">{stats.thisWeek}</p>
            </div>
            <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-700" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="البحث في السجل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 space-x-reverse">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">جميع الأنواع</option>
              <option value="create">إنشاء</option>
              <option value="update">تحديث</option>
              <option value="verify">توثيق</option>
              <option value="approve">موافقة</option>
              <option value="deliver">تسليم</option>
              <option value="review">مراجعة</option>
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">كل الفترات</option>
              <option value="today">اليوم</option>
              <option value="week">آخر أسبوع</option>
              <option value="month">آخر شهر</option>
            </select>

            <Button variant="ghost" onClick={loadLogs}>
              <RefreshCw className="w-4 h-4 ml-2" />
              تحديث
            </Button>

            <Button variant="primary" onClick={exportLogs}>
              <Download className="w-4 h-4 ml-2" />
              تصدير
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">التاريخ والوقت</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">النوع</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">الإجراء</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">المستخدم</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">الدور</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="text-gray-400">
                      <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">لا توجد سجلات</p>
                      <p className="text-sm mt-2">جرب تغيير الفلاتر أو البحث</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(log.timestamp)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {getTypeBadge(log.type)}
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-900">{log.action}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-900">{log.user}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{log.role}</span>
                    </td>
                    <td className="py-4 px-4">
                      {log.details ? (
                        <p className="text-sm text-gray-600 max-w-xs truncate" title={log.details}>
                          {log.details}
                        </p>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredLogs.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <p>عرض {filteredLogs.length} من {logs.length} عملية</p>
          </div>
        )}
      </Card>
    </div>
  );
}
