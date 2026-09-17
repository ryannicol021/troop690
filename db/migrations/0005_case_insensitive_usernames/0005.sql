CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_username_nocase
ON accounts(username COLLATE NOCASE);
