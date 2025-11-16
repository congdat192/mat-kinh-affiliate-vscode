import { useState } from 'react';
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
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';

// Notification types
type NotificationType = 'referral' | 'commission' | 'withdrawal' | 'announcement' | 'alert';
type NotificationFilter = 'all' | 'unread' | 'read';

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: 1,
    type: 'referral',
    title: 'Khách hàng mới đã đăng ký',
    description: 'Nguyễn Văn B đã đăng ký thành công qua link giới thiệu của bạn',
    timestamp: '2 giờ trước',
    read: false,
  },
  {
    id: 2,
    type: 'commission',
    title: 'Bạn đã nhận hoa hồng',
    description: 'Nhận 450.000đ hoa hồng từ đơn hàng #DH12345',
    timestamp: '5 giờ trước',
    read: false,
  },
  {
    id: 3,
    type: 'withdrawal',
    title: 'Yêu cầu rút tiền đã được xử lý',
    description: 'Số tiền 5.000.000đ đã được chuyển vào tài khoản ngân hàng của bạn',
    timestamp: '1 ngày trước',
    read: false,
  },
  {
    id: 4,
    type: 'announcement',
    title: 'Thông báo: Chương trình khuyến mãi mới',
    description:
      'Tham gia chương trình "Giới thiệu bạn bè - Nhận quà liền tay" để nhận thêm hoa hồng',
    timestamp: '1 ngày trước',
    read: true,
  },
  {
    id: 5,
    type: 'referral',
    title: 'Khách hàng hoàn tất đơn hàng đầu tiên',
    description: 'Trần Thị C đã hoàn tất đơn hàng đầu tiên. Hoa hồng sẽ được tính sau 3 ngày',
    timestamp: '2 ngày trước',
    read: true,
  },
  {
    id: 6,
    type: 'commission',
    title: 'Hoa hồng đã được duyệt',
    description: 'Hoa hồng 380.000đ từ đơn hàng #DH12344 đã được duyệt và cộng vào số dư',
    timestamp: '2 ngày trước',
    read: true,
  },
  {
    id: 7,
    type: 'alert',
    title: 'Cập nhật thông tin ngân hàng',
    description: 'Vui lòng cập nhật thông tin ngân hàng để tiếp tục nhận thanh toán',
    timestamp: '3 ngày trước',
    read: true,
  },
  {
    id: 8,
    type: 'referral',
    title: 'Link giới thiệu được truy cập',
    description: '15 người đã truy cập link giới thiệu của bạn trong 24 giờ qua',
    timestamp: '3 ngày trước',
    read: true,
  },
  {
    id: 9,
    type: 'announcement',
    title: 'Cập nhật chính sách hoa hồng',
    description:
      'Chính sách hoa hồng mới có hiệu lực từ ngày 01/12/2025. Xem chi tiết trong mục Chính sách',
    timestamp: '4 ngày trước',
    read: true,
  },
  {
    id: 10,
    type: 'commission',
    title: 'Thưởng đạt mốc doanh số',
    description: 'Chúc mừng! Bạn nhận thêm 1.000.000đ khi đạt 20 đơn hàng thành công',
    timestamp: '5 ngày trước',
    read: true,
  },
  {
    id: 11,
    type: 'withdrawal',
    title: 'Yêu cầu rút tiền đang được xử lý',
    description: 'Yêu cầu rút 3.000.000đ đang được xử lý. Dự kiến hoàn tất trong 1-2 ngày làm việc',
    timestamp: '6 ngày trước',
    read: true,
  },
  {
    id: 12,
    type: 'alert',
    title: 'Đăng nhập từ thiết bị mới',
    description: 'Tài khoản của bạn vừa được đăng nhập từ Chrome on Windows tại TP.HCM',
    timestamp: '1 tuần trước',
    read: true,
  },
];

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [visibleCount, setVisibleCount] = useState(8);

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
  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  // Mark single notification as read
  const handleMarkAsRead = (id: number) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // Delete notification
  const handleDeleteNotification = (id: number) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  // Get visible notifications
  const visibleNotifications = filteredNotifications.slice(0, visibleCount);

  // Load more
  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 8);
  };

  // Count unread
  const unreadCount = notifications.filter((n) => !n.read).length;

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
                  disabled={unreadCount === 0}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
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
                  : 'Bạn chưa có thông báo nào'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {visibleNotifications.map((notification) => {
              const style = getNotificationStyle(notification.type);
              const Icon = style.icon;

              return (
                <Card
                  key={notification.id}
                  className={`transition-all hover:shadow-md cursor-pointer ${
                    !notification.read ? 'border-l-4 border-l-primary-500' : ''
                  }`}
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
                                  !notification.read
                                    ? 'text-gray-900'
                                    : 'text-gray-700'
                                }`}
                              >
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {notification.description}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              {notification.timestamp}
                            </p>
                          </div>

                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(notification.id);
                            }}
                            className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
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
