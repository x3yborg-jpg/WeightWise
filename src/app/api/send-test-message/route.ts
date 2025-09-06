
import { NextResponse } from 'next/server';
import fetch from 'node-fetch';
import { database } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

function formatPhoneNumber(number: string): string {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.startsWith('91')) {
        return cleaned;
    }
    return `91${cleaned}`;
}

export async function POST(request: Request) {
    const { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID } = process.env;
    const body = await request.json();
    const { templateName } = body;

    if (!templateName) {
        return NextResponse.json({ success: false, message: "Template name is required." }, { status: 400 });
    }

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      const errorMessage = "WhatsApp API credentials are not fully configured in .env file.";
      console.error(`[API Route Error] ${errorMessage}`);
      return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
    }

    // Fetch recipients from Firebase Realtime Database
    const settingsRef = ref(database, 'global-settings/recipientNumbers');
    const settingsSnap = await get(settingsRef);
    const recipientNumbers = settingsSnap.exists() ? settingsSnap.val() : '';
    
    const recipients = recipientNumbers.split(',').map((num: string) => num.trim()).filter(Boolean);

    if (recipients.length === 0) {
      const errorMessage = "No recipient phone numbers configured in the Admin Panel.";
       console.error(`[API Route Error] ${errorMessage}`);
      return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
    }

    const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    let allSuccessful = true;
    let firstError = null;

    for (const recipient of recipients) {
        const formattedRecipient = formatPhoneNumber(recipient);
        const payload = {
            messaging_product: 'whatsapp',
            to: formattedRecipient,
            type: 'template',
            template: {
                name: templateName, 
                language: { code: 'en' },
            },
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const responseData: any = await response.json();
            if (!response.ok) {
                allSuccessful = false;
                const errorMessage = responseData.error?.message || `HTTP error! Status: ${response.status}`;
                console.error(`Failed to send WhatsApp message to ${formattedRecipient}:`, errorMessage, `(Code: ${responseData.error?.code})`);
                if (!firstError) {
                    firstError = `Error Code ${responseData.error?.code}: ${errorMessage}`;
                }
            } else {
                console.log(`Successfully sent WhatsApp message to ${formattedRecipient}:`, responseData.messages[0]?.id);
            }
        } catch (error: any) {
            allSuccessful = false;
            const errorMessage = error.message || 'An unknown error occurred.';
            console.error(`Error sending WhatsApp message to ${formattedRecipient}:`, errorMessage);
            if (!firstError) {
                firstError = errorMessage;
            }
        }
    }
    
    if (allSuccessful) {
        return NextResponse.json({ success: true, message: `Test message sent to ${recipients.length} recipient(s).` });
    } else {
        return NextResponse.json({ success: false, message: firstError || 'One or more messages failed to send. Check server logs.' }, { status: 500 });
    }
}
