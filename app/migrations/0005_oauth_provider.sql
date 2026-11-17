-- Better Auth jwt() and mcp() plugin tables (OAuth authorization server for MCP clients).
-- Better Auth reads these tables directly through D1, so table and column names
-- match its model and field names. Timestamps are ISO 8601 text, as Better Auth writes them.

CREATE TABLE jwks (
  id TEXT PRIMARY KEY NOT NULL,
  publicKey TEXT NOT NULL,
  privateKey TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  expiresAt TEXT,
  alg TEXT,
  crv TEXT
);

CREATE TABLE oauthClient (
  id TEXT PRIMARY KEY NOT NULL,
  clientId TEXT NOT NULL UNIQUE,
  clientSecret TEXT,
  clientDiscoveryId TEXT,
  disabled INTEGER DEFAULT 0,
  skipConsent INTEGER,
  enableEndSession INTEGER,
  subjectType TEXT,
  scopes TEXT,
  clientCredentialsScopes TEXT DEFAULT '[]',
  userId TEXT REFERENCES user(id) ON DELETE CASCADE,
  createdAt TEXT,
  updatedAt TEXT,
  name TEXT,
  uri TEXT,
  icon TEXT,
  contacts TEXT,
  tos TEXT,
  policy TEXT,
  softwareId TEXT,
  softwareVersion TEXT,
  softwareStatement TEXT,
  redirectUris TEXT NOT NULL,
  postLogoutRedirectUris TEXT,
  backchannelLogoutUri TEXT,
  backchannelLogoutSessionRequired INTEGER,
  tokenEndpointAuthMethod TEXT,
  applicationType TEXT,
  jwks TEXT,
  jwksUri TEXT,
  grantTypes TEXT,
  responseTypes TEXT,
  requirePKCE INTEGER,
  dpopBoundAccessTokens INTEGER DEFAULT 0,
  referenceId TEXT,
  metadata TEXT
);
CREATE INDEX oauthClient_userId_idx ON oauthClient(userId);

CREATE TABLE oauthResource (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  accessTokenTtl INTEGER,
  refreshTokenTtl INTEGER,
  signingAlgorithm TEXT,
  signingKeyId TEXT,
  allowedScopes TEXT,
  customClaims TEXT,
  dpopBoundAccessTokensRequired INTEGER DEFAULT 0,
  disabled INTEGER DEFAULT 0,
  createdAt TEXT,
  updatedAt TEXT,
  policyVersion INTEGER DEFAULT 1,
  metadata TEXT
);

CREATE TABLE oauthClientResource (
  id TEXT PRIMARY KEY NOT NULL,
  clientId TEXT NOT NULL REFERENCES oauthClient(clientId) ON DELETE CASCADE,
  resourceId TEXT NOT NULL REFERENCES oauthResource(identifier) ON DELETE CASCADE,
  metadata TEXT,
  createdAt TEXT
);
CREATE UNIQUE INDEX oauthClientResource_clientId_resourceId_uidx
  ON oauthClientResource(clientId, resourceId);
CREATE INDEX oauthClientResource_clientId_idx ON oauthClientResource(clientId);
CREATE INDEX oauthClientResource_resourceId_idx ON oauthClientResource(resourceId);

CREATE TABLE oauthRefreshToken (
  id TEXT PRIMARY KEY NOT NULL,
  token TEXT NOT NULL UNIQUE,
  clientId TEXT NOT NULL REFERENCES oauthClient(clientId) ON DELETE CASCADE,
  sessionId TEXT REFERENCES session(id) ON DELETE SET NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  referenceId TEXT,
  authorizationCodeId TEXT,
  resources TEXT,
  requestedUserInfoClaims TEXT,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  revoked TEXT,
  rotatedAt TEXT,
  rotationReplayResponse TEXT,
  rotationReplayExpiresAt TEXT,
  authTime TEXT,
  confirmation TEXT,
  scopes TEXT NOT NULL
);
CREATE INDEX oauthRefreshToken_clientId_idx ON oauthRefreshToken(clientId);
CREATE INDEX oauthRefreshToken_sessionId_idx ON oauthRefreshToken(sessionId);
CREATE INDEX oauthRefreshToken_userId_idx ON oauthRefreshToken(userId);
CREATE INDEX oauthRefreshToken_authorizationCodeId_idx ON oauthRefreshToken(authorizationCodeId);

CREATE TABLE oauthAccessToken (
  id TEXT PRIMARY KEY NOT NULL,
  token TEXT NOT NULL UNIQUE,
  clientId TEXT NOT NULL REFERENCES oauthClient(clientId) ON DELETE CASCADE,
  sessionId TEXT REFERENCES session(id) ON DELETE SET NULL,
  userId TEXT REFERENCES user(id) ON DELETE CASCADE,
  referenceId TEXT,
  authorizationCodeId TEXT,
  resources TEXT,
  requestedUserInfoClaims TEXT,
  refreshId TEXT REFERENCES oauthRefreshToken(id) ON DELETE CASCADE,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  revoked TEXT,
  confirmation TEXT,
  scopes TEXT NOT NULL
);
CREATE INDEX oauthAccessToken_clientId_idx ON oauthAccessToken(clientId);
CREATE INDEX oauthAccessToken_sessionId_idx ON oauthAccessToken(sessionId);
CREATE INDEX oauthAccessToken_userId_idx ON oauthAccessToken(userId);
CREATE INDEX oauthAccessToken_authorizationCodeId_idx ON oauthAccessToken(authorizationCodeId);
CREATE INDEX oauthAccessToken_refreshId_idx ON oauthAccessToken(refreshId);

CREATE TABLE oauthConsent (
  id TEXT PRIMARY KEY NOT NULL,
  clientId TEXT NOT NULL REFERENCES oauthClient(clientId) ON DELETE CASCADE,
  userId TEXT REFERENCES user(id) ON DELETE CASCADE,
  referenceId TEXT,
  resources TEXT,
  requestedUserInfoClaims TEXT,
  scopes TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX oauthConsent_clientId_idx ON oauthConsent(clientId);
CREATE INDEX oauthConsent_userId_idx ON oauthConsent(userId);

CREATE TABLE oauthClientAssertion (
  id TEXT PRIMARY KEY NOT NULL,
  expiresAt TEXT NOT NULL
);
