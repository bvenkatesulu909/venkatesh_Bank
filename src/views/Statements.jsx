import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { fmtMoney, Badge } from '../components/ui.jsx';

export default function Statements() {
  const [accounts, setAccounts] = useState([]);
  const [selAcct, setSelAcct] = useState('');
  const [txns, setTxns] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => { api('/accounts').then(r => setAccounts(r.data)); }, []);
  useEffect(() => {
    if (!selAcct) return;
    const q = new URLSearchParams({ page: page.toString(), limit: '20' });
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    api(`/accounts/${selAcct}/statement?${q}`).then(r => { setTxns(r.data); }).catch(() => {});
    api(`/transactions?page=${page}&limit=20`).then(r => { setTotal(r.total); }).catch(() => {});
  }, [selAcct, page]);

  return (
    <div>
      <div className="topbar"><div><h1>Account Statements</h1><div className="sub">Download & view transactions</div></div></div>
      <div className="content">
        <div className="card" style={{marginBottom:16}}>
          <div className="grid-2">
            <div className="field"><label>Account</label>
              <select value={selAcct} onChange={e => { setSelAcct(e.target.value); setPage(1); }}>
                <option value="">Select account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number} ({a.type})</option>)}
              </select>
            </div>
            <div style={{display:'flex',gap:10,alignItems:'flex-end'}}>
              <div className="field"><label>From</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} /></div>
              <div className="field"><label>To</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} /></div>
              <button className="btn small" onClick={() => setPage(1)}>Filter</button>
            </div>
          </div>
        </div>
        {txns.length === 0 && <div className="empty">Select an account to view transactions</div>}
        {txns.length > 0 && (
          <div className="card">
            <table>
              <thead><tr><th>Date</th><th>Ref ID</th><th>Description</th><th>Mode</th><th style={{textAlign:'right'}}>Amount</th><th style={{textAlign:'right'}}>Fee</th></tr></thead>
              <tbody>
                {txns.map(t => (
                  <tr key={t.id}>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{t.created_at?.split(' ')[0]}</td>
                    <td style={{fontSize:11,fontFamily:'monospace'}}>{t.transaction_id?.slice(-10)}</td>
                    <td>{t.description || t.type || '—'}</td>
                    <td><Badge kind="info">{t.mode}</Badge></td>
                    <td style={{textAlign:'right', color: t.type === 'transfer' ? 'var(--success)' : 'var(--danger)'}}>{fmtMoney(t.amount)}</td>
                    <td style={{textAlign:'right'}}>{t.fee > 0 ? fmtMoney(t.fee) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total > 20 && (
              <div style={{display:'flex',justifyContent:'center',gap:10,marginTop:14}}>
                <button className="btn secondary small" disabled={page<=1} onClick={() => setPage(p=>p-1)}>← Previous</button>
                <span style={{padding:'5px 10px',color:'var(--muted)'}}>Page {page}</span>
                <button className="btn secondary small" disabled={page*20>=total} onClick={() => setPage(p=>p+1)}>Next →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}