// nodemailer is optional — install with: npm install nodemailer
let nodemailer;
try { nodemailer = require('nodemailer'); } catch (_) {}
const https = require('https');

/** Load all settings from DB into a plain object */
function getSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  rows.forEach(r => { s[r.key] = r.value; });
  return s;
}

/** Safely parse JSON, return fallback on error */
function safeJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

/** Build plain-text order summary */
function buildOrderText(order) {
  const lines = order.items.map(
    i => `  • ${i.name} x${i.quantity}  KWD ${(i.unit_price * i.quantity).toFixed(3)}`
  );
  return [
    `☕ New Order #${order.id} — Studio Roast`,
    `Customer : ${order.client_name} <${order.client_email}>`,
    `Date     : ${order.order_date}`,
    ``,
    `Items:`,
    ...lines,
    ``,
    `Total    : KWD ${order.total.toFixed(3)}`,
    order.notes ? `Notes    : ${order.notes}` : null,
  ].filter(l => l !== null).join('\n');
}

/** Build HTML email body */
function buildEmailHtml(order) {
  const itemRows = order.items.map(i =>
    `<tr>
      <td style="padding:7px 10px;border-top:1px solid #EDD9B8;color:#2C1A0E">${i.name}</td>
      <td style="padding:7px 10px;border-top:1px solid #EDD9B8;text-align:center;color:#4A2C0A">${i.quantity}</td>
      <td style="padding:7px 10px;border-top:1px solid #EDD9B8;text-align:right;color:#C8860A;font-weight:600">KWD ${(i.unit_price * i.quantity).toFixed(3)}</td>
    </tr>`
  ).join('');

  return `
    <div style="font-family:'Segoe UI',sans-serif;max-width:540px;margin:0 auto;background:#FDF6EC;border-radius:12px;overflow:hidden;border:1px solid #EDD9B8">
      <div style="background:#2C1A0E;padding:22px 28px;text-align:center">
        <h2 style="color:#E8C99A;margin:0;font-size:1.25rem;letter-spacing:0.04em">☕ New Order Received</h2>
        <p style="color:#7A5C3A;margin:6px 0 0;font-size:0.85rem">Studio Roast — Kuwait</p>
      </div>
      <div style="padding:24px 28px">
        <table style="width:100%;margin-bottom:16px;font-size:0.9rem">
          <tr><td style="color:#9A7A5A;padding:3px 0;width:110px">Order #</td><td style="color:#2C1A0E;font-weight:600">${order.id}</td></tr>
          <tr><td style="color:#9A7A5A;padding:3px 0">Customer</td><td style="color:#2C1A0E">${order.client_name}</td></tr>
          <tr><td style="color:#9A7A5A;padding:3px 0">Email</td><td style="color:#2C1A0E">${order.client_email}</td></tr>
          <tr><td style="color:#9A7A5A;padding:3px 0">Date</td><td style="color:#2C1A0E">${order.order_date}</td></tr>
          ${order.notes ? `<tr><td style="color:#9A7A5A;padding:3px 0">Notes</td><td style="color:#7A5C3A;font-style:italic">${order.notes}</td></tr>` : ''}
        </table>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#FDF0DC">
              <th style="padding:8px 10px;text-align:left;color:#4A2C0A;font-size:0.82rem;font-weight:600">Item</th>
              <th style="padding:8px 10px;text-align:center;color:#4A2C0A;font-size:0.82rem;font-weight:600">Qty</th>
              <th style="padding:8px 10px;text-align:right;color:#4A2C0A;font-size:0.82rem;font-weight:600">Price</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr style="background:#FDF0DC">
              <td colspan="2" style="padding:10px;font-weight:700;color:#C8860A">Total</td>
              <td style="padding:10px;font-weight:700;color:#C8860A;text-align:right">KWD ${order.total.toFixed(3)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style="background:#1A0E07;padding:12px;text-align:center">
        <p style="color:#7A5C3A;margin:0;font-size:0.78rem">© Studio Roast Kuwait</p>
      </div>
    </div>`;
}

/** Create a nodemailer transporter from settings */
function createTransporter(s) {
  if (!nodemailer) throw new Error('nodemailer not installed — run: npm install nodemailer in the backend folder');
  return nodemailer.createTransport({
    host: s.smtp_host || 'smtp.gmail.com',
    port: parseInt(s.smtp_port || '587'),
    secure: parseInt(s.smtp_port || '587') === 465,
    auth: { user: s.smtp_user, pass: s.smtp_pass },
    tls: { rejectUnauthorized: false },   // helps with self-signed certs
  });
}

/** Send email to ALL configured recipients */
async function sendEmail(db, order) {
  const s = getSettings(db);
  if (s.email_enabled !== '1') return;
  if (!nodemailer) { console.log('✉️  nodemailer not installed — run: npm install nodemailer'); return; }

  const recipients = safeJSON(s.email_recipients, []).filter(Boolean);
  if (!s.smtp_user || recipients.length === 0) {
    console.log('✉️  Email skipped: no SMTP user or no recipients configured');
    return;
  }

  try {
    const transporter = createTransporter(s);
    // Verify SMTP connection first
    await transporter.verify();

    await transporter.sendMail({
      from: `"Studio Roast Orders" <${s.smtp_user}>`,
      to: recipients.join(', '),
      subject: `☕ New Order #${order.id} — ${order.client_name}`,
      text: buildOrderText(order),
      html: buildEmailHtml(order),
    });
    console.log(`✉️  Email sent to [${recipients.join(', ')}] for order #${order.id}`);
  } catch (err) {
    console.error(`✉️  Email FAILED for order #${order.id}:`, err.message);
  }
}

/** Send one WhatsApp message via CallMeBot */
async function sendOneWhatsApp(phone, apikey, text) {
  const encoded = encodeURIComponent(text);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encoded}&apikey=${apikey}`;
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => {
        if (res.statusCode === 200) resolve(body);
        else reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 100)}`));
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

/** Send WhatsApp to ALL configured recipients */
async function sendWhatsApp(db, order) {
  const s = getSettings(db);
  if (s.whatsapp_enabled !== '1') return;

  const recipients = safeJSON(s.whatsapp_recipients, []).filter(r => r.phone && r.apikey);
  if (recipients.length === 0) {
    console.log('📱 WhatsApp skipped: no recipients configured');
    return;
  }

  const text = buildOrderText(order);
  for (const r of recipients) {
    try {
      await sendOneWhatsApp(r.phone, r.apikey, text);
      console.log(`📱 WhatsApp sent to ${r.phone} for order #${order.id}`);
    } catch (err) {
      console.error(`📱 WhatsApp FAILED for ${r.phone} order #${order.id}:`, err.message);
    }
  }
}

/** Test email config — returns { ok, message } */
async function testEmail(db) {
  const s = getSettings(db);
  if (!nodemailer) return { ok: false, message: 'nodemailer not installed. Run: npm install nodemailer in the backend folder.' };
  const recipients = safeJSON(s.email_recipients, []).filter(Boolean);
  if (!s.smtp_user)        return { ok: false, message: 'SMTP username is not configured.' };
  if (!s.smtp_pass)        return { ok: false, message: 'SMTP password is not configured.' };
  if (recipients.length === 0) return { ok: false, message: 'No email recipients added.' };

  try {
    const transporter = createTransporter(s);
    await transporter.verify();
    await transporter.sendMail({
      from: `"Studio Roast Orders" <${s.smtp_user}>`,
      to: recipients.join(', '),
      subject: '☕ Test Notification — Studio Roast',
      text: 'This is a test notification from Studio Roast order system. If you received this, email notifications are working correctly.',
      html: `<div style="font-family:sans-serif;padding:24px;background:#FDF6EC;border-radius:10px;border:1px solid #EDD9B8"><h3 style="color:#2C1A0E">✅ Email notifications are working!</h3><p style="color:#7A5C3A">This is a test from Studio Roast order system.</p></div>`,
    });
    return { ok: true, message: `Test email sent to: ${recipients.join(', ')}` };
  } catch (err) {
    return { ok: false, message: `SMTP error: ${err.message}` };
  }
}

/** Test WhatsApp config — returns { ok, message } */
async function testWhatsApp(db) {
  const s = getSettings(db);
  const recipients = safeJSON(s.whatsapp_recipients, []).filter(r => r.phone && r.apikey);
  if (recipients.length === 0) return { ok: false, message: 'No WhatsApp recipients configured.' };

  const results = [];
  for (const r of recipients) {
    try {
      await sendOneWhatsApp(r.phone, r.apikey, '☕ Test from Studio Roast — notifications are working!');
      results.push(`✅ ${r.phone}`);
    } catch (err) {
      results.push(`❌ ${r.phone}: ${err.message}`);
    }
  }
  const allOk = results.every(r => r.startsWith('✅'));
  return { ok: allOk, message: results.join('\n') };
}

/** Fire both notifications without blocking the response */
function sendNotifications(db, order) {
  sendEmail(db, order).catch(() => {});
  sendWhatsApp(db, order).catch(() => {});
}

module.exports = { sendNotifications, testEmail, testWhatsApp };
