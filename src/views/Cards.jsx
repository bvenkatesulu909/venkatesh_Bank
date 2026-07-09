import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { fmtMoney, Modal, Badge } from '../components/ui.jsx';

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [showRequest, setShowRequest] = useState(false);
  const [form, setForm] = useState({ account_id: '', card_type: 'debit', network: 'Visa', is_virtual: false });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    api('/cards').then(r => setCards(r.data || [])).catch(() => {});
    api('/accounts').then(r => setAccounts(r.data || [])).catch(() => {});
  }, []);

  const u = k => e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [k]: val });
  };

  const requestCard = async e => {
    e.preventDefault(); setBusy(true); setError(''); setMsg('');
    try {
      await api('/cards/request', {
        method: 'POST',
        body: {
          account_id: Number(form.account_id),
          card_type: form.card_type,
          network: form.network,
          is_virtual: form.is_virtual,
        },
      });
      setMsg('✅ Card requested successfully!');
      setShowRequest(false);
      setForm({ account_id: '', card_type: 'debit', network: 'Visa', is_virtual: false });
      api('/cards').then(r => setCards(r.data || [])).catch(() => {});
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const blockCard = async id => {
    if (!window.confirm('Are you sure you want to block this card?')) return;
    try {
      await api(`/cards/${id}/block`, { method: 'POST' });
      setMsg('✅ Card blocked successfully!');
      api('/cards').then(r => setCards(r.data || [])).catch(() => {});
    } catch (err) { setError(err.message); }
  };

  const networkLabel = n => {
    const icons = { Visa: '💳', Mastercard: '💳', RuPay: '🔶' };
    return <>{icons[n] || '💳'} {n}</>;
  };

  return (
    <div>
      <div className="topbar">
        <div><h1>Cards</h1><div className="sub">Manage your debit and credit cards</div></div>
        <button className="btn" onClick={() => setShowRequest(true)}>+ Request Card</button>
      </div>
      <div className="content">
        {msg && <div className="success-msg">{msg}</div>}
        {error && <div className="error-msg">{error}</div>}
        <div className="stat-row">
          {cards.map(c => (
            <div key={c.id} className="stat-card" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <Badge kind={c.card_type === 'credit' ? 'warning' : 'primary'}>{c.card_type.toUpperCase()}</Badge>
                  {c.is_virtual && <Badge kind="info">VIRTUAL</Badge>}
                </div>
                <Badge kind={c.status === 'active' ? 'success' : c.status === 'blocked' ? 'danger' : 'muted'}>{c.status}</Badge>
              </div>
              <div className="label" style={{ fontSize: 18, letterSpacing: 3, fontFamily: 'monospace', marginBottom: 6 }}>
                {c.card_number || '**** **** **** ****'}
              </div>
              <div className="sub-value" style={{ marginBottom: 4 }}>{networkLabel(c.network)}</div>
              {c.expiry && <div className="sub-value" style={{ marginBottom: 8 }}>Exp: {c.expiry}</div>}
              {c.card_holder && <div className="sub-value" style={{ marginBottom: 8 }}>{c.card_holder}</div>}
              {c.status === 'active' && (
                <button className="btn small danger" onClick={() => blockCard(c.id)} style={{ marginTop: 4 }}>
                  🔒 Block Card
                </button>
              )}
            </div>
          ))}
          {cards.length === 0 && <div className="empty-state">No cards yet. Request a new card above.</div>}
        </div>
      </div>
      {showRequest && (
        <div className="modal-overlay" onClick={() => setShowRequest(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><h2>Request New Card</h2><button className="modal-close" onClick={() => setShowRequest(false)}>×</button></div>
            <form onSubmit={requestCard}>
              <div className="field"><label>Account</label>
                <select value={form.account_id} onChange={u('account_id')} required>
                  <option value="">Select account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number} ({fmtMoney(a.balance)})</option>)}
                </select>
              </div>
              <div className="field"><label>Card Type</label>
                <select value={form.card_type} onChange={u('card_type')}>
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div className="field"><label>Network</label>
                <select value={form.network} onChange={u('network')}>
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="RuPay">RuPay</option>
                </select>
              </div>
              <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="is_virtual" checked={form.is_virtual} onChange={u('is_virtual')} style={{ width: 18, height: 18 }} />
                <label htmlFor="is_virtual" style={{ margin: 0 }}>Virtual Card (no physical delivery)</label>
              </div>
              <button className="btn" disabled={busy} style={{ marginTop: 14 }}>{busy ? 'Requesting…' : 'Request Card'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}