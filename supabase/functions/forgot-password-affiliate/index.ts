import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// =============================================================================
// forgot-password-affiliate v6 - Enhanced error_details for FE debugging
// =============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
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
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

// AES-256-GCM decryption
async function decrypt(encryptedBase64: string, keyBase64: string): Promise<string> {
  const encryptedBytes = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));

  const iv = encryptedBytes.slice(0, 12);
  const ciphertextWithTag = encryptedBytes.slice(12);

  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertextWithTag);

  return new TextDecoder().decode(decrypted);
}

Deno.serve(async (req) => {
  console.log('\n========== FORGOT PASSWORD AFFILIATE v6 ==========');

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const { email, baseUrl } = body;
    console.log(`[Request] email: ${email}`);

    // Validate input
    if (!email) {
      return errorResponse('Vui lòng nhập email', 'MISSING_EMAIL', 400, {
        missing: { email: true }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('Email không hợp lệ', 'INVALID_EMAIL', 400, {
        email,
        expected_format: 'example@domain.com'
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Config] Missing Supabase credentials');
      return errorResponse('Lỗi cấu hình server', 'CONFIG_ERROR', 500, {
        missing: {
          SUPABASE_URL: !supabaseUrl,
          SUPABASE_SERVICE_ROLE_KEY: !supabaseKey
        }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      db: { schema: 'api' }
    });

    // Check if user exists
    console.log('[Database] Finding user...');
    const { data: user, error: userError } = await supabase
      .from('f0_partners')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase())
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('[Database] User lookup error:', JSON.stringify(userError));
      return errorResponse('Lỗi truy vấn tài khoản', 'USER_QUERY_ERROR', 500, {
        code: userError.code,
        message: userError.message,
        details: userError.details
      });
    }

    if (!user) {
      console.log('[User] Not found');
      return errorResponse('Email không tồn tại trong hệ thống', 'EMAIL_NOT_FOUND', 400, {
        email: email.toLowerCase()
      });
    }

    console.log(`[User] Found: ${user.id}`);

    // Check for existing valid token (rate limiting)
    const { data: existingToken, error: tokenCheckError } = await supabase
      .from('password_resets')
      .select('id, created_at')
      .eq('email', email.toLowerCase())
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenCheckError && tokenCheckError.code !== 'PGRST116') {
      console.error('[Database] Token check error:', JSON.stringify(tokenCheckError));
      // Non-critical, continue
    }

    // Rate limit: if token was created less than 1 minute ago
    if (existingToken) {
      const createdAt = new Date(existingToken.created_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - createdAt.getTime()) / 60000;

      if (diffMinutes < 1) {
        const waitSeconds = Math.ceil((1 - diffMinutes) * 60);
        return errorResponse('Vui lòng đợi trước khi gửi lại', 'RATE_LIMIT', 400, {
          wait_seconds: waitSeconds,
          last_request_at: existingToken.created_at
        });
      }
    }

    // Generate reset token
    const token = crypto.randomUUID();
    console.log('[Token] Generated');

    // Save token to database
    const { error: insertError } = await supabase
      .from('password_resets')
      .insert({
        f0_id: user.id,
        email: email.toLowerCase(),
        token: token
      });

    if (insertError) {
      console.error('[Database] Insert token error:', JSON.stringify(insertError));
      return errorResponse('Lỗi lưu token đặt lại mật khẩu', 'TOKEN_INSERT_ERROR', 500, {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
    }

    console.log('[Token] Saved to database');

    // Get Resend credentials
    const { data: resendCreds, error: credsError } = await supabase.rpc('get_resend_credential');

    if (credsError) {
      console.error('[Resend] RPC error:', JSON.stringify(credsError));
      return errorResponse('Lỗi lấy thông tin cấu hình email', 'RESEND_CREDENTIAL_ERROR', 500, {
        code: credsError.code,
        message: credsError.message,
        details: credsError.details
      });
    }

    if (!resendCreds || resendCreds.length === 0) {
      console.error('[Resend] No credentials found');
      return errorResponse('Không tìm thấy cấu hình email', 'RESEND_NO_CREDENTIALS', 500, {
        result_count: resendCreds?.length || 0
      });
    }

    const encryptedApiKey = resendCreds[0].api_key_encrypted;

    // Get encryption key from env
    const encryptionKey = Deno.env.get('RESEND_API_KEY');
    if (!encryptionKey) {
      console.error('[Config] RESEND_API_KEY not found');
      return errorResponse('Thiếu cấu hình mã hóa email', 'MISSING_ENCRYPTION_KEY', 500, {
        env_var: 'RESEND_API_KEY'
      });
    }

    // Decrypt Resend API key
    let resendApiKey: string;
    try {
      resendApiKey = await decrypt(encryptedApiKey, encryptionKey);
    } catch (decryptError) {
      console.error('[Decrypt] Failed:', decryptError);
      return errorResponse('Không thể giải mã thông tin email', 'DECRYPT_ERROR', 500, {
        error: String(decryptError)
      });
    }

    // Build reset URL
    const resetUrl = `${baseUrl || 'https://matkinhtamduc.com'}/f0/auth/reset-password?token=${token}`;
    console.log(`[Email] Reset URL: ${resetUrl}`);

    // Send email via Resend
    let emailResponse;
    try {
      emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Mắt Kính Tâm Đức <affiliate@matkinhtamduc.com>',
          to: [email],
          subject: 'Đặt lại mật khẩu - Mắt Kính Tâm Đức',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Đặt lại mật khẩu</h2>
              <p>Xin chào <strong>${user.full_name}</strong>,</p>
              <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
              <p>Nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}"
                   style="background-color: #2563eb; color: white; padding: 12px 24px;
                          text-decoration: none; border-radius: 6px; display: inline-block;">
                  Đặt lại mật khẩu
                </a>
              </p>
              <p style="color: #666; font-size: 14px;">Liên kết này sẽ hết hạn sau <strong>15 phút</strong>.</p>
              <p style="color: #666; font-size: 14px;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="color: #999; font-size: 12px;">Mắt Kính Tâm Đức - Hệ thống Affiliate</p>
            </div>
          `
        })
      });
    } catch (fetchError) {
      console.error('[Resend] Fetch error:', fetchError);
      return errorResponse('Không thể kết nối đến Resend API', 'RESEND_FETCH_ERROR', 500, {
        error: String(fetchError)
      });
    }

    let emailResult;
    try {
      emailResult = await emailResponse.json();
    } catch (parseError) {
      console.error('[Resend] JSON parse error:', parseError);
      return errorResponse('Không thể parse response từ Resend', 'RESEND_PARSE_ERROR', 500, {
        status: emailResponse.status,
        error: String(parseError)
      });
    }

    if (!emailResponse.ok) {
      console.error('[Resend] Email error:', JSON.stringify(emailResult));
      return errorResponse('Không thể gửi email', 'RESEND_EMAIL_ERROR', 500, {
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        error: emailResult
      });
    }

    console.log('[Complete] Email sent successfully');

    return new Response(JSON.stringify({
      success: true,
      message: "Đã gửi email đặt lại mật khẩu",
      email_masked: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      email_id: emailResult.id
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('[Unexpected] Error:', error);
    return errorResponse('Lỗi hệ thống', 'UNEXPECTED_ERROR', 500, {
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});
