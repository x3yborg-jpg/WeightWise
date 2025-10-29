import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, updateDoc, query, Timestamp } from 'firebase/firestore';
import { firestore } from './firebase';

// Bin Configuration
export interface BinDocument {
  name: string;
  deviceId: string;
  location: string;
  status?: 'active' | 'inactive' | 'maintenance';
  lastHeartbeat?: number;
  createdAt?: Timestamp;
  metadata?: Record<string, any>;
}

// System Settings
export interface SystemSettingsDocument {
  notificationInterval: number;
  warningThresholdLevel: number;
  warningThresholdWeight: number;
  recipientNumbers: string;
  updatedAt?: Timestamp;
}

// User Document
export interface UserDocument {
  email: string;
  role: 'admin' | 'user';
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
}

// Alert Document
export interface AlertDocument {
  binId: string;
  type: 'level_alert' | 'weight_alert';
  threshold: number;
  actualValue: number;
  timestamp: Timestamp;
  resolvedAt?: Timestamp;
  message: string;
}

// Bin Operations
export async function getBins(): Promise<Array<BinDocument & { id: string }>> {
  const binsCollection = collection(firestore, 'bins');
  const snapshot = await getDocs(binsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as BinDocument }));
}

export async function getBin(binId: string): Promise<(BinDocument & { id: string }) | null> {
  const binDoc = await getDoc(doc(firestore, 'bins', binId));
  if (!binDoc.exists()) return null;
  return { id: binDoc.id, ...binDoc.data() as BinDocument };
}

export async function createBin(binId: string, data: BinDocument): Promise<void> {
  await setDoc(doc(firestore, 'bins', binId), {
    ...data,
    createdAt: Timestamp.now(),
  });
}

export async function updateBin(binId: string, data: Partial<Omit<BinDocument, 'createdAt'>>): Promise<void> {
  await updateDoc(doc(firestore, 'bins', binId), data as any);
}

export async function deleteBin(binId: string): Promise<void> {
  await deleteDoc(doc(firestore, 'bins', binId));
}

// System Settings Operations
export async function getSystemSettings(): Promise<SystemSettingsDocument | null> {
  const settingsDoc = await getDoc(doc(firestore, 'system-settings', 'global'));
  if (!settingsDoc.exists()) return null;
  return settingsDoc.data() as SystemSettingsDocument;
}

export async function setSystemSettings(settings: SystemSettingsDocument): Promise<void> {
  await setDoc(doc(firestore, 'system-settings', 'global'), {
    ...settings,
    updatedAt: Timestamp.now(),
  });
}

// User Operations
export async function getUserRole(uid: string): Promise<'admin' | 'user' | null> {
  const userDoc = await getDoc(doc(firestore, 'users', uid));
  if (!userDoc.exists()) return null;
  return userDoc.data().role as 'admin' | 'user';
}

export async function setUserRole(uid: string, role: 'admin' | 'user', email?: string): Promise<void> {
  await setDoc(doc(firestore, 'users', uid), {
    role,
    email: email || '',
    updatedAt: Timestamp.now(),
  }, { merge: true });
}

export async function getAllUsers(): Promise<Array<UserDocument & { uid: string }>> {
  const usersCollection = collection(firestore, 'users');
  const snapshot = await getDocs(usersCollection);
  return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() as UserDocument }));
}

// Alert Operations
export async function createAlert(alertData: Omit<AlertDocument, 'timestamp'>): Promise<void> {
  const alertsCollection = collection(firestore, 'alerts');
  await setDoc(doc(alertsCollection), {
    ...alertData,
    timestamp: Timestamp.now(),
  });
}

export async function getBinAlerts(binId: string): Promise<Array<AlertDocument & { id: string }>> {
  const alertsCollection = collection(firestore, 'alerts');
  const q = query(alertsCollection);
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() as AlertDocument }))
    .filter(alert => alert.binId === binId)
    .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
}

