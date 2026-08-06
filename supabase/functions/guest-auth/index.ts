
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      guest_users: {
        Row: {
          id: string
          user_id: string | null
          created_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          created_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          created_at?: string | null
          expires_at?: string | null
        }
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { action } = await req.json()

    if (action === 'create_guest') {
      // Generate a unique temporary email for guest user
      const guestId = crypto.randomUUID()
      const tempEmail = `guest_${guestId}@temp.captureordie.com`
      const tempPassword = crypto.randomUUID()

      console.log('Creating guest user with email:', tempEmail)

      // Create the auth user first
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email: tempEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          is_guest: true,
          guest_id: guestId
        }
      })

      if (authError) {
        console.error('Auth error:', authError)
        throw authError
      }

      console.log('Auth user created:', authData.user?.id)

      // Create guest user record
      const { data: guestData, error: guestError } = await supabaseClient
        .from('guest_users')
        .insert({
          user_id: authData.user?.id,
        })
        .select()
        .single()

      if (guestError) {
        console.error('Guest user error:', guestError)
        // If guest record creation fails, clean up the auth user
        await supabaseClient.auth.admin.deleteUser(authData.user?.id || '')
        throw guestError
      }

      console.log('Guest user record created:', guestData)

      return new Response(
        JSON.stringify({
          success: true,
          user: authData.user,
          session: authData.session,
          credentials: {
            email: tempEmail,
            password: tempPassword
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    if (action === 'cleanup_expired') {
      console.log('Starting cleanup of expired guest users...')

      // Get expired guest users
      const { data: expiredGuests, error: fetchError } = await supabaseClient
        .from('guest_users')
        .select('user_id')
        .lt('expires_at', new Date().toISOString())

      if (fetchError) {
        throw fetchError
      }

      console.log(`Found ${expiredGuests?.length || 0} expired guest users`)

      // Delete expired auth users
      for (const guest of expiredGuests || []) {
        if (guest.user_id) {
          try {
            await supabaseClient.auth.admin.deleteUser(guest.user_id)
            console.log(`Deleted auth user: ${guest.user_id}`)
          } catch (error) {
            console.error(`Failed to delete user ${guest.user_id}:`, error)
          }
        }
      }

      // Clean up guest records (this will also clean up due to CASCADE)
      const { error: cleanupError } = await supabaseClient.rpc('cleanup_expired_guests')

      if (cleanupError) {
        throw cleanupError
      }

      return new Response(
        JSON.stringify({
          success: true,
          cleaned_up: expiredGuests?.length || 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
