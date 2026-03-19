# Email SMTP Setup Guide — Studio Roast

This guide walks you through configuring email notifications so that every new order triggers an email to your team.

---

## Prerequisites

- The app must be deployed (locally or on Railway)
- `nodemailer` must be installed (it is included in `backend/package.json` as a dependency)
- A Gmail account with 2-Step Verification enabled (or another SMTP provider)

---

## Step 1 — Create a Gmail App Password

Gmail blocks third-party apps from using your real password. You need a special **App Password** instead.

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click **Security** in the left sidebar
3. Under "How you sign in to Google", click **2-Step Verification**
   - Enable it first if it is not already on
4. Scroll to the bottom and click **App passwords**
5. Under "App name", type: `Studio Roast`
6. Click **Create**
7. Google displays a **16-character password** (e.g. `abcd efgh ijkl mnop`)
8. **Copy it immediately** — it is only shown once
9. Remove the spaces when entering it: `abcdefghijklmnop`

> **Important:** If you do not see "App passwords", make sure 2-Step Verification is fully enabled and your account is not a managed/workspace account that blocks app passwords.

---

## Step 2 — Configure SMTP in the Admin Panel

1. Open the app and go to `/admin`
2. Log in with your admin credentials
3. Navigate to the **Settings** tab
4. Fill in the SMTP fields:

| Field           | Value                                          |
|-----------------|------------------------------------------------|
| SMTP Host       | `smtp.gmail.com`                               |
| SMTP Port       | `587`                                          |
| SMTP Username   | Your full Gmail address (e.g. `you@gmail.com`) |
| SMTP Password   | The 16-character App Password from Step 1      |

5. Add one or more **Email Recipients** — these are the addresses that will receive order notifications
6. Toggle **Email Notifications** to **ON**
7. Click **Save Settings**

---

## Step 3 — Send a Test Email

In the Settings page, click the **Test Email** button. You should receive a test email within 30 seconds with the subject line:

```
☕ Test Notification — Studio Roast
```

---

## Step 4 — Verify with a Real Order

Place a test order on the client page. You should receive a styled HTML email containing:

- Order number and customer details
- Itemized table with quantities and prices
- Expected delivery date
- Total in KWD
- Any special notes or custom order requests

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "nodemailer not installed" | Run `cd backend && npm install` — nodemailer is now a required dependency |
| "SMTP username is not configured" | Fill in the SMTP Username field in Settings |
| "Invalid login" or "Authentication failed" | Make sure you are using an **App Password**, not your regular Gmail password. Remove all spaces from the 16-character code. |
| "2-Step Verification" not available | App Passwords require 2-Step Verification to be enabled on the Google account |
| Emails go to spam | Add your Gmail address to recipient's contacts, or switch to SendGrid for better deliverability |
| Gmail 500 emails/day limit | Switch to SendGrid (free tier: 100 emails/day) for higher volume |

---

## Alternative SMTP Providers

### Outlook / Hotmail

| Field         | Value                    |
|---------------|--------------------------|
| SMTP Host     | `smtp.office365.com`     |
| SMTP Port     | `587`                    |
| SMTP Username | Your full Outlook email  |
| SMTP Password | Your Outlook password    |

### SendGrid (Free — 100 emails/day)

1. Create a free account at [sendgrid.com](https://sendgrid.com)
2. Generate an API key in Settings > API Keys

| Field         | Value                    |
|---------------|--------------------------|
| SMTP Host     | `smtp.sendgrid.net`      |
| SMTP Port     | `587`                    |
| SMTP Username | `apikey`                 |
| SMTP Password | Your SendGrid API key    |

### Zoho Mail

| Field         | Value                    |
|---------------|--------------------------|
| SMTP Host     | `smtp.zoho.com`          |
| SMTP Port     | `587`                    |
| SMTP Username | Your Zoho email          |
| SMTP Password | Your Zoho app password   |

---

## How It Works (Technical)

The email system is implemented in `backend/src/notifications.js`:

- When a new order is placed via `POST /api/orders`, the `sendNotifications()` function fires asynchronously
- It reads SMTP settings from the `settings` table in the database
- If `email_enabled` is `'1'` and recipients are configured, it creates a nodemailer transporter and sends a styled HTML email
- The email includes: order ID, customer info, order date, expected delivery date, itemized table, total, and notes
- Email sending never blocks the order response — it runs in the background

### Admin API Endpoints

| Endpoint                        | Method | Description                |
|---------------------------------|--------|----------------------------|
| `GET /api/settings`             | GET    | Retrieve current settings  |
| `PUT /api/settings`             | PUT    | Update SMTP/notification settings |
| `POST /api/settings/test-email` | POST   | Send a test email          |

All settings endpoints require admin authentication.
