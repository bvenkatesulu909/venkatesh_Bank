import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { fmtMoney, Modal, Badge } from '../components/ui.jsx';

const emptyForm = { name: '', account_number: '', ifsc_code: '', bank_name: '', nick_name: '', max_limit: '', limit: '' };

export default function Beneficiaries() {
  const [bens, setBens] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api('/beneficiaries')
      .then(r => setBens(r.data || []))
      .catch(() => {});
  };

  useEffect(load, []);

  const u = k => e => setForm({ ...form, [k]: e.target.value });

  const openAdd = () => {
    setForm({ ...emptyForm });
    setEditing(null);
    setError('');
    setShow(true);
  };

  const openEdit = (b) => {
    setForm({
      name: b.name || '',
      account_number: b.account_number || '',
      ifsc_code: b.ifsc_code || '',
      bank_name: b.bank_name || '',
      nick_name: b.nick_name || '',
      max_limit: b.max_limit ?? '',
      limit: b.limit ?? '',
    });
    setEditing(b.id);
    setError('');
    setShow(true);
  };

  const close = () => { setShow(false); setEditing(null); setError(''); };

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const body = {
        ...form,
        max_limit: Number(form.max_limit) || 0,
        limit: Number(form.limit) || 0,
      };
      if (editing) {
        await api(`/beneficiaries/${editing}`, { method: 'PUT', body });
        setMsg('✅ Beneficiary updated');
      } else {
        await api('/beneficiaries', { method: 'POST', body });
        setMsg('✅ Beneficiary added');
      }
      close();
      load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this beneficiary?')) return;
    try {
      await api(`/beneficiaries/${id}`, { method: 'DELETE' });
      load();
    } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <div className="topbar">
        <div><h1>Beneficiaries</h1><div className="sub">Manage your trusted payees</div></div>
        <button className="btn" onClick={openAdd}>+ Add Beneficiary</button>
      </div>
      <div className="content">
        {msg && <div className="success-msg">{msg}</div>}
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Account No</th>
                <th>IFSC</th>
                <th>Bank</th>
                <th>Nick Name</th>
                <th>Max Limit</th>
                <th>Per Tx Limit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bens.length === 0 && (
                <tr><td colSpan={8} className="empty">No beneficiaries added yet</td></tr>
              )}
              {bens.map(b => (
                <tr key={b.id}>
                  <td style={{fontWeight:600}}>{b.name}</td>
                  <td style={{fontFamily:'monospace',letterSpacing:1}}>{b.account_number}</td>
                  <td style={{fontFamily:'monospace'}}>{b.ifsc_code}</td>
                  <td>{b.bank_name}</td>
                  <td>{b.nick_name || '—'}</td>
                  <td>{fmtMoney(b.max_limit)}</td>
                  <td>{fmtMoney(b.limit)}</td>
                  <td className="actions">
                    <button className="btn small secondary" onClick={() => openEdit(b)}>✏️ Edit</button>
                    <button className="btn small danger" onClick={() => remove(b.id)}>🗑️ Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {show && (
        <Modal title={editing ? 'Edit Beneficiary' : 'Add Beneficiary'} onClose={close}>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={submit}>
            <div className="form-grid">
              <div className="field"><label>Name *</label>
                <input value={form.name} onChange={u('name')} required placeholder="Full name" /></div>
              <div className="field"><label>Account Number *</label>
                <input value={form.account_number} onChange={u('account_number')} required placeholder="Account number" /></div>
              <div className="field"><label>IFSC Code *</label>
                <input value={form.ifsc_code} onChange={u('ifsc_code')} required placeholder="IFSC" /></div>
              <div className="field"><label>Bank Name *</label>
                <input value={form.bank_name} onChange={u('bank_name')} required placeholder="Bank name" /></div>
              <div className="field"><label>Nick Name</label>
                <input value={form.nick_name} onChange={u('nick_name')} placeholder="Optional label" /></div>
              <div className="field"><label>Max Limit (₹) *</label>
                <input type="number" min="0" value={form.max_limit} onChange={u('max_limit')} required placeholder="Overall limit" /></div>
              <div className="field full"><label>Per Transaction Limit (₹) *</label>
                <input type="number" min="0" value={form.limit} onChange={u('limit')} required placeholder="Single transaction limit" /></div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}>
              <button type="button" className="btn secondary" onClick={close}>Cancel</button>
              <button className="btn" disabled={busy}>{busy ? 'Saving…' : editing ? 'Update' : 'Add Beneficiary'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
