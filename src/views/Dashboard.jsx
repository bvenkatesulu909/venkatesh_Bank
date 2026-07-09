import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { fmtMoney, AcctCard } from '../components/ui.jsx';

export default function Dashboard({ setView }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api('/dashboard').then(d => setData(d)).catch(() => {});
  }, []);

  if (!data) return <div className="loading">Loading dashboard…</div>;

  return (
    <div>
      <div className="topbar">
        <div><h1>Welcome back, {data?.accounts?.[0] ? '' : 'User'}</h1><div className="sub">Your banking overview</div></div>
        <div className="topbar-right">
          <button className="btn" onClick={() => setView('transfers')}>↗️ Transfer</button>
          <button className="btn secondary" onClick={() => setView('notifications')}>🔔{data.unreadNotifs > 0 && <span className="badge-notif" style={{marginLeft:4}}>{data.unreadNotifs}</span>}</button>
        </div>
      </div>
      <div className="content">
        <div className="stat-row">
          <div className="stat-card"><div className="label">Total Balance</div><div className="value" style={{color:'var(--primary)'}}>{fmtMoney(data.totalBalance)}</div></div>
          <div className="stat-card"><div className="label">Accounts</div><div className="value">{data.accounts?.length || 0}</div></div>
          <div className="stat-card"><div className="label">Active FD</div><div className="value">{data.activeFds}</div></div>
          <div className="stat-card"><div className="label">Active Loans</div><div className="value">{data.activeLoans}</div></div>
        </div>

        <div className="grid-2">
          <div>
            <div className="card-header"><h3>Your Accounts</h3><button className="btn secondary small" onClick={() => setView('accounts')}>View All</button></div>
            <div className="acct-list">
            {data.accounts?.filter(a => a.status === 'active').slice(0, 2).map(a => (
              <AcctCard key={a.id} account={a} />
            ))}
            </div>
          </div>
          <div>
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card-header"><h3>Quick Actions</h3></div>
              <div className="quick-actions">
                <div className="qa-btn" onClick={() => setView('transfers')}><div className="icon">↗️</div><div className="name">Transfer</div></div>
                <div className="qa-btn" onClick={() => setView('bill-payments')}><div className="icon">📄</div><div className="name">Pay Bills</div></div>
                <div className="qa-btn" onClick={() => setView('cards')}><div className="icon">💳</div><div className="name">Cards</div></div>
                <div className="qa-btn" onClick={() => setView('deposits')}><div className="icon">📈</div><div className="name">FD / RD</div></div>
                <div className="qa-btn" onClick={() => setView('loans')}><div className="icon">🏠</div><div className="name">Loans</div></div>
                <div className="qa-btn" onClick={() => setView('profile')}><div className="icon">👤</div><div className="name">Profile</div></div>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3>Recent Transactions</h3></div>
              {data.recentTxn?.length === 0 && <div className="empty">No recent transactions</div>}
              <table className="compact">
                <tbody>
                  {data.recentTxn?.slice(0, 5).map(t => (
                    <tr key={t.id}>
                      <td style={{fontSize:16}}>{t.type === 'transfer' ? t.beneficiary_name || 'Transfer' : t.description||'—'}</td>
                      <td style={{color:'var(--muted)', fontSize:12}}>{t.created_at?.split(' ')[0]}</td>
                      <td style={{textAlign:'right', color: t.type === 'transfer' ? 'var(--success)' : 'var(--danger)'}}>{fmtMoney(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}