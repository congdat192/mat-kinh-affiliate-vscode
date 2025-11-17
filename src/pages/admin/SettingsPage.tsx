import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Mail, Percent, Tag, CheckCircle, XCircle } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [alertMessage, setAlertMessage] = useState('');

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'Mắt Kính Affiliate',
    siteDescription: 'Hệ thống affiliate marketing cho sản phẩm mắt kính cao cấp',
    contactEmail: 'contact@matkinh.vn',
    contactPhone: '0123 456 789',
    businessAddress: '123 Đường ABC, Quận 1, TP. Hồ Chí Minh'
  });

  // Commission Settings State
  const [commissionSettings, setCommissionSettings] = useState({
    silverMinReferrals: 0,
    silverMaxReferrals: 9,
    silverFirstOrderCommission: 10,
    silverLifetimeCommission: 5,
    goldMinReferrals: 10,
    goldMaxReferrals: 29,
    goldFirstOrderCommission: 15,
    goldLifetimeCommission: 7,
    diamondMinReferrals: 30,
    diamondMaxReferrals: 999,
    diamondFirstOrderCommission: 20,
    diamondLifetimeCommission: 10,
    minWithdrawal: 500000,
    withdrawalProcessingDays: 7
  });

  // Voucher Settings State
  const [voucherSettings, setVoucherSettings] = useState({
    defaultValue: 200000,
    validityPeriod: 30,
    autoGenerate: true,
    voucherPrefix: 'MK'
  });

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState({
    smtpServer: 'smtp.gmail.com',
    smtpPort: 587,
    emailUsername: 'noreply@matkinh.vn',
    emailPassword: '',
    fromName: 'Mắt Kính Affiliate',
    fromEmail: 'noreply@matkinh.vn'
  });

  const showSuccessAlert = (message: string) => {
    setAlertType('success');
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  const showErrorAlert = (message: string) => {
    setAlertType('error');
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  const handleSaveGeneral = () => {
    if (!generalSettings.siteName || !generalSettings.contactEmail) {
      showErrorAlert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }
    showSuccessAlert('Lưu cài đặt chung thành công!');
  };

  const handleSaveCommission = () => {
    showSuccessAlert('Lưu cài đặt hoa hồng thành công!');
  };

  const handleSaveVoucher = () => {
    if (voucherSettings.defaultValue <= 0 || voucherSettings.validityPeriod <= 0) {
      showErrorAlert('Giá trị voucher và thời hạn phải lớn hơn 0!');
      return;
    }
    showSuccessAlert('Lưu cài đặt voucher thành công!');
  };

  const handleSaveEmail = () => {
    if (!emailSettings.smtpServer || !emailSettings.emailUsername) {
      showErrorAlert('Vui lòng điền đầy đủ thông tin SMTP!');
      return;
    }
    showSuccessAlert('Lưu cài đặt email thành công!');
  };

  const handleTestEmail = () => {
    if (!emailSettings.smtpServer || !emailSettings.emailUsername) {
      showErrorAlert('Vui lòng cấu hình SMTP trước khi test!');
      return;
    }
    showSuccessAlert('Email test đã được gửi thành công!');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Cài Đặt Hệ Thống</h1>
        <p className="text-muted-foreground">Quản lý các cài đặt và cấu hình hệ thống</p>
      </div>

      {showAlert && (
        <Alert className={`mb-6 ${alertType === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            {alertType === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={alertType === 'success' ? 'text-green-800' : 'text-red-800'}>
              {alertMessage}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Cài Đặt Chung</span>
            <span className="sm:hidden">Chung</span>
          </TabsTrigger>
          <TabsTrigger value="commission" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            <span className="hidden sm:inline">Hoa Hồng</span>
            <span className="sm:hidden">HH</span>
          </TabsTrigger>
          <TabsTrigger value="voucher" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Voucher</span>
            <span className="sm:hidden">VCH</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
            <span className="sm:hidden">Mail</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: General Settings */}
        <TabsContent value="general">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Cài Đặt Chung</h2>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="siteName">Tên Website <span className="text-red-500">*</span></Label>
                <Input
                  id="siteName"
                  value={generalSettings.siteName}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                  placeholder="Nhập tên website"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="siteDescription">Mô Tả Website</Label>
                <Textarea
                  id="siteDescription"
                  value={generalSettings.siteDescription}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })}
                  placeholder="Nhập mô tả website"
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contactEmail">Email Liên Hệ <span className="text-red-500">*</span></Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={generalSettings.contactEmail}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, contactEmail: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contactPhone">Số Điện Thoại</Label>
                <Input
                  id="contactPhone"
                  value={generalSettings.contactPhone}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, contactPhone: e.target.value })}
                  placeholder="0123 456 789"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="businessAddress">Địa Chỉ Kinh Doanh</Label>
                <Textarea
                  id="businessAddress"
                  value={generalSettings.businessAddress}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, businessAddress: e.target.value })}
                  placeholder="Nhập địa chỉ kinh doanh"
                  rows={2}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveGeneral} className="w-full sm:w-auto">
                  Lưu Cài Đặt
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Commission Settings */}
        <TabsContent value="commission">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Cài Đặt Hoa Hồng</h2>
            <div className="space-y-6">
              {/* Silver Tier */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  Cấp Bạc (Silver)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Số Giới Thiệu Tối Thiểu</Label>
                    <Input
                      type="number"
                      value={commissionSettings.silverMinReferrals}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, silverMinReferrals: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Số Giới Thiệu Tối Đa</Label>
                    <Input
                      type="number"
                      value={commissionSettings.silverMaxReferrals}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, silverMaxReferrals: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Hoa Hồng Đơn Đầu (%)</Label>
                    <Input
                      type="number"
                      value={commissionSettings.silverFirstOrderCommission}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, silverFirstOrderCommission: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Hoa Hồng Suốt Đời (%)</Label>
                    <Input
                      type="number"
                      value={commissionSettings.silverLifetimeCommission}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, silverLifetimeCommission: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Gold Tier */}
              <div className="border rounded-lg p-4 bg-yellow-50">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  Cấp Vàng (Gold)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Số Giới Thiệu Tối Thiểu</Label>
                    <Input
                      type="number"
                      value={commissionSettings.goldMinReferrals}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, goldMinReferrals: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Số Giới Thiệu Tối Đa</Label>
                    <Input
                      type="number"
                      value={commissionSettings.goldMaxReferrals}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, goldMaxReferrals: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Hoa Hồng Đơn Đầu (%)</Label>
                    <Input
                      type="number"
                      value={commissionSettings.goldFirstOrderCommission}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, goldFirstOrderCommission: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Hoa Hồng Suốt Đời (%)</Label>
                    <Input
                      type="number"
                      value={commissionSettings.goldLifetimeCommission}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, goldLifetimeCommission: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Diamond Tier */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  Cấp Kim Cương (Diamond)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Số Giới Thiệu Tối Thiểu</Label>
                    <Input
                      type="number"
                      value={commissionSettings.diamondMinReferrals}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, diamondMinReferrals: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Số Giới Thiệu Tối Đa</Label>
                    <Input
                      type="number"
                      value={commissionSettings.diamondMaxReferrals}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, diamondMaxReferrals: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Hoa Hồng Đơn Đầu (%)</Label>
                    <Input
                      type="number"
                      value={commissionSettings.diamondFirstOrderCommission}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, diamondFirstOrderCommission: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Hoa Hồng Suốt Đời (%)</Label>
                    <Input
                      type="number"
                      value={commissionSettings.diamondLifetimeCommission}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, diamondLifetimeCommission: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Withdrawal Settings */}
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Cài Đặt Rút Tiền</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Số Tiền Rút Tối Thiểu (VND)</Label>
                    <Input
                      type="number"
                      value={commissionSettings.minWithdrawal}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, minWithdrawal: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Thời Gian Xử Lý (ngày)</Label>
                    <Input
                      type="number"
                      value={commissionSettings.withdrawalProcessingDays}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, withdrawalProcessingDays: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveCommission} className="w-full sm:w-auto">
                  Lưu Cài Đặt
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Voucher Settings */}
        <TabsContent value="voucher">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Cài Đặt Voucher</h2>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="defaultValue">Giá Trị Voucher Mặc Định (VND)</Label>
                <Input
                  id="defaultValue"
                  type="number"
                  value={voucherSettings.defaultValue}
                  onChange={(e) => setVoucherSettings({ ...voucherSettings, defaultValue: parseInt(e.target.value) })}
                  placeholder="200000"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="validityPeriod">Thời Hạn Voucher (ngày)</Label>
                <Input
                  id="validityPeriod"
                  type="number"
                  value={voucherSettings.validityPeriod}
                  onChange={(e) => setVoucherSettings({ ...voucherSettings, validityPeriod: parseInt(e.target.value) })}
                  placeholder="30"
                />
              </div>

              <div className="flex items-center justify-between border rounded-lg p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="autoGenerate" className="text-base">Tự Động Tạo Voucher</Label>
                  <p className="text-sm text-muted-foreground">
                    Tự động tạo voucher khi có đơn hàng thành công
                  </p>
                </div>
                <Switch
                  id="autoGenerate"
                  checked={voucherSettings.autoGenerate}
                  onCheckedChange={(checked) => setVoucherSettings({ ...voucherSettings, autoGenerate: checked })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="voucherPrefix">Tiền Tố Mã Voucher</Label>
                <Input
                  id="voucherPrefix"
                  value={voucherSettings.voucherPrefix}
                  onChange={(e) => setVoucherSettings({ ...voucherSettings, voucherPrefix: e.target.value.toUpperCase() })}
                  placeholder="MK"
                  maxLength={4}
                />
                <p className="text-xs text-muted-foreground">
                  Mã voucher sẽ có dạng: {voucherSettings.voucherPrefix}XXXXXX
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveVoucher} className="w-full sm:w-auto">
                  Lưu Cài Đặt
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 4: Email Settings */}
        <TabsContent value="email">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Cài Đặt Email</h2>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="smtpServer">SMTP Server <span className="text-red-500">*</span></Label>
                <Input
                  id="smtpServer"
                  value={emailSettings.smtpServer}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpServer: e.target.value })}
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="smtpPort">SMTP Port</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={emailSettings.smtpPort}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: parseInt(e.target.value) })}
                  placeholder="587"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="emailUsername">Email Username <span className="text-red-500">*</span></Label>
                <Input
                  id="emailUsername"
                  type="email"
                  value={emailSettings.emailUsername}
                  onChange={(e) => setEmailSettings({ ...emailSettings, emailUsername: e.target.value })}
                  placeholder="noreply@matkinh.vn"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="emailPassword">Email Password</Label>
                <Input
                  id="emailPassword"
                  type="password"
                  value={emailSettings.emailPassword}
                  onChange={(e) => setEmailSettings({ ...emailSettings, emailPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="fromName">Tên Người Gửi</Label>
                <Input
                  id="fromName"
                  value={emailSettings.fromName}
                  onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                  placeholder="Mắt Kính Affiliate"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="fromEmail">Email Người Gửi</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={emailSettings.fromEmail}
                  onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                  placeholder="noreply@matkinh.vn"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button onClick={handleTestEmail} variant="outline" className="w-full sm:w-auto">
                  Gửi Email Test
                </Button>
                <Button onClick={handleSaveEmail} className="w-full sm:flex-1">
                  Lưu Cài Đặt
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
