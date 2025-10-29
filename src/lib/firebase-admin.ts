import 'server-only';
import admin from 'firebase-admin';

let app: admin.app.App | null = null;

function initApp(): admin.app.App {
  if (app) return app;

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

  if (privateKey) {
    // Remove surrounding quotes if present
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
      privateKey = privateKey.slice(1, -1);
    }
    // Normalize escaped newlines to real newlines
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\r?\\n/g, '\n');
    }
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('FIREBASE_ADMIN_MISCONFIGURED');
  }

  app = admin.apps.length
    ? admin.app()
    : admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      });
  return app;
}

export function getAdminAuth() {
  return admin.auth(initApp());
}

export function getAdminDb() {
  return admin.database(initApp());
}

export function getAdminFirestore() {
  return admin.firestore(initApp());
}

