import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import db from './db.js';
import { hashPassword, verifyPassword, signToken, requireAuth, requireAdmin } from './auth.js';

const getDirname = () => path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

// Helpers
function genAccountNo() { return 'SVBAP' + Date.now().toString(36).toUpperCase() + String(Math.floor(Math.random()*9000+1000)); }
function genTransactionId() { return 'TXN' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase(); }
function genCardNo() {
  const seg = () => String(Math.floor(Math.random()*9000+1000));
  return `${seg()}${seg()}${seg()}${seg()}`;
}
function genFdNumber() { return 'FD' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random()*1000); }
function genRdNumber() { return 'RD' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random()*1000); }
function genLoanNumber() { return 'LOAN' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random()*1000); }
function publicUser(u) { if (!u) return null; const { password_hash, mpin, ...rest } = u; return rest; }
function maskCard(c) { if (!c) return null; return { ...c, card_number: 'XXXX-XXXX-XXXX-' + c.card_number.slice(-4), cvv: '***' }; }

function notify(user_id, title, message, type = 'info') {
  db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run(user_id, title, message, type);
}

// ========= AUTH =========
app.post('/api/auth/register', (req, res) => {
  try {
    const { first_name, last_name, email, phone, password, dob, address, city, state, pincode, pan_number, aadhar_number } = req.body || {};
    if (!first_name || !last_name || !email || !phone || !password) return res.status(400).json({ error: 'First name, last name, email, phone and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const exists = db.prepare('SELECT id FROM users WHERE email = ? OR phone = ?').get(email, phone);
    if (exists) return res.status(409).json({ error: 'Email or phone already registered' });
    const info = db.prepare(
      'INSERT INTO users (first_name, last_name, email, phone, password_hash, dob, address, city, state, pincode, pan_number, aadhar_number) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
    ).run(first_name, last_name, email, phone, hashPassword(password), dob || null, address || null, city || null, state || null, pincode || null, pan_number || null, aadhar_number || null);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    // Auto-create savings account
    const accNo = genAccountNo();
    db.prepare('INSERT INTO accounts (account_number, user_id, type, balance) VALUES (?, ?, ?, ?)').run(accNo, user.id, 'savings', 0);
    notify(user.id, 'Account Created', `Welcome to Sri Venkateswara Bank! Your savings account ${accNo} is ready.`);
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Registration failed' }); }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: signToken(user), user: publicUser(user) });
});

app.post('/api/auth/verify-mpin', requireAuth, (req, res) => {
  const { mpin } = req.body || {};
  if (!mpin) return res.status(400).json({ error: 'MPIN required' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user.mpin) return res.status(400).json({ error: 'MPIN not set. Set it first' });
  if (!verifyPassword(mpin, user.mpin)) return res.status(401).json({ error: 'Invalid MPIN' });
  res.json({ verified: true });
});

app.post('/api/auth/set-mpin', requireAuth, (req, res) => {
  const { mpin } = req.body || {};
  if (!mpin || mpin.length < 4 || mpin.length > 6) return res.status(400).json({ error: 'MPIN must be 4-6 digits' });
  db.prepare('UPDATE users SET mpin = ?, updated_at = datetime("now") WHERE id = ?').run(hashPassword(mpin), req.user.id);
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

// ========= DASHBOARD =========
app.get('/api/dashboard', requireAuth, (req, res) => {
  const uid = req.user.id;
  const accounts = db.prepare('SELECT id, account_number, type, balance, status FROM accounts WHERE user_id = ?').all(uid);
  const totalBalance = accounts.reduce((s, a) => s + (a.status === 'active' ? a.balance : 0), 0);
  const recentTxn = db.prepare('SELECT * FROM transactions WHERE from_user_id = ? ORDER BY created_at DESC LIMIT 8').all(uid);
  const activeFds = db.prepare('SELECT COUNT(*) c FROM fixed_deposits WHERE user_id = ? AND status = ?').get(uid, 'active').c;
  const activeLoans = db.prepare("SELECT COUNT(*) c FROM loans WHERE user_id = ? AND status = ?").get(uid, 'approved').c;
  const unreadNotifs = db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND is_read = 0').get(uid).c;
  const cards = db.prepare('SELECT id, card_type, network, status, is_virtual FROM cards WHERE user_id = ?').all(uid);
  res.json({ accounts, totalBalance, recentTxn, activeFds, activeLoans, unreadNotifs, cards });
});

// ========= ACCOUNTS =========
app.get('/api/accounts', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY type').all(req.user.id);
  res.json({ data: rows });
});

app.get('/api/accounts/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Account not found' });
  res.json({ data: row });
});

app.post('/api/accounts/create', requireAuth, (req, res) => {
  const { type } = req.body || {};
  if (!['savings', 'current'].includes(type)) return res.status(400).json({ error: 'Invalid account type' });
  const accNo = genAccountNo();
  const rates = { savings: 3.5, current: 0 };
  db.prepare('INSERT INTO accounts (account_number, user_id, type, balance, interest_rate) VALUES (?,?,?,?,?)')
    .run(accNo, req.user.id, type, 0, rates[type]);
  const row = db.prepare('SELECT * FROM accounts WHERE account_number = ?').get(accNo);
  notify(req.user.id, 'New Account', `Your ${type} account ${accNo} has been opened.`);
  res.status(201).json({ data: row });
});

app.get('/api/accounts/:id/statement', requireAuth, (req, res) => {
  const acct = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!acct) return res.status(404).json({ error: 'Account not found' });
  const { from, to, limit = 50 } = req.query;
  let q = 'SELECT * FROM transactions WHERE (from_account = ? OR to_account = ?)';
  const params = [acct.id, acct.id];
  if (from) { q += ' AND created_at >= ?'; params.push(from); }
  if (to) { q += ' AND created_at <= ?'; params.push(to); }
  q += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  const rows = db.prepare(q).all(...params);
  res.json({ data: rows, account: acct });
});

// ========= TRANSFERS =========
app.get('/api/transactions', requireAuth, (req, res) => {
  const { page = 1, limit = 20, type, from, to } = req.query;
  let q = 'SELECT * FROM transactions WHERE from_user_id = ?';
  const params = [req.user.id];
  if (type) { q += ' AND type = ?'; params.push(type); }
  if (from) { q += ' AND created_at >= ?'; params.push(from); }
  if (to) { q += ' AND created_at <= ?'; params.push(to); }
  q += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, (page - 1) * limit);
  const rows = db.prepare(q).all(...params);
  const total = db.prepare('SELECT COUNT(*) c FROM transactions WHERE from_user_id = ?').get(req.user.id).c;
  res.json({ data: rows, total, page: Number(page), limit: Number(limit) });
});

app.post('/api/transfers/within', requireAuth, (req, res) => {
  const { from_account, to_account, amount, description } = req.body || {};
  if (!from_account || !to_account || !amount) return res.status(400).json({ error: 'from_account, to_account and amount required' });
  if (amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });
  const fromAcct = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(from_account, req.user.id);
  if (!fromAcct) return res.status(404).json({ error: 'Source account not found' });
  if (fromAcct.status !== 'active') return res.status(400).json({ error: 'Source account is not active' });
  if (fromAcct.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
  if (from_account === to_account) return res.status(400).json({ error: 'Cannot transfer to same account' });
  const toAcct = db.prepare('SELECT * FROM accounts WHERE id = ?').get(to_account);
  if (!toAcct) return res.status(404).json({ error: 'Destination account not found' });

  const txnId = genTransactionId();
  const write = db.transaction(() => {
    db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(amount, from_account);
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(amount, to_account);
    db.prepare(
      `INSERT INTO transactions (transaction_id, from_account, to_account, from_user_id, type, amount, status, description, mode, beneficiary_name)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run(txnId, from_account, to_account, req.user.id, 'transfer', amount, 'success', description || 'Fund Transfer', 'IMPS', toAcct.nominee_name || null);
  });
  try { write(); } catch (e) { return res.status(500).json({ error: 'Transfer failed' }); }

  notify(req.user.id, 'Transfer Successful', `₹${amount.toLocaleString('en-IN')} transferred from ${fromAcct.account_number}. Ref: ${txnId}`);
  notify(toAcct.user_id, 'Credit Alert', `₹${amount.toLocaleString('en-IN')} credited to ${toAcct.account_number}. From: ${fromAcct.account_number}`);
  res.json({ success: true, transaction_id: txnId });
});

app.post('/api/transfers/other-bank', requireAuth, (req, res) => {
  const { from_account, beneficiary_id, amount, description } = req.body || {};
  if (!from_account || !beneficiary_id || !amount) return res.status(400).json({ error: 'All fields required' });
  if (amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });
  const fromAcct = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(from_account, req.user.id);
  if (!fromAcct) return res.status(404).json({ error: 'Source account not found' });
  if (fromAcct.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
  const ben = db.prepare('SELECT * FROM beneficiaries WHERE id = ? AND user_id = ?').get(beneficiary_id, req.user.id);
  if (!ben) return res.status(404).json({ error: 'Beneficiary not found' });
  if (amount > ben.max_limit) return res.status(400).json({ error: `Exceeds beneficiary limit of ₹${ben.max_limit.toLocaleString('en-IN')}` });

  const fee = amount > 50000 ? Math.round(amount * 0.005) : 0;
  const total = amount + fee;
  if (fromAcct.balance < total) return res.status(400).json({ error: `Insufficient balance (includes ₹${fee.toLocaleString('en-IN')} fee)` });

  const txnId = genTransactionId();
  const write = db.transaction(() => {
    db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(total, from_account);
    db.prepare(
      `INSERT INTO transactions (transaction_id, from_account, from_user_id, type, amount, fee, status, description, mode, beneficiary_name, reference)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).run(txnId, from_account, req.user.id, 'outward_transfer', amount, fee, 'success', description || `Transfer to ${ben.name}`, 'NEFT', ben.name, `${ben.bank_name} • A/C ${ben.account_number.slice(-4)}`);
  });
  try { write(); } catch (e) { return res.status(500).json({ error: 'Transfer failed' }); }
  notify(req.user.id, 'Transfer Initiated', `₹${amount.toLocaleString('en-IN')} sent to ${ben.name} (${ben.bank_name}). Ref: ${txnId}`);
  res.json({ success: true, transaction_id: txnId, fee });
});

// ========= BENEFICIARIES =========
app.get('/api/beneficiaries', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM beneficiaries WHERE user_id = ? ORDER BY name').all(req.user.id);
  res.json({ data: rows });
});

app.post('/api/beneficiaries', requireAuth, (req, res) => {
  const { name, account_number, ifsc_code, bank_name, type, nick_name, max_limit } = req.body || {};
  if (!name || !account_number || !ifsc_code) return res.status(400).json({ error: 'name, account_number and ifsc_code required' });
  if (!bank_name) return res.status(400).json({ error: 'Bank name required' });
  const dup = db.prepare('SELECT id FROM beneficiaries WHERE user_id = ? AND account_number = ?').get(req.user.id, account_number);
  if (dup) return res.status(409).json({ error: 'Beneficiary already exists' });
  const info = db.prepare('INSERT INTO beneficiaries (user_id, name, account_number, ifsc_code, bank_name, type, nick_name, max_limit) VALUES (?,?,?,?,?,?,?,?)')
    .run(req.user.id, name, account_number, ifsc_code, bank_name, type || 'other_bank', nick_name || null, max_limit || 100000);
  const row = db.prepare('SELECT * FROM beneficiaries WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ data: row });
});

app.put('/api/beneficiaries/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM beneficiaries WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Beneficiary not found' });
  const { name, nick_name, max_limit } = req.body || {};
  if (name) db.prepare('UPDATE beneficiaries SET name = ? WHERE id = ?').run(name, req.params.id);
  if (nick_name !== undefined) db.prepare('UPDATE beneficiaries SET nick_name = ? WHERE id = ?').run(nick_name, req.params.id);
  if (max_limit) db.prepare('UPDATE beneficiaries SET max_limit = ? WHERE id = ?').run(max_limit, req.params.id);
  const row = db.prepare('SELECT * FROM beneficiaries WHERE id = ?').get(req.params.id);
  res.json({ data: row });
});

app.delete('/api/beneficiaries/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM beneficiaries WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Beneficiary not found' });
  db.prepare('DELETE FROM beneficiaries WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ========= CARDS =========
app.get('/api/cards', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM cards WHERE user_id = ?').all(req.user.id);
  res.json({ data: rows.map(maskCard) });
});

app.post('/api/cards/request', requireAuth, (req, res) => {
  const { account_id, card_type, network, is_virtual } = req.body || {};
  const acct = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(account_id, req.user.id);
  if (!acct) return res.status(404).json({ error: 'Account not found' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const cardNo = genCardNo();
  const expM = Math.floor(Math.random() * 12) + 1;
  const expY = new Date().getFullYear() + 4;
  const cvv = String(Math.floor(Math.random() * 900 + 100));
  const nameOnCard = `${user.first_name} ${user.last_name}`.toUpperCase();
  db.prepare('INSERT INTO cards (user_id, account_id, card_number, card_type, network, name_on_card, expiry_month, expiry_year, cvv, is_virtual) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(req.user.id, account_id, cardNo, card_type || 'debit', network || 'Visa', nameOnCard, expM, expY, cvv, is_virtual ? 1 : 0);
  const card = db.prepare('SELECT * FROM cards WHERE card_number = ?').get(cardNo);
  notify(req.user.id, 'Card Issued', `Your ${network} ${card_type} card ending ${cardNo.slice(-4)} is active.`);
  res.status(201).json({ data: maskCard(card) });
});

app.put('/api/cards/:id/block', requireAuth, (req, res) => {
  const card = db.prepare('SELECT * FROM cards WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  const { reason } = req.body || {};
  db.prepare('UPDATE cards SET status = ?, blocked_reason = ? WHERE id = ?').run('blocked', reason || 'User requested', req.params.id);
  notify(req.user.id, 'Card Blocked', `Your ${card.network} card ending ${card.card_number.slice(-4)} has been blocked.`);
  res.json({ success: true });
});

// ========= BILL PAYMENTS =========
app.get('/api/bills/providers', (req, res) => {
  res.json({ data: [
    { type: 'mobile', providers: ['Airtel', 'Jio', 'Vi', 'BSNL'] },
    { type: 'electricity', providers: ['Tata Power', 'Adani Electricity', 'BESCOM', 'MSEB', 'BSES'] },
    { type: 'dth', providers: ['Tata Play', 'Airtel DTH', 'Dish TV', 'SUN Direct'] },
    { type: 'broadband', providers: ['JioFiber', 'Airtel Xstream', 'ACT Fibernet', 'Hathway'] },
    { type: 'gas', providers: ['IOCL', 'HP Gas', 'Bharat Gas', 'Mahanagar Gas'] },
    { type: 'insurance', providers: ['LIC', 'HDFC Life', 'Bajaj Allianz', 'SBI Life'] },
  ]});
});

app.get('/api/bills/history', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM bill_payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(req.user.id);
  res.json({ data: rows });
});

app.post('/api/bills/pay', requireAuth, (req, res) => {
  const { account_id, provider, consumer_number, amount, bill_type } = req.body || {};
  if (!account_id || !provider || !consumer_number || !amount || !bill_type) return res.status(400).json({ error: 'All fields required' });
  const acct = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(account_id, req.user.id);
  if (!acct) return res.status(404).json({ error: 'Account not found' });
  if (acct.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
  if (amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  const ref = 'BILL' + Date.now().toString(36).toUpperCase();
  const write = db.transaction(() => {
    db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(amount, account_id);
    db.prepare('INSERT INTO bill_payments (user_id, account_id, provider, consumer_number, amount, bill_type, reference) VALUES (?,?,?,?,?,?,?)')
      .run(req.user.id, account_id, provider, consumer_number, amount, bill_type, ref);
  });
  try { write(); } catch (e) { return res.status(500).json({ error: 'Payment failed' }); }
  notify(req.user.id, 'Bill Paid', `${provider} bill of ₹${amount.toLocaleString('en-IN')} paid. Ref: ${ref}`);
  res.json({ success: true, reference: ref });
});

// ========= FIXED DEPOSITS =========
app.get('/api/deposits/fd', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM fixed_deposits WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ data: rows });
});

app.post('/api/deposits/fd/create', requireAuth, (req, res) => {
  const { account_id, amount, tenure_months } = req.body || {};
  if (!account_id || !amount || !tenure_months) return res.status(400).json({ error: 'account_id, amount and tenure_months required' });
  const acct = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(account_id, req.user.id);
  if (!acct) return res.status(404).json({ error: 'Account not found' });
  if (amount < 10000) return res.status(400).json({ error: 'Minimum FD amount is ₹10,000' });
  if (tenure_months < 6 || tenure_months > 120) return res.status(400).json({ error: 'Tenure must be 6-120 months' });
  if (acct.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

  const rates = { 6: 5.5, 12: 6.0, 24: 6.5, 36: 7.0, 60: 7.25, 120: 7.5 };
  let rate = 5.5;
  for (const [m, r] of Object.entries(rates)) { if (tenure_months >= Number(m)) rate = r; }
  const maturityAmt = Math.round(amount * Math.pow(1 + (rate / 100) / 4, tenure_months / 3));
  const maturityDate = new Date(); maturityDate.setMonth(maturityDate.getMonth() + tenure_months);
  const fdNo = genFdNumber();
  const write = db.transaction(() => {
    db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(amount, account_id);
    db.prepare('INSERT INTO fixed_deposits (account_id, user_id, fd_number, amount, tenure_months, interest_rate, maturity_amount, maturity_date, nominee) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(account_id, req.user.id, fdNo, amount, tenure_months, rate, maturityAmt, maturityDate.toISOString().split('T')[0], acct.nominee_name || null);
  });
  try { write(); } catch (e) { return res.status(500).json({ error: 'FD creation failed' }); }
  notify(req.user.id, 'FD Opened', `Fixed Deposit ₹${amount.toLocaleString('en-IN')} created. FD No: ${fdNo}`);
  res.status(201).json({ fd_number: fdNo, amount, interest_rate: rate, maturity_amount: maturityAmt, maturity_date: maturityDate.toISOString().split('T')[0] });
});

app.get('/api/deposits/rd', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM recurring_deposits WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ data: rows });
});

app.post('/api/deposits/rd/create', requireAuth, (req, res) => {
  const { account_id, monthly_amount, tenure_months } = req.body || {};
  if (!account_id || !monthly_amount || !tenure_months) return res.status(400).json({ error: 'account_id, monthly_amount and tenure_months required' });
  const acct = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(account_id, req.user.id);
  if (!acct) return res.status(404).json({ error: 'Account not found' });
  if (monthly_amount < 500) return res.status(400).json({ error: 'Minimum monthly deposit is ₹500' });
  if (tenure_months < 6 || tenure_months > 120) return res.status(400).json({ error: 'Tenure must be 6-120 months' });
  const rate = 6.0;
  const totalInvested = monthly_amount * tenure_months;
  const maturityAmt = Math.round(totalInvested * (1 + (rate / 100) * (tenure_months + 1) / 24));
  const maturityDate = new Date(); maturityDate.setMonth(maturityDate.getMonth() + tenure_months);
  const rdNo = genRdNumber();
  db.prepare('INSERT INTO recurring_deposits (account_id, user_id, rd_number, monthly_amount, tenure_months, interest_rate, maturity_amount, maturity_date, nominee) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(account_id, req.user.id, rdNo, monthly_amount, tenure_months, rate, maturityAmt, maturityDate.toISOString().split('T')[0], acct.nominee_name || null);
  notify(req.user.id, 'RD Opened', `Recurring Deposit ₹${monthly_amount.toLocaleString('en-IN')}/mo created. RD No: ${rdNo}`);
  res.status(201).json({ rd_number: rdNo, monthly_amount, tenure_months, interest_rate: rate, maturity_amount: maturityAmt, maturity_date: maturityDate.toISOString().split('T')[0] });
});

// ========= LOANS =========
app.get('/api/loans', requireAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM loans WHERE user_id = ? ORDER BY application_date DESC').all(req.user.id);
    res.json({ data: rows });
  } catch (e) {
    console.error('Loans error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/loans/apply', requireAuth, (req, res) => {
  const { type, amount, tenure_months, purpose, collateral } = req.body || {};
  if (!type || !amount || !tenure_months) return res.status(400).json({ error: 'type, amount and tenure_months required' });
  const validTypes = ['personal', 'home', 'auto', 'education', 'business'];
  if (!validTypes.includes(type)) return res.status(400).json({ error: 'Invalid loan type' });

  const loanRates = { personal: 10.99, home: 8.5, auto: 9.5, education: 7.5, business: 12.0 };
  const rate = loanRates[type];
  const r = rate / 100 / 12;
  const emi = Math.round(amount * r * Math.pow(1 + r, tenure_months) / (Math.pow(1 + r, tenure_months) - 1));
  const loanNo = genLoanNumber();
  db.prepare('INSERT INTO loans (user_id, loan_number, type, amount, interest_rate, tenure_months, emi_amount, total_emi, status, purpose, collateral) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(req.user.id, loanNo, type, amount, rate, tenure_months, emi, tenure_months, 'pending', purpose || null, collateral || null);
  notify(req.user.id, 'Loan Applied', `Your ${type} loan of ₹${amount.toLocaleString('en-IN')} has been submitted. Ref: ${loanNo}`);
  res.status(201).json({ loan_number: loanNo, status: 'pending', emi_amount: emi });
});

// ========= PROFILE =========
app.get('/api/profile', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const accounts = db.prepare('SELECT account_number, type, balance, status FROM accounts WHERE user_id = ?').all(req.user.id);
  res.json({ user: publicUser(user), accounts });
});

app.put('/api/profile', requireAuth, (req, res) => {
  const { address, city, state, pincode, pan_number, aadhar_number, phone } = req.body || {};
  const fields = [];
  const vals = [];
  if (address !== undefined) { fields.push('address = ?'); vals.push(address); }
  if (city !== undefined) { fields.push('city = ?'); vals.push(city); }
  if (state !== undefined) { fields.push('state = ?'); vals.push(state); }
  if (pincode !== undefined) { fields.push('pincode = ?'); vals.push(pincode); }
  if (pan_number !== undefined) { fields.push('pan_number = ?'); vals.push(pan_number); }
  if (aadhar_number !== undefined) { fields.push('aadhar_number = ?'); vals.push(aadhar_number); }
  if (phone !== undefined) { fields.push('phone = ?'); vals.push(phone); }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  vals.push(req.user.id);
  db.prepare(`UPDATE users SET ${fields.join(', ')}, updated_at = datetime('now'), kyc_status = CASE WHEN pan_number IS NOT NULL AND aadhar_number IS NOT NULL AND address IS NOT NULL THEN 'verified' ELSE kyc_status END WHERE id = ?`).run(...vals);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

// ========= NOTIFICATIONS =========
app.get('/api/notifications', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json({ data: rows });
});

app.put('/api/notifications/:id/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

app.put('/api/notifications/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ success: true });
});

// ========= ADMIN =========
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT id, first_name, last_name, email, phone, kyc_status, role, created_at FROM users ORDER BY id').all();
  res.json({ data: rows });
});

app.get('/api/admin/accounts', requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare(
    `SELECT a.*, u.first_name || ' ' || u.last_name AS user_name FROM accounts a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.id`
  ).all();
  res.json({ data: rows });
});

app.get('/api/admin/transactions', requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 100').all();
  res.json({ data: rows });
});

app.put('/api/admin/loans/:id/approve', requireAuth, requireAdmin, (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  db.prepare('UPDATE loans SET status = ?, approved_amount = ?, approval_date = datetime("now"), emi_amount = ? WHERE id = ?')
    .run('approved', loan.amount, loan.emi_amount, req.params.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(loan.user_id);
  // Auto-disburse to savings account
  const sa = db.prepare("SELECT * FROM accounts WHERE user_id = ? AND type = 'savings' AND status = 'active'").get(loan.user_id);
  if (sa) {
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(loan.amount, sa.id);
    notify(loan.user_id, 'Loan Approved & Disbursed', `Your ${loan.type} loan of ₹${loan.amount.toLocaleString('en-IN')} has been approved and disbursed to A/C ${sa.account_number}.`);
  }
  res.json({ success: true });
});

app.put('/api/admin/loans/:id/reject', requireAuth, requireAdmin, (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  db.prepare('UPDATE loans SET status = ? WHERE id = ?').run('rejected', req.params.id);
  res.json({ success: true });
});

// ========= HEALTH =========
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', bank: 'Sri Venkateswara Bank of Andhra Pradesh', version: '1.0.0', time: new Date().toISOString() });
});

// ========= SERVE FRONTEND =========
const distDir = path.join(getDirname(), '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); });

const isRunningDirectly = process.argv[1] && (process.argv[1].endsWith('index.js') || process.argv[1].endsWith('server\\index.js'));
if (isRunningDirectly || process.env.STANDALONE) {
  app.listen(PORT, () => console.log(`Banking server running on port ${PORT}`));
}

export default app;