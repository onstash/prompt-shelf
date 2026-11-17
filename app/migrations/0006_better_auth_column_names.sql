-- Better Auth reads the core auth tables directly through D1 (no Drizzle adapter).
-- Rename snake_case columns to Better Auth's field names and convert existing
-- timestamps from Unix seconds (Drizzle mode "timestamp") to ISO 8601 text,
-- the format Better Auth writes to D1 (for example 2026-11-17T03:11:31.000Z).
-- Session checks compare these values as text, so the formats must match.
-- Renaming a column keeps its data and updates indexes that reference it.

ALTER TABLE user RENAME COLUMN email_verified TO emailVerified;
ALTER TABLE user RENAME COLUMN created_at TO createdAt;
ALTER TABLE user RENAME COLUMN updated_at TO updatedAt;

ALTER TABLE session RENAME COLUMN expires_at TO expiresAt;
ALTER TABLE session RENAME COLUMN created_at TO createdAt;
ALTER TABLE session RENAME COLUMN updated_at TO updatedAt;
ALTER TABLE session RENAME COLUMN ip_address TO ipAddress;
ALTER TABLE session RENAME COLUMN user_agent TO userAgent;
ALTER TABLE session RENAME COLUMN user_id TO userId;

ALTER TABLE account RENAME COLUMN account_id TO accountId;
ALTER TABLE account RENAME COLUMN provider_id TO providerId;
ALTER TABLE account RENAME COLUMN user_id TO userId;
ALTER TABLE account RENAME COLUMN access_token TO accessToken;
ALTER TABLE account RENAME COLUMN refresh_token TO refreshToken;
ALTER TABLE account RENAME COLUMN id_token TO idToken;
ALTER TABLE account RENAME COLUMN access_token_expires_at TO accessTokenExpiresAt;
ALTER TABLE account RENAME COLUMN refresh_token_expires_at TO refreshTokenExpiresAt;
ALTER TABLE account RENAME COLUMN created_at TO createdAt;
ALTER TABLE account RENAME COLUMN updated_at TO updatedAt;

ALTER TABLE verification RENAME COLUMN expires_at TO expiresAt;
ALTER TABLE verification RENAME COLUMN created_at TO createdAt;
ALTER TABLE verification RENAME COLUMN updated_at TO updatedAt;

-- Values below 100000000000 are Unix seconds. The guard makes the conversion safe to re-run.
UPDATE user SET createdAt = strftime('%Y-%m-%dT%H:%M:%fZ', createdAt, 'unixepoch') WHERE createdAt < 100000000000;
UPDATE user SET updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', updatedAt, 'unixepoch') WHERE updatedAt < 100000000000;

UPDATE session SET expiresAt = strftime('%Y-%m-%dT%H:%M:%fZ', expiresAt, 'unixepoch') WHERE expiresAt < 100000000000;
UPDATE session SET createdAt = strftime('%Y-%m-%dT%H:%M:%fZ', createdAt, 'unixepoch') WHERE createdAt < 100000000000;
UPDATE session SET updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', updatedAt, 'unixepoch') WHERE updatedAt < 100000000000;

UPDATE account SET accessTokenExpiresAt = strftime('%Y-%m-%dT%H:%M:%fZ', accessTokenExpiresAt, 'unixepoch') WHERE accessTokenExpiresAt < 100000000000;
UPDATE account SET refreshTokenExpiresAt = strftime('%Y-%m-%dT%H:%M:%fZ', refreshTokenExpiresAt, 'unixepoch') WHERE refreshTokenExpiresAt < 100000000000;
UPDATE account SET createdAt = strftime('%Y-%m-%dT%H:%M:%fZ', createdAt, 'unixepoch') WHERE createdAt < 100000000000;
UPDATE account SET updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', updatedAt, 'unixepoch') WHERE updatedAt < 100000000000;

UPDATE verification SET expiresAt = strftime('%Y-%m-%dT%H:%M:%fZ', expiresAt, 'unixepoch') WHERE expiresAt < 100000000000;
UPDATE verification SET createdAt = strftime('%Y-%m-%dT%H:%M:%fZ', createdAt, 'unixepoch') WHERE createdAt < 100000000000;
UPDATE verification SET updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', updatedAt, 'unixepoch') WHERE updatedAt < 100000000000;
