import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { fmtMoney, Modal } from '../components/ui.jsx';

const INITIAL = {
  first_name: '', last_name: '', email: '', phone: '',
  dob: '', address: '', city: '', state: '', pincode: '',
  pan: '', aadhar: '', kyc_status: 'pending',
};

export default function Profile() {
  const [profile, setProfile] = useState(INITIAL);
  const [original, setOriginal] = useState(INITIAL);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // MPIN state
  const [showMpin, setShowMpin] = useState(false);
  const [mpin, setMpin] = useState('');
  const [mpinConfirm, setMpinConfirm] = useState('');
  const [mpinBusy, setMpinBusy] = useState(false);
  const [mpinMsg, setMpinMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, accts] = await Promise.all([
        api('/profile'),
        api('/accounts').catch(() => ({ data: [] })),
      ]);
      const p = pRes.profile || pRes.user || pRes.data || pRes;
      const merged = { ...INITIAL };
      for (const key of Object.keys(INITIAL)) {
        merged[key] = p[key] !== undefined && p[key] !== null ? p[key] : INITIAL[key];
      }
      // Normalize dob if it's a timestamp
      if (merged.dob && merged.dob.includes('T')) merged.dob = merged.dob.split('T')[0];
      setProfile(merged);
      setOriginal({ ...merged });
      setAccounts(accts.data || accts || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const changedKeys = () => {
    const changed = {};
    for (const key of Object.keys(INITIAL)) {
      if (profile[key] !== original[key]) changed[key] = profile[key];
    }
    return changed;
  };

  const hasChanges = Object.keys(changedKeys()).length > 0;

  const u = k => e => setProfile({ ...profile, [k]: e.target.value });

  const saveProfile = async () => {
    const changes = changedKeys();
    if (Object.keys(changes).length === 0) return;
    setSaving(true); setError(''); setMsg('');
    try {
      await api('/profile', { method: 'PUT', body: changes });
      setMsg('✅ Profile updated successfully');
      setOriginal({ ...profile });
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleSetMpin = async e => {
    e.preventDefault();
    if (mpin !== mpinConfirm) { setMpinMsg('❌ MPINs do not match'); return; }
    if (mpin.length < 4 || mpin.length > 6) { setMpinMsg('❌ MPIN must be 4–6 digits'); return; }
    setMpinBusy(true); setMpinMsg('');
    try {
      await api('/auth/set-mpin', { method: 'POST', body: { mpin } });
      setMpinMsg('✅ MPIN set successfully');
      setMpin('');
      setMpinConfirm('');
    } catch (err) { setMpinMsg(`❌ ${err.message}`); }
    finally { setMpinBusy(false); }
  };

  const kycBadge = status => {
    const colors = { completed: 'var(--success)', pending: 'var(--warning)', verified: 'var(--success)', rejected: 'var(--danger)' };
    return <span style={{ color: colors[status] || 'var(--muted)', fontWeight: 600, textTransform: 'capitalize' }}>{status}</span>;
  };

  if (loading) return <div className="loading">Loading profile…</div>;

  return (
    <div>
      <div className="topbar">
        <div><h1>My Profile</h1><div className="sub">Manage your personal details and KYC</div></div>
      </div>
      <div className="content">
        {msg && <div className="success-msg">{msg}</div>}
        {error && <div className="error-msg">{error}</div>}

        <div className="grid-2">
          <div className="card">
            <div className="card-header"><h3>Personal Information</h3></div>
            <div className="form-grid">
              <div className="field"><label>First Name</label>
                <input value={profile.first_name} onChange={u('first_name')} /></div>
              <div className="field"><label>Last Name</label>
                <input value={profile.last_name} onChange={u('last_name')} /></div>
              <div className="field"><label>Email</label>
                <input type="email" value={profile.email} onChange={u('email')} /></div>
              <div className="field"><label>Phone</label>
                <input type="tel" value={profile.phone} onChange={u('phone')} /></div>
              <div className="field"><label>Date of Birth</label>
                <input type="date" value={profile.dob} onChange={u('dob')} /></div>
              <div className="field"><label>PAN</label>
                <input value={profile.pan} onChange={u('pan')} placeholder="ABCDE1234F" style={{ textTransform: 'uppercase' }} /></div>
              <div className="field"><label>Aadhar</label>
                <input value={profile.aadhar} onChange={u('aadhar')} placeholder="XXXX XXXX XXXX" /></div>
              <div className="field"><label>KYC Status</label>
                <div style={{ padding: '8px 0' }}>{kycBadge(profile.kyc_status)}</div></div>
            </div>
            <div className="field" style={{ marginTop: 12 }}><label>Address</label>
              <textarea value={profile.address} onChange={u('address')} rows={2} /></div>
            <div className="form-grid" style={{ marginTop: 12 }}>
              <div className="field"><label>City</label>
                <input value={profile.city} onChange={u('city')} /></div>
              <div className="field"><label>State</label>
                <input value={profile.state} onChange={u('state')} /></div>
              <div className="field"><label>Pincode</label>
                <input value={profile.pincode} onChange={u('pincode')} /></div>
            </div>
            <button className="btn" onClick={saveProfile} disabled={saving || !hasChanges} style={{ marginTop: 16 }}>
              {saving ? 'Saving…' : hasChanges ? '💾 Save Changes' : 'No Changes'}
            </button>
          </div>

          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h3>Security</h3></div>
              <div style={{ padding: '8px 0' }}>
                <button className="btn secondary" onClick={() => setShowMpin(true)}>🔐 Set / Change MPIN</button>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                  MPIN is used for transaction verification and login.
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3>Linked Accounts</h3></div>
              {accounts.length === 0 ? (
                <div className="empty">No accounts linked to this profile.</div>
              ) : (
                accounts.map(a => (
                  <div key={a.id} className="acct-card" style={{ marginBottom: 8 }}>
                    <div className="acct-chip"></div>
                    <div className="acct-type">{a.type} account</div>
                    <div className="acct-no">{a.account_number}</div>
                    <div className="acct-bal">{fmtMoney(a.balance)}</div>
                    <div className="acct-ifsc">{a.ifsc_code} | <span style={{ color: a.status === 'active' ? 'var(--success)' : 'var(--danger)' }}>{a.status}</span></div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showMpin && (
        <Modal title="Set MPIN" onClose={() => { setShowMpin(false); setMpinMsg(''); setMpin(''); setMpinConfirm(''); }}>
          <form onSubmit={handleSetMpin}>
            {mpinMsg && <div className={mpinMsg.startsWith('✅') ? 'success-msg' : 'error-msg'}>{mpinMsg}</div>}
            <div className="field" style={{ marginBottom: 12 }}>
              <label>New MPIN (4–6 digits)</label>
              <input type="password" maxLength={6} value={mpin} onChange={e => setMpin(e.target.value.replace(/\D/g, ''))} required placeholder="Enter MPIN" />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Confirm MPIN</label>
              <input type="password" maxLength={6} value={mpinConfirm} onChange={e => setMpinConfirm(e.target.value.replace(/\D/g, ''))} required placeholder="Re-enter MPIN" />
            </div>
            <button className="btn" disabled={mpinBusy} style={{ width: '100%' }}>
              {mpinBusy ? 'Setting…' : 'Set MPIN'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
