
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

function formatPhoneNumber(number: string): string {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.startsWith('91')) {
        return cleaned;
    }
    return `91${cleaned}`;
}

export async function sendWhatsAppMessage(templateName: 'level_alert' | 'weight_alert', recipient: string) {
    const { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID } = process.env;

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      const errorMessage = "WhatsApp API credentials are not fully configured in .env file.";
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }
    
    const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    const payload = {
        messaging_product: 'whatsapp',
        to: recipient,
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
            console.error(`Failed to send WhatsApp message to ${recipient}:`, responseData.error?.message || `HTTP error! Status: ${response.status}`, `(Code: ${responseData.error?.code})`);
             return { success: false, message: responseData.error?.message || `HTTP error! Status: ${response.status}` };
        } else {
            console.log(`Successfully sent WhatsApp message to ${recipient}:`, responseData.messages[0]?.id);
             return { success: true, message: `Alert sent to ${recipient}.` };
        }
    } catch (error: any) {
        console.error(`Error sending WhatsApp message to ${recipient}:`, error.message || 'An unknown error occurred.');
         return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}


export async function binDataAuditor(input: BinDataAuditorInput): Promise<{ status: string }> {
    const { binId } = input;
    const { WHATSAPP_RECIPIENT_NUMBERS } = process.env;
    
    const recipients = WHATSAPP_RECIPIENT_NUMBERS 
        ? WHATSAPP_RECIPIENT_NUMBERS.split(',').map(num => num.trim()).filter(Boolean)
        : [];

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

    const updates: any = {};
    
    // Heartbeat/LastSeen Logic
    const currentHeartbeat = binData.IsON;
    const lastKnownHeartbeat = binConfig.lastHeartbeat ?? null;
    if (currentHeartbeat !== undefined && currentHeartbeat !== lastKnownHeartbeat) {
        updates.lastSeen = Date.now();
        await update(binConfigRef, { lastHeartbeat: currentHeartbeat });
    }

    // Alert Logic
    const { warningThresholdLevel, warningThresholdWeight } = globalSettings;
    const { level, weight, levelAlarmSent, weightAlarmSent } = binData;
    let alertType: 'level_alert' | 'weight_alert' | null = null;
    
    const isLevelThresholdExceeded = level >= warningThresholdLevel;
    const isWeightThresholdExceeded = weight >= warningThresholdWeight;

    // Check Level Threshold
    if (isLevelThresholdExceeded && !levelAlarmSent) {
        alertType = 'level_alert';
    } else if (!isLevelThresholdExceeded && levelAlarmSent) {
      updates.levelAlarmSent = false;
    }
    
    // Check Weight Threshold, but only if a level alert hasn't already been queued
    if (!alertType && isWeightThresholdExceeded && !weightAlarmSent) {
        alertType = 'weight_alert';
    } else if (!isWeightThresholdExceeded && weightAlarmSent) {
      updates.weightAlarmSent = false;
    }
    
    if (alertType && recipients.length > 0) {
        let allSuccessful = true;
        for (const recipient of recipients) {
            const formattedRecipient = formatPhoneNumber(recipient);
            const sendResult = await sendWhatsAppMessage(alertType, formattedRecipient);
            if (!sendResult.success) {
                allSuccessful = false;
            }
        }
        
        if (allSuccessful) {
            updates[`${alertType.replace('_alert', 'AlarmSent')}`] = true;
            const logRef = ref(database, `alerts-log/${binId}`);
            const message = alertType === 'level_alert' 
                ? `Level alert: ${binConfig.name} at ${binConfig.location} reached ${level.toFixed(1)}%`
                : `Weight alert: ${binConfig.name} at ${binConfig.location} reached ${(weight / 1000).toFixed(1)}kg`;
            
            await push(logRef, {
                timestamp: serverTimestamp(),
                type: alertType,
                message: `⚠️ ${message}`,
            });
        } else {
             console.error(`Failed to send ${alertType} for ${binId}, not setting alarm flag.`);
        }
    }
    
    if (Object.keys(updates).length > 0) {
      await update(binDataRef, updates);
    }

    return { status: `Audit complete for ${binId}. Alert type triggered: ${alertType ?? 'none'}` };
}
