// deno-lint-ignore-file no-explicit-any
/// <reference lib="deno.ns" />
// @ts-ignore: allow remote Deno std import when the local TS server can't resolve the URL
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
// @ts-ignore: allow remote import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const { title, content } = await req.json();
    if (!title || !content) {
      return new Response(JSON.stringify({ error: 'Missing title/content' }), { status: 400 });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all device tokens
    const { data: tokens, error } = await supabase
      .from('device_tokens')
      .select('token')
      .limit(1000);

    if (error) throw error;

    const registration_ids = (tokens || []).map((t: any) => t.token).filter(Boolean);

    if (!FCM_SERVER_KEY) {
      return new Response(
        JSON.stringify({
          warning: 'FCM_SERVER_KEY not set',
          info: 'Function received request but cannot send push without server key.',
          count: registration_ids.length,
        }),
        { status: 200 }
      );
    }

    if (registration_ids.length === 0) {
      return new Response(JSON.stringify({ message: 'No device tokens registered' }), { status: 200 });
    }

    const chunkSize = 900; // FCM limit safety margin
    let success = 0;
    let failure = 0;

    for (let i = 0; i < registration_ids.length; i += chunkSize) {
      const chunk = registration_ids.slice(i, i + chunkSize);
      const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${FCM_SERVER_KEY}`,
        },
        body: JSON.stringify({
          registration_ids: chunk,
          notification: {
            title: title,
            body: content,
            sound: 'default',
          },
          android: {
            priority: 'high',
            notification: {
              channel_id: 'news-alerts',
              sound: 'default',
            },
          },
          apns: {
            headers: {
              'apns-priority': '10',
            },
            payload: {
              aps: {
                sound: 'default',
                alert: {
                  title,
                  body: content,
                },
              },
            },
          },
          data: { type: 'news', sound: 'default' },
          priority: 'high',
        }),
      });

      const body = await res.json().catch(() => ({}));
      success += body.success || 0;
      failure += body.failure || 0;
    }

    return new Response(JSON.stringify({ ok: true, success, failure }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
