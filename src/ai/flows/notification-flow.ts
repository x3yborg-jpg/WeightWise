
'use server';
/**
 * @fileOverview Production-ready WhatsApp notifications for bin alerts
 * 
 * Features:
 * - Automatic retry with exponential backoff
 * - Rate limiting
 * - Message queue with Firestore
 * - Delivery status tracking
 * - Comprehensive error logging
 */
import { z } from 'zod';
import { getAdminFirestore, getAdminDb } from '@/lib/firebase-admin';
import { createWhatsAppService, formatPhoneNumber } from '@/lib/whatsapp-service';
import { sanitizeForFirestore } from '@/lib/firestore-utils';

const BinDataAuditorInputSchema = z.object({
  binId: z.string(),
});
type BinDataAuditorInput = z.infer<typeof BinDataAuditorInputSchema>;

/**
 * Send WhatsApp alert message using production-ready service
 */
export async function sendWhatsAppMessage(
  templateName: 'level_alert' | 'weight_alert', 
  recipients: string[],
  binName?: string,
  location?: string,
  value?: number
) {
    const whatsappService = createWhatsAppService();
    
    if (!whatsappService) {
      const errorMessage = "WhatsApp API credentials are not fully configured in .env file.";
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }

    // Send to all recipients using bulk send with retry logic
    const result = await whatsappService.sendBulkTemplateMessage(
      recipients,
      templateName,
      'en' // Language code
    );

    // Log results to Firestore for tracking
    const adminFirestore = getAdminFirestore();
    const admin = await import('firebase-admin');
    
    for (const res of result.results) {
      const logData = sanitizeForFirestore({
        recipient: res.recipient,
        template: templateName,
        success: res.success,
        messageId: res.messageId,
        error: res.error,
        binName,
        location,
        value,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      await adminFirestore.collection('whatsapp-logs').add(logData);

      if (res.success) {
        console.log(`✅ WhatsApp sent to ${res.recipient}: ${res.messageId}`);
      } else {
        console.error(`❌ WhatsApp failed to ${res.recipient}: ${res.error}`);
      }
    }

    return {
      success: result.success,
      message: result.success 
        ? `Alert sent to ${result.results.filter(r => r.success).length}/${recipients.length} recipients`
        : `Failed to send to ${result.results.filter(r => !r.success).length}/${recipients.length} recipients`,
      details: result.results,
    };
}


/**
 * Atomic lock helper using Firestore transaction
 * Prevents duplicate alerts when multiple devices are viewing the same bin
 * Returns true if this call acquired the lock and should send the alert
 */
async function tryAcquireAlertLock(
  binId: string,
  alertType: 'level' | 'weight',
  isThresholdExceeded: boolean
): Promise<boolean> {
  const adminFirestore = getAdminFirestore();
  const lockRef = adminFirestore.collection('alert-locks').doc(`${binId}-${alertType}`);
  
  try {
    const acquired = await adminFirestore.runTransaction(async (transaction) => {
      const lockDoc = await transaction.get(lockRef);
      const now = Date.now();
      
      if (isThresholdExceeded) {
        // Check if lock exists and is not expired (30 second expiry for safety)
        if (lockDoc.exists) {
          const lockData = lockDoc.data();
          const isLocked = lockData?.locked === true;
          const lockTime = lockData?.timestamp || 0;
          const isExpired = (now - lockTime) > 30000; // 30 seconds
          
          if (isLocked && !isExpired) {
            // Already locked by another device
            return false;
          }
        }
        
        // Acquire the lock
        transaction.set(lockRef, {
          locked: true,
          timestamp: now,
          binId,
          alertType,
        });
        return true;
      } else {
        // Threshold not exceeded, release lock if it exists
        if (lockDoc.exists) {
          transaction.delete(lockRef);
        }
        return false;
      }
    });
    
    return acquired;
  } catch (error) {
    console.error(`Error acquiring alert lock for ${binId}-${alertType}:`, error);
    // In case of transaction failure, assume we didn't acquire the lock (safe default)
    return false;
  }
}

export async function binDataAuditor(input: BinDataAuditorInput): Promise<{ status: string }> {
    const { binId } = input;
    
    const adminFirestore = getAdminFirestore();
    const adminDb = getAdminDb();
    
    // Fetch bin config from Firestore
    const binConfigDoc = await adminFirestore.collection('bins').doc(binId).get();
    if (!binConfigDoc.exists) {
      return { status: `Bin configuration for ${binId} not found.` };
    }
    const binConfig = binConfigDoc.data();
    
    // Fetch global settings from Firestore
    const settingsDoc = await adminFirestore.collection('system-settings').doc('global').get();
    if (!settingsDoc.exists) {
      return { status: `Global settings not found.` };
    }
    const globalSettings = settingsDoc.data();
    
    // Fetch live sensor data from Realtime Database
    const binDataSnap = await adminDb.ref(binId).get();
    if (!binDataSnap.exists()) {
      return { status: `Live data for bin ${binId} not found.` };
    }
    const binData = binDataSnap.val();

    const recipientNumbersStr = globalSettings.recipientNumbers || '';
    const recipients = recipientNumbersStr.split(',').map((num: string) => formatPhoneNumber(num.trim())).filter(Boolean);

    const updates: any = {};
    
    const currentHeartbeat = binData.IsON;
    const lastKnownHeartbeat = binConfig?.lastHeartbeat ?? null;
    if (currentHeartbeat !== undefined && currentHeartbeat !== lastKnownHeartbeat) {
        updates.lastSeen = Date.now();
        // Update lastHeartbeat in Firestore
        await adminFirestore.collection('bins').doc(binId).update({ lastHeartbeat: currentHeartbeat });
    }

    const { warningThresholdLevel, warningThresholdWeight } = globalSettings;
    const { level, weight, levelAlarmSent, weightAlarmSent } = binData;
    
    const isLevelThresholdExceeded = level >= warningThresholdLevel;
    const isWeightThresholdExceeded = weight >= warningThresholdWeight;

    // LEVEL ALERT - with atomic lock to prevent duplicates
    if (isLevelThresholdExceeded && !levelAlarmSent) {
      // Try to acquire lock atomically
      const lockAcquired = await tryAcquireAlertLock(binId, 'level', isLevelThresholdExceeded);
      
      if (lockAcquired && recipients.length > 0) {
        console.log(`🔒 Lock acquired for level alert on ${binId} - sending message`);
        const result = await sendWhatsAppMessage(
          'level_alert', 
          recipients,
          binConfig?.name,
          binConfig?.location,
          level
        );
        
        console.log(`Alert sending attempted for level on ${binId}: ${result.message}`);
        updates.levelAlarmSent = true;
        
        // Log to Firestore alerts collection for better querying
        const admin = await import('firebase-admin');
        const message = `Level alert: ${binConfig?.name} at ${binConfig?.location} reached ${level.toFixed(1)}%`;
        const alertData = sanitizeForFirestore({
            binId,
            type: 'level_alert',
            threshold: warningThresholdLevel,
            actualValue: level,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            message: `⚠️ ${message}`,
            whatsappSent: result.success,
        });
        await adminFirestore.collection('alerts').add(alertData);
      } else if (!lockAcquired) {
        console.log(`⏭️ Skipping level alert for ${binId} - lock already held by another device`);
      }
    } else if (!isLevelThresholdExceeded && levelAlarmSent) {
      // Release lock when threshold is no longer exceeded
      await tryAcquireAlertLock(binId, 'level', false);
      updates.levelAlarmSent = false;
    }
    
    // WEIGHT ALERT - with atomic lock to prevent duplicates
    if (isWeightThresholdExceeded && !weightAlarmSent) {
      // Try to acquire lock atomically
      const lockAcquired = await tryAcquireAlertLock(binId, 'weight', isWeightThresholdExceeded);
      
      if (lockAcquired && recipients.length > 0) {
        console.log(`🔒 Lock acquired for weight alert on ${binId} - sending message`);
        const result = await sendWhatsAppMessage(
          'weight_alert', 
          recipients,
          binConfig?.name,
          binConfig?.location,
          weight
        );
        
        console.log(`Alert sending attempted for weight on ${binId}: ${result.message}`);
        updates.weightAlarmSent = true;
        
        // Log to Firestore alerts collection for better querying
        const admin = await import('firebase-admin');
        const message = `Weight alert: ${binConfig?.name} at ${binConfig?.location} reached ${(weight / 1000).toFixed(1)}kg`;
        const alertData = sanitizeForFirestore({
            binId,
            type: 'weight_alert',
            threshold: warningThresholdWeight,
            actualValue: weight,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            message: `⚠️ ${message}`,
            whatsappSent: result.success,
        });
        await adminFirestore.collection('alerts').add(alertData);
      } else if (!lockAcquired) {
        console.log(`⏭️ Skipping weight alert for ${binId} - lock already held by another device`);
      }
    } else if (!isWeightThresholdExceeded && weightAlarmSent) {
      // Release lock when threshold is no longer exceeded
      await tryAcquireAlertLock(binId, 'weight', false);
      updates.weightAlarmSent = false;
    }
    
    if (Object.keys(updates).length > 0) {
      await adminDb.ref(binId).update(updates);
    }

    return { status: `Audit complete for ${binId}.` };
}
