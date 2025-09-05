
'use server';
/**
 * @fileOverview A flow for sending WhatsApp notifications for bin alerts and auditing bin data.
 *
 * - binDataAuditor - A function that checks bin data and triggers alerts if necessary.
 */
import { z } from 'zod';
import fetch from 'node-fetch';
import { database } from '@/lib/firebase';
import { ref, get, update, push, serverTimestamp } from 'firebase/database';

const BinDataAuditorInputSchema = z.object({
  binId: z.string(),
});
type BinDataAuditorInput = z.infer<typeof BinDataAuditorInputSchema>;


export async function sendWhatsAppMessage(binConfig?: any) {
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
    
    let allSuccessful = true;
    for (const recipient of recipients) {
        const payload = {
            messaging_product: 'whatsapp',
            to: recipient,
            type: 'template',
            template: {
                name: 'hello_world', 
                language: { code: 'en_US' },
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


export async function binDataAuditor(input: BinDataAuditorInput): Promise<{ status: string }> {
    const { binId } = input;
    
    // 1. Get bin configuration and global settings from Firebase
    const binConfigRef = ref(database, `bins-config/${binId}`);
    const binSettingsRef = ref(database, `global-settings`);
    const binDataRef = ref(database, binId);

    const [binConfigSnap, binSettingsSnap, binDataSnap] = await Promise.all([
      get(binConfigRef),
      get(binSettingsRef),
      get(binDataRef),
    ]);

    if (!binConfigSnap.exists() || !binSettingsSnap.exists() || !binDataSnap.exists()) {
      return { status: `Configuration or data for bin ${binId} not found.` };
    }

    const binConfig = binConfigSnap.val();
    const globalSettings = binSettingsSnap.val();
    const binData = binDataSnap.val();

    const { warningThresholdLevel, warningThresholdWeight } = globalSettings;
    const { level, weight, levelAlarmSent, weightAlarmSent } = binData;

    let updates: any = {};
    let alertType: 'level' | 'weight' | null = null;
    
    const isLevelThresholdExceeded = level >= warningThresholdLevel;
    const isWeightThresholdExceeded = weight >= warningThresholdWeight;

    // 2. Check Level Threshold
    if (isLevelThresholdExceeded && !levelAlarmSent) {
        alertType = 'level';
    } else if (!isLevelThresholdExceeded && levelAlarmSent) {
      updates.levelAlarmSent = false; // Reset the flag
    }
    
    // 3. Check Weight Threshold
    if (isWeightThresholdExceeded && !weightAlarmSent && !alertType) { // only check if level alert not already triggered
        alertType = 'weight';
    } else if (!isWeightThresholdExceeded && weightAlarmSent) {
      updates.weightAlarmSent = false; // Reset the flag
    }
    
    // 4. Prepare and Send Alert if needed
    if (alertType) {
        const sendResult = await sendWhatsAppMessage(binConfig);
        
        // Only set the flag and log if the notification was successful
        if (sendResult.success) {
            updates[`${alertType}AlarmSent`] = true;
            const logRef = ref(database, `alerts-log/${binId}`);
            const message = alertType === 'level' 
                ? `Level alert: ${binConfig.name} at ${binConfig.location} reached ${level.toFixed(1)}%`
                : `Weight alert: ${binConfig.name} at ${binConfig.location} reached ${(weight / 1000).toFixed(1)}kg`;
            
            await push(logRef, {
                timestamp: serverTimestamp(),
                type: alertType,
                message: `⚠️ ${message}`,
            });
        } else {
             console.error(`Failed to send ${alertType} alert for ${binId}, not setting flag.`);
        }
    }
    
    // 5. Apply any necessary updates to the database (flags)
    if (Object.keys(updates).length > 0) {
      await update(binDataRef, updates);
    }

    return { status: `Audit complete for ${binId}. Alert type triggered: ${alertType ?? 'none'}` };
}
