import React, { useState } from 'react';
import { api } from '../api.js';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const u = k => e => setForm({ ...form, [k]: e.target.value });

  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      if (mode === 'login') {
        const { token, user } = await api('/auth/login', { method: 'POST', body: { email: form.email, password: form.password } });
        onAuth(user, token);
      } else {
        const { token, user } = await api('/auth/register', { method: 'POST', body: form });
        onAuth(user, token);
      }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 style={{ color: 'var(--primary)' }}>Sri Venkateswara Bank</h1>
        <p className="sub">{mode === 'login' ? 'Sign in to Internet Banking' : 'Open your account'}</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={submit}>
          {mode === 'register' && (
            <><div className="form-grid" style={{ marginBottom: 0 }}>
              <div className="field"><label>First Name</label><input value={form.first_name} onChange={u('first_name')} required /></div>
              <div className="field"><label>Last Name</label><input value={form.last_name} onChange={u('last_name')} required /></div>
            </div>
            <div className="field"><label>Phone</label><input value={form.phone} onChange={u('phone')} required /></div>
            </>
          )}
          <div className="field"><label>Email</label><input type="email" value={form.email} onChange={u('email')} required /></div>
          <div className="field"><label>Password</label><input type="password" value={form.password} onChange={u('password')} required minLength={6} /></div>
          <button className="btn" style={{ width: '100%', marginTop: 8 }} disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Open Account'}</button>
        </form>
        <div className="auth-toggle">
          {mode === 'login' ? <>New to Our Bank? <a onClick={() => { setMode('register'); setError(''); }}>Open Account</a></>
          : <>Already have an account? <a onClick={() => { setMode('login'); setError(''); }}>Sign in</a></>}
        </div>
        {mode === 'login' && (
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
            <b>Demo:</b> rahul.sharma@email.test / rahul123
          </div>
        )}
      </div>
    </div>
  );
}