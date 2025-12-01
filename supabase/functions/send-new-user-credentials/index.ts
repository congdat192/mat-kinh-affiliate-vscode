import { Resend } from 'https://esm.sh/resend@2.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// AES-256-GCM DECRYPTION
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
async function getEncryptionKey() {
  const keyString = Deno.env.get('RESEND_API_KEY');
  if (!keyString) {
    throw new Error('RESEND_API_KEY not found in environment');
  }
  const keyData = Uint8Array.from(atob(keyString), (c)=>c.charCodeAt(0));
  return await crypto.subtle.importKey('raw', keyData.buffer, {
    name: ALGORITHM,
    length: KEY_LENGTH
  }, false, [
    'decrypt'
  ]);
}
async function decrypt(encryptedBase64) {
  const key = await getEncryptionKey();
  const combined = Uint8Array.from(atob(encryptedBase64), (c)=>c.charCodeAt(0));
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt({
    name: ALGORITHM,
    iv
  }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}
async function getResendApiKey() {
  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const { data, error } = await supabaseAdmin.schema('api').rpc('get_resend_credential');
  if (error || !data || data.length === 0) {
    throw new Error('Resend credentials not found. Please configure Resend integration first.');
  }
  const encryptedApiKey = data[0].api_key_encrypted;
  return await decrypt(encryptedApiKey);
}
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { email, fullName, tempPassword, loginUrl } = await req.json();
    console.log('Sending credentials email to:', email);
    console.log('Getting Resend API Key from database...');
    const apiKey = await getResendApiKey();
    const resend = new Resend(apiKey);
    console.log('Resend client initialized');
    const { data, error } = await resend.emails.send({
      from: 'ERP System <erp-admin@matkinhtamduc.com>',
      to: email,
      subject: 'Tài khoản ERP System của bạn đã được tạo',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
                  Chào mừng đến ERP System
                </h1>
              </div>
              <div style="padding: 40px 30px;">
                <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px;">
                  Xin chào ${fullName}!
                </h2>
                <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                  Tài khoản ERP System của bạn đã được tạo thành công bởi quản trị viên.
                  Dưới đây là thông tin đăng nhập của bạn:
                </p>
                <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #e9ecef;">
                  <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">
                    Thông tin đăng nhập
                  </h3>
                  <div style="margin-bottom: 12px;">
                    <strong style="color: #555;">Email:</strong>
                    <div style="color: #333; font-size: 15px; margin-top: 4px;">${email}</div>
                  </div>
                  <div>
                    <strong style="color: #555;">Mật khẩu tạm thời:</strong>
                    <div style="background: white; padding: 12px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #667eea; margin-top: 4px; border: 2px dashed #667eea; letter-spacing: 1px;">
                      ${tempPassword}
                    </div>
                  </div>
                </div>
                <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
                  <div style="display: flex; align-items: flex-start;">
                    <div>
                      <strong style="color: #856404; display: block; margin-bottom: 5px;">BẮT BUỘC ĐỔI MẬT KHẨU</strong>
                      <p style="color: #856404; margin: 0; font-size: 14px;">
                        Bạn phải đổi mật khẩu ngay khi đăng nhập lần đầu tiên để bảo mật tài khoản.
                      </p>
                    </div>
                  </div>
                </div>
                <div style="text-align: center; margin: 35px 0;">
                  <a href="${loginUrl}"
                     style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    Đăng nhập ngay
                  </a>
                </div>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                  <p style="color: #999; font-size: 12px; margin: 0;">
                    © 2025 ERP System. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `
    });
    if (error) {
      console.error('Resend error:', error);
      throw error;
    }
    console.log('Email sent successfully:', data);
    return new Response(JSON.stringify({
      success: true,
      emailId: data?.id
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in send-new-user-credentials:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to send email'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
