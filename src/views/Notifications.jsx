import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function Notifications() {
  const [notes, setNotes] = useState([]);
  useEffect(() => { load(); }, []);
  const load = () => api('/notifications').then(r => setNotes(r.data));
  const markRead = async id => { await api(`/notifications/${id}/read`, { method: 'PUT' }); load(); };
  const markAll = async () => { await api('/notifications/read-all', { method: 'PUT' }); load(); };

  return (
    <div>
      <div className="topbar">
        <div><h1>Alerts & Notifications</h1><div className="sub">Stay updated on your account activity</div></div>
        <button className="btn secondary" onClick={markAll}>Mark All Read</button>
      </div>
      <div className="content">
        {notes.length === 0 && <div className="empty">No notifications</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notes.map(n => (
            <div key={n.id} className="card" style={{ opacity: n.is_read ? .7 : 1, cursor: 'pointer' }} onClick={() => !n.is_read && markRead(n.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong>{n.title}</strong>
                  <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{n.message}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ color: 'var(--muted)', fontSize: 11 }}>{n.created_at?.split(' ')[0]}</span>
                  {!n.is_read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}