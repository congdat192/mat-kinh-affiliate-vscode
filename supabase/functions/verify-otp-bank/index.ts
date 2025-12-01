import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from 'https://esm.sh/resend@2.0.0';

// =============================================================================
// verify-otp-bank v3 - Enhanced error_details for FE debugging
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

// AES-256-GCM Decryption for Resend API Key
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

// Vietnam banks lookup
const vietnamBanks: Record<string, string> = {
  'vietcombank': 'Vietcombank',
  'vietinbank': 'VietinBank',
  'bidv': 'BIDV',
  'agribank': 'Agribank',
  'techcombank': 'Techcombank',
  'acb': 'ACB',
  'vpbank': 'VPBank',
  'mbbank': 'MBBank',
  'sacombank': 'Sacombank',
  'tpbank': 'TPBank'
};

Deno.serve(async (req) => {
  console.log('\n========== VERIFY OTP BANK v3 ==========');

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
    console.log(`[Request] record_id: ${record_id}, phone: ${phone}`);

    // Validate required fields
    if (!record_id || !phone || !otp) {
      return errorResponse('Thiếu thông tin bắt buộc', 'MISSING_FIELDS', 400, {
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
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('id', record_id)
      .eq('phone', phone)
      .single();

    if (otpError && otpError.code !== 'PGRST116') {
      console.error('[Database] OTP query error:', JSON.stringify(otpError));
      return errorResponse('Lỗi truy vấn OTP', 'OTP_QUERY_ERROR', 500, {
        code: otpError.code,
        message: otpError.message,
        details: otpError.details
      });
    }

    if (!otpRecord) {
      console.log('[OTP] Not found');
      return errorResponse('Không tìm thấy mã OTP', 'OTP_NOT_FOUND', 404, {
        record_id,
        phone
      });
    }

    // Check if OTP is already used
    if (otpRecord.is_used) {
      return errorResponse('Mã OTP đã được sử dụng', 'OTP_ALREADY_USED', 400, {
        record_id,
        used_at: otpRecord.verified_at
      });
    }

    // Check if OTP is expired
    const now = new Date();
    if (new Date(otpRecord.expires_at) < now) {
      return errorResponse('Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.', 'OTP_EXPIRED', 400, {
        expires_at: otpRecord.expires_at,
        current_time: now.toISOString()
      });
    }

    // Verify OTP code
    if (otpRecord.otp_code !== otp) {
      return errorResponse('Mã OTP không chính xác', 'WRONG_OTP', 400, {
        record_id
      });
    }

    // Check purpose
    const registrationData = otpRecord.registration_data;
    if (!registrationData || registrationData.purpose !== 'bank_verification') {
      return errorResponse('Mã OTP không hợp lệ cho việc xác minh ngân hàng', 'INVALID_OTP_PURPOSE', 400, {
        purpose: registrationData?.purpose,
        expected: 'bank_verification'
      });
    }

    const f0Id = registrationData.f0_id;
    const bankName = registrationData.bank_name;
    const bankAccountNumber = registrationData.bank_account_number;
    const bankAccountHolder = registrationData.bank_account_holder;
    const bankBranch = registrationData.bank_branch;

    // Update bank info and mark as verified
    console.log('[Database] Updating bank info...');
    const { error: updateError } = await supabase
      .from('f0_partners')
      .update({
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        bank_account_holder: bankAccountHolder,
        bank_branch: bankBranch,
        bank_verified: true,
        bank_verified_at: new Date().toISOString()
      })
      .eq('id', f0Id);

    if (updateError) {
      console.error('[Database] Update bank error:', JSON.stringify(updateError));
      return errorResponse('Không thể cập nhật thông tin ngân hàng', 'BANK_UPDATE_ERROR', 500, {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        f0_id: f0Id
      });
    }

    console.log('[Bank] Updated successfully');

    // Mark OTP as used
    const { error: markUsedError } = await supabase
      .from('otp_verifications')
      .update({
        is_used: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', record_id);

    if (markUsedError) {
      console.error('[Database] Mark OTP used error:', JSON.stringify(markUsedError));
      // Non-critical, continue
    }

    // Get F0 partner info for email
    const { data: f0Partner, error: f0Error } = await supabase
      .from('f0_partners')
      .select('full_name, email, f0_code')
      .eq('id', f0Id)
      .single();

    if (f0Error) {
      console.error('[Database] F0 lookup error:', JSON.stringify(f0Error));
      // Non-critical, continue without email
    }

    // Send confirmation email
    let emailSent = false;
    if (f0Partner && f0Partner.email) {
      try {
        console.log('[Email] Sending bank verification email to:', f0Partner.email);

        // Get Resend credentials
        const { data: resendCreds, error: credsError } = await supabase.schema('api').rpc('get_resend_credential');

        if (credsError || !resendCreds || resendCreds.length === 0) {
          console.error('[Resend] Credentials error:', credsError);
        } else {
          const encryptedApiKey = resendCreds[0].api_key_encrypted;
          const apiKey = await decrypt(encryptedApiKey);
          const resend = new Resend(apiKey);

          const bankDisplayName = vietnamBanks[bankName] || bankName;
          const maskedAccountNumber = bankAccountNumber.substring(0, 4) + '****' + bankAccountNumber.substring(bankAccountNumber.length - 4);

          await resend.emails.send({
            from: 'Mắt Kính Tâm Đức <affiliate@matkinhtamduc.com>',
            to: f0Partner.email,
            subject: 'Xác minh tài khoản ngân hàng thành công',
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
                        Xác minh thành công!
                      </h1>
                    </div>
                    <div style="padding: 40px 30px;">
                      <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px;">
                        Xin chào ${f0Partner.full_name}!
                      </h2>
                      <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                        Thông tin tài khoản ngân hàng của bạn đã được <strong>xác minh thành công</strong> và liên kết với tài khoản Affiliate <strong>${f0Partner.f0_code}</strong>.
                      </p>
                      <div style="background-color: #ecfdf5; padding: 25px; border-radius: 8px; margin: 30px 0; border: 2px solid #10b981;">
                        <h3 style="margin: 0 0 15px 0; color: #059669; font-size: 16px;">
                          Thông tin tài khoản ngân hàng
                        </h3>
                        <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 8px 0; color: #666; width: 140px;">Ngân hàng:</td>
                            <td style="padding: 8px 0; color: #333; font-weight: 500;">${bankDisplayName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #666;">Số tài khoản:</td>
                            <td style="padding: 8px 0; color: #333; font-weight: 500; font-family: monospace;">${maskedAccountNumber}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #666;">Chủ tài khoản:</td>
                            <td style="padding: 8px 0; color: #333; font-weight: 500;">${bankAccountHolder}</td>
                          </tr>
                          ${bankBranch ? `
                          <tr>
                            <td style="padding: 8px 0; color: #666;">Chi nhánh:</td>
                            <td style="padding: 8px 0; color: #333; font-weight: 500;">${bankBranch}</td>
                          </tr>
                          ` : ''}
                          <tr>
                            <td style="padding: 8px 0; color: #666;">Trạng thái:</td>
                            <td style="padding: 8px 0;">
                              <span style="background-color: #dcfce7; color: #16a34a; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500;">
                                Đã xác minh
                              </span>
                            </td>
                          </tr>
                        </table>
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

          emailSent = true;
          console.log('[Email] Sent successfully');
        }
      } catch (emailError) {
        console.error('[Email] Failed to send:', emailError);
        // Non-critical, continue
      }
    }

    console.log('[Complete] Bank verification successful');

    return new Response(JSON.stringify({
      success: true,
      message: 'Xác minh tài khoản ngân hàng thành công!',
      bank_info: {
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        bank_account_holder: bankAccountHolder,
        bank_branch: bankBranch,
        bank_verified: true,
        bank_verified_at: new Date().toISOString()
      },
      email_sent: emailSent
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
