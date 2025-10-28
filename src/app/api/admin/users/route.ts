export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

const SECRET_PASSWORD = 'WeightWise';
const AUTH_DOMAIN = 'weightwise.app';

function pinToEmail(pin: string) {
  if (!/^\d{10}$/.test(pin)) throw new Error('PIN must be 10 digits');
  return `${pin}@${AUTH_DOMAIN}`;
}

export async function GET() {
  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    const usersPage = await adminAuth.listUsers(1000);
    const users = await Promise.all(usersPage.users.map(async (u) => {
      const userSnap = await adminDb.ref(`users/${u.uid}`).get();
      const userData = userSnap.exists() ? userSnap.val() : { role: 'user', name: null };
      return {
        uid: u.uid,
        email: u.email,
        role: userData.role || 'user',
        name: userData.name || null,
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
    const adminDb = getAdminDb();
    const user = await adminAuth.createUser({ email, password: SECRET_PASSWORD, emailVerified: false, disabled: false });
    const roleValue = role === 'admin' ? 'admin' : 'user';
    await adminDb.ref(`users/${user.uid}`).set({ role: roleValue, name: name || null });
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
    const adminDb = getAdminDb();
    if (role) {
      await adminDb.ref(`users/${uid}/role`).set(role);
    }
    if (name !== undefined) {
      await adminDb.ref(`users/${uid}/name`).set(name);
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
    const adminDb = getAdminDb();
    await adminAuth.deleteUser(uid);
    await adminDb.ref(`users/${uid}`).remove();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.message === 'FIREBASE_ADMIN_MISCONFIGURED') {
      return NextResponse.json({ error: 'Server credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.' }, { status: 500 });
    }
    return NextResponse.json({ error: e.message || 'Unknown server error' }, { status: 500 });
  }
}


