import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { fmtMoney, Modal, Badge, BillProviders } from '../components/ui.jsx';

const categories = [
  { key: 'mobile', label: '📱 Mobile' },
  { key: 'electricity', label: '💡 Electricity' },
  { key: 'dth', label: '📺 DTH' },
  { key: 'broadband', label: '🌐 Broadband' },
  { key: 'gas', label: '🔥 Gas' },
  { key: 'insurance', label: '🛡️ Insurance' },
];

const emptyForm = { category: '', provider: '', consumer_no: '', amount: '', account_id: '' };

export default function BillPayments() {
  const [accounts, setAccounts] = useState([]);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [providers, setProviders] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/accounts').then(r => setAccounts(r.data.filter(a => a.status === 'active'))).catch(() => {});
    api('/bills/providers').then(r => setProviders(r.data || [])).catch(() => {});
    api('/bills/history').then(r => setHistory(r.data || [])).catch(() => {});
  }, []);

  const u = k => e => setForm({ ...form, [k]: e.target.value });

  const selectCategory = (k) => {
    setForm({ ...emptyForm, category: k });
  };

  const catProviders = form.category
    ? BillProviders[form.category] || []
    : [];

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const r = await api('/bills/pay', {
        method: 'POST',
        body: {
          category: form.category,
          provider: form.provider,
          consumer_no: form.consumer_no,
          amount: Number(form.amount),
          account_id: Number(form.account_id),
        },
      });
      setMsg(`✅ Bill paid! Ref: ${r.transaction_id}`);
      setForm({ ...emptyForm });
      api('/bills/history').then(res => setHistory(res.data || [])).catch(() => {});
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="topbar"><div><h1>Bill Payments</h1><div className="sub">Pay your bills instantly</div></div></div>
      <div className="content">
        {msg && <div className="success-msg">{msg}</div>}
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><h3>Pay a Bill</h3></div>
            {error && <div className="error-msg">{error}</div>}

            {!form.category ? (
              <div>
                <p style={{color:'var(--muted)',marginBottom:14,fontSize:13}}>Choose a bill category</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {categories.map(c => (
                    <button
                      key={c.key}
                      className="btn secondary"
                      style={{justifyContent:'center',padding:'14px 10px',fontSize:13}}
                      onClick={() => selectCategory(c.key)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div style={{marginBottom:12}}>
                  <Badge kind="info">{categories.find(c => c.key === form.category)?.label}</Badge>
                  <button type="button" className="btn small secondary" style={{marginLeft:8}} onClick={() => setForm({...emptyForm})}>Change</button>
                </div>

                <div className="field" style={{marginBottom:12}}>
                  <label>Provider</label>
                  <select value={form.provider} onChange={u('provider')} required>
                    <option value="">Select provider</option>
                    {catProviders.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="field" style={{marginBottom:12}}>
                  <label>Consumer Number / ID</label>
                  <input value={form.consumer_no} onChange={u('consumer_no')} required placeholder="Consumer number" />
                </div>

                <div className="field" style={{marginBottom:12}}>
                  <label>Amount (₹)</label>
                  <input type="number" min="1" value={form.amount} onChange={u('amount')} required placeholder="Amount" />
                </div>

                <div className="field" style={{marginBottom:16}}>
                  <label>From Account</label>
                  <select value={form.account_id} onChange={u('account_id')} required>
                    <option value="">Select account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number} ({fmtMoney(a.balance)})</option>)}
                  </select>
                </div>

                <div style={{display:'flex',gap:8}}>
                  <button className="btn" disabled={busy}>{busy ? 'Processing…' : '💳 Pay Now'}</button>
                  <button type="button" className="btn secondary" onClick={() => setForm({...emptyForm})}>Cancel</button>
                </div>
              </form>
            )}
          </div>

          <div className="card">
            <div className="card-header"><h3>Payment History</h3></div>
            {history.length === 0 ? (
              <div className="empty">No bill payments yet</div>
            ) : (
              <div style={{maxHeight:400,overflowY:'auto'}}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Provider</th>
                      <th>Consumer No</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id || h.transaction_id}>
                        <td style={{whiteSpace:'nowrap',fontSize:12}}>{h.created_at ? new Date(h.created_at).toLocaleDateString('en-IN') : '—'}</td>
                        <td><Badge kind="info">{h.category}</Badge></td>
                        <td>{h.provider}</td>
                        <td style={{fontFamily:'monospace'}}>{h.consumer_no}</td>
                        <td>{fmtMoney(h.amount)}</td>
                        <td><Badge kind={h.status === 'paid' || h.status === 'success' ? 'success' : h.status === 'pending' ? 'pending' : 'danger'}>{h.status || 'completed'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
