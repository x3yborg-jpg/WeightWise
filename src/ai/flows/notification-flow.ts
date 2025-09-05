
'use server';
/**
 * @fileOverview A flow for sending WhatsApp notifications for bin alerts and auditing bin data.
 *
 * - sendWhatsappAlert - A function that handles sending a WhatsApp message.
 * - WhatsappAlertInput - The input type for the sendWhatsappAlert function.
 * - binDataAuditor - A flow that checks bin data and triggers alerts if necessary.
 * - BinDataAuditorInput - The input type for the binDataAuditor flow.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import fetch from 'node-fetch';
import { database } from '@/lib/firebase';
import { ref, get, update, push, serverTimestamp } from 'firebase/database';

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


const BinDataAuditorInputSchema = z.object({
  binId: z.string(),
  currentLevel: z.number(),
  currentWeight: z.number(),
});
type BinDataAuditorInput = z.infer<typeof BinDataAuditorInputSchema>;


// This is the main backend flow that decides if an alert should be sent.
const binDataAuditorFlow = ai.defineFlow(
  {
    name: 'binDataAuditorFlow',
    inputSchema: BinDataAuditorInputSchema,
    outputSchema: z.object({ status: z.string() }),
  },
  async ({ binId, currentLevel, currentWeight }) => {
    // 1. Get bin configuration and global settings from Firebase
    const binConfigRef = ref(database, `bins-config/${binId}`);
    const binSettingsRef = ref(database, `global-settings`);
    const binDataRef = ref(database, binId);

    const [binConfigSnap, binSettingsSnap, binDataSnap] = await Promise.all([
      get(binConfigRef),
      get(binSettingsSnap),
      get(binDataRef),
    ]);

    if (!binConfigSnap.exists() || !binSettingsSnap.exists() || !binDataSnap.exists()) {
      return { status: `Configuration or data for bin ${binId} not found.` };
    }

    const binConfig = binConfigSnap.val();
    const globalSettings = binSettingsSnap.val();
    const binData = binDataSnap.val();

    const { warningThresholdLevel, warningThresholdWeight } = globalSettings;
    const { levelAlarmSent, weightAlarmSent } = binData;

    let updates: any = {};
    let alertToSend: WhatsappAlertInput | null = null;
    let alertType: 'level' | 'weight' | null = null;

    // 2. Check Level Threshold
    if (currentLevel >= warningThresholdLevel && !levelAlarmSent) {
      alertType = 'level';
      updates.levelAlarmSent = true;
    } else if (currentLevel < warningThresholdLevel && levelAlarmSent) {
      updates.levelAlarmSent = false;
    }

    // 3. Check Weight Threshold (only if no level alert is pending)
    if (!alertType && currentWeight >= warningThresholdWeight && !weightAlarmSent) {
      alertType = 'weight';
      updates.weightAlarmSent = true;
    } else if (currentWeight < warningThresholdWeight && weightAlarmSent) {
      updates.weightAlarmSent = false;
    }
    
    // 4. Prepare and Send Alert if needed
    if (alertType) {
       alertToSend = {
            binId: binId,
            binName: binConfig.name,
            location: binConfig.location,
            deviceId: binConfig.deviceId,
            isOnline: true, // Assuming online since data is fresh
            level: currentLevel,
            weight: currentWeight,
            alertType: alertType,
        };
        
        const sendResult = await sendNotificationFlow(alertToSend);
        
        // Only set the flag if the notification was successful
        if (!sendResult.success) {
            console.error(`Failed to send ${alertType} alert for ${binId}, not setting flag.`);
            delete updates[`${alertType}AlarmSent`];
        } else {
             // Log the successful alert to the new audit log
            const logRef = ref(database, `alerts-log/${binId}`);
            const message = alertType === 'level' 
                ? `Level alert: ${binConfig.name} at ${binConfig.location} reached ${currentLevel.toFixed(1)}%`
                : `Weight alert: ${binConfig.name} at ${binConfig.location} reached ${(currentWeight / 1000).toFixed(1)}kg`;
            
            await push(logRef, {
                timestamp: serverTimestamp(),
                type: alertType,
                message: `⚠️ ${message}`,
            });
        }
    }
    
    // 5. Apply any necessary updates to the database (flags)
    if (Object.keys(updates).length > 0) {
      await update(binDataRef, updates);
    }

    return { status: `Audit complete for ${binId}. Alert sent: ${alertType ?? 'none'}` };
  }
);


const sendNotificationFlow = ai.defineFlow(
  {
    name: 'sendNotificationFlow',
    inputSchema: WhatsappAlertInputSchema,
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  async (input) => {
    // A short delay to prevent race conditions
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
    // This function is kept for potential manual triggering (e.g., a test button)
    return await sendNotificationFlow(input);
}

export async function binDataAuditor(input: BinDataAuditorInput): Promise<{ status: string }> {
    return await binDataAuditorFlow(input);
}
