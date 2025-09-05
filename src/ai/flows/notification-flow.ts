
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
import { database } from '@/lib/firebase';
import { ref, get, update } from 'firebase/database';

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
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  async (input) => {
    const { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_RECIPIENT_NUMBERS } = process.env;

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_RECIPIENT_NUMBERS) {
      const errorMessage = "WhatsApp API credentials are not fully configured in .env file.";
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }

    const recipients = WHATSAPP_RECIPIENT_NUMBERS.split(',').map(num => num.trim()).filter(Boolean);
    if (recipients.length === 0) {
      const errorMessage = "No recipient phone numbers configured in .env file.";
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }

    // This flow is now called by the Cloud Function, which handles the logic.
    // The flow's job is to format and send the message.
    const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const templateName = input.alertType === 'level' ? 'level_alert' : 'weight_alert';
    const bodyParams = [
        { type: 'text', text: input.binName },
        { type: 'text', text: input.location },
        { type: 'text', text: input.alertType === 'level' ? input.level.toFixed(1) : (input.weight / 1000).toFixed(1) },
        { type: 'text', text: input.alertType === 'level' ? (input.weight / 1000).toFixed(1) : input.level.toFixed(1) },
        { type: 'text', text: input.isOnline ? 'Online' : 'Offline' },
        { type: 'text', text: `${input.binId} / ${input.deviceId}` },
    ];

    let allSuccessful = true;
    for (const recipient of recipients) {
        const payload = {
            messaging_product: 'whatsapp',
            to: recipient,
            type: 'template',
            template: {
                name: templateName, 
                language: { code: 'en' },
                components: [{ type: 'body', parameters: bodyParams }]
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
                console.error(`Failed to send WhatsApp message to ${recipient}:`, responseData.error?.message || `HTTP error! Status: ${response.status}`);
            } else {
                console.log(`Successfully sent WhatsApp message to ${recipient}:`, responseData.messages[0]?.id);
            }
        } catch (error: any) {
            allSuccessful = false;
            console.error(`Error sending WhatsApp message to ${recipient}:`, error.message || 'An unknown error occurred.');
        }
    }
    
    if (allSuccessful) {
        return { success: true, message: `Alert sent to ${recipients.length} recipient(s).` };
    } else {
        return { success: false, message: 'One or more messages failed to send. Check logs.' };
    }
  }
);

export async function sendWhatsappAlert(input: WhatsappAlertInput): Promise<{ success: boolean; message: string; }> {
    return await sendNotificationFlow(input);
}

    