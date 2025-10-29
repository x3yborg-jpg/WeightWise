# 🔧 Fix Your WhatsApp Error 100 - Quick Guide

## Your Current Error

```
Error Code 100: Unsupported post request. 
Object with ID '100386608651178' does not exist, 
cannot be loaded due to missing permissions, 
or does not support this operation.
```

---

## ⚡ Quick Fix (5 Minutes)

### Step 1: Get Correct Phone Number ID

The `100386608651178` in your error is **NOT** a Phone Number ID - it looks like your WhatsApp Business Account ID.

**Get the CORRECT Phone Number ID:**

1. Go to [Meta for Developers](https://developers.facebook.com/apps)
2. Select your app
3. Click **"WhatsApp"** in the left sidebar
4. Click **"API Setup"**
5. Look for **"Phone Number ID"** (should be 15-16 digits)
   - Example: `123456789012345`
6. **Copy this number** (not the phone number itself!)

### Step 2: Update Environment Variable

In your `.env.local` file, update:

```bash
WHATSAPP_PHONE_NUMBER_ID=123456789012345  # ← Use the Phone Number ID from step 1
```

**NOT:**
- ❌ Phone number (like `919876543210`)
- ❌ Business Account ID (like `100386608651178`)
- ❌ App ID

### Step 3: Verify Access Token

1. In Meta Developers, go to **WhatsApp > API Setup**
2. Copy the **Temporary Access Token** (for testing)
3. Update in `.env.local`:

```bash
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx  # ← Your access token
```

⚠️ **Note:** Temporary tokens expire in 24 hours. For production, create a System User token (see WHATSAPP-SETUP-GUIDE.md Step 6).

### Step 4: Restart Your Server

```bash
# Stop your development server (Ctrl+C)
# Then restart
npm run dev
```

### Step 5: Test Again

1. Open your app at `http://localhost:9002`
2. Login as admin
3. Open **Admin Panel**
4. Add your phone number in **"WhatsApp Alert Recipients"**
   - Format: `919876543210` (without + or spaces)
5. Click **"Send Level Alert Test"**

---

## ✅ Success Looks Like This

**In your browser console or server logs:**

```
✅ WhatsApp sent to 919876543210: wamid.HBgLOTE5ODc2NTQzMjEwFQIAERgSMzFEREFFRTFGNEQ1RDg5Qzc5AA==
```

**In Firestore `whatsapp-logs` collection:**

```javascript
{
  recipient: "919876543210",
  template: "level_alert",
  success: true,
  messageId: "wamid.xxxxx",
  timestamp: Firebase Timestamp
}
```

---

## 🔍 Still Not Working?

### Check 1: Phone Number ID is Correct?

```bash
# In Meta Developers > WhatsApp > API Setup
# Should see something like:
Phone Number ID: 123456789012345  ← This is what you need!
Phone number: +1 555-0100         ← NOT this
```

### Check 2: Access Token is Valid?

Test with curl:
```bash
curl -X GET "https://graph.facebook.com/v21.0/YOUR_PHONE_NUMBER_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Should return phone number details (not an error).

### Check 3: Template Exists?

Make sure you have created and approved templates in Meta Business Suite:
- Go to [Meta Business Suite](https://business.facebook.com)
- **WhatsApp Manager > Message Templates**
- Check if `level_alert` and `weight_alert` are **Approved**

If not, use the built-in `hello_world` template for testing:

Edit `src/app/api/send-test-message/route.ts` line 37:
```typescript
const result = await whatsappService.sendBulkTemplateMessage(
  recipients, 
  'hello_world',  // ← Change to hello_world for testing
  'en_US'         // ← Change language to en_US
);
```

### Check 4: Environment Variables Loaded?

Add this to your API route to debug:

```typescript
console.log('WHATSAPP_PHONE_NUMBER_ID:', process.env.WHATSAPP_PHONE_NUMBER_ID);
console.log('WHATSAPP_ACCESS_TOKEN:', process.env.WHATSAPP_ACCESS_TOKEN ? 'SET' : 'NOT SET');
```

---

## 📋 Complete Environment Variables Checklist

Your `.env.local` should have:

```bash
# Firebase (already configured)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="..."

# WhatsApp (add these)
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_random_token_here
```

---

## 🚀 After Fixing

Once it works:

1. ✅ Deploy updated Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

2. ✅ Create production access token (for permanent use)
   - See **WHATSAPP-SETUP-GUIDE.md** Step 6

3. ✅ Create and approve your custom templates
   - See **WHATSAPP-SETUP-GUIDE.md** Step 5

4. ✅ Set up webhook for delivery tracking
   - See **WHATSAPP-SETUP-GUIDE.md** Step 7

---

## 🆘 Common Mistakes

### Mistake 1: Using Business Account ID
```bash
❌ WHATSAPP_PHONE_NUMBER_ID=100386608651178  # This is Business Account ID
✅ WHATSAPP_PHONE_NUMBER_ID=123456789012345  # This is Phone Number ID
```

### Mistake 2: Using Actual Phone Number
```bash
❌ WHATSAPP_PHONE_NUMBER_ID=+15550100       # This is phone number
✅ WHATSAPP_PHONE_NUMBER_ID=123456789012345  # This is Phone Number ID
```

### Mistake 3: Expired Token
```bash
# Temporary tokens expire in 24 hours
# Solution: Generate System User token (see setup guide)
```

### Mistake 4: Wrong API Version
```bash
# Your code now uses v21.0 (correct)
# Old code used v22.0 (might not exist yet)
```

---

## 💬 Need More Help?

1. **Check Firestore Logs:**
   ```
   Firebase Console → Firestore → whatsapp-logs
   ```
   Look at the `error` field for specific error messages

2. **Check Server Logs:**
   Look in your terminal for detailed error messages

3. **Read the Full Guide:**
   See `WHATSAPP-SETUP-GUIDE.md` for complete setup

4. **Test with Curl:**
   ```bash
   curl -X POST "https://graph.facebook.com/v21.0/YOUR_PHONE_NUMBER_ID/messages" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "messaging_product": "whatsapp",
       "to": "919876543210",
       "type": "template",
       "template": {
         "name": "hello_world",
         "language": { "code": "en_US" }
       }
     }'
   ```

---

## ✅ Verification Checklist

- [ ] Phone Number ID is 15-16 digits (not phone number)
- [ ] Access Token starts with `EAA`
- [ ] Environment variables in `.env.local`
- [ ] Server restarted after updating `.env.local`
- [ ] Template exists and is approved
- [ ] Recipient number in international format
- [ ] Firestore rules deployed
- [ ] No other errors in console

---

**Fix these 3 things and you'll be sending messages in minutes!** 🚀

1. ✅ Correct Phone Number ID
2. ✅ Valid Access Token  
3. ✅ Restart Server

**Good luck!** 🎉

