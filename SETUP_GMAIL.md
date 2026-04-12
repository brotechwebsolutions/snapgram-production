# 📧 Gmail SMTP Setup Guide

## Why Gmail SMTP?
Gmail's SMTP server is free, reliable, and works with App Passwords for secure auth.

## Step-by-Step Setup

### 1. Enable 2-Step Verification
1. Go to https://myaccount.google.com/security
2. Click **"2-Step Verification"** → Follow the setup
3. This is **required** before App Passwords work

### 2. Generate an App Password
1. Go to https://myaccount.google.com/apppasswords
   - (If you don't see this option, 2FA isn't enabled)
2. Select app: **"Mail"**
3. Select device: **"Other (Custom name)"** → type "SnapGram"
4. Click **Generate**
5. **Copy the 16-character password** (shown once — save it!)
   - It looks like: `abcd efgh ijkl mnop`
   - Remove spaces: `abcdefghijklmnop`

### 3. Set Environment Variables

**Local development (backend/.env or export):**
```bash
GMAIL_USERNAME=your-actual-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

**On Render:**
1. Dashboard → Your Service → Environment
2. Add: `GMAIL_USERNAME` = `your-actual-email@gmail.com`
3. Add: `GMAIL_APP_PASSWORD` = `abcdefghijklmnop`

### 4. Verify It Works
After deploying, test by registering a new account.
You should receive a 6-digit OTP within 30 seconds.

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Authentication failed` | Wrong App Password. Re-generate it. |
| `Username and Password not accepted` | Make sure you're using App Password, NOT your Gmail login password |
| `Connection refused` | Port 587 blocked by firewall. Try port 465 with SSL. |
| `Email never arrives` | Check spam folder. Verify GMAIL_USERNAME is correct. |

## Alternative: Port 465 (SSL)
If port 587 is blocked, change application.properties:
```properties
spring.mail.port=465
spring.mail.properties.mail.smtp.ssl.enable=true
spring.mail.properties.mail.smtp.starttls.enable=false
```
