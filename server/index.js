import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

// ---------------------------------------------------------------------------
// Configuration (validated at startup — the server refuses to boot with a
// missing or placeholder secret, so a misconfigured deploy fails loudly).
// ---------------------------------------------------------------------------
function required(name, placeholderPrefix = 'your_') {
  const value = process.env[name];
  if (!value || value.startsWith(placeholderPrefix)) {
    throw new Error(`Missing required env var: ${name}. See server/.env.example`);
  }
  return value;
}

const MAL_CLIENT_ID = required('MAL_CLIENT_ID');
const MAL_CLIENT_SECRET = required('MAL_CLIENT_SECRET');
const SESSION_SECRET = required('SESSION_SECRET');

/**
 * The OAuth redirect URI MUST be exactly ONE absolute URL — MAL redirects the
 * browser there verbatim after authorization. A comma-joined value (e.g. a
 * pasted pair of URLs) silently breaks the whole flow, so we refuse to boot
 * instead of letting a malformed URI reach MAL.
 */
function resolveRedirectUri() {
  const raw = (process.env.MAL_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/mal').trim();
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    parsed = null;
  }
  const isSingleUrl =
    parsed &&
    (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
    !/[\s,]/.test(raw) && // no whitespace or comma anywhere in the value
    !raw.includes(',');
  if (!isSingleUrl) {
    throw new Error(
      `Invalid MAL_REDIRECT_URI: "${raw}". It must be exactly ONE http(s) URL, ` +
        'e.g. http://localhost:3000/api/auth/callback/mal (no commas, no extra URLs).',
    );
  }
  return raw;
}
const MAL_REDIRECT_URI = resolveRedirectUri();

const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:8080,http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** Where the frontend lives — used for the post-link redirect back to the app. */
const FRONTEND_URL = (process.env.FRONTEND_URL || CORS_ORIGINS[0] || 'http://localhost:8080').trim();
const PORT = Number(process.env.PORT || 3000);

const MAL_AUTH_URL = 'https://myanimelist.net/v1/oauth2';
const MAL_API_URL = 'https://api.myanimelist.net/v2';
const COOKIE_NAME = 'mal_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const app = express();
app.set('trust proxy', 1); // needed so express-rate-limit sees real client IPs behind a reverse proxy
app.use(helmet());
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(cookieParser(SESSION_SECRET));
app.use(express.json());

// Basic rate limiting on the auth endpoints (abuse protection).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// ---------------------------------------------------------------------------
// Session store. In-memory is fine for a single home server; restarting the
// server logs users out (they just re-link MAL). The cookie only holds a
// random token + HMAC signature — never the MAL token itself.
// ---------------------------------------------------------------------------
const sessions = new Map(); // token -> { malToken, malUser, createdAt }

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
}

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, `${token}.${sign(token)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE * 1000,
    path: '/',
  });
}

function getSession(req) {
  const raw = req.signedCookies?.[COOKIE_NAME] ?? req.cookies?.[COOKIE_NAME];
  if (!raw) return null;
  const [token, sig] = String(raw).split('.');
  if (!token || !sig || sig !== sign(token)) return null; // tampered cookie
  return sessions.get(token) || null;
}

function clearSession(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// ---------------------------------------------------------------------------
// MAL API helpers
// ---------------------------------------------------------------------------
async function malTokenExchange(body) {
  const res = await fetch(`${MAL_AUTH_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: MAL_CLIENT_ID, client_secret: MAL_CLIENT_SECRET, ...body }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(`MAL token exchange failed (${res.status})`);
    err.status = 502;
    throw err;
  }
  return data;
}

async function malGet(path, accessToken) {
  const res = await fetch(`${MAL_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = new Error(`MAL API error (${res.status})`);
    err.status = 502;
    throw err;
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** Start MAL OAuth: generate PKCE + state, store the verifier, redirect. */
app.get('/api/auth/mal', (req, res) => {
  const state = crypto.randomUUID();
  const codeVerifier = crypto.randomBytes(48).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  // The oauth draft (state/verifier) lives in an httpOnly cookie so it can't
  // be read by scripts; it is deleted when the callback completes.
  res.cookie('mal_oauth', JSON.stringify({ state, codeVerifier }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000,
    path: '/',
  });
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: MAL_CLIENT_ID,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    redirect_uri: MAL_REDIRECT_URI,
  });
  res.redirect(`https://myanimelist.net/v1/oauth2/authorize?${params.toString()}`);
});

/** MAL redirects here after the user authorizes. */
app.get('/api/auth/callback/mal', async (req, res) => {
  const { code, state, error } = req.query;
  const oauthDraft = req.cookies?.mal_oauth;

  const sendError = (message, status = 400) =>
    res.status(status).send(`<h2>${message}</h2><p>You can close this tab and try again.</p>`);

  if (error) return sendError(`Authorization failed: ${error}`, 400);

  // CSRF / state check: the state must match the one we issued.
  let draft;
  try {
    draft = oauthDraft ? JSON.parse(oauthDraft) : null;
  } catch {
    draft = null;
  }
  if (!draft || !draft.state || draft.state !== state || !draft.codeVerifier || !code) {
    return sendError('OAuth state mismatch. Please start over.', 400);
  }
  res.clearCookie('mal_oauth');

  try {
    const token = await malTokenExchange({
      grant_type: 'authorization_code',
      code: String(code),
      code_verifier: draft.codeVerifier,
      redirect_uri: MAL_REDIRECT_URI,
    });
    const malUser = await malGet('/users/@me', token.access_token);

    const sessionToken = crypto.randomUUID();
    sessions.set(sessionToken, {
      token: sessionToken,
      malToken: { access_token: token.access_token, refresh_token: token.refresh_token, expires_at: Date.now() + token.expires_in * 1000 },
      malUser: { id: malUser.id, name: malUser.name, picture: malUser.picture || null },
      createdAt: Date.now(),
    });
    setSessionCookie(res, sessionToken);

    // Redirect back to the app with a hash the frontend can watch.
    res.redirect(`${FRONTEND_URL}/profile#mal=connected`);
  } catch (err) {
    console.error('MAL callback failed:', err);
    return sendError('Something went wrong while linking your MyAnimeList account.', 502);
  }
});

/** Return the currently linked MAL user (null if not logged in). */
app.get('/api/auth/me', (req, res) => {
  const session = getSession(req);
  if (!session) return res.json({ user: null });
  res.json({ user: session.malUser });
});

/** Log out: destroys the server-side session and clears the cookie. */
app.post('/api/auth/logout', (req, res) => {
  // SameSite=Lax already protects against cross-site POSTs; verify Origin
  // anyway as a second line of defense against CSRF.
  const origin = req.headers.origin;
  if (origin && CORS_ORIGINS.length > 0 && !CORS_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }
  const session = getSession(req);
  if (session) sessions.delete(session.token);
  clearSession(res);
  res.json({ ok: true });
});

/** Proxy the user's MAL anime list (watchlist/ratings) — kept server-side so
 *  the access token never reaches the browser. */
app.get('/api/mal/animelist', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not linked to MyAnimeList' });
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const data = await malGet(
      `/users/@me/animelist?fields=list_status&limit=${limit}${status ? `&status=${status}` : ''}`,
      session.malToken.access_token
    );
    res.json(data);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message });
  }
});

/** Proxy MAL favorites for the connected user. */
app.get('/api/mal/favorites', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not linked to MyAnimeList' });
  try {
    const data = await malGet(`/users/${session.malUser.id}?fields=favorites`, session.malToken.access_token);
    res.json(data);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Optional: serve the built frontend in production.
const staticDir = process.env.STATIC_DIR;
if (staticDir) {
  app.use(express.static(staticDir));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile('index.html', { root: staticDir }));
}

// 404 + error handler
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`CaptureOrDie server listening on http://localhost:${PORT}`);
  console.log(`MAL redirect URI: ${MAL_REDIRECT_URI}`);
});
