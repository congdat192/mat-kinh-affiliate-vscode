import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

console.info('Cron lock commissions started - v1 (Lock pending commissions after lock period)');

// ============================================
// HELPER FUNCTIONS
// ============================================
function getVietnamTime() {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + 7 * 3600000);
}

// ============================================
// RECALCULATE F0 TIER (Same as webhook)
// ============================================
async function recalculateF0Tier(supabase: any, f0Id: string, f0Code: string) {
  console.log(`[Tier] 🔄 Recalculating tier for F0: ${f0Code}`);

  try {
    // Step 1: Get all tiers ordered by level (highest first)
    const { data: tiers, error: tiersError } = await supabase
      .from('f0_tiers')
      .select('*')
      .eq('is_active', true)
      .order('tier_level', { ascending: false });

    if (tiersError || !tiers || tiers.length === 0) {
      console.error('[Tier] ❌ Error fetching tiers:', tiersError?.message);
      return null;
    }

    // Step 2: Calculate F0's current stats from commission_records
    // Only count commissions that are LOCKED or PAID
    const { data: stats, error: statsError } = await supabase
      .from('commission_records')
      .select('id, invoice_amount, f1_customer_id')
      .eq('f0_id', f0Id)
      .in('status', ['locked', 'paid']);

    if (statsError) {
      console.error('[Tier] ❌ Error fetching commission stats:', statsError.message);
      return null;
    }

    // Calculate metrics
    const totalOrders = stats?.length || 0;
    const totalRevenue = stats?.reduce((sum: number, r: any) => sum + Number(r.invoice_amount || 0), 0) || 0;
    // Count unique F1 customers
    const uniqueF1s = new Set(stats?.map((r: any) => r.f1_customer_id).filter(Boolean));
    const totalReferrals = uniqueF1s.size;

    console.log(`[Tier] 📊 F0 Stats:`);
    console.log(`[Tier]    Total Orders: ${totalOrders}`);
    console.log(`[Tier]    Total Revenue: ${totalRevenue.toLocaleString()}đ`);
    console.log(`[Tier]    Total Referrals (unique F1): ${totalReferrals}`);

    // Step 3: Determine new tier (highest tier that meets all requirements)
    let newTier = tiers[tiers.length - 1]; // Default to lowest tier (BRONZE)

    for (const tier of tiers) {
      const req = tier.requirements || {};
      const minReferrals = req.min_referrals || 0;
      const minRevenue = req.min_revenue || 0;
      const minOrders = req.min_orders || 0;

      const meetsReferrals = totalReferrals >= minReferrals;
      const meetsRevenue = totalRevenue >= minRevenue;
      const meetsOrders = totalOrders >= minOrders;

      if (meetsReferrals && meetsRevenue && meetsOrders) {
        newTier = tier;
        console.log(`[Tier] ✅ Qualifies for ${tier.tier_code}!`);
        break; // Found highest qualifying tier
      }
    }

    // Step 4: Get current tier
    const { data: f0Partner, error: f0Error } = await supabase
      .from('f0_partners')
      .select('current_tier')
      .eq('id', f0Id)
      .single();

    if (f0Error) {
      console.error('[Tier] ❌ Error fetching F0 partner:', f0Error.message);
      return null;
    }

    const currentTier = f0Partner?.current_tier || 'BRONZE';

    // Step 5: Update if tier changed
    if (currentTier !== newTier.tier_code) {
      console.log(`[Tier] 🎉 TIER UPGRADE: ${currentTier} → ${newTier.tier_code}`);

      const { error: updateError } = await supabase
        .from('f0_partners')
        .update({
          current_tier: newTier.tier_code,
          updated_at: getVietnamTime().toISOString()
        })
        .eq('id', f0Id);

      if (updateError) {
        console.error('[Tier] ❌ Error updating tier:', updateError.message);
        return null;
      }

      // Create notification for tier upgrade
      if (newTier.tier_level > (tiers.find((t: any) => t.tier_code === currentTier)?.tier_level || 1)) {
        await supabase.from('notifications').insert({
          f0_id: f0Id,
          type: 'system',
          content: {
            title: '🎉 Chúc mừng! Bạn đã lên hạng!',
            message: `Bạn đã đạt thứ hạng ${newTier.tier_name} (${newTier.tier_code})! Hưởng thêm ${newTier.benefits?.commission_bonus_percent || 0}% bonus hoa hồng.`,
            old_tier: currentTier,
            new_tier: newTier.tier_code,
            new_tier_name: newTier.tier_name,
            bonus_percent: newTier.benefits?.commission_bonus_percent || 0
          },
          is_read: false
        });
        console.log('[Tier] ✅ Tier upgrade notification sent!');
      }

      return { upgraded: true, oldTier: currentTier, newTier: newTier.tier_code };
    } else {
      console.log(`[Tier] ℹ️ Tier unchanged: ${currentTier}`);
      return { upgraded: false, currentTier };
    }
  } catch (error: any) {
    console.error('[Tier] ❌ Error in recalculateF0Tier:', error.message);
    return null;
  }
}

// ============================================
// MAIN HANDLER
// ============================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Cron] Missing Supabase environment variables');
      return new Response('Server configuration error', {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'api' }
    });

    const now = getVietnamTime();
    const nowIso = now.toISOString();
    const currentMonth = now.toISOString().slice(0, 7); // '2025-12'

    console.log('====================================');
    console.log('[Cron] 🔄 Starting commission lock process...');
    console.log(`[Cron] Current time (VN): ${nowIso}`);
    console.log(`[Cron] Current month: ${currentMonth}`);
    console.log('====================================');

    // Step 1: Get all pending commissions that have passed their lock_date
    const { data: pendingCommissions, error: fetchError } = await supabase
      .from('commission_records')
      .select('id, f0_id, f0_code, voucher_code, invoice_code, total_commission, lock_date')
      .eq('status', 'pending')
      .lte('lock_date', nowIso)
      .is('invoice_cancelled_at', null); // Not cancelled

    if (fetchError) {
      console.error('[Cron] ❌ Error fetching pending commissions:', fetchError.message);
      return new Response(JSON.stringify({
        success: false,
        error: fetchError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!pendingCommissions || pendingCommissions.length === 0) {
      console.log('[Cron] ℹ️ No pending commissions to lock');
      return new Response(JSON.stringify({
        success: true,
        message: 'No pending commissions to lock',
        locked_count: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Cron] Found ${pendingCommissions.length} commissions to lock`);

    // Step 2: Lock each commission and recalculate tier
    let lockedCount = 0;
    let errorCount = 0;
    const tierUpgrades: any[] = [];
    const processedF0s = new Set<string>(); // Track F0s to avoid multiple tier recalcs

    for (const commission of pendingCommissions) {
      console.log(`[Cron] 🔒 Locking commission: ${commission.id}`);
      console.log(`[Cron]    Voucher: ${commission.voucher_code}`);
      console.log(`[Cron]    Invoice: ${commission.invoice_code}`);
      console.log(`[Cron]    Amount: ${Number(commission.total_commission).toLocaleString()}đ`);

      // Update commission status to locked
      const { error: updateError } = await supabase
        .from('commission_records')
        .update({
          status: 'locked',
          locked_at: nowIso,
          commission_month: currentMonth,
          updated_at: nowIso
        })
        .eq('id', commission.id);

      if (updateError) {
        console.error(`[Cron] ❌ Error locking commission ${commission.id}:`, updateError.message);
        errorCount++;
        continue;
      }

      console.log(`[Cron] ✅ Commission ${commission.id} locked!`);
      lockedCount++;

      // Create notification for F0
      await supabase.from('notifications').insert({
        f0_id: commission.f0_id,
        type: 'commission',
        content: {
          title: '🔒 Hoa hồng đã được chốt!',
          message: `Hoa hồng ${Number(commission.total_commission).toLocaleString()}đ từ đơn hàng ${commission.invoice_code} đã được chốt. EXP đã được cộng vào tài khoản của bạn!`,
          invoice_code: commission.invoice_code,
          voucher_code: commission.voucher_code,
          commission_amount: commission.total_commission,
          status: 'locked',
          commission_month: currentMonth
        },
        is_read: false
      });

      // Track F0 for tier recalculation (only once per F0)
      if (!processedF0s.has(commission.f0_id)) {
        processedF0s.add(commission.f0_id);
      }
    }

    // Step 3: Recalculate tier for all affected F0s
    console.log(`[Cron] 📊 Recalculating tiers for ${processedF0s.size} F0s...`);

    for (const f0Id of processedF0s) {
      // Get F0 code for logging
      const f0Commission = pendingCommissions.find(c => c.f0_id === f0Id);
      const f0Code = f0Commission?.f0_code || 'unknown';

      const tierResult = await recalculateF0Tier(supabase, f0Id, f0Code);
      if (tierResult?.upgraded) {
        tierUpgrades.push({
          f0_id: f0Id,
          f0_code: f0Code,
          oldTier: tierResult.oldTier,
          newTier: tierResult.newTier
        });
      }
    }

    // Step 4: Log summary
    console.log('====================================');
    console.log('[Cron] ✅ Commission lock process completed!');
    console.log(`[Cron]    Locked: ${lockedCount}`);
    console.log(`[Cron]    Errors: ${errorCount}`);
    console.log(`[Cron]    Tier upgrades: ${tierUpgrades.length}`);
    if (tierUpgrades.length > 0) {
      console.log('[Cron]    Upgrades:', JSON.stringify(tierUpgrades));
    }
    console.log('====================================');

    return new Response(JSON.stringify({
      success: true,
      message: `Locked ${lockedCount} commissions`,
      locked_count: lockedCount,
      error_count: errorCount,
      tier_upgrades: tierUpgrades,
      processed_at: nowIso
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('====================================');
    console.error('[Cron] PROCESSING ERROR');
    console.error('Error:', error?.message || error);
    console.error('Stack:', error?.stack || 'No stack trace');
    console.error('====================================');

    return new Response(JSON.stringify({
      success: false,
      error: error?.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
