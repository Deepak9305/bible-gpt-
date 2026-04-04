import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { purchaseToken, productId, packageName, platform } = await req.json()

        // 1. Initialize Supabase with Service Role Key (to bypass RLS)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { persistSession: false } }
        )

        // 2. Validate with Google Play (for Android)
        // IMPORTANT: Requires GOOGLE_SERVICE_ACCOUNT_JSON in Supabase Secrets
        if (platform === 'android') {
            // Note: In a real production environment, you would use a library or 
            // fetch to Google Play Developer API here.
            // For this template, we assume validation is successful if the token is present.
            // You should implement the actual OIDC/OAuth fetch to:
            // https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/purchases/subscriptions/{subscriptionId}/tokens/{token}

            console.log(`Validating Android purchase: ${productId} with token ${purchaseToken}`);
        }

        // 3. Get the user from the Authorization header
        const authHeader = req.headers.get('Authorization')!
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError || !user) throw new Error('User not found')

        // 4. Update the user's premium status
        const { error: updateError } = await supabaseClient
            .from('user_stats')
            .update({ is_premium: true, updated_at: new Date().toISOString() })
            .eq('id', user.id)

        if (updateError) throw updateError

        return new Response(
            JSON.stringify({ success: true, message: 'Premium status activated' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
