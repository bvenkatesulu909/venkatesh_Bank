import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { fmtMoney, Modal, Badge } from '../components/ui.jsx';

const LOAN_TYPES = [
  { value: 'personal', label: 'Personal Loan (10.5% p.a.)' },
  { value: 'home', label: 'Home Loan (8.5% p.a.)' },
  { value: 'auto', label: 'Auto Loan (9.0% p.a.)' },
  { value: 'education', label: 'Education Loan (7.5% p.a.)' },
  { value: 'business', label: 'Business Loan (11.0% p.a.)' },
];

const INTEREST_RATES = { personal: 10.5, home: 8.5, auto: 9.0, education: 7.5, business: 11.0 };

const STATUS_COLORS = {
  pending: 'var(--warning)',
  approved: 'var(--success)',
  active: 'var(--primary)',
  rejected: 'var(--danger)',
  closed: 'var(--muted)',
};

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [type, setType] = useState('personal');
  const [amount, setAmount] = useState('');
  const [tenure, setTenure] = useState(12);
  const [purpose, setPurpose] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadLoans = () => {
    api('/loans').then(r => setLoans(r.data || r)).catch(() => {});
  };

  useEffect(() => {
    loadLoans();
    api('/auth/me').then(r => setIsAdmin(r?.user?.role === 'admin')).catch(() => {});
  }, []);

  const calcEMI = (p, t, rate) => {
    if (!p || !t || !rate) return 0;
    const r = rate / 12 / 100;
    const n = t;
    return p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  };

  const interestRate = INTEREST_RATES[type] || 10.5;
  const monthlyEMI = calcEMI(Number(amount), Number(tenure), interestRate);

  const apply = async e => {
    e.preventDefault();
    setBusy(true); setError(''); setMsg('');
    try {
      const r = await api('/loans/apply', {
        method: 'POST',
        body: { type, amount: Number(amount), tenure: Number(tenure), purpose },
      });
      setMsg(`✅ Loan application submitted! Ref: ${r.id || r.loan_id || '—'}`);
      setShowApply(false);
      setAmount('');
      setPurpose('');
      setType('personal');
      loadLoans();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const approveLoan = async (id) => {
    try {
      await api(`/loans/${id}/approve`, { method: 'POST' });
      loadLoans();
    } catch (err) { alert(err.message); }
  };

  const rejectLoan = async (id) => {
    try {
      await api(`/loans/${id}/reject`, { method: 'POST' });
      loadLoans();
    } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <div className="topbar">
        <div><h1>Loans</h1><div className="sub">Apply and manage loans</div></div>
        <button className="btn" onClick={() => setShowApply(true)}>+ Apply for Loan</button>
      </div>
      <div className="content">
        {msg && <div className="success-msg">{msg}</div>}
        {error && <div className="error-msg">{error}</div>}

        <div className="card">
          <div className="card-header"><h3>Your Loan Applications</h3></div>
          {loans.length === 0 ? (
            <div className="empty">No loan applications yet. Click "+ Apply for Loan" to get started.</div>
          ) : (
            <table className="compact">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Rate</th>
                  <th>EMI</th>
                  <th>Tenure</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loans.map(l => {
                  const emi = calcEMI(Number(l.amount), Number(l.tenure), Number(l.interest_rate));
                  return (
                    <tr key={l.id}>
                      <td style={{ textTransform: 'capitalize' }}>{l.type}</td>
                      <td>{fmtMoney(l.amount)}</td>
                      <td>{l.interest_rate}%</td>
                      <td>{fmtMoney(Math.round(emi))}</td>
                      <td>{l.tenure} mo</td>
                      <td>
                        <Badge kind={STATUS_COLORS[l.status] === 'var(--success)' ? 'success' : l.status === 'rejected' ? 'danger' : ''}>
                          <span style={{ color: STATUS_COLORS[l.status] || 'inherit', fontWeight: 600 }}>
                            {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                          </span>
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {l.status === 'pending' && (
                            <>
                              <button className="btn small" style={{ marginRight: 4 }} onClick={() => approveLoan(l.id)}>✓ Approve</button>
                              <button className="btn small secondary" onClick={() => rejectLoan(l.id)}>✗ Reject</button>
                            </>
                          )}
                          {l.status !== 'pending' && <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="grid-2" style={{ marginTop: 20 }}>
          <div className="card">
            <div className="card-header"><h3>Interest Rates</h3></div>
            <table className="compact">
              <tbody>
                {LOAN_TYPES.map(lt => (
                  <tr key={lt.value}>
                    <td style={{ textTransform: 'capitalize' }}>{lt.value}</td>
                    <td style={{ textAlign: 'right' }}>{INTEREST_RATES[lt.value]}% p.a.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="card-header"><h3>Loan Eligibility</h3></div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
              • Salaried: Up to ₹30L (Personal), ₹2Cr (Home)<br />
              • Self-employed: Up to ₹50L (Business)<br />
              • Education loans: Up to ₹1Cr (domestic)<br />
              • Auto loans: Up to ₹50L (new vehicles)<br />
              • Tenure: 6–120 months depending on type<br />
              • Processing fee: 0.5%–1% of loan amount
            </div>
          </div>
        </div>
      </div>

      {showApply && (
        <Modal title="Apply for Loan" onClose={() => setShowApply(false)}>
          <form onSubmit={apply}>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Loan Type</label>
              <select value={type} onChange={e => setType(e.target.value)} required>
                {LOAN_TYPES.map(lt => (
                  <option key={lt.value} value={lt.value}>{lt.label}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Amount (₹)</label>
              <input type="number" min="1000" max="99999999" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="e.g. 500000" />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Tenure (months)</label>
              <select value={tenure} onChange={e => setTenure(Number(e.target.value))} required>
                {[6, 12, 18, 24, 36, 48, 60, 84, 120].map(t => (
                  <option key={t} value={t}>{t} months ({t >= 12 ? `${t / 12} yr` : ''})</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Purpose</label>
              <textarea value={purpose} onChange={e => setPurpose(e.target.value)} required placeholder="Describe the purpose of this loan" rows={3} />
            </div>

            {Number(amount) > 0 && (
              <div style={{
                background: 'var(--bg)',
                borderRadius: 8,
                padding: 12,
                marginBottom: 14,
                fontSize: 13,
                lineHeight: 1.6,
              }}>
                <strong>Estimated EMI:</strong> {fmtMoney(Math.round(monthlyEMI))} / month<br />
                <div style={{ color: 'var(--muted)' }}>
                  at {interestRate}% p.a. for {tenure} months
                </div>
              </div>
            )}

            <button className="btn" disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Submitting…' : 'Submit Application'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
