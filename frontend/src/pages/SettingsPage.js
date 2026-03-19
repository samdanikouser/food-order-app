import React, { useState, useEffect } from 'react';
import axios from 'axios';

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
});

const safeJSON = (str, fallback) => { try { return JSON.parse(str); } catch { return fallback; } };

export default function SettingsPage() {
  // Credentials
  const [username, setUsername]           = useState('');
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // SMTP
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');

  // Email recipients: array of strings
  const [emailEnabled, setEmailEnabled]     = useState(false);
  const [emailRecipients, setEmailRecipients] = useState(['']);

  // WhatsApp recipients: array of { phone, apikey }
  const [waEnabled, setWaEnabled]         = useState(false);
  const [waRecipients, setWaRecipients]   = useState([{ phone: '', apikey: '' }]);

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState({ text: '', type: '' });
  const [testEmailMsg, setTestEmailMsg]   = useState('');
  const [testWaMsg, setTestWaMsg]         = useState('');
  const [testingEmail, setTestingEmail]   = useState(false);
  const [testingWa, setTestingWa]         = useState(false);

  useEffect(() => {
    axios.get('/api/settings', authHeader())
      .then(res => {
        const d = res.data.data;
        setUsername(d.admin_username || 'admin');
        setSmtpHost(d.smtp_host || 'smtp.gmail.com');
        setSmtpPort(d.smtp_port || '587');
        setSmtpUser(d.smtp_user || '');
        setSmtpPass(d.smtp_pass || '');
        setEmailEnabled(d.email_enabled === '1');
        setEmailRecipients(safeJSON(d.email_recipients, ['']).length ? safeJSON(d.email_recipients, ['']) : ['']);
        setWaEnabled(d.whatsapp_enabled === '1');
        setWaRecipients(safeJSON(d.whatsapp_recipients, [{ phone: '', apikey: '' }]).length
          ? safeJSON(d.whatsapp_recipients, [])
          : [{ phone: '', apikey: '' }]);
      })
      .catch(() => setMsg({ text: 'Failed to load settings.', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      setMsg({ text: 'Passwords do not match.', type: 'error' }); return;
    }
    setSaving(true); setMsg({ text: '', type: '' });
    try {
      const payload = {
        admin_username: username,
        email_enabled: emailEnabled ? '1' : '0',
        email_recipients: JSON.stringify(emailRecipients.filter(e => e.trim())),
        smtp_host: smtpHost, smtp_port: smtpPort,
        smtp_user: smtpUser, smtp_pass: smtpPass,
        whatsapp_enabled: waEnabled ? '1' : '0',
        whatsapp_recipients: JSON.stringify(waRecipients.filter(r => r.phone.trim() && r.apikey.trim())),
      };
      if (newPassword) payload.admin_password = newPassword;
      await axios.put('/api/settings', payload, authHeader());
      if (newPassword) {
        localStorage.setItem('adminToken', btoa(`${username}:${newPassword}`));
      }
      setNewPassword(''); setConfirmPassword('');
      setMsg({ text: '✅ Settings saved successfully!', type: 'success' });
    } catch {
      setMsg({ text: 'Failed to save settings.', type: 'error' });
    } finally { setSaving(false); }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true); setTestEmailMsg('');
    try {
      const res = await axios.post('/api/settings/test-email', {}, authHeader());
      setTestEmailMsg(res.data.ok ? `✅ ${res.data.message}` : `❌ ${res.data.message}`);
    } catch { setTestEmailMsg('❌ Request failed'); }
    finally { setTestingEmail(false); }
  };

  const handleTestWa = async () => {
    setTestingWa(true); setTestWaMsg('');
    try {
      const res = await axios.post('/api/settings/test-whatsapp', {}, authHeader());
      setTestWaMsg(res.data.ok ? `✅ ${res.data.message}` : `❌ ${res.data.message}`);
    } catch { setTestWaMsg('❌ Request failed'); }
    finally { setTestingWa(false); }
  };

  // Email list helpers
  const addEmail    = () => setEmailRecipients(p => [...p, '']);
  const removeEmail = i  => setEmailRecipients(p => p.filter((_, idx) => idx !== i));
  const setEmail    = (i, v) => setEmailRecipients(p => p.map((e, idx) => idx === i ? v : e));

  // WhatsApp list helpers
  const addWa    = () => setWaRecipients(p => [...p, { phone: '', apikey: '' }]);
  const removeWa = i  => setWaRecipients(p => p.filter((_, idx) => idx !== i));
  const setWa    = (i, key, v) => setWaRecipients(p => p.map((r, idx) => idx === i ? { ...r, [key]: v } : r));

  if (loading) return <div className="loading">☕ Loading settings...</div>;

  return (
    <div style={{ maxWidth: 660 }}>
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Manage credentials, email & WhatsApp notifications</p>

      {msg.text && <div className={msg.type === 'error' ? 'error-msg' : 'success-msg'}>{msg.text}</div>}

      <form onSubmit={handleSave}>

        {/* ── Credentials ── */}
        <div className="settings-section">
          <div className="settings-section-title">🔐 Admin Credentials</div>
          <div className="form-group">
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to keep current" />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" />
            </div>
          </div>
        </div>

        {/* ── Email Notifications ── */}
        <div className="settings-section">
          <div className="settings-section-title">
            ✉️ Email Notifications
            <label className="toggle-label">
              <input type="checkbox" checked={emailEnabled} onChange={e => setEmailEnabled(e.target.checked)} />
              <span className="toggle-text">{emailEnabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          {emailEnabled && (<>
            {/* Recipients list */}
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#9A7060', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Recipients <span style={{ color: '#9A7060', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(all will receive every order notification)</span>
            </label>
            {emailRecipients.map((email, i) => (
              <div key={i} className="recipient-row">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(i, e.target.value)}
                  placeholder={`recipient${i + 1}@example.com`}
                  style={{ flex: 1 }}
                />
                {emailRecipients.length > 1 && (
                  <button type="button" className="remove-btn" onClick={() => removeEmail(i)} title="Remove">✕</button>
                )}
              </div>
            ))}
            <button type="button" className="add-recipient-btn" onClick={addEmail}>+ Add Email</button>

            <div className="settings-divider" />

            {/* SMTP settings */}
            <div className="settings-hint">
              📌 Use Gmail with an <strong>App Password</strong> (not your regular password).<br />
              Enable 2FA on your Google account → Security → App Passwords → generate one for "Mail".
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 12 }}>
              <div className="form-group">
                <label>SMTP Host</label>
                <input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Port</label>
                <input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Gmail / SMTP Username</label>
                <input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="your@gmail.com" />
              </div>
              <div className="form-group">
                <label>App Password</label>
                <input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
              <button type="button" className="btn btn-secondary test-btn" onClick={handleTestEmail} disabled={testingEmail}>
                {testingEmail ? 'Sending...' : '📨 Send Test Email'}
              </button>
              {testEmailMsg && <span className={`test-result ${testEmailMsg.startsWith('✅') ? 'ok' : 'fail'}`}>{testEmailMsg}</span>}
            </div>
          </>)}
        </div>

        {/* ── WhatsApp Notifications ── */}
        <div className="settings-section">
          <div className="settings-section-title">
            📱 WhatsApp Notifications
            <label className="toggle-label">
              <input type="checkbox" checked={waEnabled} onChange={e => setWaEnabled(e.target.checked)} />
              <span className="toggle-text">{waEnabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          {waEnabled && (<>
            <div className="settings-hint">
              📌 Uses <strong>CallMeBot</strong> (free). Each number needs its own API key.<br />
              To get a key: save <strong>+1 (206) 317-8047</strong> as a contact, then send <em>"I allow callmebot to send me messages"</em> on WhatsApp — they reply with your key in minutes.
            </div>

            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#9A7060', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Recipients <span style={{ color: '#9A7060', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(each number needs its own CallMeBot key)</span>
            </label>

            {waRecipients.map((r, i) => (
              <div key={i} className="recipient-row wa-row">
                <input
                  value={r.phone}
                  onChange={e => setWa(i, 'phone', e.target.value)}
                  placeholder="+96512345678"
                  style={{ flex: '1 1 150px' }}
                />
                <input
                  value={r.apikey}
                  onChange={e => setWa(i, 'apikey', e.target.value)}
                  placeholder="CallMeBot API key"
                  style={{ flex: '1 1 160px' }}
                />
                {waRecipients.length > 1 && (
                  <button type="button" className="remove-btn" onClick={() => removeWa(i)} title="Remove">✕</button>
                )}
              </div>
            ))}
            <button type="button" className="add-recipient-btn" onClick={addWa}>+ Add Number</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
              <button type="button" className="btn btn-secondary test-btn" onClick={handleTestWa} disabled={testingWa}>
                {testingWa ? 'Sending...' : '📲 Send Test WhatsApp'}
              </button>
              {testWaMsg && (
                <span className={`test-result ${testWaMsg.startsWith('✅') ? 'ok' : 'fail'}`} style={{ whiteSpace: 'pre-line' }}>
                  {testWaMsg}
                </span>
              )}
            </div>
          </>)}
        </div>

        <button className="btn btn-primary" type="submit" disabled={saving} style={{ marginTop: 8 }}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
