import crypto from "crypto";

const COOKIE_NAME = "frag_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Falta la variable de entorno SESSION_SECRET");
  return secret;
}

function sign(expiry) {
  return crypto.createHmac("sha256", getSecret()).update(String(expiry)).digest("hex");
}

export function createSessionToken() {
  const expiry = Date.now() + SESSION_DURATION_MS;
  return `${expiry}.${sign(expiry)}`;
}

function isValidToken(token) {
  if (!token) return false;
  const [expiryStr, signature] = token.split(".");
  const expiry = Number(expiryStr);
  if (!expiry || !signature || Date.now() > expiry) return false;

  const expected = sign(expiry);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(value);
  });
  return cookies;
}

export function isAuthenticated(cookieHeader) {
  const cookies = parseCookies(cookieHeader);
  return isValidToken(cookies[COOKIE_NAME]);
}

export function buildSessionCookie(token) {
  const maxAgeSeconds = Math.floor(SESSION_DURATION_MS / 1000);
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function buildClearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

// Para handlers estilo Node (req, res): corta la respuesta con 401 si no hay sesion valida.
export function requireAuth(req, res) {
  if (!isAuthenticated(req.headers.cookie)) {
    res.status(401).json({ error: "No autenticado" });
    return false;
  }
  return true;
}
