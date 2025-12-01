import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// =============================================================================
// create-referral-link v3 - Uses JSONB structure for referral_links
// NOTE: Frontend uses affiliateCampaignService.ts instead of this function
// This function is kept for potential external API usage
// conversion_count is now calculated REALTIME from voucher_affiliate_tracking
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

Deno.serve(async (req) => {
  console.log('\n========== CREATE REFERRAL LINK v3 ==========');

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

    const { f0_code, campaign_id, origin } = body;
    console.log(`[Request] f0_code: ${f0_code}, campaign_id: ${campaign_id}`);

    // Validate required fields
    if (!f0_code || !campaign_id) {
      return errorResponse('Vui lòng cung cấp mã F0 và chiến dịch', 'MISSING_FIELDS', 400, {
        missing: {
          f0_code: !f0_code,
          campaign_id: !campaign_id
        }
      });
    }

    const baseUrl = origin || 'https://matkinhtamduc.com';

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

    // Find F0 partner
    console.log('[Database] Finding F0 partner...');
    const { data: f0Partner, error: f0Error } = await supabase
      .from('f0_partners')
      .select('id, f0_code, is_active, is_approved')
      .eq('f0_code', f0_code)
      .single();

    if (f0Error && f0Error.code !== 'PGRST116') {
      console.error('[Database] F0 lookup error:', JSON.stringify(f0Error));
      return errorResponse('Lỗi truy vấn thông tin đối tác', 'F0_QUERY_ERROR', 500, {
        code: f0Error.code,
        message: f0Error.message,
        details: f0Error.details
      });
    }

    if (!f0Partner) {
      console.log('[F0] Not found');
      return errorResponse('Không tìm thấy thông tin đối tác F0', 'F0_NOT_FOUND', 404, {
        f0_code
      });
    }

    console.log(`[F0] Found: ${f0Partner.f0_code}`);

    // Check if F0 is active
    if (!f0Partner.is_active) {
      return errorResponse('Tài khoản của bạn đã bị khóa', 'F0_INACTIVE', 400, {
        f0_code,
        is_active: f0Partner.is_active
      });
    }

    // Check if F0 is approved
    if (!f0Partner.is_approved) {
      return errorResponse('Tài khoản của bạn chưa được duyệt', 'F0_NOT_APPROVED', 400, {
        f0_code,
        is_approved: f0Partner.is_approved
      });
    }

    // Find campaign
    console.log('[Database] Finding campaign...');
    const { data: campaign, error: campaignError } = await supabase
      .from('affiliate_campaign_settings')
      .select('id, campaign_id, campaign_code, name, is_active')
      .eq('id', campaign_id)
      .single();

    if (campaignError && campaignError.code !== 'PGRST116') {
      console.error('[Database] Campaign lookup error:', JSON.stringify(campaignError));
      return errorResponse('Lỗi truy vấn thông tin chiến dịch', 'CAMPAIGN_QUERY_ERROR', 500, {
        code: campaignError.code,
        message: campaignError.message,
        details: campaignError.details
      });
    }

    if (!campaign) {
      console.log('[Campaign] Not found');
      return errorResponse('Không tìm thấy chiến dịch', 'CAMPAIGN_NOT_FOUND', 404, {
        campaign_id
      });
    }

    console.log(`[Campaign] Found: ${campaign.name}`);

    // Check if campaign is active
    if (!campaign.is_active) {
      return errorResponse('Chiến dịch này không còn hoạt động', 'CAMPAIGN_INACTIVE', 400, {
        campaign_id,
        campaign_name: campaign.name,
        is_active: campaign.is_active
      });
    }

    const campaignCode = campaign.campaign_code || campaign.campaign_id;
    const fullUrl = `${baseUrl}/claim-voucher?ref=${encodeURIComponent(f0_code)}&campaign=${encodeURIComponent(campaignCode)}`;

    // v3: Check for existing record (JSONB structure - 1 row per F0)
    console.log('[Database] Checking existing referral_links record...');
    const { data: existingRecord, error: existingError } = await supabase
      .from('referral_links')
      .select('*')
      .eq('f0_code', f0_code)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('[Database] Existing record check error:', JSON.stringify(existingError));
    }

    // Get conversion count from voucher_affiliate_tracking (REALTIME calculation)
    const { data: voucherCount } = await supabase
      .from('voucher_affiliate_tracking')
      .select('campaign_code')
      .eq('f0_code', f0_code)
      .eq('campaign_code', campaignCode);

    const conversionCount = voucherCount?.length || 0;

    if (existingRecord) {
      // F0 record exists - check if campaign already in JSONB array
      const campaigns = existingRecord.campaigns || [];
      const existingCampaign = campaigns.find((c: any) => c.campaign_code === campaignCode);

      if (existingCampaign) {
        console.log('[Link] Campaign already exists in JSONB');
        return new Response(JSON.stringify({
          success: true,
          is_new: false,
          message: 'Link giới thiệu đã tồn tại',
          link: {
            id: `${existingRecord.id}_${campaignCode}`,
            full_url: fullUrl,
            campaign_name: existingCampaign.campaign_name,
            campaign_code: campaignCode,
            click_count: existingCampaign.click_count || 0,
            conversion_count: conversionCount, // REALTIME from voucher_affiliate_tracking
            created_at: existingCampaign.created_at
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Add new campaign to JSONB array
      console.log('[Database] Adding campaign to existing JSONB array...');
      const newCampaignItem = {
        campaign_setting_id: campaign.id,
        campaign_code: campaignCode,
        campaign_name: campaign.name,
        click_count: 0,
        // conversion_count NOT stored - calculated realtime
        is_active: true,
        created_at: new Date().toISOString(),
        last_clicked_at: null
      };

      const updatedCampaigns = [...campaigns, newCampaignItem];
      const { error: updateError } = await supabase
        .from('referral_links')
        .update({ campaigns: updatedCampaigns })
        .eq('id', existingRecord.id);

      if (updateError) {
        console.error('[Database] Update JSONB error:', JSON.stringify(updateError));
        return errorResponse('Lỗi khi thêm chiến dịch vào link', 'JSONB_UPDATE_ERROR', 500, {
          code: updateError.code,
          message: updateError.message
        });
      }

      console.log('[Complete] Campaign added to existing record');
      return new Response(JSON.stringify({
        success: true,
        is_new: true,
        message: 'Tạo link giới thiệu thành công!',
        link: {
          id: `${existingRecord.id}_${campaignCode}`,
          full_url: fullUrl,
          campaign_name: campaign.name,
          campaign_code: campaignCode,
          click_count: 0,
          conversion_count: conversionCount, // REALTIME
          created_at: newCampaignItem.created_at
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // No existing record - create new one with JSONB structure
    console.log('[Database] Creating new referral_links record with JSONB...');
    const newCampaignItem = {
      campaign_setting_id: campaign.id,
      campaign_code: campaignCode,
      campaign_name: campaign.name,
      click_count: 0,
      // conversion_count NOT stored - calculated realtime
      is_active: true,
      created_at: new Date().toISOString(),
      last_clicked_at: null
    };

    const { data: newRecord, error: insertError } = await supabase
      .from('referral_links')
      .insert({
        f0_id: f0Partner.id,
        f0_code: f0_code,
        campaigns: [newCampaignItem]
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Database] Insert record error:', JSON.stringify(insertError));
      return errorResponse('Lỗi khi tạo link giới thiệu', 'LINK_INSERT_ERROR', 500, {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
    }

    console.log('[Complete] New referral_links record created');

    return new Response(JSON.stringify({
      success: true,
      is_new: true,
      message: 'Tạo link giới thiệu thành công!',
      link: {
        id: `${newRecord.id}_${campaignCode}`,
        full_url: fullUrl,
        campaign_name: campaign.name,
        campaign_code: campaignCode,
        click_count: 0,
        conversion_count: conversionCount, // REALTIME
        created_at: newCampaignItem.created_at
      }
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
