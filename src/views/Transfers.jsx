import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { fmtMoney, Modal, Badge } from '../components/ui.jsx';

export default function Transfers() {
  const [accounts, setAccounts] = useState([]);
  const [bens, setBens] = useState([]);
  const [mode, setMode] = useState('within');
  const [form, setForm] = useState({ from_account: '', to_account: '', beneficiary_id: '', amount: '', description: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/accounts').then(r => setAccounts(r.data.filter(a => a.status === 'active')));
    api('/beneficiaries').then(r => setBens(r.data)).catch(() => {});
  }, []);

  const u = k => e => setForm({ ...form, [k]: e.target.value });

  const submit = async e => {
    e.preventDefault(); setBusy(true); setError(''); setMsg('');
    try {
      let r;
      if (mode === 'within') {
        r = await api('/transfers/within', { method: 'POST', body: { from_account: Number(form.from_account), to_account: Number(form.to_account), amount: Number(form.amount), description: form.description } });
      } else {
        r = await api('/transfers/other-bank', { method: 'POST', body: { from_account: Number(form.from_account), beneficiary_id: Number(form.beneficiary_id), amount: Number(form.amount), description: form.description } });
      }
      setMsg(`✅ Transfer successful! Ref: ${r.transaction_id}${r.fee ? ` (Fee: ₹${r.fee.toLocaleString('en-IN')})` : ''}`);
      setForm({ from_account: '', to_account: '', beneficiary_id: '', amount: '', description: '' });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="topbar"><div><h1>Fund Transfer</h1><div className="sub">Send money securely</div></div></div>
      <div className="content">
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><h3>New Transfer</h3></div>
            <div style={{display:'flex',gap:8,marginBottom:14}}>
              <button className={`btn small ${mode==='within'?'':'secondary'}`} onClick={()=>setMode('within')}>Within ICICI</button>
              <button className={`btn small ${mode==='other'?'':'secondary'}`} onClick={()=>setMode('other')}>Other Bank</button>
            </div>
            {msg && <div className="success-msg">{msg}</div>}
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={submit}>
              <div className="field" style={{marginBottom:12}}><label>From Account</label>
                <select value={form.from_account} onChange={u('from_account')} required>
                  <option value="">Select account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number} ({fmtMoney(a.balance)})</option>)}
                </select>
              </div>
              {mode === 'within' ? (
                <div className="field" style={{marginBottom:12}}><label>To Account (ICICI)</label>
                  <select value={form.to_account} onChange={u('to_account')} required>
                    <option value="">Select account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number} - {a.type}</option>)}
                  </select>
                </div>
              ) : (
                <div className="field" style={{marginBottom:12}}><label>To Beneficiary</label>
                  <select value={form.beneficiary_id} onChange={u('beneficiary_id')} required>
                    <option value="">Select beneficiary</option>
                    {bens.map(b => <option key={b.id} value={b.id}>{b.name} ({b.bank_name}) - Limit: {fmtMoney(b.max_limit)}</option>)}
                  </select>
                </div>
              )}
              <div className="field" style={{marginBottom:12}}><label>Amount (₹)</label>
                <input type="number" min="1" value={form.amount} onChange={u('amount')} required /></div>
              <div className="field" style={{marginBottom:12}}><label>Description</label>
                <input value={form.description} onChange={u('description')} placeholder="Reason for transfer" /></div>
              <button className="btn" disabled={busy}>{busy ? 'Processing…' : '↗️ Send Money'}</button>
            </form>
          </div>
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header"><h3>Transfer Limits</h3></div>
              <table className="compact"><tbody>
                <tr><td>IMPS (Within ICICI)</td><td style={{textAlign:'right'}}>₹5,00,000</td></tr>
                <tr><td>NEFT (Other Bank)</td><td style={{textAlign:'right'}}>₹50,000 (per ben)</td></tr>
                <tr><td>RTGS</td><td style={{textAlign:'right'}}>No limit</td></tr>
              </tbody></table>
            </div>
            <div className="card">
              <div className="card-header"><h3>Quick Info</h3></div>
              <div style={{fontSize:13,color:'var(--muted)',lineHeight:1.7}}>
                • NEFT: ₹0.50 fee for transactions above ₹50,000<br />
                • IMPS: 24x7 instant transfers<br />
                • RTGS: Minimum ₹2,00,000<br />
                • Transfers within ICICI are free
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}