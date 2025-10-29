# 📱 WhatsApp Cloud API - Production Setup Guide

Complete guide to set up WhatsApp Business API for the WeightWise system.

**Official Documentation:** https://developers.facebook.com/docs/whatsapp/cloud-api

---

## 🎯 Prerequisites

1. **Facebook Business Account** - [Create one](https://business.facebook.com)
2. **Meta Developer Account** - [Sign up](https://developers.facebook.com)
3. **WhatsApp Business Account** - Will be created during setup
4. **Phone Number** - Dedicated phone number for WhatsApp Business

---

## 📋 Step-by-Step Setup

### Step 1: Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/apps)
2. Click **"Create App"**
3. Select **"Business"** as app type
4. Fill in app details:
   - **App Name**: "WeightWise Alerts" (or your choice)
   - **App Contact Email**: Your email
   - **Business Account**: Select your business account
5. Click **"Create App"**

### Step 2: Add WhatsApp Product

1. In your app dashboard, find **"WhatsApp"**
2. Click **"Set Up"**
3. This will create a WhatsApp Business Account and test number

### Step 3: Get Your Credentials

#### A. Access Token (Temporary for Testing)

1. Go to **WhatsApp > API Setup**
2. Copy the **"Temporary Access Token"**
   - ⚠️ This expires in 24 hours - for testing only!
3. For production, generate a **System User Access Token** (see Step 6)

#### B. Phone Number ID

1. In **WhatsApp > API Setup**
2. Copy the **"Phone Number ID"** (looks like: `123456789012345`)

#### C. WhatsApp Business Account ID

1. In **WhatsApp > API Setup**
2. Copy the **"WhatsApp Business Account ID"** (looks like: `987654321098765`)

### Step 4: Add Environment Variables

Add these to your `.env.local`:

```bash
# WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_random_secure_token_here
```

**Generate a secure webhook verify token:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Create Message Templates

WhatsApp requires pre-approved templates for business-initiated conversations.

#### Create Templates in Meta Business Manager:

1. Go to [Meta Business Suite](https://business.facebook.com)
2. Navigate to **WhatsApp Manager > Message Templates**
3. Click **"Create Template"**

#### Template 1: `level_alert`

```
Category: Alert Update
Name: level_alert
Language: English

Message:
⚠️ *Bin Alert - Level Threshold Exceeded*

One of your waste bins has reached the configured fill level threshold. Please arrange for collection soon.

Thank you for using WeightWise.
```

#### Template 2: `weight_alert`

```
Category: Alert Update  
Name: weight_alert
Language: English

Message:
⚠️ *Bin Alert - Weight Threshold Exceeded*

One of your waste bins has reached the configured weight threshold. Please arrange for collection soon.

Thank you for using WeightWise.
```

#### Template 3: `hello_world` (Built-in for Testing)

Meta provides a default `hello_world` template you can use for testing.

**⏳ Approval Time:** Templates usually get approved within 24-48 hours.

### Step 6: Create System User (Production Access Token)

For production, you need a **permanent access token** (temporary ones expire in 24 hours).

1. Go to [Meta Business Settings](https://business.facebook.com/settings)
2. Navigate to **Users > System Users**
3. Click **"Add"** to create a system user
   - Name: "WeightWise API"
   - Role: "Admin"
4. Click **"Add Assets"**
   - Select your WhatsApp Business Account
   - Grant **"Manage WhatsApp Business Account"** permission
5. Click **"Generate New Token"**
   - Select your app
   - Select permissions: `whatsapp_business_messaging`, `whatsapp_business_management`
   - Set expiration: **Never** (for production)
6. **Copy and save** this token securely
7. Update your `.env.local` with this token

### Step 7: Configure Webhook

Webhooks receive delivery status, read receipts, and incoming messages.

#### A. Deploy Your Application First

Your webhook endpoint is: `https://your-domain.com/api/whatsapp/webhook`

#### B. Configure in Meta:

1. Go to your app in Meta Developers
2. Navigate to **WhatsApp > Configuration**
3. In **Webhook** section, click **"Edit"**
4. Enter:
   - **Callback URL**: `https://your-domain.com/api/whatsapp/webhook`
   - **Verify Token**: Your `WHATSAPP_WEBHOOK_VERIFY_TOKEN` from `.env`
5. Click **"Verify and Save"**

#### C. Subscribe to Events:

Check these webhook fields:
- ✅ `messages` - Incoming messages
- ✅ `message_status` - Delivery status updates
- ✅ `message_template_status_update` - Template approvals

### Step 8: Add a Production Phone Number

The test number has limitations (only works with 5 numbers). Add your own:

1. Go to **WhatsApp > API Setup**
2. Click **"Add Phone Number"**
3. Choose:
   - **Option A:** Use existing WhatsApp Business number (easier)
   - **Option B:** Register a new number
4. Follow verification steps
5. Update `WHATSAPP_PHONE_NUMBER_ID` in `.env.local`

### Step 9: Register Phone Numbers for Testing

While using the test number:

1. Go to **WhatsApp > API Setup**
2. Under **"To"** section, click **"Manage phone number list"**
3. Add test recipient numbers (max 5)
4. They'll receive a verification code on WhatsApp
5. Once verified, they can receive your test messages

### Step 10: Test Your Setup

#### A. Test from the Dashboard:

```bash
npm run dev
```

1. Log in as admin
2. Open **Admin Panel**
3. Add recipient numbers in **"WhatsApp Alert Recipients"**
4. Click **"Send Level Alert Test"** or **"Send Weight Alert Test"**

#### B. Check Logs:

Open your browser console or server logs to see:
- ✅ Success: "WhatsApp sent to 919876543210: wamid.xxxxx"
- ❌ Error: "WhatsApp failed: Invalid parameter (Code: 100)"

#### C. View in Firestore:

Check the `whatsapp-logs` collection for detailed logs.

---

## 🚨 Common Issues & Fixes

### Error Code 100: "Object with ID does not exist"

**Cause:** Wrong Phone Number ID or Access Token

**Fix:**
1. Verify `WHATSAPP_PHONE_NUMBER_ID` is correct
2. Check Access Token is valid (not expired)
3. Ensure token has correct permissions

### Error Code 131000: "Something went wrong"

**Cause:** Rate limiting or temporary Meta outage

**Fix:**
- Wait a few minutes and retry
- Check [Meta Status](https://metastatus.com/)
- Our retry logic will handle this automatically

### Error Code 132000: "Template does not exist"

**Cause:** Template name wrong or not approved

**Fix:**
1. Check template name exactly matches (case-sensitive)
2. Ensure template is approved in Meta Business Suite
3. Wait for approval if recently submitted

### Error Code 131048: "Number does not have WhatsApp"

**Cause:** Recipient doesn't use WhatsApp

**Fix:**
- Verify the number is correct
- Ensure recipient has WhatsApp installed
- Number must be in international format (e.g., 919876543210)

### Error Code 131042: "Phone number not registered"

**Cause:** Business phone number not verified

**Fix:**
1. Complete phone number verification in Meta
2. Check phone number status in WhatsApp Manager

### Webhook Not Working

**Symptoms:** No delivery status updates

**Fix:**
1. Verify webhook URL is publicly accessible (not localhost)
2. Check `WHATSAPP_WEBHOOK_VERIFY_TOKEN` matches in both places
3. Ensure webhook returns 200 OK
4. Check server logs for webhook POST requests
5. Test webhook manually:
   ```bash
   curl -X GET "https://your-domain.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"
   ```

---

## 📊 Monitoring & Logging

### Firestore Collections for Monitoring:

1. **`whatsapp-logs`** - All sent messages
   - Fields: recipient, template, success, messageId, error, timestamp
   - Use for: Tracking delivery, debugging failures

2. **`whatsapp-status-events`** - Delivery status updates
   - Fields: messageId, status (sent/delivered/read/failed), timestamp
   - Use for: Delivery analytics, read receipts

3. **`whatsapp-errors`** - API errors
   - Fields: code, message, timestamp
   - Use for: Debugging, monitoring

4. **`whatsapp-incoming-messages`** - Received messages
   - Fields: from, text, timestamp
   - Use for: Future two-way communication

### Query Examples:

```javascript
// Get all failed messages
const failed = await firestore
  .collection('whatsapp-logs')
  .where('success', '==', false)
  .orderBy('timestamp', 'desc')
  .get();

// Get delivery status for a message
const status = await firestore
  .collection('whatsapp-status-events')
  .where('messageId', '==', 'wamid.xxxxx')
  .get();

// Check error patterns
const errors = await firestore
  .collection('whatsapp-errors')
  .where('timestamp', '>', yesterday)
  .get();
```

---

## 💰 Pricing

### WhatsApp Cloud API Pricing (as of 2025):

- **Free Tier:** 1,000 conversations/month
- **Business-Initiated:** $0.005-$0.09 per conversation (varies by country)
- **User-Initiated:** FREE for 24 hours after user message

**India Pricing:**
- Service Conversations: ~$0.01 per conversation
- Marketing Conversations: ~$0.025 per conversation

**Conversation = 24-hour window** (multiple messages = 1 conversation)

### Cost Estimation for WeightWise:

**Scenario: 50 bins, each triggers 2 alerts/month**
- Conversations/month: 100
- Cost: 100 × $0.01 = **$1.00/month**
- Well within free tier!

---

## 🔐 Security Best Practices

### 1. Access Token Security

✅ **DO:**
- Store in environment variables only
- Use System User tokens (never expire)
- Rotate tokens every 90 days
- Use separate tokens for dev/production

❌ **DON'T:**
- Commit tokens to git
- Share tokens in public channels
- Use temporary tokens in production
- Hardcode in source files

### 2. Webhook Security

✅ **DO:**
- Verify webhook signatures (if available)
- Use HTTPS only
- Validate verify token
- Rate limit webhook endpoint
- Log all webhook events

### 3. Phone Number Privacy

✅ **DO:**
- Format numbers consistently
- Validate before sending
- Respect opt-outs
- Follow GDPR/privacy laws

---

## 📈 Production Checklist

Before going live:

- [ ] System User access token configured (permanent)
- [ ] Production phone number added and verified
- [ ] Message templates approved
- [ ] Webhook configured and verified
- [ ] Test messages sent successfully
- [ ] Firestore logging working
- [ ] Error handling tested
- [ ] Rate limiting tested (50 messages)
- [ ] Delivery status updates received
- [ ] Environment variables secured
- [ ] Backup recipient numbers configured
- [ ] Monitoring dashboard set up
- [ ] Team trained on admin panel

---

## 🆘 Support Resources

### Official Documentation:
- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Getting Started Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Error Codes Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes)
- [Webhooks Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)

### Meta Support:
- [WhatsApp Business Support](https://developers.facebook.com/support/bugs/)
- [Meta Status Page](https://metastatus.com/)
- [Community Forum](https://developers.facebook.com/community/)

### WeightWise Specific:
- Check `whatsapp-logs` collection in Firestore
- Review server logs for detailed errors
- Test with `hello_world` template first
- Use admin panel test buttons

---

## 🎓 Next Steps

1. **Set up templates** - Create and get approved
2. **Configure webhook** - Enable delivery tracking
3. **Test thoroughly** - Use test numbers
4. **Monitor logs** - Check Firestore collections
5. **Go live!** - Start receiving real alerts

**Your production-ready WhatsApp integration is now complete!** 🎉

---

*Last Updated: January 2025*
*Based on WhatsApp Cloud API v21.0*

