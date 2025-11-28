import { useState, useEffect } from 'react';
import {
  Link as LinkIcon,
  Copy,
  Facebook,
  Mail,
  MessageCircle,
  Check,
  TrendingUp,
  Eye,
  ExternalLink,
  Loader2,
  Gift,
  AlertCircle,
  RefreshCw,
  Download,
  Trash2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
import { affiliateCampaignService, type AffiliateCampaign, type ReferralLink } from '@/services/affiliateCampaignService';

const CreateReferralLinkPage = () => {
  const [campaigns, setCampaigns] = useState<AffiliateCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<AffiliateCampaign | null>(null);
  const [generatedLink, setGeneratedLink] = useState('');
  const [currentLinkStats, setCurrentLinkStats] = useState<{ clicks: number; conversions: number }>({ clicks: 0, conversions: 0 });
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isNewLink, setIsNewLink] = useState(false);
  const [f0Code, setF0Code] = useState('');
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [createError, setCreateError] = useState('');

  // Referral links list
  const [referralLinks, setReferralLinks] = useState<ReferralLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);

  // Load campaigns, F0 code, and existing links on mount
  useEffect(() => {
    const code = authService.getF0Code();
    setF0Code(code);
    loadCampaigns();
    if (code) {
      loadReferralLinks(code);
    }
  }, []);

  const loadCampaigns = async () => {
    setIsLoadingCampaigns(true);
    setLoadError('');
    try {
      const activeCampaigns = await affiliateCampaignService.getActiveCampaigns();
      setCampaigns(activeCampaigns);

      // Auto-select default campaign if exists
      const defaultCampaign = activeCampaigns.find(c => c.is_default);
      if (defaultCampaign) {
        setSelectedCampaignId(defaultCampaign.id);
        setSelectedCampaign(defaultCampaign);
      } else if (activeCampaigns.length > 0) {
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

  const loadReferralLinks = async (code: string) => {
    setIsLoadingLinks(true);
    try {
      const links = await affiliateCampaignService.getReferralLinksByF0(code);
      setReferralLinks(links);
    } catch (error) {
      console.error('Error loading referral links:', error);
    } finally {
      setIsLoadingLinks(false);
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
    setCreateError('');
    setCurrentLinkStats({ clicks: 0, conversions: 0 });
  };

  // Create referral link (client-side generation with DB history tracking)
  const handleCreateLink = async () => {
    if (!selectedCampaign || !f0Code) {
      setCreateError('Vui lòng chọn chiến dịch');
      return;
    }

    setIsCreatingLink(true);
    setCreateError('');
    setShowSuccess(false);

    try {
      const result = await affiliateCampaignService.createReferralLink(f0Code, selectedCampaign);

      if (!result.success) {
        setCreateError(result.error || 'Không thể tạo link');
        return;
      }

      // Set the generated link
      setGeneratedLink(result.link?.full_url || '');
      setCurrentLinkStats({
        clicks: result.link?.click_count ?? 0,
        conversions: result.link?.conversion_count ?? 0,
      });
      setIsNewLink(result.is_new || false);
      setShowSuccess(true);

      // Reload the links list
      loadReferralLinks(f0Code);
    } catch (error) {
      console.error('Error creating link:', error);
      setCreateError('Lỗi hệ thống. Vui lòng thử lại sau.');
    } finally {
      setIsCreatingLink(false);
    }
  };

  // Copy link to clipboard
  const handleCopyLink = async (link?: string) => {
    const linkToCopy = link || generatedLink;
    if (linkToCopy) {
      await navigator.clipboard.writeText(linkToCopy);
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
        // Zalo share URL
        window.open(
          `https://zalo.me/share?url=${encodeURIComponent(generatedLink)}`,
          '_blank'
        );
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

  // Download QR Code as PNG
  const handleDownloadQR = () => {
    const svg = document.querySelector('#qr-code-container svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-code-${f0Code}-${selectedCampaign?.campaign_code || 'link'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Delete referral link
  const handleDeleteLink = async (linkId: string, campaignName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa link của chiến dịch "${campaignName}"?`)) {
      return;
    }

    setDeletingLinkId(linkId);
    try {
      const result = await affiliateCampaignService.deleteReferralLink(linkId, f0Code);
      if (result.success) {
        // Remove from local state
        setReferralLinks(prev => prev.filter(link => link.id !== linkId));
        // Clear generated link if it was the deleted one
        const deletedLink = referralLinks.find(link => link.id === linkId);
        if (deletedLink && generatedLink === deletedLink.full_url) {
          setGeneratedLink('');
          setShowSuccess(false);
        }
      } else {
        alert(result.error || 'Không thể xóa link');
      }
    } catch (error) {
      console.error('Error deleting link:', error);
      alert('Lỗi khi xóa link');
    } finally {
      setDeletingLinkId(null);
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
            <Check className="h-4 w-4" />
            <AlertTitle>{isNewLink ? 'Tạo link thành công!' : 'Link đã tồn tại!'}</AlertTitle>
            <AlertDescription>
              {isNewLink
                ? 'Link giới thiệu của bạn đã được tạo. Hãy chia sẻ nó với bạn bè để bắt đầu kiếm hoa hồng.'
                : 'Bạn đã có link cho chiến dịch này. Sử dụng link bên dưới để chia sẻ.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {createError && (
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{createError}</AlertDescription>
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
                  Chọn chiến dịch để tạo link giới thiệu
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
                  disabled={!selectedCampaignId || campaigns.length === 0 || isLoadingCampaigns || isCreatingLink}
                >
                  {isCreatingLink ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang tạo link...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Tạo Link Giới Thiệu
                    </>
                  )}
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
                          onClick={() => handleCopyLink()}
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="space-y-2">
                      <Label>Mã QR</Label>
                      <div className="bg-white rounded-lg p-4 flex items-center justify-center border" id="qr-code-container">
                        <QRCodeSVG
                          value={generatedLink}
                          size={160}
                          level="H"
                          includeMargin={true}
                          bgColor="#ffffff"
                          fgColor="#000000"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleDownloadQR}
                      >
                        <Download className="w-4 h-4 mr-2" />
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
                            <span className="text-xs text-blue-600">Lượt click</span>
                          </div>
                          <p className="text-2xl font-bold text-blue-900">{currentLinkStats.clicks}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-green-600">Chuyển đổi</span>
                          </div>
                          <p className="text-2xl font-bold text-green-900">{currentLinkStats.conversions}</p>
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Link đã tạo gần đây</CardTitle>
                <CardDescription>Quản lý và theo dõi các link giới thiệu của bạn</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadReferralLinks(f0Code)}
                disabled={isLoadingLinks}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingLinks ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingLinks ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : referralLinks.length === 0 ? (
              <div className="text-center py-12">
                <LinkIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">Chưa có link nào được tạo</p>
                <p className="text-sm text-gray-400">
                  Tạo link giới thiệu đầu tiên của bạn để bắt đầu theo dõi
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chiến dịch</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead className="text-center">Lượt click</TableHead>
                      <TableHead className="text-center">Chuyển đổi</TableHead>
                      <TableHead className="text-center">Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referralLinks.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell className="font-medium">{link.campaign_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded max-w-[150px] truncate">
                              {link.full_url}
                            </code>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => handleCopyLink(link.full_url)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatDate(link.created_at)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold">{link.click_count ?? 0}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-green-600">{link.conversion_count ?? 0}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {link.is_active ? (
                            <Badge variant="success">Hoạt động</Badge>
                          ) : (
                            <Badge variant="default">Tạm dừng</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => window.open(link.full_url, '_blank')}
                              title="Mở link"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteLink(link.id, link.campaign_name)}
                              disabled={deletingLinkId === link.id}
                              title="Xóa link"
                            >
                              {deletingLinkId === link.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateReferralLinkPage;
