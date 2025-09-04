
'use server';
/**
 * @fileOverview A flow for sending WhatsApp notifications.
 *
 * - sendWhatsappMessage - A function that handles sending a WhatsApp message.
 * - WhatsappNotificationInput - The input type for the sendWhatsappMessage function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import fetch from 'node-fetch';

export const WhatsappNotificationInputSchema = z.object({
  message: z.string().describe('The content of the message to be sent.'),
});
export type WhatsappNotificationInput = z.infer<typeof WhatsappNotificationInputSchema>;


async function sendWhatsappMessage(input: WhatsappNotificationInput): Promise<{ success: boolean; messageId?: string, error?: string }> {
    const {
        WHATSAPP_ACCESS_TOKEN,
        WHATSAPP_PHONE_NUMBER_ID,
        WHATSAPP_RECIPIENT_NUMBER,
    } = process.env;

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_RECIPIENT_NUMBER) {
        const errorMessage = "WhatsApp API credentials are not configured in .env file.";
        console.error(errorMessage);
        return { success: false, error: errorMessage };
    }

    const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const payload = {
        messaging_product: 'whatsapp',
        to: WHATSAPP_RECIPIENT_NUMBER,
        type: 'text',
        text: {
            preview_url: false,
            body: input.message,
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


export const sendNotificationFlow = ai.defineFlow(
  {
    name: 'sendNotificationFlow',
    inputSchema: WhatsappNotificationInputSchema,
    outputSchema: z.object({ success: z.boolean(), messageId: z.string().optional(), error: z.string().optional() }),
  },
  async (input) => {
    return await sendWhatsappMessage(input);
  }
);
