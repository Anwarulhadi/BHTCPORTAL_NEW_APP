// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore
import { GoogleAuth } from "npm:google-auth-library@9";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { title, content } = await req.json();
    if (!title || !content) {
      return new Response(JSON.stringify({ error: 'Missing title/content' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SERVICE_ACCOUNT_JSON = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');

    if (!SERVICE_ACCOUNT_JSON) {
      return new Response(JSON.stringify({ error: 'FIREBASE_SERVICE_ACCOUNT secret is missing' }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Authenticate with Google
    const serviceAccount = JSON.parse(SERVICE_ACCOUNT_JSON);
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    const accessToken = await auth.getAccessToken();
    const projectId = serviceAccount.project_id;

    // 2. Fetch Tokens
    const { data: tokens, error } = await supabase
      .from('device_tokens')
      .select('token')
      .limit(1000);

    if (error) throw error;

    const deviceTokens = (tokens || []).map((t: any) => t.token).filter(Boolean);

    if (deviceTokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No device tokens registered' }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Send Messages (HTTP v1 requires sending one by one)
    let success = 0;
    let failure = 0;
    
    // Send in parallel batches of 20 to speed it up
    const batchSize = 20;
    for (let i = 0; i < deviceTokens.length; i += batchSize) {
      const batch = deviceTokens.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (token: string) => {
        try {
          const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              message: {
                token: token,
                notification: {
                  title: title,
                  body: content,
                },
                android: {
                  priority: 'high',
                  notification: {
                    channel_id: 'news-alerts',
                    sound: 'default',
                  },
                },
                data: { type: 'news' }
              }
            }),
          });

          if (res.ok) {
            success++;
          } else {
            console.error('FCM Error:', await res.text());
            failure++;
          }
        } catch (err) {
          console.error('Fetch Error:', err);
          failure++;
        }
      }));
    }

    return new Response(JSON.stringify({ ok: true, success, failure }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
