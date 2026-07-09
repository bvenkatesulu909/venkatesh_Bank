import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { fmtMoney, AcctCard } from '../components/ui.jsx';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [type, setType] = useState('savings');

  useEffect(() => { api('/accounts').then(r => setAccounts(r.data)).catch(() => {}); }, []);

  const createAcct = async () => {
    try { await api('/accounts/create', { method: 'POST', body: { type } }); setShowCreate(false); api('/accounts').then(r => setAccounts(r.data)); } catch {}
  };

  return (
    <div>
      <div className="topbar">
        <div><h1>My Accounts</h1><div className="sub">Manage your bank accounts</div></div>
        <button className="btn" onClick={() => setShowCreate(true)}>+ Open Account</button>
      </div>
      <div className="content">
        <div className="stat-row">
          {accounts.map(a => (
            <div key={a.id} className="stat-card">
              <div className="label">{a.type.toUpperCase()} {a.account_number}</div>
              <div className="value" style={{color:'var(--primary)'}}>{fmtMoney(a.balance)}</div>
              <div className="sub-value">{a.ifsc_code} · <span style={{color: a.status === 'active' ? 'var(--success)' : 'var(--danger)'}}>{a.status}</span></div>
            </div>
          ))}
        </div>
        <div className="acct-list">
          {accounts.map(a => <AcctCard key={a.id} account={a} />)}
        </div>
      </div>
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><h2>Open New Account</h2><button className="modal-close" onClick={() => setShowCreate(false)}>×</button></div>
            <div className="field"><label>Account Type</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                <option value="savings">Savings (3.5% p.a.)</option>
                <option value="current">Current (0% p.a.)</option>
              </select>
            </div>
            <button className="btn" onClick={createAcct} style={{marginTop:14}}>Open Account</button>
          </div>
        </div>
      )}
    </div>
  );
}