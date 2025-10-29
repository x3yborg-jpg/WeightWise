export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';

const SECRET_PASSWORD = 'WeightWise';
const AUTH_DOMAIN = 'weightwise.app';

function pinToEmail(pin: string) {
  if (!/^\d{10}$/.test(pin)) throw new Error('PIN must be 10 digits');
  return `${pin}@${AUTH_DOMAIN}`;
}

export async function GET() {
  try {
    const adminAuth = getAdminAuth();
    const adminFirestore = getAdminFirestore();
    const usersPage = await adminAuth.listUsers(1000);
    const users = await Promise.all(usersPage.users.map(async (u) => {
      const userDoc = await adminFirestore.collection('users').doc(u.uid).get();
      const userData = userDoc.exists ? userDoc.data() : { role: 'user', name: null };
      return {
        uid: u.uid,
        email: u.email,
        role: userData?.role || 'user',
        name: userData?.name || null,
      };
    }));
    return NextResponse.json({ users });
  } catch (e: any) {
    if (e?.message === 'FIREBASE_ADMIN_MISCONFIGURED') {
      return NextResponse.json({ error: 'Server credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.' }, { status: 500 });
    }
    return NextResponse.json({ error: e.message || 'Unknown server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { pin, role, name } = await request.json() as { pin: string; role?: 'admin' | 'user'; name?: string | null };
    if (!pin) return NextResponse.json({ error: 'pin is required' }, { status: 400 });
    const email = pinToEmail(pin);
    const adminAuth = getAdminAuth();
    const adminFirestore = getAdminFirestore();
    const user = await adminAuth.createUser({ email, password: SECRET_PASSWORD, emailVerified: false, disabled: false });
    const roleValue = role === 'admin' ? 'admin' : 'user';
    await adminFirestore.collection('users').doc(user.uid).set({ 
      email: user.email,
      role: roleValue, 
      name: name || null,
      createdAt: adminFirestore.FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ uid: user.uid, email: user.email, name: name || null, role: roleValue }, { status: 201 });
  } catch (e: any) {
    if (e?.message === 'FIREBASE_ADMIN_MISCONFIGURED') {
      return NextResponse.json({ error: 'Server credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.' }, { status: 500 });
    }
    return NextResponse.json({ error: e.message || 'Unknown server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { uid, role, name } = await request.json() as { uid: string; role?: 'admin' | 'user'; name?: string | null };
    if (!uid) return NextResponse.json({ error: 'uid is required' }, { status: 400 });
    const adminFirestore = getAdminFirestore();
    const updateData: any = {};
    if (role) {
      updateData.role = role;
    }
    if (name !== undefined) {
      updateData.name = name;
    }
    if (Object.keys(updateData).length > 0) {
      // Use set with merge to create document if it doesn't exist
      await adminFirestore.collection('users').doc(uid).set(updateData, { merge: true });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.message === 'FIREBASE_ADMIN_MISCONFIGURED') {
      return NextResponse.json({ error: 'Server credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.' }, { status: 500 });
    }
    return NextResponse.json({ error: e.message || 'Unknown server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { uid } = await request.json() as { uid: string };
    if (!uid) return NextResponse.json({ error: 'uid is required' }, { status: 400 });
    const adminAuth = getAdminAuth();
    const adminFirestore = getAdminFirestore();
    await adminAuth.deleteUser(uid);
    await adminFirestore.collection('users').doc(uid).delete();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.message === 'FIREBASE_ADMIN_MISCONFIGURED') {
      return NextResponse.json({ error: 'Server credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.' }, { status: 500 });
    }
    return NextResponse.json({ error: e.message || 'Unknown server error' }, { status: 500 });
  }
}


