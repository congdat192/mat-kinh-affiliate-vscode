import { useState } from 'react';
import {
  Link as LinkIcon,
  Copy,
  QrCode,
  Facebook,
  Mail,
  MessageCircle,
  Check,
  Calendar,
  TrendingUp,
  Eye,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Mock data for recently created links
const mockRecentLinks = [
  {
    id: 1,
    name: 'Chiến dịch Tết 2025',
    link: 'https://matkinhaffiliate.vn/ref/tet2025',
    code: 'tet2025',
    createdDate: '2025-11-15',
    clicks: 234,
    conversions: 12,
    status: 'active',
  },
  {
    id: 2,
    name: 'Khuyến mãi Black Friday',
    link: 'https://matkinhaffiliate.vn/ref/blackfriday',
    code: 'blackfriday',
    createdDate: '2025-11-10',
    clicks: 456,
    conversions: 28,
    status: 'active',
  },
  {
    id: 3,
    name: 'Giới thiệu bạn bè',
    link: 'https://matkinhaffiliate.vn/ref/friends2024',
    code: 'friends2024',
    createdDate: '2025-11-05',
    clicks: 189,
    conversions: 9,
    status: 'expired',
  },
  {
    id: 4,
    name: 'Ưu đãi sinh viên',
    link: 'https://matkinhaffiliate.vn/ref/student',
    code: 'student',
    createdDate: '2025-11-01',
    clicks: 567,
    conversions: 34,
    status: 'active',
  },
  {
    id: 5,
    name: 'Khám mắt miễn phí',
    link: 'https://matkinhaffiliate.vn/ref/freeeye',
    code: 'freeeye',
    createdDate: '2025-10-28',
    clicks: 823,
    conversions: 67,
    status: 'active',
  },
];

const CreateReferralLinkPage = () => {
  const [campaignName, setCampaignName] = useState('');
  const [linkCode, setLinkCode] = useState('');
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Generate random code
  const generateRandomCode = () => {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  // Handle form submission
  const handleCreateLink = async () => {
    if (!campaignName.trim()) {
      return;
    }

    setIsCreating(true);
    setShowSuccess(false);

    // Simulate API call
    setTimeout(() => {
      const code = linkCode.trim() || generateRandomCode();
      const link = `https://matkinhaffiliate.vn/ref/${code}`;
      setGeneratedLink(link);
      setIsCreating(false);
      setShowSuccess(true);

      // Reset form
      setCampaignName('');
      setLinkCode('');
      setDescription('');
      setExpiryDate('');
    }, 1000);
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Share on social media
  const handleShare = (platform: string) => {
    const text = `Hãy tham gia cùng tôi! ${generatedLink}`;
    switch (platform) {
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(generatedLink)}`,
          '_blank'
        );
        break;
      case 'email':
        window.location.href = `mailto:?subject=Giới thiệu&body=${encodeURIComponent(text)}`;
        break;
      case 'zalo':
        // Zalo share URL (placeholder)
        console.log('Share on Zalo:', generatedLink);
        break;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge variant="success">Hoạt động</Badge>
    ) : (
      <Badge variant="default">Hết hạn</Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tạo Link Giới Thiệu</h1>
          <p className="text-gray-600">
            Tạo link giới thiệu tùy chỉnh để chia sẻ với bạn bè và theo dõi hiệu quả chiến dịch
          </p>
        </div>

        {/* Success Alert */}
        {showSuccess && (
          <Alert variant="success">
            <AlertTitle>Tạo link thành công!</AlertTitle>
            <AlertDescription>
              Link giới thiệu của bạn đã được tạo. Hãy chia sẻ nó với bạn bè để bắt đầu kiếm hoa hồng.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Link Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-primary-500" />
                  Thông tin chiến dịch
                </CardTitle>
                <CardDescription>
                  Điền thông tin để tạo link giới thiệu mới
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Campaign Name */}
                <div className="space-y-2">
                  <Label htmlFor="campaignName">
                    Tên chiến dịch <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="campaignName"
                    placeholder="VD: Khuyến mãi Tết 2025"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Tên chiến dịch giúp bạn dễ dàng quản lý và phân biệt các link
                  </p>
                </div>

                {/* Link Code */}
                <div className="space-y-2">
                  <Label htmlFor="linkCode">Mã link (tùy chọn)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="linkCode"
                      placeholder="VD: tet2025"
                      value={linkCode}
                      onChange={(e) => setLinkCode(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    />
                    <Button
                      variant="outline"
                      onClick={() => setLinkCode(generateRandomCode())}
                    >
                      Tạo ngẫu nhiên
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Để trống để hệ thống tự động tạo mã ngẫu nhiên
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả (tùy chọn)</Label>
                  <Textarea
                    id="description"
                    placeholder="Ghi chú về chiến dịch, đối tượng mục tiêu..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Expiry Date */}
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Ngày hết hạn (tùy chọn)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="expiryDate"
                        type="date"
                        className="pl-10"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Link sẽ tự động vô hiệu hóa sau ngày này
                  </p>
                </div>

                {/* Create Button */}
                <Button
                  className="w-full"
                  onClick={handleCreateLink}
                  disabled={isCreating || !campaignName.trim()}
                >
                  {isCreating ? 'Đang tạo...' : 'Tạo Link Giới Thiệu'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Generated Link Display */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Link đã tạo</CardTitle>
                <CardDescription>Chia sẻ link của bạn</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {generatedLink ? (
                  <>
                    {/* Link Display */}
                    <div className="space-y-2">
                      <Label>Link giới thiệu</Label>
                      <div className="flex gap-2">
                        <Input
                          value={generatedLink}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={handleCopyLink}
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* QR Code Placeholder */}
                    <div className="space-y-2">
                      <Label>Mã QR</Label>
                      <div className="bg-gray-100 rounded-lg p-6 flex items-center justify-center">
                        <QrCode className="w-32 h-32 text-gray-400" />
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        Tải xuống QR Code
                      </Button>
                    </div>

                    {/* Share Buttons */}
                    <div className="space-y-2">
                      <Label>Chia sẻ</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-col h-auto py-3"
                          onClick={() => handleShare('facebook')}
                        >
                          <Facebook className="w-5 h-5 mb-1 text-blue-600" />
                          <span className="text-xs">Facebook</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-col h-auto py-3"
                          onClick={() => handleShare('zalo')}
                        >
                          <MessageCircle className="w-5 h-5 mb-1 text-blue-500" />
                          <span className="text-xs">Zalo</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-col h-auto py-3"
                          onClick={() => handleShare('email')}
                        >
                          <Mail className="w-5 h-5 mb-1 text-gray-600" />
                          <span className="text-xs">Email</span>
                        </Button>
                      </div>
                    </div>

                    {/* Statistics Preview */}
                    <div className="space-y-2">
                      <Label>Thống kê</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Eye className="w-4 h-4 text-blue-600" />
                            <span className="text-xs text-blue-600">Lượt xem</span>
                          </div>
                          <p className="text-2xl font-bold text-blue-900">0</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-green-600">Chuyển đổi</span>
                          </div>
                          <p className="text-2xl font-bold text-green-900">0</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <LinkIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Tạo link mới để xem thông tin tại đây
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Links Table */}
        <Card>
          <CardHeader>
            <CardTitle>Link đã tạo gần đây</CardTitle>
            <CardDescription>Quản lý và theo dõi các link giới thiệu của bạn</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên chiến dịch</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-center">Lượt click</TableHead>
                    <TableHead className="text-center">Chuyển đổi</TableHead>
                    <TableHead className="text-center">Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockRecentLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium">{link.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            .../{link.code}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={async () => {
                              await navigator.clipboard.writeText(link.link);
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {formatDate(link.createdDate)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold">{link.clicks}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-green-600">{link.conversions}</span>
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(link.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => window.open(link.link, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateReferralLinkPage;
