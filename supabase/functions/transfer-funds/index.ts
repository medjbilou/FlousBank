/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`[transfer-funds] Function handler initialized.`);

serve(async (req) => {
  console.log('[transfer-funds] Received request:', req.method);
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Create Supabase client specific to this function invocation
    //    Uses the Authorization header from the request to authenticate the user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 2. Get the user making the request
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
        console.error('No user found for the provided token.');
        return new Response(JSON.stringify({ error: 'User not authenticated' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
        });
    }
    console.log('[transfer-funds] Authenticated user:', user.id);

    // 3. Parse request body
    let sourceAccountId, recipientEmail, amount, description;
    try {
        const body = await req.json();
        sourceAccountId = body.sourceAccountId;
        recipientEmail = body.recipientEmail;
        amount = body.amount;
        description = body.description; // Keep description optional
        console.log('[transfer-funds] Parsed request body:', { sourceAccountId, recipientEmail, amount, description });
    } catch (e) {
        console.error('[transfer-funds] Error parsing request body:', e);
        return new Response(JSON.stringify({ error: 'Invalid request body' }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400 
        });
    }

    if (!sourceAccountId || !recipientEmail || !amount) {
      console.log('[transfer-funds] Missing required fields.');
      return new Response(JSON.stringify({ error: 'Missing required fields: sourceAccountId, recipientEmail, amount' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    const transferAmount = Number(amount);
     if (isNaN(transferAmount) || transferAmount <= 0) {
       return new Response(JSON.stringify({ error: 'Invalid amount' }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         status: 400,
       });
     }

    // Add Backend Self-transfer check
     if (user.email && user.email.toLowerCase() === recipientEmail.toLowerCase()) {
         console.warn(`Self-transfer attempt by user ${user.id}`);
         return new Response(JSON.stringify({ error: 'Cannot transfer funds to yourself.' }), {
             headers: { ...corsHeaders, 'Content-Type': 'application/json' },
             status: 400,
         });
     }

    // 4. **Security Check**: Verify the authenticated user owns the source account
     console.log(`Verifying ownership: User ${user.id} owns account ${sourceAccountId}?`);
    const { data: accountData, error: ownerError } = await supabaseClient
        .from('accounts')
        .select('id')
        .eq('id', sourceAccountId)
        .eq('user_id', user.id) // Check if user_id matches authenticated user
        .maybeSingle(); // Use maybeSingle to handle null if not found

     if (ownerError) {
       console.error('Error checking account ownership:', ownerError);
        return new Response(JSON.stringify({ error: 'Database error checking ownership.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
     }
    if (!accountData) {
        console.warn(`Ownership check failed: User ${user.id} does not own account ${sourceAccountId}`);
         return new Response(JSON.stringify({ error: 'User does not own the source account or account not found.' }), {
             headers: { ...corsHeaders, 'Content-Type': 'application/json' },
             status: 403, // Forbidden
         });
     }
     console.log('[transfer-funds] Ownership verified.');

    // 5. Find Recipient Account ID based on Email
    //    Use the Admin client as users shouldn't be able to query all profiles/accounts directly
    let supabaseAdminClient;
    try {
        console.log('[transfer-funds] Attempting to create Admin Client...');
        supabaseAdminClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('CUSTOM_SERVICE_ROLE_KEY') ?? '' // <-- Use the custom secret name
        );
        console.log('[transfer-funds] Admin Client created successfully.');
    } catch(e) {
        console.error('[transfer-funds] Failed to create Admin Client:', e);
        return new Response(JSON.stringify({ error: 'Internal Server Error: Failed to initialize admin client' }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 500 
        });
    }

    console.log(`[transfer-funds] Finding recipient user profile for email: ${recipientEmail}`);
    const { data: recipientProfile, error: profileError } = await supabaseAdminClient
        .from('profiles')
        .select('id') // Get the user ID
        .eq('email', recipientEmail) // Match email (case-insensitive handled by DB potentially, or use .ilike)
        .maybeSingle();

    if (profileError || !recipientProfile) {
        console.error('Error finding recipient profile or profile not found:', profileError);
        return new Response(JSON.stringify({ error: 'Recipient email not found or database error.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404, // Not Found
        });
    }
    const recipientUserId = recipientProfile.id;
    console.log(`Found recipient user ID: ${recipientUserId}`);

    // Now find the recipient's *primary* account (assuming first one found)
     console.log(`Finding primary account for recipient user ID: ${recipientUserId}`);
    const { data: recipientAccount, error: recipientAccountError } = await supabaseAdminClient
        .from('accounts')
        .select('id, account_number') // Select ID and account number
        .eq('user_id', recipientUserId)
        .limit(1) // Get the first account associated with the user
        .maybeSingle();

    if (recipientAccountError || !recipientAccount) {
        console.error('Error finding recipient account or account not found:', recipientAccountError);
        return new Response(JSON.stringify({ error: 'Recipient user found, but no bank account associated with them.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404, // Not Found or appropriate error
        });
    }
     const recipientAccountId = recipientAccount.id;
     const recipientAccountNumber = recipientAccount.account_number; // Get the number for the SQL function
     console.log(`Found recipient account ID: ${recipientAccountId} (Number: ${recipientAccountNumber})`);

    // Check if source and recipient accounts are the same (redundant with email check, but safe)
     if (sourceAccountId === recipientAccountId) {
         console.warn(`Self-transfer attempt detected via account IDs by user ${user.id}`);
          return new Response(JSON.stringify({ error: 'Cannot transfer funds to the same account.' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
          });
     }

    // 6. Call the database function with recipient ACCOUNT NUMBER
    //    (The SQL function expects the account number to perform its internal lookup/locking)
     console.log('[transfer-funds] Calling database function create_transfer with params:', 
                    { source_account_id: sourceAccountId, recipient_account_number: recipientAccountNumber, transfer_amount: transferAmount, transfer_description: description || 'Transfer' });
    const { data: transferResult, error: rpcError } = await supabaseAdminClient.rpc('create_transfer', {
      source_account_id: sourceAccountId,
      recipient_account_number: recipientAccountNumber, // Pass the looked-up account number
      transfer_amount: transferAmount,
      transfer_description: description || 'Transfer'
    })

    if (rpcError) {
      console.error('Error calling create_transfer RPC:', rpcError);
      // Provide a more user-friendly error based on common DB exceptions
      let userMessage = 'Transfer failed due to a database error.';
      if (rpcError.message.includes('Insufficient funds')) {
          userMessage = 'Insufficient funds in the source account.';
      } else if (rpcError.message.includes('Recipient account not found')) {
          userMessage = 'Recipient account number not found.';
      } else if (rpcError.message.includes('Transfer amount must be positive')) {
            userMessage = 'Transfer amount must be positive.';
      }
      return new Response(JSON.stringify({ error: userMessage, details: rpcError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, // Use 400 for expected errors like insufficient funds
      })
    }

     console.log('Transfer successful:', transferResult);

    // --- Add sender notification logic --- 
    try {
      const { error: notificationError } = await supabaseClient // Use user's client
        .from('notifications')
        .insert({
          user_id: user.id, // Sender's ID
          title: 'Transfer Successful',
          message: `You successfully sent ${transferAmount} to ${recipientEmail}.`, // Using email as recipient identifier
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Log only, don't fail the whole transfer if notification fails
      } else {
        console.log('Notification created successfully for user:', user.id);
      }
    } catch (notificationCatchError) {
      console.error('Caught error during notification creation:', notificationCatchError);
    }
    // --- End of sender notification logic ---

    // --- Add receiver notification logic --- 
    if (recipientUserId) { // Ensure we found the recipient user ID
      try {
        const { error: receiverNotificationError } = await supabaseAdminClient // Use ADMIN client
          .from('notifications')
          .insert({
            user_id: recipientUserId, // Recipient's ID
            title: 'Funds Received',
            // Use sender's email for the message (user.email might be null, handle that)
            message: `You received ${transferAmount} from ${user?.email || 'another user'}.`,
          });

        if (receiverNotificationError) {
          console.error('Error creating receiver notification:', receiverNotificationError);
          // Log only
        } else {
          console.log('Receiver notification created successfully for user:', recipientUserId);
        }
      } catch (receiverNotificationCatchError) {
        console.error('Caught error during receiver notification creation:', receiverNotificationCatchError);
      }
    }
    // --- End of receiver notification logic ---

    // 7. Return success response
    return new Response(JSON.stringify({ success: true, data: transferResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
     console.error('Unhandled error in function:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

/* To invoke locally:
  1. Run `supabase start`
  2. Set up environment variables:
     - Copy `supabase/.env.local.example` to `supabase/.env.local`
     - Fill in the required values
  3. Run `supabase functions serve --env-file supabase/.env.local`
  4. Send a POST request to `http://localhost:54321/functions/v1/transfer-funds` with a valid JWT in the Authorization header and the required body JSON.
*/
/* To deploy:
  1. Ensure you are linked `supabase link --project-ref <your-project-ref>`
  2. Set required environment variables and secrets:
     - supabase secrets set SUPABASE_URL=...
     - supabase secrets set SUPABASE_ANON_KEY=...
     - supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
  3. Run `supabase functions deploy transfer-funds --no-verify-jwt` (use --no-verify-jwt only if your function handles auth explicitly as done above)
*/
