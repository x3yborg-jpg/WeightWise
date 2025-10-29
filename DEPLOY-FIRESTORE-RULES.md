# 🚀 Deploy Firestore Rules - Quick Guide

## Why You Need to Deploy

The duplicate alerts fix requires a new Firestore collection (`alert-locks`) that needs security rules. The rules have been updated in `firestore.rules`, but need to be deployed to Firebase.

---

## 📋 Deployment Options

### **Option 1: Firebase Console (Easiest)**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database**
4. Click on **Rules** tab
5. Copy the contents of `firestore.rules` from your project
6. Paste into the Firebase Console editor
7. Click **Publish**

✅ Done!

---

### **Option 2: Firebase CLI (Recommended for Production)**

**Prerequisites:**
```bash
npm install -g firebase-tools
firebase login
```

**Deploy Rules:**
```bash
firebase deploy --only firestore:rules
```

Expected output:
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/YOUR_PROJECT/overview
```

---

## 🔍 Verify Deployment

After deploying, verify the rules are active:

1. Go to Firebase Console → Firestore Database → Rules
2. Look for the `alert-locks` section:

```javascript
// Alert locks - Used to prevent duplicate WhatsApp notifications
match /alert-locks/{lockId} {
  allow read: if isAuthenticated();
  allow create, update, delete: if isAuthenticated();
}
```

3. Check the "Last published" timestamp - should be recent

---

## ✅ Test After Deployment

1. Restart your dev server
2. Open dashboard on 2 devices (e.g., laptop + phone)
3. Trigger an alert (increase sensor level above threshold)
4. Check WhatsApp: Should receive **exactly 1 message** (not 2)
5. Check browser console: Look for 🔒 and ⏭️ emoji logs

---

## 🎯 What the Rules Do

The new `alert-locks` rules allow authenticated users to:
- **Read** locks (check if alert is already being sent)
- **Create** locks (acquire the right to send alert)
- **Update** locks (refresh lock timestamp)
- **Delete** locks (release when threshold drops)

This enables the atomic transaction system that prevents duplicate alerts.

---

**Important:** The app will work without deploying these rules, but you **won't get duplicate prevention** until the rules are deployed!

