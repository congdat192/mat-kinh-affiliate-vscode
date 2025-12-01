import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { createClient } from "jsr:@supabase/supabase-js@2";

// =============================================================================
// send-affiliate-approval-email v3 - Enhanced error_details for FE debugging
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

// AES-256-GCM DECRYPTION
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get('RESEND_API_KEY');
  if (!keyString) {
    throw new Error('RESEND_API_KEY not found in environment');
  }
  const keyData = Uint8Array.from(atob(keyString), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey('raw', keyData.buffer, {
    name: ALGORITHM,
    length: KEY_LENGTH
  }, false, ['decrypt']);
}

async function decrypt(encryptedBase64: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

Deno.serve(async (req) => {
  console.log('\n========== SEND AFFILIATE APPROVAL EMAIL v3 ==========');

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

    const { email, fullName, f0Code, loginUrl } = body;
    console.log(`[Request] email: ${email}, f0Code: ${f0Code}`);

    // Validate required fields
    if (!email || !fullName || !f0Code) {
      return errorResponse('Thiếu thông tin bắt buộc', 'MISSING_FIELDS', 400, {
        missing: {
          email: !email,
          fullName: !fullName,
          f0Code: !f0Code
        }
      });
    }

    const finalLoginUrl = loginUrl || 'https://matkinhtamduc.com/f0/auth/login';

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Config] Missing Supabase credentials');
      return errorResponse('Lỗi cấu hình server', 'CONFIG_ERROR', 500, {
        missing: {
          SUPABASE_URL: !supabaseUrl,
          SUPABASE_SERVICE_ROLE_KEY: !supabaseKey
        }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Resend credentials
    console.log('[Resend] Getting API key from database...');
    const { data: resendCreds, error: credsError } = await supabase.schema('api').rpc('get_resend_credential');

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

    // Decrypt API key
    let apiKey: string;
    try {
      const encryptedApiKey = resendCreds[0].api_key_encrypted;
      apiKey = await decrypt(encryptedApiKey);
    } catch (decryptError) {
      console.error('[Decrypt] Failed:', decryptError);
      return errorResponse('Không thể giải mã thông tin email', 'DECRYPT_ERROR', 500, {
        error: String(decryptError)
      });
    }

    // Send email via Resend
    console.log('[Resend] Sending approval email...');
    const resend = new Resend(apiKey);

    let emailResult;
    try {
      const { data, error } = await resend.emails.send({
        from: 'Mắt Kính Tâm Đức <affiliate@matkinhtamduc.com>',
        to: email,
        subject: 'Tài khoản Affiliate đã được kích hoạt!',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
                    Chúc mừng!
                  </h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
                    Tài khoản của bạn đã được kích hoạt
                  </p>
                </div>
                <div style="padding: 40px 30px;">
                  <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px;">
                    Xin chào ${fullName}!
                  </h2>
                  <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                    Tin vui! Tài khoản Affiliate của bạn đã được <strong style="color: #10b981;">phê duyệt và kích hoạt</strong>.
                    Bạn có thể bắt đầu đăng nhập và sử dụng hệ thống ngay bây giờ.
                  </p>
                  <div style="background-color: #ecfdf5; padding: 25px; border-radius: 8px; margin: 30px 0; border: 2px solid #10b981; text-align: center;">
                    <h3 style="margin: 0 0 10px 0; color: #059669; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                      Mã Đối Tác của bạn
                    </h3>
                    <div style="font-size: 32px; font-weight: bold; color: #059669; font-family: 'Courier New', monospace;">
                      ${f0Code}
                    </div>
                  </div>
                  <div style="background-color: #f0fdf4; padding: 15px 20px; border-radius: 8px; margin: 25px 0; display: flex; align-items: center; justify-content: center;">
                    <span style="background-color: #10b981; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                      Đã kích hoạt
                    </span>
                  </div>
                  <div style="text-align: center; margin: 35px 0;">
                    <a href="${finalLoginUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 48px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                      Đăng nhập ngay
                    </a>
                  </div>
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                    <p style="color: #999; font-size: 12px; margin: 0;">
                      © 2025 Mắt Kính Tâm Đức. All rights reserved.
                    </p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `
      });

      if (error) {
        console.error('[Resend] Email error:', JSON.stringify(error));
        return errorResponse('Không thể gửi email', 'RESEND_EMAIL_ERROR', 500, {
          error: error
        });
      }

      emailResult = data;
    } catch (sendError) {
      console.error('[Resend] Send error:', sendError);
      return errorResponse('Lỗi khi gửi email', 'RESEND_SEND_ERROR', 500, {
        error: String(sendError)
      });
    }

    console.log('[Complete] Approval email sent successfully');

    return new Response(JSON.stringify({
      success: true,
      emailId: emailResult?.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Unexpected] Error:', error);
    return errorResponse('Lỗi hệ thống', 'UNEXPECTED_ERROR', 500, {
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});
