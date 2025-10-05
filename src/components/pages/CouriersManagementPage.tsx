import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Filter, MapPin, Phone, Star, TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle, Eye, CreditCard as Edit, Trash2, Navigation, Battery, Signal } from 'lucide-react';
import { Card, Button, Badge } from '../ui';
import { couriersService } from '../../services/supabaseService';

interface Courier {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'active' | 'busy' | 'offline';
  rating: number;
  completedTasks: number;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  isHumanitarianApproved: boolean;
}

export default function CouriersManagementPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'busy' | 'offline'>('all');
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view');

  useEffect(() => {
    loadCouriers();
  }, []);

  const loadCouriers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await couriersService.getAllWithPerformance();
      setCouriers(data);
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل بيانات المندوبين');
      console.error('Error loading couriers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCouriers = couriers.filter(courier => {
    const matchesSearch = courier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         courier.phone.includes(searchTerm) ||
                         courier.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || courier.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: couriers.length,
    active: couriers.filter(c => c.status === 'active').length,
    busy: couriers.filter(c => c.status === 'busy').length,
    offline: couriers.filter(c => c.status === 'offline').length,
    approved: couriers.filter(c => c.isHumanitarianApproved).length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" size="sm">متاح</Badge>;
      case 'busy':
        return <Badge variant="warning" size="sm">مشغول</Badge>;
      case 'offline':
        return <Badge variant="default" size="sm">غير متصل</Badge>;
      default:
        return <Badge variant="default" size="sm">{status}</Badge>;
    }
  };

  const handleAddCourier = () => {
    setModalType('add');
    setSelectedCourier(null);
    setShowModal(true);
  };

  const handleEditCourier = (courier: Courier) => {
    setModalType('edit');
    setSelectedCourier(courier);
    setShowModal(true);
  };

  const handleViewCourier = (courier: Courier) => {
    setModalType('view');
    setSelectedCourier(courier);
    setShowModal(true);
  };

  const handleDeleteCourier = async (courierId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المندوب؟')) return;

    try {
      setCouriers(couriers.filter(c => c.id !== courierId));
    } catch (err: any) {
      alert('فشل في حذف المندوب: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات المندوبين...</p>
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
        <Button variant="primary" size="sm" onClick={loadCouriers} className="mt-4">
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium mb-1">إجمالي المندوبين</p>
              <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-blue-700" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium mb-1">متاحون الآن</p>
              <p className="text-3xl font-bold text-green-900">{stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-700" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium mb-1">مشغولون</p>
              <p className="text-3xl font-bold text-orange-900">{stats.busy}</p>
            </div>
            <div className="w-12 h-12 bg-orange-200 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-700" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">غير متصلين</p>
              <p className="text-3xl font-bold text-gray-900">{stats.offline}</p>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
              <XCircle className="w-6 h-6 text-gray-700" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium mb-1">معتمدون إنسانياً</p>
              <p className="text-3xl font-bold text-purple-900">{stats.approved}</p>
            </div>
            <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-purple-700" />
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
                placeholder="البحث عن مندوب (الاسم، الهاتف، البريد)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="flex items-center space-x-2 space-x-reverse bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'active'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                متاح
              </button>
              <button
                onClick={() => setStatusFilter('busy')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'busy'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                مشغول
              </button>
              <button
                onClick={() => setStatusFilter('offline')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'offline'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                غير متصل
              </button>
            </div>

            <Button variant="primary" onClick={handleAddCourier}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة مندوب
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">المندوب</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">التواصل</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">الحالة</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">التقييم</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">المهام المكتملة</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">الموقع</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredCouriers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="text-gray-400">
                      <Truck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">لا يوجد مندوبون</p>
                      <p className="text-sm mt-2">قم بإضافة مندوب جديد للبدء</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCouriers.map((courier) => (
                  <tr key={courier.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Truck className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{courier.name}</p>
                          {courier.isHumanitarianApproved && (
                            <span className="inline-flex items-center text-xs text-purple-600">
                              <Star className="w-3 h-3 ml-1" />
                              معتمد إنسانياً
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        <div className="flex items-center space-x-2 space-x-reverse text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span dir="ltr">{courier.phone}</span>
                        </div>
                        <p className="text-gray-500 mt-1">{courier.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(courier.status)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-1 space-x-reverse">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium text-gray-900">{courier.rating.toFixed(1)}</span>
                        <span className="text-gray-500 text-sm">/5</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-gray-900">{courier.completedTasks}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {courier.currentLocation ? (
                        <button
                          onClick={() => handleViewCourier(courier)}
                          className="flex items-center space-x-1 space-x-reverse text-blue-600 hover:text-blue-700"
                        >
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">عرض الموقع</span>
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">غير متاح</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => handleViewCourier(courier)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditCourier(courier)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourier(courier.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
