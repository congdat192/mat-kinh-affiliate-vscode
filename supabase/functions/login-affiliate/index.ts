import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// =============================================================================
// login-affiliate v16 - Enhanced error_details for FE debugging
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

// Hash password with SHA-256
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  console.log('\n========== LOGIN AFFILIATE v16 ==========');

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

    const { email_or_phone, password } = body;
    console.log(`[Request] email_or_phone: ${email_or_phone}`);

    // Validate required fields
    if (!email_or_phone || !password) {
      return errorResponse('Vui lòng nhập email/số điện thoại và mật khẩu', 'MISSING_FIELDS', 400, {
        missing: {
          email_or_phone: !email_or_phone,
          password: !password
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

    // Determine login type
    const isEmail = email_or_phone.includes('@');
    const isPhone = /^0[0-9]{9}$/.test(email_or_phone);

    if (!isEmail && !isPhone) {
      return errorResponse('Email hoặc số điện thoại không hợp lệ', 'INVALID_FORMAT', 400, {
        input: email_or_phone,
        is_email: isEmail,
        is_phone: isPhone,
        expected_phone_format: '0XXXXXXXXX (10 digits starting with 0)'
      });
    }

    // Find user
    console.log(`[Database] Finding user by ${isEmail ? 'email' : 'phone'}...`);
    const query = supabase.from('f0_partners').select('*');

    if (isEmail) {
      query.eq('email', email_or_phone.toLowerCase());
    } else {
      query.eq('phone', email_or_phone);
    }

    const { data: user, error: findError } = await query.single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('[Database] Find user error:', JSON.stringify(findError));
      return errorResponse('Lỗi truy vấn tài khoản', 'USER_QUERY_ERROR', 500, {
        code: findError.code,
        message: findError.message,
        details: findError.details
      });
    }

    if (!user) {
      console.log('[User] Not found');
      return errorResponse('Tài khoản không tồn tại. Vui lòng kiểm tra lại email/số điện thoại.', 'USER_NOT_FOUND', 400, {
        login_type: isEmail ? 'email' : 'phone',
        input: email_or_phone
      });
    }

    console.log(`[User] Found: ${user.f0_code}`);

    // Verify password
    console.log('[Auth] Verifying password...');
    const passwordHash = await hashPassword(password);

    if (passwordHash !== user.password_hash) {
      console.log('[Auth] Invalid password');
      return errorResponse('Mật khẩu không chính xác. Vui lòng thử lại.', 'WRONG_PASSWORD', 400, {
        user_id: user.id,
        f0_code: user.f0_code
      });
    }

    console.log('[Auth] Password verified');

    // Check account status
    console.log(`[Status] is_active: ${user.is_active}, is_approved: ${user.is_approved}`);

    if (!user.is_active) {
      console.log('[Status] Account is locked');
      return errorResponse('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.', 'ACCOUNT_LOCKED', 400, {
        user_id: user.id,
        f0_code: user.f0_code,
        is_active: user.is_active
      });
    }

    // Success
    console.log('[Complete] LOGIN SUCCESS');

    return new Response(JSON.stringify({
      success: true,
      message: 'Đăng nhập thành công',
      user: {
        id: user.id,
        f0_code: user.f0_code,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        is_active: user.is_active,
        is_approved: user.is_approved,
        created_at: user.created_at,
        avatar_url: user.avatar_url || null
      },
      approval_status: user.is_approved ? 'approved' : 'pending'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Unexpected] Error:', error);
    return errorResponse('Lỗi hệ thống. Vui lòng thử lại sau.', 'UNEXPECTED_ERROR', 500, {
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});
