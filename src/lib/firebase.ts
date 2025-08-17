import { initializeApp, getApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

// IMPORTANT: This is a placeholder configuration.
// Replace with your own Firebase project configuration, which you can find
// in your Firebase project settings.
const firebaseConfig = {
  "projectId": "weightwise-dashboard-gboph",
  "appId": "1:458844112873:web:d7824a7a297eaf9485ad78",
  "storageBucket": "weightwise-dashboard-gboph.firebasestorage.app",
  "apiKey": "AIzaSyDh2UnT4NKyaMF8fDwNFnhqSWKiFi305rE",
  "authDomain": "weightwise-dashboard-gboph.firebaseapp.com",
  "databaseURL": "https://weightwise-dashboard-gboph-default-rtdb.firebaseio.com",
  "messagingSenderId": "458844112873"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const database = getDatabase(app);

export { database };
