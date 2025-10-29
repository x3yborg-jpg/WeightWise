
import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { createWhatsAppService, formatPhoneNumber } from '@/lib/whatsapp-service';
import { sanitizeForFirestore } from '@/lib/firestore-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { templateName } = body;

        if (!templateName) {
            return NextResponse.json({ success: false, message: "Template name is required." }, { status: 400 });
        }

        // Create WhatsApp service
        const whatsappService = createWhatsAppService();
        
        if (!whatsappService) {
          const errorMessage = "WhatsApp API credentials are not fully configured in .env file.";
          console.error(`[API Route Error] ${errorMessage}`);
          return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
        }

        // Fetch recipients from Firestore
        const adminFirestore = getAdminFirestore();
        const settingsDoc = await adminFirestore.collection('system-settings').doc('global').get();
        const recipientNumbers = settingsDoc.exists && settingsDoc.data()?.recipientNumbers ? settingsDoc.data()!.recipientNumbers : '';
        
        const recipients = recipientNumbers.split(',').map((num: string) => formatPhoneNumber(num.trim())).filter(Boolean);

        if (recipients.length === 0) {
          const errorMessage = "No recipient phone numbers configured in the Admin Panel.";
           console.error(`[API Route Error] ${errorMessage}`);
          return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
        }

        console.log(`Sending test message '${templateName}' to ${recipients.length} recipient(s)...`);

        // Send using production service with retry logic
        const result = await whatsappService.sendBulkTemplateMessage(recipients, templateName, 'en');
        
        console.log(`WhatsApp send result:`, result);

        // Log results
        const admin = await import('firebase-admin');
        for (const res of result.results) {
          const logData = sanitizeForFirestore({
            recipient: res.recipient,
            template: templateName,
            success: res.success,
            messageId: res.messageId,
            error: res.error,
            isTest: true,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
          await adminFirestore.collection('whatsapp-logs').add(logData);
        }

        const successCount = result.results.filter(r => r.success).length;
        const failCount = result.results.filter(r => !r.success).length;

        if (result.success) {
            console.log(`✅ Test message sent successfully to ${successCount} recipient(s)`);
            return NextResponse.json({ 
              success: true, 
              message: `Test message sent successfully to ${successCount}/${recipients.length} recipient(s)!`,
              details: result.results,
            }, { status: 200 });
        } else {
            const firstError = result.results.find(r => !r.success)?.error || 'Unknown error';
            console.error(`❌ Test message failed: ${firstError}`);
            return NextResponse.json({ 
              success: false, 
              message: `Failed to send to ${failCount} recipient(s). Error: ${firstError}`,
              details: result.results,
            }, { status: 200 }); // Return 200 with success: false
        }
    } catch (error: any) {
        console.error('Unexpected error in send-test-message:', error);
        return NextResponse.json({ 
            success: false, 
            message: `Server error: ${error.message || 'Unknown error'}`,
            error: error.stack,
        }, { status: 500 });
    }
}
