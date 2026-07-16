CREATE TABLE IF NOT EXISTS lovart_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS lovart_users_email_uidx ON lovart_users (email);

CREATE TABLE IF NOT EXISTS lovart_auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  user_id uuid NOT NULL REFERENCES lovart_users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS lovart_auth_sessions_token_uidx ON lovart_auth_sessions (token);
CREATE INDEX IF NOT EXISTS lovart_auth_sessions_user_idx ON lovart_auth_sessions (user_id);

CREATE TABLE IF NOT EXISTS lovart_auth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES lovart_users(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS lovart_auth_accounts_provider_account_uidx ON lovart_auth_accounts (provider_id, account_id);
CREATE INDEX IF NOT EXISTS lovart_auth_accounts_user_idx ON lovart_auth_accounts (user_id);

CREATE TABLE IF NOT EXISTS lovart_auth_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lovart_auth_verifications_identifier_idx ON lovart_auth_verifications (identifier);

CREATE TABLE IF NOT EXISTS lovart_auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  count integer NOT NULL,
  last_request bigint NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS lovart_auth_rate_limits_key_uidx ON lovart_auth_rate_limits (key);
