import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { fmtMoney, Modal, Badge } from '../components/ui.jsx';

export default function Deposits() {
  const [tab, setTab] = useState('fd');
  const [fds, setFds] = useState([]);
  const [rds, setRds] = useState([]);
  const [showNewFd, setShowNewFd] = useState(false);
  const [showNewRd, setShowNewRd] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState([]);

  const [fdForm, setFdForm] = useState({ account_id: '', amount: '', tenure: '', rate: '' });
  const [rdForm, setRdForm] = useState({ account_id: '', monthly: '', tenure: '', rate: '' });

  useEffect(() => {
    api('/deposits/fd').then(r => setFds(r.data || [])).catch(() => {});
    api('/deposits/rd').then(r => setRds(r.data || [])).catch(() => {});
    api('/accounts').then(r => setAccounts(r.data || [])).catch(() => {});
  }, []);

  const u = (obj, setter) => k => e => setter({ ...obj, [k]: e.target.value });

  const createFd = async e => {
    e.preventDefault(); setBusy(true); setError(''); setMsg('');
    try {
      await api('/deposits/fd/create', {
        method: 'POST',
        body: {
          account_id: Number(fdForm.account_id),
          amount: Number(fdForm.amount),
          tenure: Number(fdForm.tenure),
          rate: Number(fdForm.rate),
        },
      });
      setMsg('✅ Fixed Deposit created successfully!');
      setShowNewFd(false);
      setFdForm({ account_id: '', amount: '', tenure: '', rate: '' });
      api('/deposits/fd').then(r => setFds(r.data || [])).catch(() => {});
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const createRd = async e => {
    e.preventDefault(); setBusy(true); setError(''); setMsg('');
    try {
      await api('/deposits/rd/create', {
        method: 'POST',
        body: {
          account_id: Number(rdForm.account_id),
          monthly: Number(rdForm.monthly),
          tenure: Number(rdForm.tenure),
          rate: Number(rdForm.rate),
        },
      });
      setMsg('✅ Recurring Deposit created successfully!');
      setShowNewRd(false);
      setRdForm({ account_id: '', monthly: '', tenure: '', rate: '' });
      api('/deposits/rd').then(r => setRds(r.data || [])).catch(() => {});
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const statusBadge = s => {
    const k = s === 'active' || s === 'running' ? 'success' : s === 'matured' || s === 'closed' ? 'muted' : 'warning';
    return <Badge kind={k}>{s}</Badge>;
  };

  return (
    <div>
      <div className="topbar">
        <div><h1>Deposits</h1><div className="sub">Fixed Deposits (FD) &amp; Recurring Deposits (RD)</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'fd' && <button className="btn" onClick={() => setShowNewFd(true)}>+ New FD</button>}
          {tab === 'rd' && <button className="btn" onClick={() => setShowNewRd(true)}>+ New RD</button>}
        </div>
      </div>
      <div className="content">
        {msg && <div className="success-msg">{msg}</div>}
        {error && <div className="error-msg">{error}</div>}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button className={`btn small ${tab === 'fd' ? '' : 'secondary'}`} onClick={() => setTab('fd')}>Fixed Deposits</button>
          <button className={`btn small ${tab === 'rd' ? '' : 'secondary'}`} onClick={() => setTab('rd')}>Recurring Deposits</button>
        </div>

        {tab === 'fd' && (
          <div>
            <table className="compact">
              <thead>
                <tr>
                  <th>FD Number</th>
                  <th>Amount</th>
                  <th>Tenure (mo)</th>
                  <th>Rate</th>
                  <th>Maturity Amount</th>
                  <th>Maturity Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {fds.map(fd => (
                  <tr key={fd.id}>
                    <td style={{ fontFamily: 'monospace' }}>{fd.fd_number || `#FD${fd.id}`}</td>
                    <td>{fmtMoney(fd.amount)}</td>
                    <td>{fd.tenure}</td>
                    <td>{fd.rate}%</td>
                    <td>{fd.maturity_amount ? fmtMoney(fd.maturity_amount) : '—'}</td>
                    <td>{fd.maturity_date || '—'}</td>
                    <td>{statusBadge(fd.status)}</td>
                  </tr>
                ))}
                {fds.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>No Fixed Deposits yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'rd' && (
          <div>
            <table className="compact">
              <thead>
                <tr>
                  <th>RD Number</th>
                  <th>Monthly (₹)</th>
                  <th>Tenure (mo)</th>
                  <th>Paid / Total</th>
                  <th>Rate</th>
                  <th>Maturity Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rds.map(rd => (
                  <tr key={rd.id}>
                    <td style={{ fontFamily: 'monospace' }}>{rd.rd_number || `#RD${rd.id}`}</td>
                    <td>{fmtMoney(rd.monthly)}</td>
                    <td>{rd.tenure}</td>
                    <td>{rd.paid_installments ?? 0} / {rd.total_installments ?? rd.tenure}</td>
                    <td>{rd.rate}%</td>
                    <td>{rd.maturity_amount ? fmtMoney(rd.maturity_amount) : '—'}</td>
                    <td>{statusBadge(rd.status)}</td>
                  </tr>
                ))}
                {rds.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>No Recurring Deposits yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNewFd && (
        <div className="modal-overlay" onClick={() => setShowNewFd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><h2>New Fixed Deposit</h2><button className="modal-close" onClick={() => setShowNewFd(false)}>×</button></div>
            <form onSubmit={createFd}>
              <div className="field"><label>Account</label>
                <select value={fdForm.account_id} onChange={u(fdForm, setFdForm)('account_id')} required>
                  <option value="">Select account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number} ({fmtMoney(a.balance)})</option>)}
                </select>
              </div>
              <div className="field"><label>Deposit Amount (₹)</label>
                <input type="number" min="1000" value={fdForm.amount} onChange={u(fdForm, setFdForm)('amount')} required />
              </div>
              <div className="field"><label>Tenure (months)</label>
                <input type="number" min="1" value={fdForm.tenure} onChange={u(fdForm, setFdForm)('tenure')} required />
              </div>
              <div className="field"><label>Interest Rate (% p.a.)</label>
                <input type="number" step="0.1" min="1" value={fdForm.rate} onChange={u(fdForm, setFdForm)('rate')} required />
              </div>
              <button className="btn" disabled={busy} style={{ marginTop: 14 }}>{busy ? 'Creating…' : 'Create FD'}</button>
            </form>
          </div>
        </div>
      )}

      {showNewRd && (
        <div className="modal-overlay" onClick={() => setShowNewRd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><h2>New Recurring Deposit</h2><button className="modal-close" onClick={() => setShowNewRd(false)}>×</button></div>
            <form onSubmit={createRd}>
              <div className="field"><label>Account</label>
                <select value={rdForm.account_id} onChange={u(rdForm, setRdForm)('account_id')} required>
                  <option value="">Select account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number} ({fmtMoney(a.balance)})</option>)}
                </select>
              </div>
              <div className="field"><label>Monthly Installment (₹)</label>
                <input type="number" min="100" value={rdForm.monthly} onChange={u(rdForm, setRdForm)('monthly')} required />
              </div>
              <div className="field"><label>Tenure (months)</label>
                <input type="number" min="1" value={rdForm.tenure} onChange={u(rdForm, setRdForm)('tenure')} required />
              </div>
              <div className="field"><label>Interest Rate (% p.a.)</label>
                <input type="number" step="0.1" min="1" value={rdForm.rate} onChange={u(rdForm, setRdForm)('rate')} required />
              </div>
              <button className="btn" disabled={busy} style={{ marginTop: 14 }}>{busy ? 'Creating…' : 'Create RD'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}