import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// =============================================================================
// send-otp-bank-verification v3 - Enhanced error_details for FE debugging
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Error response helper with error_details support
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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Decrypt AES-256-GCM encrypted data
async function decrypt(encryptedBase64: string, keyBase64: string): Promise<string> {
  const encryptedBytes = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));

  if (keyBytes.length !== 32) {
    throw new Error(`Invalid key length: ${keyBytes.length} bytes. Expected 32 bytes for AES-256.`);
  }

  const iv = encryptedBytes.slice(0, 12);
  const ciphertextWithTag = encryptedBytes.slice(12);

  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertextWithTag);

  return new TextDecoder().decode(decrypted);
}

Deno.serve(async (req) => {
  console.log('\n========== SEND OTP BANK VERIFICATION v3 ==========');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('[Request] JSON parse error:', parseError);
      return errorResponse('Dữ liệu request không hợp lệ', 'INVALID_JSON', 400, {
        parseError: String(parseError)
      });
    }

    const { f0_id, bank_name, bank_account_number, bank_account_holder, bank_branch } = body;
    console.log(`[Request] f0_id: ${f0_id}, bank_name: ${bank_name}`);

    // Validate required fields
    if (!f0_id || !bank_name || !bank_account_number || !bank_account_holder) {
      return errorResponse('Vui lòng điền đầy đủ thông tin ngân hàng', 'MISSING_FIELDS', 400, {
        missing: {
          f0_id: !f0_id,
          bank_name: !bank_name,
          bank_account_number: !bank_account_number,
          bank_account_holder: !bank_account_holder
        }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Config] Missing Supabase credentials');
      return errorResponse('Lỗi cấu hình server', 'CONFIG_ERROR', 500, {
        missing: {
          SUPABASE_URL: !supabaseUrl,
          SUPABASE_SERVICE_ROLE_KEY: !supabaseServiceKey
        }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'api' }
    });

    // Get F0 partner info (phone number)
    console.log('[Database] Finding F0 partner...');
    const { data: f0Partner, error: f0Error } = await supabase
      .from('f0_partners')
      .select('id, phone, full_name, bank_verified')
      .eq('id', f0_id)
      .single();

    if (f0Error && f0Error.code !== 'PGRST116') {
      console.error('[Database] F0 lookup error:', JSON.stringify(f0Error));
      return errorResponse('Lỗi truy vấn thông tin đối tác', 'F0_QUERY_ERROR', 500, {
        code: f0Error.code,
        message: f0Error.message,
        details: f0Error.details
      });
    }

    if (!f0Partner) {
      console.log('[F0] Not found');
      return errorResponse('Không tìm thấy thông tin đối tác', 'F0_NOT_FOUND', 404, {
        f0_id
      });
    }

    console.log(`[F0] Found: ${f0Partner.full_name}`);

    // Check if bank already verified
    if (f0Partner.bank_verified) {
      return errorResponse('Thông tin ngân hàng đã được xác minh. Vui lòng liên hệ Admin nếu cần thay đổi.', 'BANK_ALREADY_VERIFIED', 400, {
        f0_id,
        bank_verified: true
      });
    }

    // Get Vihat credentials via RPC function
    const { data: vihatCreds, error: vihatError } = await supabase.rpc('get_vihat_credential');

    if (vihatError) {
      console.error('[Vihat] RPC error:', JSON.stringify(vihatError));
      return errorResponse('Không thể lấy thông tin xác thực Vihat', 'VIHAT_CREDENTIAL_ERROR', 500, {
        code: vihatError.code,
        message: vihatError.message,
        details: vihatError.details
      });
    }

    if (!vihatCreds || vihatCreds.length === 0) {
      console.error('[Vihat] No credentials found');
      return errorResponse('Không tìm thấy thông tin xác thực Vihat', 'VIHAT_NO_CREDENTIALS', 500, {
        result_count: vihatCreds?.length || 0
      });
    }

    const vihatCredential = vihatCreds[0];
    const vihatApiKey = vihatCredential.api_key;
    const secretKeyEncrypted = vihatCredential.secret_key_encrypted;

    // Check encryption key
    const encryptionKey = Deno.env.get('VIHAT_ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.error('[Config] VIHAT_ENCRYPTION_KEY not found');
      return errorResponse('Thiếu cấu hình mã hóa', 'MISSING_ENCRYPTION_KEY', 500, {
        env_var: 'VIHAT_ENCRYPTION_KEY'
      });
    }

    // Decrypt Vihat secret key
    let vihatSecretKey: string;
    try {
      vihatSecretKey = await decrypt(secretKeyEncrypted, encryptionKey);
    } catch (decryptError) {
      console.error('[Decrypt] Failed:', decryptError);
      return errorResponse('Không thể giải mã thông tin xác thực', 'DECRYPT_ERROR', 500, {
        error: String(decryptError)
      });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const minute = 5;
    const expiresAt = new Date(Date.now() + minute * 60 * 1000);

    // Save OTP record with bank data in registration_data
    console.log('[Database] Saving OTP record...');
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        phone: f0Partner.phone,
        otp_code: otpCode,
        registration_data: {
          purpose: 'bank_verification',
          f0_id: f0_id,
          bank_name: bank_name,
          bank_account_number: bank_account_number,
          bank_account_holder: bank_account_holder,
          bank_branch: bank_branch || null
        },
        expires_at: expiresAt.toISOString(),
        is_used: false
      })
      .select('id')
      .single();

    if (otpError) {
      console.error('[Database] OTP insert error:', JSON.stringify(otpError));
      return errorResponse('Không thể tạo mã OTP', 'OTP_INSERT_ERROR', 500, {
        code: otpError.code,
        message: otpError.message,
        details: otpError.details,
        hint: otpError.hint
      });
    }

    // Prepare Vihat SMS payload
    const smsContent = `MKTAMDUC - Ma xac thuc cap nhat ngan hang cua ban la ${otpCode}. Ma co hieu luc trong ${minute} phut.`;
    const vihatPayload = {
      ApiKey: vihatApiKey,
      SecretKey: vihatSecretKey,
      Phone: f0Partner.phone,
      Channels: ["zalo", "sms"],
      Data: [
        {
          TempID: "478665",
          Params: [otpCode, minute.toString()],
          OAID: "939629380721919913",
          campaignid: "Xác minh ngân hàng",
          CallbackUrl: `${supabaseUrl}/functions/v1/vihat-otp-webhook`,
          RequestId: otpRecord.id,
          Sandbox: "0",
          SendingMode: "1"
        },
        {
          Content: smsContent,
          IsUnicode: "0",
          SmsType: "2",
          Brandname: "MKTAMDUC",
          CallbackUrl: `${supabaseUrl}/functions/v1/vihat-otp-webhook`,
          RequestId: otpRecord.id,
          Sandbox: "0"
        }
      ]
    };

    console.log(`[Vihat] Sending OTP, Phone: ${f0Partner.phone}, OTP Record ID: ${otpRecord.id}`);

    // Send SMS via Vihat API
    let vihatResponse;
    try {
      vihatResponse = await fetch('https://rest.esms.vn/MainService.svc/json/MultiChannelMessage/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vihatPayload)
      });
    } catch (fetchError) {
      console.error('[Vihat] Fetch error:', fetchError);
      await supabase.from('otp_verifications').delete().eq('id', otpRecord.id);
      return errorResponse('Không thể kết nối đến Vihat API', 'VIHAT_FETCH_ERROR', 500, {
        error: String(fetchError),
        otp_record_deleted: true
      });
    }

    let vihatResult;
    try {
      vihatResult = await vihatResponse.json();
    } catch (parseError) {
      console.error('[Vihat] JSON parse error:', parseError);
      await supabase.from('otp_verifications').delete().eq('id', otpRecord.id);
      return errorResponse('Không thể parse response từ Vihat', 'VIHAT_PARSE_ERROR', 500, {
        error: String(parseError),
        otp_record_deleted: true
      });
    }

    console.log('[Vihat] API response:', JSON.stringify(vihatResult));

    // Check Vihat result
    if (vihatResult.CodeResult !== '100') {
      console.error('[Vihat] SMS failed:', JSON.stringify(vihatResult));
      await supabase.from('otp_verifications').delete().eq('id', otpRecord.id);
      return errorResponse(
        `Không thể gửi SMS: ${vihatResult.ErrorMessage || 'Unknown error'}`,
        'VIHAT_SMS_FAILED',
        500,
        {
          code_result: vihatResult.CodeResult,
          error_message: vihatResult.ErrorMessage,
          full_response: vihatResult,
          otp_record_deleted: true
        }
      );
    }

    // Success
    const phoneMasked = f0Partner.phone.substring(0, 3) + '***' + f0Partner.phone.substring(f0Partner.phone.length - 4);

    console.log('[Complete] OTP sent successfully');

    return new Response(JSON.stringify({
      success: true,
      record_id: otpRecord.id,
      phone_masked: phoneMasked,
      expires_in: minute * 60
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Unexpected] Error:', error);
    return errorResponse('Có lỗi xảy ra. Vui lòng thử lại.', 'UNEXPECTED_ERROR', 500, {
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});
