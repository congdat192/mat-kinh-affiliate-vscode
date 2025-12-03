import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// =============================================================================
// send-otp-affiliate v21 - Enhanced error_details for FE debugging
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

    const { phone, email, full_name, password, referral_code, resend, previous_record_id } = body;

    // Check if this is a resend request
    const isResend = resend === true && previous_record_id;

    // Validate required fields (different for resend vs new registration)
    if (isResend) {
      if (!phone) {
        return errorResponse('Thiếu số điện thoại', 'MISSING_PHONE', 400, {
          missing: { phone: true }
        });
      }
    } else {
      if (!phone || !email || !full_name || !password) {
        return errorResponse('Vui lòng điền đầy đủ thông tin', 'MISSING_FIELDS', 400, {
          missing: {
            phone: !phone,
            email: !email,
            full_name: !full_name,
            password: !password
          }
        });
      }
    }

    // Validate phone format
    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      return errorResponse('Số điện thoại không hợp lệ', 'INVALID_PHONE', 400, {
        phone,
        expected_format: '0XXXXXXXXX (10 digits starting with 0)'
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

    // Variables to hold registration data (either from request or previous OTP record)
    let registrationEmail = email;
    let registrationFullName = full_name;
    let registrationPassword = password;
    let registrationReferralCode = referral_code;

    // For resend: Get registration data from previous OTP record
    if (isResend) {
      console.log(`[Resend] Looking up previous OTP record: ${previous_record_id}`);

      const { data: previousOtp, error: previousOtpError } = await supabase
        .from('otp_verifications')
        .select('registration_data')
        .eq('id', previous_record_id)
        .eq('phone', phone)
        .single();

      if (previousOtpError || !previousOtp) {
        console.error('[Resend] Previous OTP not found:', previousOtpError);
        return errorResponse('Không tìm thấy thông tin đăng ký trước đó. Vui lòng đăng ký lại.', 'PREVIOUS_OTP_NOT_FOUND', 400, {
          previous_record_id,
          phone
        });
      }

      // Extract registration data from previous record
      const prevRegData = previousOtp.registration_data;
      registrationEmail = prevRegData?.email;
      registrationFullName = prevRegData?.full_name;
      registrationPassword = prevRegData?.password;
      registrationReferralCode = prevRegData?.referral_code;

      if (!registrationEmail || !registrationFullName || !registrationPassword) {
        console.error('[Resend] Incomplete registration data in previous record');
        return errorResponse('Thông tin đăng ký không đầy đủ. Vui lòng đăng ký lại.', 'INCOMPLETE_REGISTRATION_DATA', 400, {
          has_email: !!registrationEmail,
          has_full_name: !!registrationFullName,
          has_password: !!registrationPassword
        });
      }

      // Mark previous OTP as used to prevent reuse
      await supabase
        .from('otp_verifications')
        .update({ is_used: true })
        .eq('id', previous_record_id);

      console.log(`[Resend] Using registration data from previous OTP for: ${registrationEmail}`);
    }

    // Check if phone already exists in f0_partners (skip for resend since we already validated on first send)
    if (!isResend) {
      const { data: existingPhone, error: phoneCheckError } = await supabase
        .from('f0_partners')
        .select('id')
        .eq('phone', phone)
        .single();

      if (phoneCheckError && phoneCheckError.code !== 'PGRST116') {
        console.error('[Database] Phone check error:', JSON.stringify(phoneCheckError));
        return errorResponse('Lỗi kiểm tra số điện thoại', 'PHONE_CHECK_ERROR', 500, {
          code: phoneCheckError.code,
          message: phoneCheckError.message,
          details: phoneCheckError.details
        });
      }

      if (existingPhone) {
        return errorResponse('Số điện thoại đã được đăng ký', 'PHONE_EXISTS', 400, {
          phone,
          existing_id: existingPhone.id
        });
      }

      // Check if email already exists
      const { data: existingEmail, error: emailCheckError } = await supabase
        .from('f0_partners')
        .select('id')
        .eq('email', registrationEmail)
        .single();

      if (emailCheckError && emailCheckError.code !== 'PGRST116') {
        console.error('[Database] Email check error:', JSON.stringify(emailCheckError));
        return errorResponse('Lỗi kiểm tra email', 'EMAIL_CHECK_ERROR', 500, {
          code: emailCheckError.code,
          message: emailCheckError.message,
          details: emailCheckError.details
        });
      }

      if (existingEmail) {
        return errorResponse('Email đã được đăng ký', 'EMAIL_EXISTS', 400, {
          email: registrationEmail,
          existing_id: existingEmail.id
        });
      }
    }

    // Get Vihat credentials via RPC function
    const { data: vihatCreds, error: vihatError } = await supabase.rpc('get_vihat_credential');

    if (vihatError) {
      console.error('[Vihat] RPC get_vihat_credential error:', JSON.stringify(vihatError));
      return errorResponse('Không thể lấy thông tin xác thực Vihat', 'VIHAT_CREDENTIAL_ERROR', 500, {
        code: vihatError.code,
        message: vihatError.message,
        details: vihatError.details,
        hint: vihatError.hint
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
      console.error('[Decrypt] Failed to decrypt Vihat secret:', decryptError);
      return errorResponse('Không thể giải mã thông tin xác thực', 'DECRYPT_ERROR', 500, {
        error: String(decryptError)
      });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const minute = 5;
    const expiresAt = new Date(Date.now() + minute * 60 * 1000);

    // Save OTP record (use registration data variables which may be from previous record for resend)
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        phone,
        otp_code: otpCode,
        registration_data: {
          email: registrationEmail,
          full_name: registrationFullName,
          password: registrationPassword,
          referral_code: registrationReferralCode || null
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
    const smsContent = `MKTAMDUC - Ma xac thuc dang ky Mat Kinh Tam Duc cua ban la ${otpCode}. Ma co hieu luc trong ${minute} phut.`;
    const vihatPayload = {
      ApiKey: vihatApiKey,
      SecretKey: vihatSecretKey,
      Phone: phone,
      Channels: ["zalo", "sms"],
      Data: [
        {
          TempID: "478665",
          Params: [otpCode, minute.toString()],
          OAID: "939629380721919913",
          campaignid: "Đăng ký F0",
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

    console.log('[Vihat] Sending MultiChannelMessage...');
    console.log(`[Vihat] Phone: ${phone}, OTP Record ID: ${otpRecord.id}`);

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
      // Delete OTP record since SMS failed
      await supabase.from('otp_verifications').delete().eq('id', otpRecord.id);
      return errorResponse('Không thể kết nối đến Vihat API', 'VIHAT_FETCH_ERROR', 500, {
        error: String(fetchError),
        otp_record_deleted: true
      });
    }

    if (!vihatResponse.ok) {
      const errorText = await vihatResponse.text();
      console.error('[Vihat] HTTP error:', vihatResponse.status, errorText);
      await supabase.from('otp_verifications').delete().eq('id', otpRecord.id);
      return errorResponse('Vihat API trả về lỗi HTTP', 'VIHAT_HTTP_ERROR', 500, {
        status: vihatResponse.status,
        statusText: vihatResponse.statusText,
        body: errorText,
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
    const phoneMasked = phone.substring(0, 3) + '***' + phone.substring(phone.length - 4);

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
