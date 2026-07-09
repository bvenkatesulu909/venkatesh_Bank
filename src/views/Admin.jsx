import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { fmtMoney, Badge, Modal } from '../components/ui.jsx';

export default function Admin() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [txns, setTxns] = useState([]);
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api('/admin/users').catch(e => { setError(e.message); return {data:[]}; }),
      api('/admin/accounts').catch(() => ({data:[]})),
      api('/admin/transactions').catch(() => ({data:[]})),
    ]).then(([u, a, t]) => { setUsers(u.data); setAccounts(a.data); setTxns(t.data); }).catch(() => {});
    api('/loans').then(r => setLoans(r.data)).catch(() => {});
  }, []);

  const approveLoan = async (id) => { await api(`/admin/loans/${id}/approve`, { method: 'PUT' }); window.location.reload(); };
  const rejectLoan = async (id) => { await api(`/admin/loans/${id}/reject`, { method: 'PUT' }); window.location.reload(); };

  return (
    <div>
      <div className="topbar"><div><h1>🏦 Admin Panel</h1><div className="sub">Bank administration & oversight</div></div>
        <div style={{display:'flex',gap:8}}>
          <button className={`btn small ${tab==='users'?'':'secondary'}`} onClick={()=>setTab('users')}>Users</button>
          <button className={`btn small ${tab==='accounts'?'':'secondary'}`} onClick={()=>setTab('accounts')}>Accounts</button>
          <button className={`btn small ${tab==='txns'?'':'secondary'}`} onClick={()=>setTab('txns')}>Transactions</button>
          <button className={`btn small ${tab==='loans'?'':'secondary'}`} onClick={()=>setTab('loans')}>Loans</button>
        </div>
      </div>
      <div className="content">
        {error && <div className="error-msg">{error}</div>}
        {tab === 'users' && (
          <div className="card">
            <table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>KYC</th><th>Role</th><th>Joined</th></tr></thead>
              <tbody>{users.map(u => <tr key={u.id}>
                <td>{u.id}</td><td>{u.first_name} {u.last_name}</td><td>{u.email}</td><td>{u.phone}</td>
                <td><Badge kind={u.kyc_status}>{u.kyc_status}</Badge></td>
                <td>{u.role === 'admin' ? '🏦 Admin' : 'Customer'}</td>
                <td style={{fontSize:12,color:'var(--muted)'}}>{u.created_at?.split(' ')[0]}</td>
              </tr>)}</tbody></table>
          </div>
        )}
        {tab === 'accounts' && (
          <div className="card">
            <table><thead><tr><th>A/C No</th><th>User</th><th>Type</th><th>Balance</th><th>Status</th></tr></thead>
              <tbody>{accounts.map(a => <tr key={a.id}>
                <td style={{fontFamily:'monospace'}}>{a.account_number}</td>
                <td>{a.user_name}</td>
                <td>{a.type}</td>
                <td>{fmtMoney(a.balance)}</td>
                <td><Badge kind={a.status}>{a.status}</Badge></td>
              </tr>)}</tbody></table>
          </div>
        )}
        {tab === 'txns' && (
          <div className="card">
            <table><thead><tr><th>Ref</th><th>Amount</th><th>Type</th><th>Mode</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>{txns.map(t => <tr key={t.id}>
                <td style={{fontSize:11,fontFamily:'monospace'}}>{t.transaction_id?.slice(-10)}</td>
                <td>{fmtMoney(t.amount)}</td>
                <td>{t.type}</td>
                <td>{t.mode}</td>
                <td><Badge kind={t.status}>{t.status}</Badge></td>
                <td style={{fontSize:12,color:'var(--muted)'}}>{t.created_at?.split(' ')[0]}</td>
              </tr>)}</tbody></table>
          </div>
        )}
        {tab === 'loans' && (
          <div className="card">
            <table><thead><tr><th>Loan No</th><th>Type</th><th>Amount</th><th>EMI</th><th>Status</th><th></th></tr></thead>
              <tbody>{loans.map(l => <tr key={l.id}>
                <td style={{fontSize:11,fontFamily:'monospace'}}>{l.loan_number}</td>
                <td>{l.type}</td>
                <td>{fmtMoney(l.amount)}</td>
                <td>{fmtMoney(l.emi_amount)}</td>
                <td><Badge kind={l.status}>{l.status}</Badge></td>
                <td>{l.status === 'pending' && <>
                  <button className="btn small" style={{background:'var(--success)',color:'#000'}} onClick={()=>approveLoan(l.id)}>✓ Approve</button>
                  <button className="btn small danger" onClick={()=>rejectLoan(l.id)}>✕ Reject</button>
                </>}</td>
              </tr>)}</tbody></table>
          </div>
        )}
      </div>
    </div>
  );
}