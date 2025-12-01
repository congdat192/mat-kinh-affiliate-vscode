import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// =============================================================================
// verify-otp-affiliate v20 - Enhanced error_details for FE debugging
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const MAX_ATTEMPTS = 5;

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

// Hash password with SHA-256
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Call send-affiliate-registration-email Edge Function
async function sendRegistrationEmail(partner: { email: string; full_name: string; f0_code: string; phone: string }) {
  console.log('[Email] Calling send-affiliate-registration-email...');
  console.log(`[Email] Partner: ${partner.email}, ${partner.f0_code}`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const response = await fetch(`${supabaseUrl}/functions/v1/send-affiliate-registration-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        email: partner.email,
        fullName: partner.full_name,
        f0Code: partner.f0_code,
        phone: partner.phone
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Email] Function error:', JSON.stringify(result));
      return { success: false, error: result };
    }

    console.log('[Email] Sent successfully, ID:', result.emailId);
    return { success: true, emailId: result.emailId };
  } catch (error) {
    console.error('[Email] Error calling function:', error);
    return { success: false, error: String(error) };
  }
}

Deno.serve(async (req) => {
  console.log('\n========== VERIFY OTP AFFILIATE v20 ==========');

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

    const { record_id, phone, otp } = body;
    console.log(`[Request] record_id: ${record_id}, phone: ${phone}, otp: ${otp}`);

    // Validate required fields
    if (!record_id || !phone || !otp) {
      return errorResponse('Thiếu thông tin: record_id, phone, otp', 'MISSING_FIELDS', 400, {
        missing: {
          record_id: !record_id,
          phone: !phone,
          otp: !otp
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

    // Find OTP record
    console.log('[Database] Finding OTP record...');
    const { data: otpRecord, error: findError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('id', record_id)
      .eq('phone', phone)
      .single();

    if (findError) {
      console.error('[Database] Find OTP error:', JSON.stringify(findError));
      if (findError.code !== 'PGRST116') {
        return errorResponse('Lỗi truy vấn OTP', 'OTP_QUERY_ERROR', 500, {
          code: findError.code,
          message: findError.message,
          details: findError.details
        });
      }
    }

    if (!otpRecord) {
      console.log('[OTP] Record not found');
      return errorResponse('Mã OTP không hợp lệ hoặc đã hết hạn', 'OTP_NOT_FOUND', 400, {
        record_id,
        phone
      });
    }

    console.log('[OTP] Found record');
    const now = new Date();

    // Check if already used
    if (otpRecord.is_used) {
      console.log('[OTP] Already used');
      return errorResponse('Mã OTP đã được sử dụng', 'OTP_ALREADY_USED', 400, {
        record_id,
        used_at: otpRecord.verified_at
      });
    }

    // Check if expired
    if (new Date(otpRecord.expires_at) < now) {
      console.log('[OTP] Expired');
      return errorResponse('Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.', 'OTP_EXPIRED', 400, {
        expires_at: otpRecord.expires_at,
        current_time: now.toISOString()
      });
    }

    // Check max attempts
    const attempts = (otpRecord.registration_data?.attempts || 0) + 1;
    if (attempts > MAX_ATTEMPTS) {
      console.log('[OTP] Max attempts exceeded');
      return errorResponse('Đã thử sai quá nhiều lần. Vui lòng yêu cầu mã OTP mới.', 'MAX_ATTEMPTS_EXCEEDED', 400, {
        attempts,
        max_attempts: MAX_ATTEMPTS
      });
    }

    // Verify OTP code
    if (otpRecord.otp_code !== otp) {
      console.log('[OTP] Wrong code');
      // Update attempts count
      const { error: updateError } = await supabase
        .from('otp_verifications')
        .update({
          registration_data: {
            ...otpRecord.registration_data,
            attempts
          }
        })
        .eq('id', record_id);

      if (updateError) {
        console.error('[Database] Update attempts error:', JSON.stringify(updateError));
      }

      const remaining = MAX_ATTEMPTS - attempts;
      return errorResponse(`Mã OTP không chính xác. Còn ${remaining} lần thử.`, 'WRONG_OTP', 400, {
        remaining_attempts: remaining,
        attempts_used: attempts
      });
    }

    console.log('[OTP] Verified successfully');

    // Hash password
    const regData = otpRecord.registration_data;
    if (!regData || !regData.password || !regData.email || !regData.full_name) {
      console.error('[Registration] Missing registration data');
      return errorResponse('Dữ liệu đăng ký không đầy đủ', 'INVALID_REGISTRATION_DATA', 500, {
        has_password: !!regData?.password,
        has_email: !!regData?.email,
        has_full_name: !!regData?.full_name
      });
    }

    const passwordHash = await hashPassword(regData.password);

    // Create F0 partner
    console.log('[Database] Creating F0 partner...');
    const { data: newPartner, error: partnerError } = await supabase
      .from('f0_partners')
      .insert({
        phone: phone,
        email: regData.email,
        full_name: regData.full_name,
        password_hash: passwordHash,
        referral_code: regData.referral_code,
        is_active: true,
        is_approved: false
      })
      .select()
      .single();

    if (partnerError) {
      console.error('[Database] Partner insert error:', JSON.stringify(partnerError));
      if (partnerError.code === '23505') {
        return errorResponse('Số điện thoại hoặc email đã được đăng ký', 'DUPLICATE_PARTNER', 400, {
          code: partnerError.code,
          message: partnerError.message,
          details: partnerError.details
        });
      }
      return errorResponse('Không thể tạo tài khoản', 'PARTNER_INSERT_ERROR', 500, {
        code: partnerError.code,
        message: partnerError.message,
        details: partnerError.details,
        hint: partnerError.hint
      });
    }

    console.log(`[Partner] Created with F0 code: ${newPartner.f0_code}`);

    // Mark OTP as used
    const { error: markUsedError } = await supabase
      .from('otp_verifications')
      .update({
        is_used: true,
        verified_at: now.toISOString()
      })
      .eq('id', record_id);

    if (markUsedError) {
      console.error('[Database] Mark OTP used error:', JSON.stringify(markUsedError));
      // Non-critical error, continue
    }

    console.log('[OTP] Marked as used');

    // Send registration confirmation email (non-blocking)
    const emailResult = await sendRegistrationEmail({
      email: newPartner.email,
      full_name: newPartner.full_name,
      f0_code: newPartner.f0_code,
      phone: newPartner.phone
    });

    console.log('[Complete] VERIFY OTP SUCCESS');

    return new Response(JSON.stringify({
      success: true,
      message: 'Đăng ký thành công! Tài khoản của bạn đang chờ phê duyệt.',
      partner: {
        id: newPartner.id,
        f0_code: newPartner.f0_code,
        full_name: newPartner.full_name,
        email: newPartner.email,
        phone: newPartner.phone,
        is_approved: newPartner.is_approved
      },
      email_sent: emailResult.success
    }), {
      status: 200,
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
