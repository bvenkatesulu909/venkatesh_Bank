import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const getDataDir = () => {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const dataDir = path.join(dir, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return dataDir;
};
const dbPath = process.env.DB_PATH || path.join(getDataDir(), 'bank.db');
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA journal_mode=WAL');

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  dob TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  pan_number TEXT,
  aadhar_number TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'pending',
  role TEXT NOT NULL DEFAULT 'customer',
  mpin TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_number TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'savings',
  balance REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  branch_code TEXT NOT NULL DEFAULT 'ICIC0001',
  ifsc_code TEXT NOT NULL DEFAULT 'ICIC0000001',
  interest_rate REAL NOT NULL DEFAULT 3.5,
  open_date TEXT NOT NULL DEFAULT (datetime('now')),
  close_date TEXT,
  nominee_name TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT UNIQUE NOT NULL,
  from_account INTEGER,
  to_account INTEGER,
  from_user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  fee REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  reference TEXT,
  mode TEXT NOT NULL DEFAULT 'NEFT',
  beneficiary_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS beneficiaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  bank_name TEXT NOT NULL DEFAULT 'ICICI Bank',
  type TEXT NOT NULL DEFAULT 'within_bank',
  nick_name TEXT,
  max_limit REAL NOT NULL DEFAULT 100000,
  is_approved INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  card_number TEXT UNIQUE NOT NULL,
  card_type TEXT NOT NULL DEFAULT 'debit',
  network TEXT NOT NULL DEFAULT 'Visa',
  name_on_card TEXT NOT NULL,
  expiry_month INTEGER NOT NULL,
  expiry_year INTEGER NOT NULL,
  cvv TEXT NOT NULL,
  daily_limit REAL NOT NULL DEFAULT 100000,
  status TEXT NOT NULL DEFAULT 'active',
  is_virtual INTEGER NOT NULL DEFAULT 0,
  blocked_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS bill_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  consumer_number TEXT NOT NULL,
  amount REAL NOT NULL,
  bill_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  reference TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS fixed_deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  fd_number TEXT UNIQUE NOT NULL,
  amount REAL NOT NULL,
  tenure_months INTEGER NOT NULL,
  interest_rate REAL NOT NULL,
  maturity_amount REAL NOT NULL,
  maturity_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  nominee TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS recurring_deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  rd_number TEXT UNIQUE NOT NULL,
  monthly_amount REAL NOT NULL,
  tenure_months INTEGER NOT NULL,
  interest_rate REAL NOT NULL,
  maturity_amount REAL NOT NULL,
  maturity_date TEXT NOT NULL,
  installments_paid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  nominee TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  loan_number TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  approved_amount REAL,
  interest_rate REAL NOT NULL,
  tenure_months INTEGER NOT NULL,
  emi_amount REAL,
  emi_paid INTEGER NOT NULL DEFAULT 0,
  total_emi INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  purpose TEXT,
  collateral TEXT,
  application_date TEXT NOT NULL DEFAULT (datetime('now')),
  approval_date TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_number ON accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(from_account);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user ON beneficiaries(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
`;

db.exec(schema);
export default db;