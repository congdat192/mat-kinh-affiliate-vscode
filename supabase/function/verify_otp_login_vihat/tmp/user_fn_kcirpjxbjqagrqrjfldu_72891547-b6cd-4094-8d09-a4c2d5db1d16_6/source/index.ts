import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
console.info('=== VERIFY_OTP_LOGIN_VIHAT FUNCTION STARTED ===');
// ✅ GIỮ NGUYÊN - Helper: Get Vietnam time (dùng cho RBAC)
function getVietnamTime() {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + 7 * 3600000);
}
// 🔒 RBAC CHECK FUNCTION
async function checkRBACPermissions(supabase, client_id, resource, operation) {
  console.log(`🔒 RBAC Check: ${client_id} - ${resource} - ${operation}`);
  const { data: clientRoles } = await supabase.from('oauth_client_roles').select('*').eq('client_id', client_id);
  if (!clientRoles || clientRoles.length === 0) {
    return null; // Fallback to legacy
  }
  for (const clientRole of clientRoles){
    // ✅ GIỮ NGUYÊN - Skip expired roles
    if (clientRole.expires_at && new Date(clientRole.expires_at) < getVietnamTime()) {
      continue;
    }
    const { data: role } = await supabase.from('oauth_roles').select('*').eq('id', clientRole.role_id).eq('active', true).single();
    if (!role) continue;
    const { data: permissions } = await supabase.from('oauth_role_permissions').select('*').eq('role_id', clientRole.role_id);
    if (!permissions) continue;
    for (const perm of permissions){
      if (perm.resource === resource && perm.can_read) {
        console.log(`✅ RBAC GRANTED`);
        return true;
      }
      if (perm.resource === '*' && perm.can_read) {
        console.log(`✅ RBAC GRANTED (wildcard)`);
        return true;
      }
    }
  }
  console.log('❌ RBAC DENIED');
  return false;
}
// Legacy check
function checkLegacyPermissions(allowed_resources, resource) {
  if (!allowed_resources) return false;
  for (const pattern of allowed_resources){
    let resourcePattern = pattern;
    if (pattern.includes(':')) {
      resourcePattern = pattern.split(':')[0];
    }
    if (resourcePattern === resource || resourcePattern === '*') {
      return true;
    }
  }
  return false;
}
// MAIN HANDLER
Deno.serve(async (req)=>{
  console.log('\n========== VERIFY OTP REQUEST ==========');
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      }
    });
  }
  try {
    // ========== STEP 1: VALIDATE TOKEN ==========
    console.log('📋 STEP 1: Validate Token');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Thiếu token xác thực. Yêu cầu Bearer token trong header Authorization',
        data: {
          error_code: 'MISSING_TOKEN'
        }
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const oauthToken = authHeader.replace('Bearer ', '').trim();
    // ========== STEP 2: GET RECORD_ID, PHONE & OTP ==========
    console.log('📱 STEP 2: Get Record ID, Phone & OTP');
    const { record_id, phone, otp } = await req.json();
    if (!record_id || !phone || !otp) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Thiếu thông tin bắt buộc. Yêu cầu cung cấp đầy đủ: record_id, phone và otp',
        data: {
          error_code: 'MISSING_PARAMS'
        }
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Record ID: ${record_id}`);
    console.log(`Phone: ${phone}`);
    console.log(`OTP: ${otp}`);
    // ========== STEP 3: CONNECT DB ==========
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
      db: {
        schema: 'api'
      }
    });
    // ✅ SỬA: STEP 4: VALIDATE TOKEN IN DB
    console.log('🔍 STEP 4: Check Token');
    const { data: tokenRecord } = await supabase.from('oauth_tokens').select('*').eq('access_token', oauthToken).eq('revoked', false).gt('expires_at_vn', new Date().toISOString()) // ✅ SỬA CHỖ NÀY
    .single();
    if (!tokenRecord) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn',
        data: {
          error_code: 'INVALID_TOKEN'
        }
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const { data: clientRecord } = await supabase.from('oauth_clients').select('*').eq('client_id', tokenRecord.client_id).single();
    if (!clientRecord?.active) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Tài khoản client đã bị vô hiệu hóa',
        data: {
          error_code: 'CLIENT_SUSPENDED'
        }
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // ========== STEP 5: CHECK RBAC ==========
    console.log('🔐 STEP 5: Check RBAC');
    const resource = 'supabaseapi.otp_login_vihat';
    const operation = 'read';
    const rbacResult = await checkRBACPermissions(supabase, tokenRecord.client_id, resource, operation);
    let hasAccess = false;
    if (rbacResult !== null) {
      hasAccess = rbacResult;
    } else {
      const allowedResources = tokenRecord.scopes || clientRecord.allowed_resources;
      hasAccess = checkLegacyPermissions(allowedResources, resource);
    }
    if (!hasAccess) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Không có quyền truy cập dữ liệu OTP login',
        data: {
          error_code: 'INSUFFICIENT_PERMISSION'
        }
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // ✅ SỬA: STEP 6: FIND & VERIFY OTP
    console.log('🔍 STEP 6: Find OTP Record by ID');
    const now = new Date(); // ✅ UTC time
    const { data: otpRecord, error: findError } = await supabase.from('otp_login_vihat').select('*').eq('id', record_id).single();
    if (findError || !otpRecord) {
      console.log('❌ Record not found');
      return new Response(JSON.stringify({
        success: false,
        message: 'Không tìm thấy mã OTP với record_id này',
        data: {
          error_code: 'OTP_NOT_FOUND',
          record_id: record_id
        }
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Found OTP record: ${otpRecord.id}`);
    console.log(`Phone: ${otpRecord.phone}`);
    console.log(`Attempts: ${otpRecord.attempts}/5`);
    // Check if already verified
    if (otpRecord.verified === true) {
      console.log('❌ OTP already used');
      return new Response(JSON.stringify({
        success: false,
        message: 'Mã OTP này đã được xác thực trước đó',
        data: {
          error_code: 'OTP_ALREADY_USED',
          record_id: otpRecord.id,
          verified_at: otpRecord.verified_at_vn
        }
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // ✅ SỬA: Check if expired
    if (new Date(otpRecord.expires_at_vn) < now) {
      console.log('❌ OTP expired');
      return new Response(JSON.stringify({
        success: false,
        message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới',
        data: {
          error_code: 'OTP_EXPIRED',
          record_id: otpRecord.id,
          expired_at: otpRecord.expires_at_vn
        }
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Check max attempts
    if (otpRecord.attempts >= 5) {
      console.log('❌ Max attempts exceeded');
      return new Response(JSON.stringify({
        success: false,
        message: 'Đã thử sai 5 lần. Vui lòng yêu cầu mã OTP mới',
        data: {
          error_code: 'MAX_ATTEMPTS_EXCEEDED',
          record_id: otpRecord.id,
          attempts: otpRecord.attempts
        }
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // ========== STEP 7: VERIFY OTP CODE ==========
    console.log('🔐 STEP 7: Verify OTP Code');
    if (otpRecord.otp_code !== otp) {
      console.log('❌ Wrong OTP');
      await supabase.from('otp_login_vihat').update({
        attempts: otpRecord.attempts + 1
      }).eq('id', otpRecord.id);
      const remaining = 4 - otpRecord.attempts;
      return new Response(JSON.stringify({
        success: false,
        message: `Mã OTP không chính xác. Còn ${remaining} lần thử`,
        data: {
          error_code: 'WRONG_OTP',
          record_id: otpRecord.id,
          attempts: otpRecord.attempts + 1,
          remaining_attempts: remaining
        }
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // ✅ SỬA: STEP 8: MARK AS VERIFIED
    console.log('✅ OTP Correct! Marking as verified');
    await supabase.from('otp_login_vihat').update({
      verified: true,
      verified_at: now.toISOString(),
      verified_at_vn: now.toISOString() // ✅ ĐỔI nowVN → now
    }).eq('id', otpRecord.id);
    // ========== STEP 9: CREATE SESSION/TOKEN ==========
    console.log('🎫 STEP 9: Create Session');
    // TODO: Create user session/JWT token here
    // ✅ SỬA: Log usage
    await supabase.from('oauth_token_usage').insert({
      token_id: tokenRecord.id,
      client_id: tokenRecord.client_id,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      endpoint: 'verify_otp_login_vihat',
      status_code: 200,
      created_at: now.toISOString(),
      created_at_vn: now.toISOString() // ✅ ĐỔI nowVN → now
    });
    console.log('\n✅ VERIFY SUCCESS');
    console.log('========================================\n');
    return new Response(JSON.stringify({
      success: true,
      message: 'Xác thực OTP thành công',
      data: {
        phone: otpRecord.phone,
        record_id: otpRecord.id
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau',
      data: {
        error_code: 'INTERNAL_ERROR',
        request_id: crypto.randomUUID()
      }
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
