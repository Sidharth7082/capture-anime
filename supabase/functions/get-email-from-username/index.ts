import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Handle CORS preflight requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { username } = await req.json()

    if (!username) {
      return new Response(JSON.stringify({ error: 'Username is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Validate the username format up front: only allow the same charset the
    // signup form enforces, so this endpoint can't be used to probe arbitrary
    // strings and stays consistent with profile creation.
    if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      return new Response(JSON.stringify({ error: 'Invalid username format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // NOTE (security): this endpoint intentionally lets a sign-in page resolve
    // a username to its email before authentication, so it is an email-
    // enumeration surface. Do NOT rely on client-side protection alone:
    // deploy rate limiting on this function (per IP / per username) before
    // production. See the "rate limiting" section in the project docs.
    // TODO: enforce a per-IP rate limit (e.g. via x-forwarded-for) here.

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(data.id);
    
    if (userError || !user || !user.email) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    return new Response(JSON.stringify({ email: user.email }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
