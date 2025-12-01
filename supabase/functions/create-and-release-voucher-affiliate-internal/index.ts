import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
console.info('Create and Release Voucher (Affiliate) API started - v9 (Remove redundant conversion_count update)');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
// ============= Utility Functions =============
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\.]/g, '');
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  }
  if (cleaned.startsWith('84') && cleaned.length > 10) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
}
function isValidPhone(phone: string): boolean {
  return /^0[0-9]{9}$/.test(phone);
}
function generateVoucherCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for(let i = 0; i < 10; i++){
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
function getVietnamTime(): Date {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + 7 * 3600000);
}
function toVietnamISOString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}+07:00`;
}
function calculateExpiredDate(enddate: string | null, expiretime: number | null): string {
  let expiredDate: Date;
  if (expiretime !== null && expiretime !== undefined && expiretime > 0) {
    expiredDate = getVietnamTime();
    expiredDate.setDate(expiredDate.getDate() + expiretime);
  } else if (enddate) {
    const [datePart] = enddate.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    expiredDate = new Date(year, month - 1, day);
  } else {
    expiredDate = getVietnamTime();
    expiredDate.setDate(expiredDate.getDate() + 30);
  }
  expiredDate.setHours(23, 59, 59, 999);
  return toVietnamISOString(expiredDate);
}

// ============= Error Response Helper (MUST USE per .claude-skills/edge-function.md) =============
function errorResponse(message: string, errorCode: string, status = 400, details: any = null) {
  const responseBody: any = {
    success: false,
    error: message,
    error_code: errorCode
  };
  if (details) {
    responseBody.error_details = details;
  }
  return new Response(JSON.stringify(responseBody), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

// ============= KiotViet Functions =============
async function getKiotVietCredential(supabase: any) {
  const { data, error } = await supabase.schema('api').rpc('get_kiotviet_credential');
  if (error || !data || data.length === 0) {
    console.error('[KiotViet] Credential error:', error?.message);
    return null;
  }
  return data[0];
}
async function getKiotVietToken(supabase: any) {
  const { data, error } = await supabase.from('kiotviet_tokens').select('token, expires_at').single();
  if (error || !data?.token) {
    return null;
  }
  return {
    access_token: data.token,
    expires_at: data.expires_at
  };
}
function isTokenExpired(expiresAt: string): boolean {
  const expiresDate = new Date(expiresAt);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;
  return expiresDate.getTime() - bufferMs < now.getTime();
}
async function decryptSecret(encryptedSecret: string): Promise<string> {
  if (!encryptedSecret.includes(':')) {
    return encryptedSecret;
  }
  const encryptionKey = Deno.env.get('KIOTVIET_ENCRYPTION_KEY');
  if (!encryptionKey) {
    throw new Error('KIOTVIET_ENCRYPTION_KEY not configured');
  }
  const [ivBase64, encryptedBase64] = encryptedSecret.split(':');
  const iv = Uint8Array.from(atob(ivBase64), (c)=>c.charCodeAt(0));
  const encrypted = Uint8Array.from(atob(encryptedBase64), (c)=>c.charCodeAt(0));
  const keyBytes = Uint8Array.from(atob(encryptionKey), (c)=>c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, {
    name: 'AES-GCM'
  }, false, [
    'decrypt'
  ]);
  const decrypted = await crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv
  }, cryptoKey, encrypted);
  return new TextDecoder().decode(decrypted);
}
async function refreshKiotVietToken(supabase: any, credential: any): Promise<string> {
  console.log('[KiotViet] Refreshing token for:', credential.retailer_name);
  const clientSecret = await decryptSecret(credential.client_secret_encrypted);
  const response = await fetch('https://id.kiotviet.vn/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: credential.client_id,
      client_secret: clientSecret,
      scopes: 'PublicApi.Access'
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`KiotViet OAuth failed: ${response.status} - ${errorText}`);
  }
  const tokenData = await response.json();
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
  await supabase.schema('api').rpc('save_integration_token', {
    p_credential_id: credential.id,
    p_access_token: tokenData.access_token,
    p_refresh_token: tokenData.refresh_token || null,
    p_expires_at: expiresAt.toISOString()
  });
  return tokenData.access_token;
}
async function getValidToken(supabase: any): Promise<{ token: string; retailer: string }> {
  const credential = await getKiotVietCredential(supabase);
  if (!credential) {
    throw new Error('No active KiotViet credential found');
  }
  const tokenData = await getKiotVietToken(supabase);
  if (!tokenData || isTokenExpired(tokenData.expires_at)) {
    console.log('[KiotViet] Token expired, refreshing...');
    const newToken = await refreshKiotVietToken(supabase, credential);
    return {
      token: newToken,
      retailer: credential.retailer_name
    };
  }
  return {
    token: tokenData.access_token,
    retailer: credential.retailer_name
  };
}

// v8: Return detailed error instead of just boolean
async function createVoucherInKiotViet(token: string, retailer: string, campaignId: number, code: string): Promise<{ success: boolean; error?: any }> {
  const response = await fetch('https://public.kiotapi.com/voucher', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Retailer': retailer,
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      voucherCampaignId: campaignId,
      data: [
        {
          code
        }
      ]
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[KiotViet] Create failed:', response.status, errorText);
    return {
      success: false,
      error: {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      }
    };
  }
  return { success: true };
}

// v8: Return detailed error instead of just boolean
async function releaseVoucherInKiotViet(token: string, retailer: string, campaignId: number, code: string, releaseDate: string): Promise<{ success: boolean; error?: any }> {
  const response = await fetch('https://public.kiotapi.com/voucher/release/give', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Retailer': retailer,
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      CampaignId: campaignId,
      Vouchers: [
        {
          Code: code
        }
      ],
      ReleaseDate: releaseDate
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[KiotViet] Release failed:', response.status, errorText);
    return {
      success: false,
      error: {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      }
    };
  }
  return { success: true };
}

// ============= Main Handler =============
Deno.serve(async (req)=>{
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  console.log('='.repeat(80));
  console.log(`[Request] ID: ${requestId}`);
  console.log(`[Request] Time: ${new Date().toISOString()}`);
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // 1. Parse request body
    let body: any;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch  {
      return errorResponse('Invalid JSON in request body', 'INVALID_JSON');
    }
    const { campaign_code, recipient_phone, f0_code, recipient_name, recipient_email } = body;
    console.log(`[Input] campaign_code: ${campaign_code}, phone: ${recipient_phone}, f0_code: ${f0_code}`);
    // 2. Validate required fields
    if (!campaign_code) {
      return errorResponse('Thiếu mã chiến dịch', 'MISSING_CAMPAIGN_CODE');
    }
    if (!recipient_phone) {
      return errorResponse('Thiếu số điện thoại', 'MISSING_PHONE');
    }
    const cleanPhone = normalizePhone(recipient_phone);
    if (!isValidPhone(cleanPhone)) {
      return errorResponse('Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)', 'INVALID_PHONE');
    }
    // 3. Create Supabase client
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      db: {
        schema: 'api'
      }
    });
    // 4. Check customer type (new/old)
    console.log(`[Customer] Checking type for ${cleanPhone}...`);
    const { data: customerData, error: customerError } = await supabase.from('customers_backup').select('contactnumber, name, totalrevenue').eq('contactnumber', cleanPhone).maybeSingle();

    if (customerError) {
      console.error('[Customer] Query error:', JSON.stringify(customerError));
      return errorResponse('Lỗi kiểm tra thông tin khách hàng', 'CUSTOMER_CHECK_ERROR', 500, {
        code: customerError.code,
        message: customerError.message,
        details: customerError.details
      });
    }

    let customerType = 'new';
    let customerName = recipient_name || '';
    if (customerData) {
      customerName = customerName || customerData.name || '';
      const totalRevenue = customerData.totalrevenue;
      if (totalRevenue !== null && totalRevenue !== undefined && totalRevenue > 0) {
        console.log(`[Customer] OLD customer - totalrevenue: ${totalRevenue}`);
        return errorResponse('Số điện thoại này đã là khách hàng cũ, không thể nhận voucher qua chương trình affiliate', 'OLD_CUSTOMER', 400);
      }
    }
    console.log(`[Customer] NEW customer - eligible for voucher`);

    // 5. Get campaign info from api.affiliate_campaign_settings view
    console.log(`[Campaign] Fetching by code: ${campaign_code}...`);
    const { data: campaign, error: campaignError } = await supabase.from('affiliate_campaign_settings').select('id, campaign_id, code, affiliate_name, name, enddate, expiretime, affiliate_is_active').eq('code', campaign_code).eq('affiliate_is_active', true).single();
    if (campaignError || !campaign) {
      console.error('[Campaign] Not found:', JSON.stringify(campaignError));
      return errorResponse(`Chiến dịch "${campaign_code}" không tồn tại hoặc đã kết thúc`, 'CAMPAIGN_NOT_FOUND', 404, {
        code: campaignError?.code,
        message: campaignError?.message,
        campaign_code: campaign_code
      });
    }
    const campaignName = campaign.affiliate_name || campaign.name;
    console.log(`[Campaign] Found: ${campaignName} (ID: ${campaign.campaign_id})`);

    // 6. Check for duplicate voucher in affiliate.voucher_affiliate_tracking
    console.log('[Duplicate] Checking existing voucher...');
    const { data: existingVouchers, error: duplicateError } = await supabase.from('voucher_affiliate_tracking').select('code, expired_at, activation_status').eq('campaign_id', campaign.campaign_id).eq('recipient_phone', cleanPhone).order('created_at', {
      ascending: false
    });

    if (duplicateError) {
      console.error('[Duplicate] Query error:', JSON.stringify(duplicateError));
      return errorResponse('Lỗi kiểm tra voucher trùng lặp', 'DUPLICATE_CHECK_ERROR', 500, {
        code: duplicateError.code,
        message: duplicateError.message,
        details: duplicateError.details
      });
    }

    if (existingVouchers && existingVouchers.length > 0) {
      const latest = existingVouchers[0];
      const now = new Date();
      const expiredDate = new Date(latest.expired_at);
      const isExpired = expiredDate < now;
      const isUsed = latest.activation_status === 'Đã sử dụng';
      if (!isExpired && !isUsed) {
        const daysRemaining = Math.ceil((expiredDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        console.log('[Duplicate] Active voucher exists');
        return errorResponse(`Số điện thoại ${cleanPhone} đã có voucher ${latest.code} chưa sử dụng, còn hiệu lực ${daysRemaining} ngày`, 'DUPLICATE_VOUCHER');
      }
      console.log('[Duplicate] Previous voucher expired/used - allowing new');
    }

    // 7. Validate & get F0 info
    let f0Id: string | null = null;
    let f0Name: string | null = null;
    if (f0_code) {
      console.log(`[F0] Validating: ${f0_code}...`);
      const { data: f0Partner, error: f0Error } = await supabase.from('f0_partners').select('id, f0_code, full_name, is_active, is_approved').eq('f0_code', f0_code).single();

      if (f0Error) {
        console.error('[F0] Query error:', JSON.stringify(f0Error));
        // Not critical, just log warning
        console.warn('[F0] Could not validate F0 partner, continuing without F0 info');
      } else if (f0Partner && f0Partner.is_active && f0Partner.is_approved) {
        f0Id = f0Partner.id;
        f0Name = f0Partner.full_name;
        console.log(`[F0] Valid: ${f0Name}`);
      } else {
        console.warn('[F0] Not found or inactive:', f0_code);
      }
    }

    // 8. Get KiotViet token (with auto-refresh)
    console.log('[KiotViet] Getting token...');
    let kiotToken: string;
    let kiotRetailer: string;
    try {
      const tokenResult = await getValidToken(supabase);
      kiotToken = tokenResult.token;
      kiotRetailer = tokenResult.retailer;
    } catch (tokenError: any) {
      console.error('[KiotViet] Token error:', tokenError.message);
      return errorResponse('Lỗi kết nối KiotViet', 'KIOTVIET_TOKEN_ERROR', 500, {
        message: tokenError.message
      });
    }
    console.log(`[KiotViet] Using retailer: ${kiotRetailer}`);

    // 9. Generate voucher code
    const voucherCode = generateVoucherCode();
    console.log(`[Voucher] Generated: ${voucherCode}`);

    // 10. Create voucher in KiotViet
    console.log('[KiotViet] Creating voucher...');
    const campaignId = parseInt(campaign.campaign_id);
    const createResult = await createVoucherInKiotViet(kiotToken, kiotRetailer, campaignId, voucherCode);
    if (!createResult.success) {
      return errorResponse('Lỗi tạo voucher trên KiotViet', 'KIOTVIET_CREATE_ERROR', 500, createResult.error);
    }
    console.log('[KiotViet] Voucher created');

    // 11. Release voucher
    console.log('[KiotViet] Releasing voucher...');
    const vnNow = getVietnamTime();
    const releaseDate = toVietnamISOString(vnNow);
    const releaseResult = await releaseVoucherInKiotViet(kiotToken, kiotRetailer, campaignId, voucherCode, releaseDate);
    if (!releaseResult.success) {
      return errorResponse('Lỗi kích hoạt voucher trên KiotViet', 'KIOTVIET_RELEASE_ERROR', 500, {
        ...releaseResult.error,
        voucher_code: voucherCode // Include so it's not lost
      });
    }
    console.log('[KiotViet] Voucher released');

    // 12. Calculate expiry date
    const expiredAt = calculateExpiredDate(campaign.enddate, campaign.expiretime);
    console.log(`[Voucher] Expires: ${expiredAt}`);

    // 13. Save to affiliate.voucher_affiliate_tracking (via api.voucher_affiliate_tracking view)
    console.log('[Database] Saving to voucher_affiliate_tracking...');
    const createdAt = toVietnamISOString(vnNow);
    const { error: insertError } = await supabase.from('voucher_affiliate_tracking').insert({
      code: voucherCode,
      campaign_id: campaign.campaign_id,
      campaign_code: campaign_code,
      created_at: createdAt,
      activated_at: releaseDate,
      expired_at: expiredAt,
      activation_status: 'Đã kích hoạt',
      f0_id: f0Id,
      f0_code: f0_code || null,
      recipient_phone: cleanPhone,
      recipient_name: customerName || null,
      recipient_email: recipient_email || null,
      customer_type: customerType
    });

    // CRITICAL: Return error to FE if database insert fails
    if (insertError) {
      console.error('[Database] Insert error:', JSON.stringify(insertError));
      return errorResponse('Lỗi lưu voucher vào database. Voucher đã tạo trên KiotViet nhưng chưa được tracking.', 'DATABASE_INSERT_ERROR', 500, {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        voucher_code: voucherCode // Include voucher code so it's not lost
      });
    }
    console.log('[Database] Saved successfully');

    // v9: Removed redundant conversion_count update in referral_links JSONB
    // conversion_count is now calculated REALTIME from voucher_affiliate_tracking
    // by the frontend service (affiliateCampaignService.getReferralLinksByF0)
    // This ensures data consistency when vouchers are deleted or modified

    // 14. Success response
    const duration = Date.now() - startTime;
    console.log(`[Success] Voucher issued in ${duration}ms`);
    console.log('='.repeat(80));
    return new Response(JSON.stringify({
      success: true,
      message: 'Phát voucher thành công!',
      voucher_code: voucherCode,
      campaign_name: campaignName,
      expired_at: expiredAt,
      recipient_phone: cleanPhone,
      customer_type: customerType,
      f0_code: f0_code || null,
      f0_name: f0Name,
      meta: {
        request_id: requestId,
        duration_ms: duration
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error: any) {
    console.error('='.repeat(80));
    console.error('[Error] Unexpected:', error);
    console.error('='.repeat(80));
    return errorResponse(error.message || 'Lỗi hệ thống', 'INTERNAL_ERROR', 500, {
      message: error.message,
      stack: error.stack
    });
  }
});
