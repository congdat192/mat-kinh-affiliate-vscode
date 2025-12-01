import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// =============================================================================
// reset-password-affiliate v3 - Enhanced error_details for FE debugging
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

// SHA-256 hash function
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  console.log('\n========== RESET PASSWORD AFFILIATE v3 ==========');

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

    const { token, new_password } = body;

    // Validate token
    if (!token) {
      return errorResponse('Token không hợp lệ', 'MISSING_TOKEN', 400, {
        missing: { token: true }
      });
    }

    // Validate password
    if (!new_password) {
      return errorResponse('Vui lòng nhập mật khẩu mới', 'MISSING_PASSWORD', 400, {
        missing: { new_password: true }
      });
    }

    // Validate password length
    if (new_password.length < 6) {
      return errorResponse('Mật khẩu phải có ít nhất 6 ký tự', 'PASSWORD_TOO_SHORT', 400, {
        password_length: new_password.length,
        min_length: 6
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

    // Find reset token
    console.log('[Database] Finding reset token...');
    const { data: resetRecord, error: findError } = await supabase
      .from('password_resets')
      .select('id, f0_id, email, expires_at, is_used')
      .eq('token', token)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('[Database] Find token error:', JSON.stringify(findError));
      return errorResponse('Lỗi truy vấn token', 'TOKEN_QUERY_ERROR', 500, {
        code: findError.code,
        message: findError.message,
        details: findError.details
      });
    }

    if (!resetRecord) {
      console.log('[Token] Not found');
      return errorResponse('Liên kết đặt lại mật khẩu không hợp lệ', 'INVALID_TOKEN', 400, {
        token_prefix: token.substring(0, 8) + '...'
      });
    }

    console.log(`[Token] Found for email: ${resetRecord.email}`);

    // Check if token is already used
    if (resetRecord.is_used) {
      console.log('[Token] Already used');
      return errorResponse('Liên kết này đã được sử dụng', 'TOKEN_USED', 400, {
        token_id: resetRecord.id
      });
    }

    // Check if token is expired
    const expiresAt = new Date(resetRecord.expires_at);
    const now = new Date();

    if (now > expiresAt) {
      console.log('[Token] Expired');
      return errorResponse('Liên kết đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.', 'TOKEN_EXPIRED', 400, {
        expires_at: resetRecord.expires_at,
        current_time: now.toISOString()
      });
    }

    // Hash new password
    const passwordHash = await sha256(new_password);
    console.log('[Password] Hashed');

    // Update password in f0_partners
    console.log('[Database] Updating password...');
    const { error: updateError } = await supabase
      .from('f0_partners')
      .update({ password_hash: passwordHash })
      .eq('id', resetRecord.f0_id);

    if (updateError) {
      console.error('[Database] Update password error:', JSON.stringify(updateError));
      return errorResponse('Lỗi cập nhật mật khẩu', 'PASSWORD_UPDATE_ERROR', 500, {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        f0_id: resetRecord.f0_id
      });
    }

    console.log('[Password] Updated successfully');

    // Mark token as used
    const { error: markUsedError } = await supabase
      .from('password_resets')
      .update({
        is_used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', resetRecord.id);

    if (markUsedError) {
      console.error('[Database] Mark token used error:', JSON.stringify(markUsedError));
      // Non-critical error, password was already updated
    }

    console.log('[Complete] Password reset successful');

    return new Response(JSON.stringify({
      success: true,
      message: "Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới."
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
