import db from './db.js';
import { hashPassword } from './auth.js';

// Admin user
const adminEmail = 'admin@icici.test';
const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
let adminId;
if (!existingAdmin) {
  const info = db.prepare(
    'INSERT INTO users (first_name, last_name, email, phone, password_hash, role, kyc_status, address, city, state, pincode, pan_number, aadhar_number) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
  ).run('Admin', 'User', adminEmail, '9999999999', hashPassword('admin123'), 'admin', 'verified', 'ICICI Bank HO, BKC', 'Mumbai', 'Maharashtra', '400051', 'ABCDE1234F', '111122223333');
  adminId = info.lastInsertRowid;
  db.prepare('INSERT INTO accounts (account_number, user_id, type, balance) VALUES (?,?,?,?)').run('ICICIADMIN0001', adminId, 'savings', 5000000);
  console.log('Created admin: admin@icici.test / admin123');
} else {
  adminId = existingAdmin.id;
}

// Customer 1
const c1Email = 'rahul.sharma@email.test';
let c1 = db.prepare('SELECT id FROM users WHERE email = ?').get(c1Email);
let c1Id, c1Acct;
if (!c1) {
  const info = db.prepare(
    'INSERT INTO users (first_name, last_name, email, phone, password_hash, kyc_status, dob, address, city, state, pincode, pan_number, aadhar_number) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
  ).run('Rahul', 'Sharma', c1Email, '9876543210', hashPassword('rahul123'), 'verified', '1990-05-15', '42, MG Road', 'Mumbai', 'Maharashtra', '400001', 'PQRST5678G', '333344445555');
  c1Id = info.lastInsertRowid;
  const accNo = 'ICIC1000001';
  db.prepare('INSERT INTO accounts (account_number, user_id, type, balance, nominee_name) VALUES (?,?,?,?,?)').run(accNo, c1Id, 'savings', 285000, 'Priya Sharma');
  db.prepare('INSERT INTO accounts (account_number, user_id, type, balance) VALUES (?,?,?,?)').run('ICIC1000002', c1Id, 'current', 75000);
  c1Acct = db.prepare('SELECT * FROM accounts WHERE user_id = ? AND type = ?').get(c1Id, 'savings');
} else {
  c1Id = c1.id;
  c1Acct = db.prepare('SELECT * FROM accounts WHERE user_id = ? AND type = ?').get(c1Id, 'savings');
}

// Customer 2
const c2Email = 'priya.patel@email.test';
let c2 = db.prepare('SELECT id FROM users WHERE email = ?').get(c2Email);
let c2Id, c2Acct;
if (!c2) {
  const info = db.prepare(
    'INSERT INTO users (first_name, last_name, email, phone, password_hash, kyc_status, dob, address, city, state, pincode, pan_number, aadhar_number) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
  ).run('Priya', 'Patel', c2Email, '9876543211', hashPassword('priya123'), 'verified', '1992-08-22', '15, Ashram Road', 'Ahmedabad', 'Gujarat', '380009', 'LMNOP9012H', '666677778888');
  c2Id = info.lastInsertRowid;
  db.prepare('INSERT INTO accounts (account_number, user_id, type, balance, nominee_name) VALUES (?,?,?,?,?)').run('ICIC2000001', c2Id, 'savings', 520000, 'Amit Patel');
  c2Acct = db.prepare('SELECT * FROM accounts WHERE user_id = ? AND type = ?').get(c2Id, 'savings');
} else {
  c2Id = c2.id;
  c2Acct = db.prepare('SELECT * FROM accounts WHERE user_id = ? AND type = ?').get(c2Id, 'savings');
}

// Sample transactions between the accounts
const txn1 = 'TXN' + Date.now().toString(36).toUpperCase() + 'A1B2C3';
db.prepare('INSERT INTO transactions (transaction_id, from_account, to_account, from_user_id, type, amount, status, description, mode, beneficiary_name, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
  .run(txn1, c1Acct?.id, c2Acct?.id, c1Id, 'transfer', 25000, 'success', 'Birthday gift', 'IMPS', 'Priya Patel', '2026-07-01 10:30:00');

const txn2 = 'TXN' + (Date.now()+1).toString(36).toUpperCase() + 'D4E5F6';
db.prepare('INSERT INTO transactions (transaction_id, from_account, from_user_id, type, amount, fee, status, description, mode, beneficiary_name, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
  .run(txn2, c1Acct?.id, c1Id, 'outward_transfer', 5000, 25, 'success', 'Mobile recharge', 'NEFT', 'Vodafone Idea', '2026-07-02 14:15:00');

const txn3 = 'TXN' + (Date.now()+2).toString(36).toUpperCase() + 'G7H8I9';
db.prepare('INSERT INTO transactions (transaction_id, from_account, to_account, from_user_id, type, amount, status, description, mode, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
  .run(txn3, c2Acct?.id, c1Acct?.id, c2Id, 'transfer', 10000, 'success', 'Split bill', 'UPI', '2026-07-03 09:00:00');

// Sample bills
if (c1Id && c1Acct) {
  db.prepare('INSERT INTO bill_payments (user_id, account_id, provider, consumer_number, amount, bill_type, reference) VALUES (?,?,?,?,?,?,?)')
    .run(c1Id, c1Acct.id, 'Airtel', '9876543210', 499, 'mobile', 'BILL' + Date.now().toString(36).toUpperCase());
  db.prepare('INSERT INTO bill_payments (user_id, account_id, provider, consumer_number, amount, bill_type, reference) VALUES (?,?,?,?,?,?,?)')
    .run(c1Id, c1Acct.id, 'Tata Power', 'TP123456', 1842, 'electricity', 'BILL' + (Date.now()+1).toString(36).toUpperCase());
}

// Sample FD
if (c1Acct) {
  db.prepare('INSERT INTO fixed_deposits (account_id, user_id, fd_number, amount, tenure_months, interest_rate, maturity_amount, maturity_date, status) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(c1Acct.id, c1Id, 'FD2026001', 100000, 12, 6.5, 106500, '2027-07-07', 'active');
  db.prepare('INSERT INTO fixed_deposits (account_id, user_id, fd_number, amount, tenure_months, interest_rate, maturity_amount, maturity_date, status) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(c1Acct.id, c1Id, 'FD2026002', 500000, 36, 7.5, 616000, '2029-07-07', 'active');
  db.prepare('INSERT INTO recurring_deposits (account_id, user_id, rd_number, monthly_amount, tenure_months, interest_rate, maturity_amount, maturity_date, installments_paid, status) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(c1Acct.id, c1Id, 'RD2026001', 5000, 12, 6.0, 61950, '2027-07-07', 6, 'active');
}

// Sample cards
if (c1Acct && c1Id) {
  db.prepare('INSERT INTO cards (user_id, account_id, card_number, card_type, network, name_on_card, expiry_month, expiry_year, cvv, is_virtual) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(c1Id, c1Acct.id, '4532123456789012', 'debit', 'Visa', 'RAHUL SHARMA', 12, 2028, '123', 0);
  db.prepare('INSERT INTO cards (user_id, account_id, card_number, card_type, network, name_on_card, expiry_month, expiry_year, cvv, is_virtual) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(c1Id, c1Acct.id, '5234567890123456', 'credit', 'Mastercard', 'RAHUL SHARMA', 8, 2027, '456', 0);
  db.prepare('INSERT INTO cards (user_id, account_id, card_number, card_type, network, name_on_card, expiry_month, expiry_year, cvv, is_virtual) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(c1Id, c1Acct.id, '4111111111111111', 'debit', 'Visa', 'RAHUL SHARMA', 3, 2029, '789', 1);
}

// Sample loan
if (c1Id) {
  db.prepare('INSERT INTO loans (user_id, loan_number, type, amount, approved_amount, interest_rate, tenure_months, emi_amount, emi_paid, total_emi, status, purpose, application_date, approval_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(c1Id, 'LOAN2026001', 'personal', 300000, 300000, 10.99, 24, 13900, 6, 24, 'approved', 'Home renovation', '2026-01-15', '2026-01-18');
}

// Beneficiary for Rahul
if (c1Id) {
  db.prepare('INSERT INTO beneficiaries (user_id, name, account_number, ifsc_code, bank_name, type, nick_name, max_limit) VALUES (?,?,?,?,?,?,?,?)')
    .run(c1Id, 'Amit Patel', 'ICIC2000001', 'ICIC0000001', 'ICICI Bank', 'within_bank', 'Amit - Savings', 50000);
  db.prepare('INSERT INTO beneficiaries (user_id, name, account_number, ifsc_code, bank_name, type, nick_name, max_limit) VALUES (?,?,?,?,?,?,?,?)')
    .run(c1Id, 'SBI Savings A/C', '500011223344', 'SBIN0000123', 'State Bank of India', 'other_bank', 'SBI - Mom', 25000);
}

// Notifications
if (c1Id) {
  const notifs = [
    ['Salary Credited', 'Your salary of ₹85,000 has been credited.', 'credit'],
    ['FD Maturity Reminder', 'Your FD FD2026001 matures on 2027-07-07.', 'info'],
    ['Card Transaction', '₹2,499 spent on your debit card at Amazon.in', 'alert'],
    ['Bill Due', 'Your Airtel bill of ₹499 is due in 3 days.', 'reminder'],
  ];
  for (const [t, m, ty] of notifs) {
    db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)').run(c1Id, t, m, ty);
  }
}

console.log('Banking seed complete.');
console.log('Login credentials:');
console.log('  Admin:  admin@icici.test / admin123');
console.log('  User:   rahul.sharma@email.test / rahul123');
console.log('  User:   priya.patel@email.test / priya123');