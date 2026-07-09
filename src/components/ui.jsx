import React from 'react';

export function Badge({ kind, children }) {
  return <span className={`badge ${kind || ''}`}>{children}</span>;
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head"><h2>{title}</h2><button className="modal-close" onClick={onClose}>×</button></div>
        {children}
      </div>
    </div>
  );
}

export function fmtMoney(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN'); }

export function AcctCard({ account }) {
  return (
    <div className="acct-card">
      <div className="acct-chip"></div>
      <div className="acct-type">{account.type} account</div>
      <div className="acct-no">{account.account_number}</div>
      <div className="acct-bal">{fmtMoney(account.balance)}</div>
      <div className="acct-ifsc">{account.ifsc_code} | {account.status === 'active' ? 'Active' : account.status}</div>
    </div>
  );
}

export const BillProviders = {
  mobile: ['Airtel', 'Jio', 'Vi', 'BSNL'],
  electricity: ['Tata Power', 'Adani Electricity', 'BESCOM', 'MSEB', 'BSES'],
  dth: ['Tata Play', 'Airtel DTH', 'Dish TV', 'SUN Direct'],
  broadband: ['JioFiber', 'Airtel Xstream', 'ACT Fibernet', 'Hathway'],
  gas: ['IOCL', 'HP Gas', 'Bharat Gas', 'Mahanagar Gas'],
  insurance: ['LIC', 'HDFC Life', 'ICICI Prudential', 'Bajaj Allianz'],
};