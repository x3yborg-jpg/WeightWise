/**
 * WhatsApp Cloud API Webhook Endpoint
 * 
 * Receives status updates for sent messages
 * 
 * Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Webhook verification token (set in your .env)
const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'your-verify-token-here';

/**
 * GET - Webhook verification (required by WhatsApp)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
      // Respond with 200 OK and challenge token from the request
      console.log('WhatsApp webhook verified!');
      return new NextResponse(challenge, { status: 200 });
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
    }
  }

  return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
}

/**
 * POST - Receive webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2));

    // Check if this is a WhatsApp webhook
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ error: 'Not a WhatsApp webhook' }, { status: 400 });
    }

    // Process each entry
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;

        // Process message status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            await processMessageStatus(status);
          }
        }

        // Process incoming messages (for future use)
        if (value.messages) {
          for (const message of value.messages) {
            await processIncomingMessage(message);
          }
        }

        // Process errors
        if (value.errors) {
          for (const error of value.errors) {
            await processError(error);
          }
        }
      }
    }

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * Process message status update
 */
async function processMessageStatus(status: any) {
  const adminFirestore = getAdminFirestore();

  const {
    id: messageId,
    status: messageStatus,
    timestamp,
    recipient_id,
    errors,
  } = status;

  console.log(`Message ${messageId} status: ${messageStatus}`);

  // Update message status in Firestore
  try {
    // Find the message in whatsapp-logs
    const logsQuery = await adminFirestore
      .collection('whatsapp-logs')
      .where('messageId', '==', messageId)
      .limit(1)
      .get();

    if (!logsQuery.empty) {
      const logDoc = logsQuery.docs[0];
      await logDoc.ref.update({
        deliveryStatus: messageStatus,
        deliveryTimestamp: new Date(parseInt(timestamp) * 1000),
        ...(errors && { deliveryErrors: errors }),
      });
    }

    // Also create a status event record
    await adminFirestore.collection('whatsapp-status-events').add({
      messageId,
      status: messageStatus,
      timestamp: new Date(parseInt(timestamp) * 1000),
      recipientId: recipient_id,
      errors: errors || null,
      receivedAt: adminFirestore.FieldValue.serverTimestamp(),
    });

    // Handle different status types
    switch (messageStatus) {
      case 'sent':
        console.log(`✅ Message ${messageId} sent successfully`);
        break;
      case 'delivered':
        console.log(`📬 Message ${messageId} delivered`);
        break;
      case 'read':
        console.log(`👁️ Message ${messageId} read`);
        break;
      case 'failed':
        console.error(`❌ Message ${messageId} failed:`, errors);
        break;
    }
  } catch (error) {
    console.error('Error updating message status:', error);
  }
}

/**
 * Process incoming message (for future use - two-way communication)
 */
async function processIncomingMessage(message: any) {
  const adminFirestore = getAdminFirestore();

  console.log('Incoming message:', message);

  // Store incoming message in Firestore for future processing
  await adminFirestore.collection('whatsapp-incoming-messages').add({
    messageId: message.id,
    from: message.from,
    timestamp: new Date(parseInt(message.timestamp) * 1000),
    type: message.type,
    text: message.text?.body || null,
    receivedAt: adminFirestore.FieldValue.serverTimestamp(),
    processed: false,
  });

  // TODO: Add logic to handle incoming messages (e.g., commands, replies)
}

/**
 * Process webhook error
 */
async function processError(error: any) {
  const adminFirestore = getAdminFirestore();

  console.error('WhatsApp webhook error:', error);

  // Log error to Firestore
  await adminFirestore.collection('whatsapp-errors').add({
    code: error.code,
    title: error.title,
    message: error.message,
    errorData: error.error_data || null,
    timestamp: adminFirestore.FieldValue.serverTimestamp(),
  });
}

