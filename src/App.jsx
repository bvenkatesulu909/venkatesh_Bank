import React, { useState, useEffect, useCallback } from 'react';
import { api, getToken, setToken, clearToken } from './api.js';
import Auth from './components/Auth.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './views/Dashboard.jsx';
import Accounts from './views/Accounts.jsx';
import Transfers from './views/Transfers.jsx';
import Beneficiaries from './views/Beneficiaries.jsx';
import BillPayments from './views/BillPayments.jsx';
import Cards from './views/Cards.jsx';
import Deposits from './views/Deposits.jsx';
import Loans from './views/Loans.jsx';
import Profile from './views/Profile.jsx';
import Notifications from './views/Notifications.jsx';
import Statements from './views/Statements.jsx';
import Admin from './views/Admin.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [unread, setUnread] = useState(0);

  const loadMe = useCallback(async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const { user } = await api('/auth/me');
      setUser(user);
      try { const res = await api('/dashboard'); setUnread(res.unreadNotifs || 0); } catch {}
    } catch { clearToken(); setUser(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const handleAuth = (userData, token) => { setToken(token); setUser(userData); loadMe(); };
  const handleLogout = () => { clearToken(); setUser(null); setView('dashboard'); };

  if (loading) return <div className="loading">Loading Sri Venkateswara Bank…</div>;
  if (!user) return <Auth onAuth={handleAuth} />;

  const renderView = () => {
    switch (view) {
      case 'dashboard': return <Dashboard setView={setView} />;
      case 'accounts': return <Accounts />;
      case 'transfers': return <Transfers />;
      case 'beneficiaries': return <Beneficiaries />;
      case 'bill-payments': return <BillPayments />;
      case 'cards': return <Cards />;
      case 'deposits': return <Deposits />;
      case 'loans': return <Loans />;
      case 'profile': return <Profile />;
      case 'notifications': return <Notifications />;
      case 'statements': return <Statements />;
      case 'admin': return <Admin />;
      default: return <Dashboard setView={setView} />;
    }
  };

  return (
    <div className="app">
      <Sidebar view={view} setView={setView} user={user} onLogout={handleLogout} unread={unread} />
      <div className="main">{renderView()}</div>
    </div>
  );
}