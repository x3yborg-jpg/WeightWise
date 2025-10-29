/**
 * Data Migration Script: Realtime Database → Firestore
 * 
 * This script migrates existing data from Firebase Realtime Database to Firestore.
 * 
 * IMPORTANT: Run this ONCE after deploying the new code.
 * 
 * Usage:
 *   npx ts-node scripts/migrate-data-to-firestore.ts
 * 
 * Or add to package.json:
 *   "scripts": {
 *     "migrate-data": "ts-node scripts/migrate-data-to-firestore.ts"
 *   }
 * Then run: npm run migrate-data
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin (use your service account)
// Make sure to set these environment variables or use a service account key file
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();
const firestore = admin.firestore();

async function migrateBins() {
  console.log('📦 Migrating bins configuration...');
  
  try {
    const binsSnapshot = await db.ref('bins-config').once('value');
    const bins = binsSnapshot.val();
    
    if (!bins) {
      console.log('ℹ️  No bins found in RTDB. Skipping...');
      return;
    }
    
    let count = 0;
    for (const [binId, binData] of Object.entries(bins as any)) {
      await firestore.collection('bins').doc(binId).set({
        ...binData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      count++;
      console.log(`  ✅ Migrated bin: ${binId}`);
    }
    
    console.log(`✅ Successfully migrated ${count} bins`);
  } catch (error: any) {
    console.error('❌ Error migrating bins:', error.message);
  }
}

async function migrateSettings() {
  console.log('⚙️  Migrating global settings...');
  
  try {
    const settingsSnapshot = await db.ref('global-settings').once('value');
    const settings = settingsSnapshot.val();
    
    if (!settings) {
      console.log('ℹ️  No settings found in RTDB. Skipping...');
      return;
    }
    
    await firestore.collection('system-settings').doc('global').set({
      ...settings,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('✅ Successfully migrated global settings');
  } catch (error: any) {
    console.error('❌ Error migrating settings:', error.message);
  }
}

async function migrateUsers() {
  console.log('👥 Migrating users...');
  
  try {
    const usersSnapshot = await db.ref('users').once('value');
    const users = usersSnapshot.val();
    
    if (!users) {
      console.log('ℹ️  No users found in RTDB. Skipping...');
      return;
    }
    
    // Also fetch user emails from Firebase Auth
    const authUsers = await admin.auth().listUsers(1000);
    const emailMap = new Map(authUsers.users.map(u => [u.uid, u.email || '']));
    
    let count = 0;
    for (const [uid, userData] of Object.entries(users as any)) {
      const email = emailMap.get(uid) || '';
      
      await firestore.collection('users').doc(uid).set({
        email,
        role: userData.role || 'user',
        name: userData.name || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      count++;
      console.log(`  ✅ Migrated user: ${email || uid}`);
    }
    
    console.log(`✅ Successfully migrated ${count} users`);
  } catch (error: any) {
    console.error('❌ Error migrating users:', error.message);
  }
}

async function migrateAlerts() {
  console.log('🚨 Migrating alert history...');
  
  try {
    const alertsSnapshot = await db.ref('alerts-log').once('value');
    const alertsByBin = alertsSnapshot.val();
    
    if (!alertsByBin) {
      console.log('ℹ️  No alerts found in RTDB. Skipping...');
      return;
    }
    
    let count = 0;
    for (const [binId, alerts] of Object.entries(alertsByBin as any)) {
      if (!alerts) continue;
      
      for (const [alertId, alertData] of Object.entries(alerts as any)) {
        // Convert RTDB timestamp to Firestore timestamp
        const timestamp = alertData.timestamp 
          ? admin.firestore.Timestamp.fromMillis(alertData.timestamp)
          : admin.firestore.FieldValue.serverTimestamp();
        
        await firestore.collection('alerts').add({
          binId,
          type: alertData.type || 'level_alert',
          threshold: 0, // Unknown from old format
          actualValue: 0, // Unknown from old format
          timestamp,
          message: alertData.message || 'Alert',
        });
        count++;
      }
      console.log(`  ✅ Migrated alerts for bin: ${binId}`);
    }
    
    console.log(`✅ Successfully migrated ${count} alerts`);
  } catch (error: any) {
    console.error('❌ Error migrating alerts:', error.message);
  }
}

async function verifyLiveSensorData() {
  console.log('🔍 Verifying live sensor data (should remain in RTDB)...');
  
  try {
    const binsSnapshot = await db.ref('/').once('value');
    const rootData = binsSnapshot.val();
    
    let sensorDataCount = 0;
    for (const [key, value] of Object.entries(rootData as any)) {
      // Check if this looks like a bin's sensor data
      if (value && typeof value === 'object' && 
          ('weight' in value || 'level' in value || 'IsON' in value)) {
        sensorDataCount++;
        console.log(`  ✅ Found live sensor data for: ${key}`);
      }
    }
    
    if (sensorDataCount > 0) {
      console.log(`✅ Verified ${sensorDataCount} bins with live sensor data in RTDB`);
      console.log('ℹ️  Live sensor data will remain in RTDB (correct behavior)');
    } else {
      console.log('⚠️  No live sensor data found. ESP32 devices should write to RTDB paths.');
    }
  } catch (error: any) {
    console.error('❌ Error verifying sensor data:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting Firestore Migration...\n');
  
  try {
    await migrateBins();
    console.log('');
    
    await migrateSettings();
    console.log('');
    
    await migrateUsers();
    console.log('');
    
    await migrateAlerts();
    console.log('');
    
    await verifyLiveSensorData();
    console.log('');
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📋 Next steps:');
    console.log('  1. Deploy Firestore security rules: firebase deploy --only firestore:rules');
    console.log('  2. Test the application thoroughly');
    console.log('  3. (Optional) Clean up old RTDB paths: /bins-config, /global-settings, /users, /alerts-log');
    console.log('  4. ⚠️  DO NOT delete live sensor data paths (/{binId}/)');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
main();

