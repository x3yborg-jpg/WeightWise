
import { NextResponse } from 'next/server';
import fetch from 'node-fetch';

export async function POST(request: Request) {
    const { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_RECIPIENT_NUMBERS } = process.env;

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_RECIPIENT_NUMBERS) {
      const errorMessage = "WhatsApp API credentials are not fully configured in .env file.";
      console.error(`[API Route Error] ${errorMessage}`);
      return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
    }
    
    const recipients = WHATSAPP_RECIPIENT_NUMBERS.split(',').map(num => num.trim()).filter(Boolean);
    if (recipients.length === 0) {
      const errorMessage = "No recipient phone numbers configured in .env file.";
       console.error(`[API Route Error] ${errorMessage}`);
      return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
    }

    const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    let allSuccessful = true;
    let firstError = null;

    for (const recipient of recipients) {
        const payload = {
            messaging_product: 'whatsapp',
            to: recipient,
            type: 'template',
            template: {
                name: 'level_alert', 
                language: { code: 'en_US' },
                 components: [
                    {
                        type: 'body',
                        parameters: [
                            { type: 'text', text: "Test Bin" },
                            { type: 'text', text: "95" },
                            { type: 'text', text: "38.5" },
                            { type: 'text', text: "Online" },
                            { type: 'text', text: "Test Location" }
                        ]
                    }
                ]
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
                console.error(`Failed to send WhatsApp message to ${recipient}:`, errorMessage);
                if (!firstError) {
                    firstError = errorMessage;
                }
            } else {
                console.log(`Successfully sent WhatsApp message to ${recipient}:`, responseData.messages[0]?.id);
            }
        } catch (error: any) {
            allSuccessful = false;
            const errorMessage = error.message || 'An unknown error occurred.';
            console.error(`Error sending WhatsApp message to ${recipient}:`, errorMessage);
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
