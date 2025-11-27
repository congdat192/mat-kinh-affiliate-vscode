import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
console.info('=== SEND_OTP_LOGIN_VIHAT FUNCTION STARTED ===');
// RATE LIMITS CONFIGURATION
const RATE_LIMITS = {
  DELAY_BETWEEN_MS: 60000,
  MAX_PER_PHONE_HOUR: 5,
  MAX_PER_IP_HOUR: 20,
  MAX_GLOBAL_MINUTE: 200,
  MAX_DAILY_COST_VND: 5000,
  HOUR_IN_MS: 3600000,
  MINUTE_IN_MS: 60000
};
// Helper: Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
// ✅ GIỮ NGUYÊN - Helper: Get Vietnam time (dùng cho RBAC)
function getVietnamTime() {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + 7 * 3600000);
}
// 🔒 RBAC CHECK FUNCTION
async function checkRBACPermissions(supabase, client_id, resource, operation) {
  console.log(`\n🔒 RBAC CHECK:`);
  console.log(`   Client: ${client_id}`);
  console.log(`   Resource: ${resource}`);
  console.log(`   Operation: ${operation}`);
  const { data: clientRoles, error: roleError } = await supabase.from('oauth_client_roles').select('*').eq('client_id', client_id);
  if (roleError || !clientRoles || clientRoles.length === 0) {
    console.log('   ❌ No RBAC roles found');
    return null;
  }
  console.log(`   Found ${clientRoles.length} roles`);
  for (const clientRole of clientRoles){
    // ✅ GIỮ NGUYÊN - Skip expired roles
    if (clientRole.expires_at && new Date(clientRole.expires_at) < getVietnamTime()) {
      continue;
    }
    const { data: role } = await supabase.from('oauth_roles').select('*').eq('id', clientRole.role_id).eq('active', true).single();
    if (!role) continue;
    console.log(`   Checking role: ${role.role_code}`);
    const { data: permissions } = await supabase.from('oauth_role_permissions').select('*').eq('role_id', clientRole.role_id);
    if (!permissions) continue;
    for (const perm of permissions){
      // EXACT MATCH FIRST
      if (perm.resource === resource) {
        const hasPermission = operation === 'create' && perm.can_create;
        if (hasPermission) {
          console.log(`   ✅ RBAC GRANTED - exact match`);
          return true;
        }
      }
      // WILDCARD CHECK
      if (perm.resource === '*') {
        const hasPermission = operation === 'create' && perm.can_create;
        if (hasPermission) {
          console.log(`   ✅ RBAC GRANTED - wildcard`);
          return true;
        }
      }
      // PATTERN WILDCARD
      if (perm.resource.includes('*')) {
        const pattern = perm.resource.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(resource)) {
          const hasPermission = operation === 'create' && perm.can_create;
          if (hasPermission) {
            console.log(`   ✅ RBAC GRANTED - pattern match`);
            return true;
          }
        }
      }
    }
  }
  console.log('   ❌ RBAC DENIED');
  return false;
}
// Legacy check fallback
function checkLegacyPermissions(allowed_resources, resource) {
  if (!allowed_resources) return false;
  console.log('   Checking legacy permissions...');
  for (const pattern of allowed_resources){
    let resourcePattern = pattern;
    if (pattern.includes(':')) {
      resourcePattern = pattern.split(':')[0];
    }
    if (resourcePattern === resource || resourcePattern === '*') {
      console.log('   ✅ Legacy permission GRANTED');
      return true;
    }
    if (resourcePattern.includes('*')) {
      const regex = new RegExp('^' + resourcePattern.replace(/\*/g, '.*') + '$');
      if (regex.test(resource)) {
        console.log('   ✅ Legacy permission GRANTED');
        return true;
      }
    }
  }
  console.log('   ❌ Legacy permission DENIED');
  return false;
}
// MAIN HANDLER
Deno.serve(async (req)=>{
  console.log('\n========== NEW REQUEST TO send_otp_login_vihat ==========');
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
    console.log('\n📋 STEP 1: Validate Token');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing Bearer token');
      return new Response(JSON.stringify({
        error: 'Missing token',
        error_description: 'Bearer token required'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const oauthToken = authHeader.replace('Bearer ', '').trim();
    console.log(`Token: ${oauthToken.substring(0, 10)}...`);
    // ========== STEP 2: GET PHONE ==========
    console.log('\n📱 STEP 2: Get Phone');
    const { phone } = await req.json();
    if (!phone) {
      console.error('❌ Phone missing');
      return new Response(JSON.stringify({
        error: 'Phone required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Phone received: ${phone}`);
    // ========== STEP 3: CONNECT DB ==========
    console.log('\n🔌 STEP 3: Connect Database');
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
      db: {
        schema: 'api'
      }
    });
    // ✅ SỬA: STEP 4: VALIDATE TOKEN IN DB
    console.log('\n🔍 STEP 4: Check Token in Database');
    const { data: tokenRecord } = await supabase.from('oauth_tokens').select('*').eq('access_token', oauthToken).eq('revoked', false).gt('expires_at_vn', new Date().toISOString()) // ✅ SỬA CHỖ NÀY
    .single();
    if (!tokenRecord) {
      console.error('❌ Token invalid/expired');
      return new Response(JSON.stringify({
        error: 'Invalid token'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`✅ Token valid for client: ${tokenRecord.client_id}`);
    // Get client info
    const { data: clientRecord } = await supabase.from('oauth_clients').select('*').eq('client_id', tokenRecord.client_id).single();
    if (!clientRecord?.active) {
      console.error('❌ Client suspended');
      return new Response(JSON.stringify({
        error: 'Client suspended'
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // ========== STEP 5: CHECK RBAC ==========
    console.log('\n🔐 STEP 5: Check RBAC Permissions');
    const resource = 'supabaseapi.otp_login_vihat';
    const operation = 'create';
    const rbacResult = await checkRBACPermissions(supabase, tokenRecord.client_id, resource, operation);
    let hasAccess = false;
    if (rbacResult !== null) {
      hasAccess = rbacResult;
    } else {
      const allowedResources = tokenRecord.scopes || clientRecord.allowed_resources;
      hasAccess = checkLegacyPermissions(allowedResources, resource);
    }
    if (!hasAccess) {
      console.error('\n❌ ACCESS DENIED - NO PERMISSION');
      return new Response(JSON.stringify({
        error: 'Insufficient scope',
        error_description: `No create access to ${resource}`,
        required_permission: `${resource}:create`
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('✅ Permission GRANTED');
    // ✅ SỬA: STEP 6: RATE LIMITING CHECKS
    console.log('\n🛡️ STEP 6: Rate Limiting Checks');
    const now = new Date(); // ✅ UTC time
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    // 1️⃣ CHECK DELAY BETWEEN REQUESTS
    console.log('   Checking delay between requests...');
    const { data: lastOTP } = await supabase.from('otp_login_vihat').select('created_at_vn').eq('phone', phone).order('created_at_vn', {
      ascending: false
    }).limit(1).single();
    if (lastOTP) {
      const lastRequestTime = new Date(lastOTP.created_at_vn).getTime();
      const timeSinceLastOTP = now.getTime() - lastRequestTime; // ✅ ĐỔI nowVN → now
      if (timeSinceLastOTP < RATE_LIMITS.DELAY_BETWEEN_MS) {
        const waitTime = Math.ceil((RATE_LIMITS.DELAY_BETWEEN_MS - timeSinceLastOTP) / 1000);
        console.log(`   ❌ Too fast: Wait ${waitTime} seconds`);
        return new Response(JSON.stringify({
          success: false,
          error: 'Rate limit',
          error_description: `Vui lòng đợi ${waitTime} giây trước khi gửi lại OTP`,
          wait_seconds: waitTime
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    }
    // 2️⃣ CHECK PER PHONE RATE LIMIT
    console.log('   Checking phone rate limit...');
    const { count: phoneCount } = await supabase.from('otp_login_vihat').select('*', {
      count: 'exact',
      head: true
    }).eq('phone', phone).gte('created_at_vn', new Date(now.getTime() - RATE_LIMITS.HOUR_IN_MS).toISOString()); // ✅ ĐỔI nowVN → now
    if (phoneCount >= RATE_LIMITS.MAX_PER_PHONE_HOUR) {
      console.log(`   ❌ Phone limit exceeded: ${phoneCount}/${RATE_LIMITS.MAX_PER_PHONE_HOUR} per hour`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Rate limit exceeded',
        error_description: 'Số điện thoại nhận OTP vượt 5 lần/giờ. Vui lòng thử lại sau.'
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // 3️⃣ CHECK PER IP RATE LIMIT
    console.log('   Checking IP rate limit...');
    const { count: ipCount } = await supabase.from('otp_login_vihat').select('*', {
      count: 'exact',
      head: true
    }).eq('ip_address', clientIP).gte('created_at_vn', new Date(now.getTime() - RATE_LIMITS.HOUR_IN_MS).toISOString()); // ✅ ĐỔI nowVN → now
    if (ipCount >= RATE_LIMITS.MAX_PER_IP_HOUR) {
      console.log(`   ❌ IP limit exceeded: ${ipCount}/${RATE_LIMITS.MAX_PER_IP_HOUR} per hour`);
      return new Response(JSON.stringify({
        success: false,
        error: 'IP rate limit exceeded',
        error_description: 'Địa chỉ IP nhận OTP vượt 20 lần/giờ. Vui lòng thử lại sau.'
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // 4️⃣ CHECK GLOBAL RATE LIMIT
    console.log('   Checking global rate limit...');
    const { count: globalCount } = await supabase.from('otp_login_vihat').select('*', {
      count: 'exact',
      head: true
    }).gte('created_at_vn', new Date(now.getTime() - RATE_LIMITS.MINUTE_IN_MS).toISOString()); // ✅ ĐỔI nowVN → now
    if (globalCount >= RATE_LIMITS.MAX_GLOBAL_MINUTE) {
      console.log(`   ❌ Global limit exceeded: ${globalCount}/${RATE_LIMITS.MAX_GLOBAL_MINUTE} per minute`);
      return new Response(JSON.stringify({
        success: false,
        error: 'System overload',
        error_description: 'Hệ thống đang quá tải. Vui lòng thử lại sau 1 phút.'
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // 5️⃣ CHECK DAILY COST LIMIT
    console.log('   Checking daily cost limit...');
    const startOfDay = new Date(now); // ✅ ĐỔI nowVN → now
    startOfDay.setHours(0, 0, 0, 0);
    const { data: todayOTPs } = await supabase.from('otp_login_vihat').select('cost').eq('phone', phone).gte('created_at_vn', startOfDay.toISOString()); // ✅ ĐỔI startOfDayVN → startOfDay
    const totalCostToday = todayOTPs?.reduce((sum, record)=>{
      return sum + parseFloat(record.cost || 0);
    }, 0) || 0;
    if (totalCostToday >= RATE_LIMITS.MAX_DAILY_COST_VND) {
      console.log(`   ❌ Daily cost limit exceeded: ${totalCostToday} VND`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Daily limit exceeded',
        error_description: 'Bạn đã vượt hạn mức gửi OTP trong ngày.'
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('✅ All rate limits passed');
    console.log(`   Phone: ${phoneCount}/${RATE_LIMITS.MAX_PER_PHONE_HOUR} per hour`);
    console.log(`   IP: ${ipCount}/${RATE_LIMITS.MAX_PER_IP_HOUR} per hour`);
    console.log(`   Global: ${globalCount}/${RATE_LIMITS.MAX_GLOBAL_MINUTE} per minute`);
    console.log(`   Daily cost: ${totalCostToday}/${RATE_LIMITS.MAX_DAILY_COST_VND} VND`);
    // ========== STEP 7: GENERATE OTP ==========
    console.log('\n🎲 STEP 7: Generate OTP');
    const otpCode = generateOTP();
    const minute = 1;
    console.log(`Generated OTP: ${otpCode}`);
    console.log(`Expires in: ${minute} minute`);
    // ✅ SỬA: STEP 8: INSERT TO DATABASE
    console.log('\n💾 STEP 8: Insert to otp_login_vihat table');
    const expires = new Date(now.getTime() + minute * 60 * 1000); // ✅ ĐỔI nowVN → now
    const insertData = {
      phone: phone,
      otp_code: otpCode,
      minute: minute,
      created_at: now.toISOString(),
      created_at_vn: now.toISOString(),
      expires_at: expires.toISOString(),
      expires_at_vn: expires.toISOString(),
      verified: false,
      attempts: 0,
      ip_address: clientIP,
      campaign_id: 'Login VIHAT',
      brandname: 'MKTAMDUC'
    };
    console.log('Inserting data:', {
      phone: insertData.phone,
      otp_code: insertData.otp_code,
      minute: insertData.minute,
      expires_at_vn: insertData.expires_at_vn
    });
    const { data: otpRecord, error: insertError } = await supabase.from('otp_login_vihat').insert(insertData).select().single();
    if (insertError) {
      console.error('❌ Insert failed:', insertError);
      return new Response(JSON.stringify({
        error: 'Database error',
        detail: insertError.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('✅ Insert success with ID:', otpRecord.id);
    // ========== STEP 9: CALL VIHAT API ==========
    console.log('\n📞 STEP 9: Call VIHAT API');
    const smsContent = `MKTAMDUC - Ma xac thuc cua ban la ${otpCode}. Tuyet doi KHONG chia se ma xac thuc cho bat ky ai duoi bat ky hinh thuc nao. Ma xac thuc co hieu luc trong ${minute} phut.`;
    const vihatPayload = {
      ApiKey: Deno.env.get('VIHAT_API_KEY') || "B70DE56E1A997DF6BB197CEEC85B7A",
      SecretKey: Deno.env.get('VIHAT_SECRET_KEY') || "FCD201C2BEE44E7FB641261801AB94",
      Phone: phone,
      Channels: [
        "zalo",
        "sms"
      ],
      Data: [
        {
          TempID: "478665",
          Params: [
            otpCode,
            minute.toString()
          ],
          OAID: "939629380721919913",
          campaignid: "Gửi OTP",
          CallbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/vihat-otp-webhook`,
          RequestId: otpRecord.id,
          Sandbox: "0",
          SendingMode: "1"
        },
        {
          Content: smsContent,
          IsUnicode: "0",
          SmsType: "2",
          Brandname: "MKTAMDUC",
          CallbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/vihat-otp-webhook`,
          RequestId: otpRecord.id,
          Sandbox: "0"
        }
      ]
    };
    console.log('📤 Sending to VIHAT...');
    console.log(`   Phone: ${phone}`);
    console.log(`   OTP: ${otpCode}`);
    console.log(`   Expires: ${minute} minute`);
    try {
      const vihatResponse = await fetch('https://rest.esms.vn/MainService.svc/json/MultiChannelMessage/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vihatPayload)
      });
      const vihatResult = await vihatResponse.json();
      console.log('📥 VIHAT Response:', vihatResult);
      if (vihatResult.CodeResult === "100") {
        console.log('✅ VIHAT accepted request');
        await supabase.from('otp_login_vihat').update({
          zns_request_id: vihatResult.SMSID || null,
          sms_request_id: vihatResult.SMSID || null,
          api_response: vihatResult,
          notes: `VIHAT accepted - SMSID: ${vihatResult.SMSID || 'N/A'}`
        }).eq('id', otpRecord.id);
      } else {
        console.error('❌ VIHAT error:', vihatResult.ErrorMessage || `Code: ${vihatResult.CodeResult}`);
        await supabase.from('otp_login_vihat').update({
          channel_sent: 'failed',
          api_response: vihatResult,
          notes: `VIHAT error: ${vihatResult.ErrorMessage || vihatResult.CodeResult}`
        }).eq('id', otpRecord.id);
      }
    } catch (vihatError) {
      console.error('❌ Failed to call VIHAT:', vihatError);
      await supabase.from('otp_login_vihat').update({
        channel_sent: 'failed',
        notes: `API call failed: ${vihatError.message}`
      }).eq('id', otpRecord.id);
    }
    // ✅ SỬA: STEP 10: LOG USAGE
    console.log('\n📊 STEP 10: Log API Usage');
    await supabase.from('oauth_token_usage').insert({
      token_id: tokenRecord.id,
      client_id: tokenRecord.client_id,
      ip_address: clientIP,
      endpoint: 'send_otp_login_vihat',
      status_code: 200,
      created_at: now.toISOString(),
      created_at_vn: now.toISOString() // ✅ ĐỔI nowVN → now
    });
    // SUCCESS RESPONSE
    console.log('\n✅ send_otp_login_vihat COMPLETED SUCCESSFULLY');
    console.log('================================\n');
    return new Response(JSON.stringify({
      success: true,
      message: `OTP đã được gửi đến ${phone}`,
      otp_code: otpCode,
      expires_in: 60,
      record_id: otpRecord.id
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal error',
      detail: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
