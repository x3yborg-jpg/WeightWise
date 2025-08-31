import { initializeApp, getApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Defensive check for the databaseURL
if (!firebaseConfig.databaseURL || !firebaseConfig.databaseURL.startsWith('https://')) {
    console.error("FIREBASE FATAL ERROR: Your NEXT_PUBLIC_FIREBASE_DATABASE_URL is not set or is invalid in your .env.local file.");
    console.error(`Current value is: "${firebaseConfig.databaseURL}"`);
    console.error("It must be a full URL that starts with 'https://' and ends with '.firebaseio.com'.");
    // Throw an error to prevent the app from continuing with a bad config.
    throw new Error("Invalid Firebase database URL. Check the server console for details.");
}


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const database = getDatabase(app);
const auth = getAuth(app);

export { database, auth };
