
'use server';
/**
 * @fileOverview A flow for sending WhatsApp notifications for bin alerts.
 *
 * - sendWhatsappAlert - A function that handles sending a WhatsApp message.
 * - WhatsappAlertInput - The input type for the sendWhatsappAlert function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import fetch from 'node-fetch';

// --- IMPORTANT ---
// You must enter the recipient's WhatsApp number here, including the country code.
// For example: '911234567890' for an Indian number.
const RECIPIENT_PHONE_NUMBER = '918075643194'; 

const WhatsappAlertInputSchema = z.object({
  binName: z.string().describe("The name of the bin that triggered the alert."),
  level: z.number().describe("The current level of the bin."),
  weight: z.number().describe("The current weight of the bin in grams."),
  alertType: z.enum(['level', 'weight']).describe("The type of alert being triggered."),
  location: z.string().describe("The location of the bin."),
  binId: z.string().describe("The ID of the bin (e.g., 'bin1')."),
  deviceId: z.string().describe("The hardware device ID of the bin's sensor."),
  isOnline: z.boolean().describe("The connection status of the device."),
});
type WhatsappAlertInput = z.infer<typeof WhatsappAlertInputSchema>;


const sendNotificationFlow = ai.defineFlow(
  {
    name: 'sendNotificationFlow',
    inputSchema: WhatsappAlertInputSchema,
    outputSchema: z.object({ success: z.boolean(), messageId: z.string().optional(), error: z.string().optional() }),
  },
  async (input) => {
    const {
        WHATSAPP_ACCESS_TOKEN,
        WHATSAPP_PHONE_NUMBER_ID,
    } = process.env;

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
        const errorMessage = "WhatsApp API credentials are not configured in .env file.";
        console.error(errorMessage);
        return { success: false, error: errorMessage };
    }
    
    if (RECIPIENT_PHONE_NUMBER === 'YOUR_RECIPIENT_PHONE_NUMBER' || !RECIPIENT_PHONE_NUMBER) {
        const errorMessage = "Recipient phone number is not configured in src/ai/flows/notification-flow.ts.";
        console.error(errorMessage);
        return { success: false, error: errorMessage };
    }

    const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    // As per the user's curl command, we are now sending a template message.
    const payload = {
        messaging_product: 'whatsapp',
        to: RECIPIENT_PHONE_NUMBER,
        type: 'template',
        template: {
            name: 'hello_world',
            language: {
                code: 'en_US',
            },
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
            const errorMsg = responseData.error?.message || `HTTP error! Status: ${response.status}`;
            console.error('Failed to send WhatsApp message:', errorMsg);
            return { success: false, error: errorMsg };
        }
        
        console.log('Successfully sent WhatsApp message:', responseData);
        return { success: true, messageId: responseData.messages[0]?.id };

    } catch (error: any) {
        console.error('Error sending WhatsApp message:', error);
        return { success: false, error: error.message || 'An unknown error occurred.' };
    }
  }
);

export async function sendWhatsappAlert(input: WhatsappAlertInput): Promise<{ success: boolean; messageId?: string; error?: string; }> {
    return await sendNotificationFlow(input);
}
