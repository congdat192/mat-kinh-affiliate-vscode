import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  DollarSign,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Settings,
  Filter,
  Megaphone,
  CreditCard,
  X,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';

// Notification types
type NotificationType = 'referral' | 'commission' | 'withdrawal' | 'announcement' | 'alert' | 'system';
type NotificationFilter = 'all' | 'unread' | 'read';

interface NotificationContent {
  title: string;
  message: string;
  [key: string]: unknown;
}

interface Notification {
  id: string;
  type: NotificationType;
  content: NotificationContent;
  is_read: boolean;
  created_at: string;
}

// Format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} tuần trước`;
  return date.toLocaleDateString('vi-VN');
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [visibleCount, setVisibleCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Get F0 user from localStorage
  const getF0User = () => {
    const stored = localStorage.getItem('f0_user');
    return stored ? JSON.parse(stored) : null;
  };

  // Fetch notifications from Edge Function
  const fetchNotifications = useCallback(async (showRefreshing = false) => {
    const f0User = getF0User();
    if (!f0User?.id) {
      setLoading(false);
      return;
    }

    if (showRefreshing) {
      setRefreshing(true);
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-notifications`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: 'get',
            f0_id: f0User.id,
            filter: filter === 'all' ? undefined : filter,
            limit: 100,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setNotifications(data.data || []);
      } else {
        console.error('Failed to fetch notifications:', data.error);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Get notification icon and color based on type
  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case 'referral':
        return {
          icon: UserPlus,
          bgColor: 'bg-green-50',
          iconColor: 'text-green-600',
          borderColor: 'border-green-200',
        };
      case 'commission':
        return {
          icon: DollarSign,
          bgColor: 'bg-blue-50',
          iconColor: 'text-blue-600',
          borderColor: 'border-blue-200',
        };
      case 'withdrawal':
        return {
          icon: CreditCard,
          bgColor: 'bg-purple-50',
          iconColor: 'text-purple-600',
          borderColor: 'border-purple-200',
        };
      case 'announcement':
        return {
          icon: Megaphone,
          bgColor: 'bg-yellow-50',
          iconColor: 'text-yellow-600',
          borderColor: 'border-yellow-200',
        };
      case 'alert':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-50',
          iconColor: 'text-red-600',
          borderColor: 'border-red-200',
        };
      case 'system':
      default:
        return {
          icon: Bell,
          bgColor: 'bg-gray-50',
          iconColor: 'text-gray-600',
          borderColor: 'border-gray-200',
        };
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    const f0User = getF0User();
    if (!f0User?.id) return;

    setActionLoading('mark_all');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-notifications`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: 'mark_all_read',
            f0_id: f0User.id,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
        toast.success('Đã đánh dấu tất cả thông báo đã đọc', 'Thành công');
      } else {
        toast.error(data.error || 'Không thể đánh dấu đã đọc', 'Lỗi');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Có lỗi xảy ra khi đánh dấu đã đọc', 'Lỗi');
    } finally {
      setActionLoading(null);
    }
  };

  // Mark single notification as read
  const handleMarkAsRead = async (id: string) => {
    const f0User = getF0User();
    if (!f0User?.id) return;

    const notification = notifications.find((n) => n.id === id);
    if (notification?.is_read) return; // Already read

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-notifications`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: 'mark_read',
            f0_id: f0User.id,
            notification_id: id,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setNotifications(
          notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Delete notification
  const handleDeleteNotification = async (id: string) => {
    const f0User = getF0User();
    if (!f0User?.id) return;

    setActionLoading(id);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-notifications`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: 'delete',
            f0_id: f0User.id,
            notification_id: id,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setNotifications(notifications.filter((n) => n.id !== id));
        toast.success('Thông báo đã được xóa', 'Đã xóa');
      } else {
        toast.error(data.error || 'Không thể xóa thông báo', 'Lỗi');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Có lỗi xảy ra khi xóa thông báo', 'Lỗi');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter notifications (client-side for "read" filter since API handles "unread")
  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  // Get visible notifications
  const visibleNotifications = filteredNotifications.slice(0, visibleCount);

  // Load more
  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 10);
  };

  // Count unread
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              Thông Báo
              {unreadCount > 0 && (
                <Badge variant="danger" className="text-sm">
                  {unreadCount} mới
                </Badge>
              )}
            </h1>
            <p className="text-gray-500 mt-1">
              Theo dõi các hoạt động và cập nhật quan trọng
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNotifications(true)}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>

        {/* Action Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0 || actionLoading === 'mark_all'}
                  className="flex items-center gap-2"
                >
                  {actionLoading === 'mark_all' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Đánh dấu tất cả đã đọc
                </Button>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as NotificationFilter)}
                    className="w-[140px] h-9"
                  >
                    <option value="all">Tất cả</option>
                    <option value="unread">Chưa đọc</option>
                    <option value="read">Đã đọc</option>
                  </Select>
                </div>
              </div>

              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Cài đặt thông báo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          // Empty State
          <Card>
            <CardContent className="p-12 text-center">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Không có thông báo
              </h3>
              <p className="text-gray-500">
                {filter === 'unread'
                  ? 'Bạn đã đọc tất cả thông báo'
                  : filter === 'read'
                  ? 'Chưa có thông báo đã đọc'
                  : 'Bạn chưa có thông báo nào'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {visibleNotifications.map((notification) => {
              const style = getNotificationStyle(notification.type);
              const Icon = style.icon;
              const isDeleting = actionLoading === notification.id;

              return (
                <Card
                  key={notification.id}
                  className={`transition-all hover:shadow-md cursor-pointer ${
                    !notification.is_read ? 'border-l-4 border-l-primary-500' : ''
                  } ${isDeleting ? 'opacity-50' : ''}`}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`${style.bgColor} p-3 rounded-lg flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${style.iconColor}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3
                                className={`font-semibold ${
                                  !notification.is_read
                                    ? 'text-gray-900'
                                    : 'text-gray-700'
                                }`}
                              >
                                {notification.content.title}
                              </h3>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {notification.content.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              {formatRelativeTime(notification.created_at)}
                            </p>
                          </div>

                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(notification.id);
                            }}
                            disabled={isDeleting}
                            className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Load More Button */}
            {visibleCount < filteredNotifications.length && (
              <div className="text-center pt-4">
                <Button variant="outline" onClick={handleLoadMore}>
                  Xem thêm thông báo ({filteredNotifications.length - visibleCount} còn
                  lại)
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Notification Stats */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="bg-green-50 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <UserPlus className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-xs text-gray-600">Giới thiệu</p>
                <p className="text-lg font-bold text-gray-900">
                  {notifications.filter((n) => n.type === 'referral').length}
                </p>
              </div>

              <div className="text-center">
                <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-xs text-gray-600">Hoa hồng</p>
                <p className="text-lg font-bold text-gray-900">
                  {notifications.filter((n) => n.type === 'commission').length}
                </p>
              </div>

              <div className="text-center">
                <div className="bg-purple-50 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-xs text-gray-600">Rút tiền</p>
                <p className="text-lg font-bold text-gray-900">
                  {notifications.filter((n) => n.type === 'withdrawal').length}
                </p>
              </div>

              <div className="text-center">
                <div className="bg-yellow-50 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Megaphone className="w-6 h-6 text-yellow-600" />
                </div>
                <p className="text-xs text-gray-600">Thông báo</p>
                <p className="text-lg font-bold text-gray-900">
                  {notifications.filter((n) => n.type === 'announcement').length}
                </p>
              </div>

              <div className="text-center">
                <div className="bg-red-50 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-xs text-gray-600">Cảnh báo</p>
                <p className="text-lg font-bold text-gray-900">
                  {notifications.filter((n) => n.type === 'alert').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationsPage;
