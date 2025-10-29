# WeightWise - Quick Reference Guide

## 🗂️ Database Architecture

### Firestore Collections

#### `bins`
Configuration for each waste bin.
```typescript
{
  id: "bin1",
  name: "Tree Side",
  deviceId: "DEV-1001",
  location: "Kallambalam",
  lastHeartbeat: 12345,
  createdAt: Timestamp,
  status?: "active" | "inactive" | "maintenance"
}
```

#### `system-settings`
Global system configuration (single document with ID "global").
```typescript
{
  notificationInterval: 3600000,     // milliseconds
  warningThresholdLevel: 90,         // percentage
  warningThresholdWeight: 35000,     // grams
  recipientNumbers: "919876543210, 919123456789",
  updatedAt: Timestamp
}
```

#### `users`
User accounts and roles.
```typescript
{
  uid: "firebase-auth-uid",
  email: "1234567890@weightwise.app",
  role: "admin" | "user",
  name: "John Doe",
  createdAt: Timestamp,
  lastLoginAt: Timestamp
}
```

#### `alerts`
Historical alert records.
```typescript
{
  binId: "bin1",
  type: "level_alert" | "weight_alert",
  threshold: 90,
  actualValue: 95,
  timestamp: Timestamp,
  message: "⚠️ Level alert: Tree Side at Kallambalam reached 95.0%",
  resolvedAt?: Timestamp
}
```

---

### Realtime Database Paths

#### `/{binId}/`
Live sensor data (updates every 5-10 seconds).
```json
{
  "weight": 35200,           // grams
  "level": 85,               // percentage (0-100)
  "IsON": 12345,             // heartbeat value
  "levelAlarmSent": false,   // alarm state
  "weightAlarmSent": false,  // alarm state
  "lastSeen": 1735482345678  // timestamp
}
```

---

## 🔐 Security Rules

### Firestore Rules (firestore.rules)

```javascript
// Authenticated users can read all bins, only admins can write
bins: read (authenticated), write (admin only)

// Users can read their own data, admins can read/write all
users: read (self or admin), write (admin only)

// Everyone can read settings, only admins can modify
system-settings: read (authenticated), write (admin only)

// All authenticated users can read alerts
alerts: read (authenticated), create (authenticated), update/delete (admin only)
```

### Realtime Database Rules (database.rules.json)

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

---

## 🚀 Common Operations

### Add a New Bin

**Via Admin Panel (Recommended):**
1. Log in as admin
2. Create bin configuration in Firestore
3. ESP32 will automatically start sending data to RTDB

**Via Firebase Console:**
```javascript
firestore.collection('bins').doc('bin2').set({
  name: "North Gate",
  deviceId: "DEV-1002",
  location: "Main Entrance",
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
});
```

### Update Settings

**Via Admin Panel:**
1. Open Admin Panel
2. Modify settings
3. Save

**Via Code:**
```typescript
import { updateDoc, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

await updateDoc(doc(firestore, 'system-settings', 'global'), {
  warningThresholdLevel: 85,
  updatedAt: Timestamp.now()
});
```

### Query Alerts

**Get all alerts for a bin:**
```typescript
import { collection, query, where, getDocs } from 'firebase/firestore';

const q = query(
  collection(firestore, 'alerts'),
  where('binId', '==', 'bin1')
);
const snapshot = await getDocs(q);
const alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

**Get recent alerts (last 24 hours):**
```typescript
const yesterday = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

const q = query(
  collection(firestore, 'alerts'),
  where('timestamp', '>', yesterday),
  orderBy('timestamp', 'desc')
);
```

---

## 📡 ESP32 Integration

### Data Format to Send

ESP32 devices should send data to Realtime Database at path `/{binId}/`:

```json
{
  "weight": 35200,
  "level": 85,
  "IsON": 12345
}
```

**Important:** 
- `weight` in grams (integer)
- `level` as percentage (0-100)
- `IsON` is a heartbeat value (any number that changes)
- The backend will automatically add `lastSeen`, `levelAlarmSent`, `weightAlarmSent`

### ESP32 Code Example

```cpp
#include <Firebase.h>

void sendData() {
  String path = "/" + binId;
  
  FirebaseJson json;
  json.set("weight", currentWeight);
  json.set("level", currentLevel);
  json.set("IsON", millis()); // Use timestamp as heartbeat
  
  Firebase.updateNode(fbdo, path, json);
}
```

---

## 🔧 Troubleshooting

### Bins not showing up
1. Check Firestore `bins` collection
2. Verify Firestore rules are deployed
3. Check browser console for errors

### Live data not updating
1. Verify ESP32 is sending to correct RTDB path
2. Check RTDB security rules allow writes
3. Verify ESP32 has correct Firebase credentials

### Alerts not triggering
1. Check `system-settings/global` has correct thresholds
2. Verify recipient numbers are configured
3. Check WhatsApp API credentials in `.env`

### Permission denied errors
```bash
firebase deploy --only firestore:rules
```

---

## 📊 Data Flow

```
ESP32 Device
    ↓ (every 5-10s)
Realtime Database /{binId}/
    ↓ (real-time listener)
Frontend Dashboard
    ↓ (on threshold breach)
Backend Auditor (notification-flow.ts)
    ↓ (reads from Firestore)
Bin Config + Settings
    ↓ (sends alert)
WhatsApp API
    ↓ (logs to Firestore)
Alerts Collection
```

---

## 🎯 Best Practices

### Performance
- Use `onSnapshot` for real-time Firestore updates
- Use `onValue` for real-time RTDB updates
- Limit queries with `.limit()` for large datasets
- Use indexes for complex queries

### Security
- Never expose Firebase Admin credentials in client code
- Always validate data before writing to Firestore
- Use Security Rules to enforce access control
- Regularly audit user permissions

### Scalability
- Archive old alerts (older than 6 months)
- Use pagination for large lists
- Consider using Cloud Functions for heavy processing
- Monitor Firestore usage in Firebase Console

---

## 📞 Key Files

| File | Purpose |
|------|---------|
| `firestore.rules` | Firestore security rules |
| `database.rules.json` | RTDB security rules |
| `src/lib/firebase.ts` | Firebase client initialization |
| `src/lib/firebase-admin.ts` | Firebase Admin SDK |
| `src/lib/firestore-helpers.ts` | Firestore CRUD utilities |
| `src/context/bin-context.tsx` | Bin management state |
| `src/context/settings-context.tsx` | Settings state |
| `src/context/auth-context.tsx` | Authentication state |
| `src/ai/flows/notification-flow.ts` | Alert system logic |

---

## 🔄 Data Migration

If you have existing data in RTDB:

```bash
npm run migrate-data
```

This will:
1. Copy bins from `bins-config` → Firestore `bins`
2. Copy settings from `global-settings` → Firestore `system-settings/global`
3. Copy users from `users` → Firestore `users`
4. Copy alerts from `alerts-log` → Firestore `alerts`
5. Verify live sensor data remains in RTDB

---

## 📝 Environment Variables

Required in `.env.local`:

```bash
# Firebase Config (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Server)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# WhatsApp API
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

---

**For more details, see:**
- `FIRESTORE-MIGRATION-GUIDE.md` - Complete migration guide
- `MIGRATION-SUMMARY.md` - Migration summary
- `docs/database-migration-plan.md` - Original migration plan

