import { supabase } from '../../lib/supabaseClient';

export interface Notification {
  id: string;
  recipient_id: string;
  recipient_type: string;
  title: string;
  message: string;
  type: 'otp' | 'delivery' | 'approval' | 'update' | 'alert';
  priority: 'low' | 'normal' | 'high' | 'critical';
  delivery_method: 'sms' | 'whatsapp' | 'in_app';
  delivery_status: 'pending' | 'sent' | 'delivered' | 'failed';
  is_read: boolean;
  read_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_reason: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export class NotificationService {
  static async createNotification(
    recipientId: string,
    recipientType: string,
    title: string,
    message: string,
    type: 'otp' | 'delivery' | 'approval' | 'update' | 'alert',
    deliveryMethod: 'sms' | 'whatsapp' | 'in_app' = 'in_app',
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal',
    metadata?: Record<string, any>
  ): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: recipientId,
        recipient_type: recipientType,
        title,
        message,
        type,
        priority,
        delivery_method: deliveryMethod,
        delivery_status: 'pending',
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      throw new Error('فشل في إنشاء الإشعار: ' + error.message);
    }

    if (deliveryMethod === 'in_app') {
      await this.markAsSent(data.id);
    }

    console.log('[Notification] Created:', type, 'for', recipientType, recipientId);
    return data as Notification;
  }

  static async getNotifications(
    recipientId: string,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error('فشل في جلب الإشعارات: ' + error.message);
    }

    return (data as Notification[]) || [];
  }

  static async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  static async markAllAsRead(recipientId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('recipient_id', recipientId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  static async markAsSent(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        delivery_status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as sent:', error);
    }
  }

  static async markAsDelivered(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        delivery_status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as delivered:', error);
    }
  }

  static async markAsFailed(notificationId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        delivery_status: 'failed',
        failed_reason: reason,
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as failed:', error);
    }
  }

  static async getUnreadCount(recipientId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', recipientId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  }

  static async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      throw new Error('فشل في حذف الإشعار: ' + error.message);
    }
  }

  static async sendOTPNotification(
    phone: string,
    code: string,
    userId: string,
    userType: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      userType,
      'رمز التحقق OTP',
      `رمز التحقق الخاص بك هو: ${code}. صالح لمدة 10 دقائق.`,
      'otp',
      'sms',
      'high',
      { phone, code }
    );

    console.log(`[SMS Mock] Sending OTP ${code} to ${phone}`);
  }

  static async sendDeliveryNotification(
    beneficiaryId: string,
    packageName: string,
    deliveryDate: string
  ): Promise<void> {
    await this.createNotification(
      beneficiaryId,
      'beneficiary',
      'تم تسليم الطرد',
      `تم تسليم طرد "${packageName}" بنجاح في ${new Date(deliveryDate).toLocaleDateString('ar')}`,
      'delivery',
      'in_app',
      'normal',
      { packageName, deliveryDate }
    );
  }

  static async sendApprovalNotification(
    userId: string,
    userType: string,
    fieldName: string,
    approved: boolean,
    reason?: string
  ): Promise<void> {
    const title = approved ? 'تمت الموافقة على التعديل' : 'تم رفض التعديل';
    const message = approved
      ? `تمت الموافقة على تعديل حقل "${fieldName}"`
      : `تم رفض تعديل حقل "${fieldName}". السبب: ${reason || 'غير محدد'}`;

    await this.createNotification(
      userId,
      userType,
      title,
      message,
      'approval',
      'in_app',
      'high',
      { fieldName, approved, reason }
    );
  }

  static async sendUpdateNotification(
    userId: string,
    userType: string,
    message: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      userType,
      'تحديث في النظام',
      message,
      'update',
      'in_app',
      'normal'
    );
  }

  static async sendAlertNotification(
    userId: string,
    userType: string,
    title: string,
    message: string,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<void> {
    await this.createNotification(
      userId,
      userType,
      title,
      message,
      'alert',
      'in_app',
      priority
    );
  }

  static getPriorityColor(priority: 'low' | 'normal' | 'high' | 'critical'): string {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'normal':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  static getTypeIcon(type: 'otp' | 'delivery' | 'approval' | 'update' | 'alert'): string {
    switch (type) {
      case 'otp':
        return 'shield';
      case 'delivery':
        return 'package';
      case 'approval':
        return 'check-circle';
      case 'update':
        return 'info';
      case 'alert':
        return 'alert-triangle';
      default:
        return 'bell';
    }
  }

  static formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;

    return date.toLocaleDateString('ar');
  }
}
