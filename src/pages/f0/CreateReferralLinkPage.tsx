import { useState, useEffect } from 'react';
import {
  Link as LinkIcon,
  Copy,
  QrCode,
  Facebook,
  Mail,
  MessageCircle,
  Check,
  TrendingUp,
  Eye,
  Trash2,
  ExternalLink,
  Loader2,
  Gift,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { authService } from '@/services/authService';
import { affiliateCampaignService, type AffiliateCampaign } from '@/services/affiliateCampaignService';

const CreateReferralLinkPage = () => {
  const [campaigns, setCampaigns] = useState<AffiliateCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<AffiliateCampaign | null>(null);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [f0Code, setF0Code] = useState('');

  // Load campaigns and F0 code on mount
  useEffect(() => {
    loadCampaigns();
    const code = authService.getF0Code();
    setF0Code(code);
  }, []);

  const loadCampaigns = async () => {
    setIsLoadingCampaigns(true);
    setLoadError('');
    try {
      // Fetch active campaigns from api.affiliate_campaign_settings
      const activeCampaigns = await affiliateCampaignService.getActiveCampaigns();
      setCampaigns(activeCampaigns);

      // Auto-select default campaign if exists
      const defaultCampaign = activeCampaigns.find(c => c.is_default);
      if (defaultCampaign) {
        setSelectedCampaignId(defaultCampaign.id);
        setSelectedCampaign(defaultCampaign);
      } else if (activeCampaigns.length > 0) {
        // Select first campaign if no default
        setSelectedCampaignId(activeCampaigns[0].id);
        setSelectedCampaign(activeCampaigns[0]);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      setLoadError('Lỗi khi tải danh sách chiến dịch. Vui lòng thử lại sau.');
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  // Handle campaign selection change
  const handleCampaignChange = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    const campaign = campaigns.find(c => c.id === campaignId);
    setSelectedCampaign(campaign || null);
    // Reset generated link when campaign changes
    setGeneratedLink('');
    setShowSuccess(false);
  };

  // Generate ref link
  const handleCreateLink = () => {
    if (!selectedCampaign) {
      alert('Vui lòng chọn chiến dịch');
      return;
    }

    // Generate link with F0 code and campaign_code
    // Format: https://domain.com/claim-voucher?ref={f0_code}&campaign={campaign_code}
    const campaignCode = selectedCampaign.campaign_code || selectedCampaign.campaign_id;
    const link = affiliateCampaignService.generateReferralLink(f0Code, campaignCode);
    setGeneratedLink(link);
    setShowSuccess(true);
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
                {/* F0 Code Display */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <Label className="text-sm text-blue-700 mb-2 block">Mã giới thiệu của bạn</Label>
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-bold text-blue-900">{f0Code}</code>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Link sẽ sử dụng mã này để theo dõi khách hàng giới thiệu
                  </p>
                </div>

                {/* Campaign Selection */}
                <div className="space-y-2">
                  <Label htmlFor="campaign">
                    Chọn Chiến Dịch <span className="text-red-500">*</span>
                  </Label>
                  {isLoadingCampaigns ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang tải danh sách chiến dịch...
                    </div>
                  ) : loadError ? (
                    <Alert variant="error">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{loadError}</AlertDescription>
                    </Alert>
                  ) : campaigns.length === 0 ? (
                    <Alert variant="warning">
                      <AlertDescription>
                        Hiện tại chưa có chiến dịch nào đang hoạt động. Vui lòng liên hệ admin để được hỗ trợ.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="relative">
                        <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Select
                          id="campaign"
                          value={selectedCampaignId}
                          onChange={(e) => handleCampaignChange(e.target.value)}
                          className="pl-10"
                        >
                          <option value="">-- Chọn Chiến Dịch --</option>
                          {campaigns.map((campaign) => (
                            <option key={campaign.id} value={campaign.id}>
                              {campaign.name}
                              {campaign.is_default && ' (Mặc định)'}
                            </option>
                          ))}
                        </Select>
                      </div>
                      {selectedCampaign?.description && (
                        <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          {selectedCampaign.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Chọn chiến dịch để tạo link giới thiệu cho khách hàng của bạn
                      </p>
                    </>
                  )}
                </div>

                {/* Create Button */}
                <Button
                  className="w-full"
                  onClick={handleCreateLink}
                  disabled={!selectedCampaignId || campaigns.length === 0 || isLoadingCampaigns}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Tạo Link Giới Thiệu
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

        {/* Recent Links - Empty State (TODO: Implement link history table later) */}
        <Card>
          <CardHeader>
            <CardTitle>Link đã tạo gần đây</CardTitle>
            <CardDescription>Quản lý và theo dõi các link giới thiệu của bạn</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <LinkIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Chưa có link nào được tạo</p>
              <p className="text-sm text-gray-400">
                Tạo link giới thiệu đầu tiên của bạn để bắt đầu theo dõi
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateReferralLinkPage;
