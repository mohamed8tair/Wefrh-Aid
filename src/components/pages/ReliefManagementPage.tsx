import React, { useState, useEffect } from 'react';
import { Package, Calendar, Users, TrendingUp, Filter, Download, Search, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, Button, Input, Badge } from '../ui';
import { ReliefService } from '../../services/relief/reliefService';
import { mockBeneficiaries } from '../../data/mockData';

export default function ReliefManagementPage() {
  const [filterStatus, setFilterStatus] = useState<'all' | 'never' | 'recent' | 'medium' | 'old'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [beneficiariesWithRelief, setBeneficiariesWithRelief] = useState<any[]>([]);

  useEffect(() => {
    loadBeneficiariesWithReliefStatus();
  }, [filterStatus]);

  const loadBeneficiariesWithReliefStatus = () => {
    const beneficiariesData = mockBeneficiaries.map(beneficiary => {
      const reliefStatus = ReliefService.getReliefStatus(beneficiary.id);
      return {
        ...beneficiary,
        reliefStatus
      };
    });

    if (filterStatus === 'all') {
      setBeneficiariesWithRelief(beneficiariesData);
    } else {
      const filtered = beneficiariesData.filter(b => b.reliefStatus.status === filterStatus);
      setBeneficiariesWithRelief(filtered);
    }
  };

  const filteredBeneficiaries = beneficiariesWithRelief.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.nationalId.includes(searchQuery)
  );

  const stats = {
    total: mockBeneficiaries.length,
    never: beneficiariesWithRelief.filter(b => b.reliefStatus.status === 'never').length,
    recent: beneficiariesWithRelief.filter(b => b.reliefStatus.status === 'recent').length,
    medium: beneficiariesWithRelief.filter(b => b.reliefStatus.status === 'medium').length,
    old: beneficiariesWithRelief.filter(b => b.reliefStatus.status === 'old').length,
  };

  const getStatusColor = (status: string) => {
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
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'never':
        return 'لم يستلم مساعدات';
      case 'old':
        return 'لم يستلم منذ فترة طويلة';
      case 'medium':
        return 'لم يستلم منذ فترة متوسطة';
      case 'recent':
        return 'استلم مؤخراً';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'never':
        return <XCircle className="w-4 h-4" />;
      case 'old':
        return <AlertCircle className="w-4 h-4" />;
      case 'medium':
        return <Clock className="w-4 h-4" />;
      case 'recent':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'text-red-600';
    if (priority >= 5) return 'text-orange-600';
    if (priority >= 3) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إدارة المساعدات</h1>
          <p className="text-gray-600 mt-2">تتبع وإدارة توزيع المساعدات على المستفيدين</p>
        </div>
        <Button icon={Download} iconPosition="right" variant="primary">
          تصدير التقرير
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card padding="sm" className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilterStatus('all')}>
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">إجمالي المستفيدين</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm" className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilterStatus('never')}>
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-red-100 p-3 rounded-xl">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">لم يستلموا مساعدات</p>
              <p className="text-2xl font-bold text-gray-900">{stats.never}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm" className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilterStatus('old')}>
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-orange-100 p-3 rounded-xl">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">منذ فترة طويلة</p>
              <p className="text-2xl font-bold text-gray-900">{stats.old}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm" className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilterStatus('medium')}>
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-yellow-100 p-3 rounded-xl">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">منذ فترة متوسطة</p>
              <p className="text-2xl font-bold text-gray-900">{stats.medium}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm" className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilterStatus('recent')}>
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="bg-green-100 p-3 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">استلموا مؤخراً</p>
              <p className="text-2xl font-bold text-gray-900">{stats.recent}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Package className="w-6 h-6 ml-2 text-blue-600" />
            قائمة المستفيدين وحالة المساعدات
          </h2>
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="بحث بالاسم أو رقم الهوية..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 pl-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
          </div>
        </div>

        {filterStatus !== 'all' && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Filter className="w-5 h-5 text-blue-600" />
              <span className="text-blue-800">تصفية: {getStatusLabel(filterStatus)}</span>
            </div>
            <button
              onClick={() => setFilterStatus('all')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              إلغاء التصفية
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">المستفيد</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">رقم الهوية</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الحالة</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">عدد المساعدات</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">آخر مساعدة</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الأولوية</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBeneficiaries.map((beneficiary) => (
                <tr key={beneficiary.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {beneficiary.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{beneficiary.name}</p>
                        <p className="text-sm text-gray-500">{beneficiary.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{beneficiary.nationalId}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(beneficiary.reliefStatus.status)}`}>
                      {getStatusIcon(beneficiary.reliefStatus.status)}
                      <span className="mr-1">{getStatusLabel(beneficiary.reliefStatus.status)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900 font-semibold">{beneficiary.reliefStatus.totalReceived}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-700">
                      {beneficiary.reliefStatus.lastReceived
                        ? new Date(beneficiary.reliefStatus.lastReceived).toLocaleDateString('ar')
                        : 'لم يستلم'}
                    </span>
                    {beneficiary.reliefStatus.daysSinceLastRelief !== null && (
                      <p className="text-sm text-gray-500">
                        ({beneficiary.reliefStatus.daysSinceLastRelief} يوم)
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <TrendingUp className={`w-4 h-4 ${getPriorityColor(beneficiary.reliefStatus.priorityScore)}`} />
                      <span className={`font-semibold ${getPriorityColor(beneficiary.reliefStatus.priorityScore)}`}>
                        {beneficiary.reliefStatus.priorityScore}/10
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Button size="sm" variant="primary">
                      توزيع مساعدة
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredBeneficiaries.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">لا توجد نتائج</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start space-x-3 space-x-reverse">
          <div className="bg-blue-100 p-3 rounded-xl">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-2">نظام الأولوية الذكي</h3>
            <p className="text-blue-700 text-sm leading-relaxed">
              يتم حساب الأولوية تلقائياً بناءً على عدة عوامل: عدد أيام منذ آخر مساعدة، عدد المساعدات المستلمة،
              والحالة الاقتصادية للمستفيد. المستفيدون ذوو الأولوية العالية (8-10) يحتاجون إلى مساعدات عاجلة.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
