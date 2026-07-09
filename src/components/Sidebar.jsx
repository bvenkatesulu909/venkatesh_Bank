import React from 'react';

const NAV = [
  { section: 'Main' },
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'accounts', label: 'Accounts', icon: '🏦' },
  { key: 'transfers', label: 'Transfers', icon: '↗️' },
  { key: 'beneficiaries', label: 'Beneficiaries', icon: '👥' },
  { section: 'Services' },
  { key: 'bill-payments', label: 'Bill Pay', icon: '📄' },
  { key: 'cards', label: 'Cards', icon: '💳' },
  { key: 'deposits', label: 'Deposits', icon: '📈' },
  { key: 'loans', label: 'Loans', icon: '🏠' },
  { section: 'You' },
  { key: 'profile', label: 'Profile / KYC', icon: '👤' },
  { key: 'notifications', label: 'Alerts', icon: '🔔' },
  { key: 'statements', label: 'Statements', icon: '📋' },
];

export default function Sidebar({ view, setView, user, onLogout, unread }) {
  const isAdmin = user?.role === 'admin';
  const nav = [...NAV];
  if (isAdmin) nav.push({ section: 'Admin' }, { key: 'admin', label: 'Admin Panel', icon: '🏦' });
  const initials = (user?.first_name?.[0]||'') + (user?.last_name?.[0]||'');
  return (
    <div className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">Sri Venkateswara Bank <small>Andhra Pradesh</small></div>
      </div>
      {nav.map((n, i) =>
        n.section ? <div key={`s-${i}`} className="nav-section">{n.section}</div>
        : <button key={n.key} className={`nav-item ${view === n.key ? 'active' : ''}`}
            onClick={() => setView(n.key)}>
            <span>{n.icon}</span>
            <span className="txt">{n.label}</span>
            {n.key === 'notifications' && unread > 0 && <span className="badge-notif">{unread}</span>}
          </button>
      )}
      <div className="nav-spacer" />
      <div className="sidebar-user">
        <div className="sidebar-avatar">{initials.toUpperCase() || '👤'}</div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{user?.first_name} {user?.last_name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{user?.role === 'admin' ? '🏦 Admin' : 'Customer'}</div>
        </div>
        <button className="btn small" onClick={onLogout} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '4px 8px', fontSize: 11 }}>Logout</button>
      </div>
    </div>
  );
}