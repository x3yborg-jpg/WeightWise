# Database Architecture Migration Plan

## Current Architecture Analysis

### Realtime Database (Current)
Currently ALL data is stored in Firebase Realtime Database:
- `bins-config/` - Bin metadata (name, location, deviceId, lastHeartbeat)
- `global-settings/` - System-wide settings
- `users/{uid}/role` - User roles
- `{binId}/` - Live sensor data (weight, level, IsON, alarms)
- `alerts-log/{binId}/` - Alert history

**Problems:**
1. Not scalable for many bins (RTDB stores entire dataset in JSON)
2. No querying capabilities (can't filter, sort, paginate)
3. Expensive for historical data storage
4. Slow reads as data grows
5. No data archival mechanism

---

## Proposed Hybrid Architecture

### Realtime Database (High-frequency, live data)
Store ONLY real-time streaming data that changes frequently:

```
{
  "live-sensor-data": {
    "{binId}": {
      "weight": 35200,
      "level": 85,
      "IsON": 12345,          // Heartbeat
      "levelAlarmSent": false,
      "weightAlarmSent": false,
      "lastSeen": 1735482345678,
      "lastUpdated": 1735482345678
    }
  }
}
```

**Rationale:** 
- Updates every 5-10 seconds from ESP32
- Dashboard needs immediate UI updates
- RTDB excels at low-latency, real-time streaming

---

### Firestore (Persistent configuration & historical data)
Store semi-static config and historical data that needs querying:

#### Collection: `bins`
```typescript
{
  id: string; // Document ID
  name: string;
  deviceId: string;
  location: string;
  createdAt: Timestamp;
  lastHeartbeat: number;
  status: 'active' | 'inactive' | 'maintenance';
  metadata?: {
    capacity?: number;
    material?: string;
    notes?: string;
  }
}
```
**Queries:** Sort by name, filter by location, paginate

#### Collection: `system-settings`
```typescript
{
  id: 'global'; // Single document
  notificationInterval: number;
  warningThresholdLevel: number;
  warningThresholdWeight: number;
  recipientNumbers: string;
  updatedAt: Timestamp;
}
```

#### Collection: `users`
```typescript
{
  uid: string; // Document ID = user's Firebase Auth UID
  email: string;
  role: 'admin' | 'user';
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}
```

#### Collection: `alerts`
```typescript
{
  id: string; // Auto-generated
  binId: string;
  type: 'level_alert' | 'weight_alert';
  threshold: number;
  actualValue: number;
  timestamp: Timestamp;
  resolvedAt?: Timestamp;
  message: string;
}
```
**Queries:** Filter by binId, type, date range, sort by timestamp

#### Collection: `sensor-history` (Optional - for long-term analytics)
```typescript
{
  id: string;
  binId: string;
  weight: number;
  level: number;
  timestamp: Timestamp;
}
```
**Queries:** Time-series queries, aggregations, date ranges

---

## Migration Strategy

### Phase 1: Setup (No disruption)
1. Create Firestore collections with new schema
2. Keep RTDB as primary data source
3. Implement dual-write logic (write to both RTDB and Firestore)

### Phase 2: Gradual Migration (Zero downtime)
1. Update contexts to read from Firestore first, fallback to RTDB
2. Migrate existing data from RTDB to Firestore
3. Test thoroughly with existing ESP32 devices

### Phase 3: Complete Cutover
1. Update ESP32 code to write ONLY to RTDB (live sensor data)
2. All app reads from Firestore for configs/settings/users
3. Remove RTDB fallback code

### Phase 4: Optimization
1. Implement Firestore rules for security
2. Add caching layer for settings
3. Archive old sensor history

---

## Benefits

✅ **Scalability:** Add 1000+ bins without performance issues  
✅ **Querying:** Filter bins by location, sort by name, paginate  
✅ **Cost:** Firestore billed by reads, not data size  
✅ **Security:** Fine-grained access control per user  
✅ **Analytics:** Historical data queries for trends  
✅ **Real-time:** Keep live sensor updates fast via RTDB  

---

## File Changes Required

### New Files:
- `src/lib/firestore-helpers.ts` - Firestore CRUD utilities
- `src/context/bins-firestore-context.tsx` - Firestore bin context
- `src/context/users-firestore-context.tsx` - Firestore user context
- `database.rules` → `firestore.rules` - Migration rules

### Modified Files:
- `src/lib/firebase-admin.ts` - Add Firestore access
- `src/context/bin-context.tsx` - Migrate to Firestore
- `src/context/settings-context.tsx` - Migrate to Firestore
- `src/context/auth-context.tsx` - Migrate user roles to Firestore
- `src/app/api/admin/users/route.ts` - Use Firestore
- `src/components/admin-panel.tsx` - Use new contexts

---

## Implementation Order

1. ✅ Fix Firebase Admin credentials
2. ✅ Setup Firestore helpers
3. ✅ Create Firestore contexts
4. ✅ Migrate API routes
5. ✅ Update admin panel
6. ✅ Test end-to-end
7. ✅ Document for users

---

## Backward Compatibility

- ESP32 devices continue writing to RTDB (no changes needed)
- Old RTDB data remains accessible during migration
- Dual-read mode ensures no data loss
- Can rollback at any point

---

*Last Updated: January 2025*

