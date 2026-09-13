// Private, single-process session store. Persist this directory across restarts.
// Never serve it over HTTP. Multi-instance deployment needs a shared transactional store.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function failure(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");

class ClientSessions {
  constructor({ env = process.env, fetcher = fetch, directory = path.join(__dirname, "../../data/private-auth") } = {}) {
    this.env = env;
    this.fetcher = fetcher;
    this.directory = directory;
    this.file = path.join(directory, "sessions.json");
    this.state = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file, "utf8")) : { sessions: {}, identities: {} };
    this.limits = new Map();
    this.logins = new Map();
  }

  persist() {
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    fs.writeFileSync(this.file + ".tmp", JSON.stringify(this.state), { mode: 0o600 });
    fs.renameSync(this.file + ".tmp", this.file);
  }

  limit(req) {
    const key = req.socket.remoteAddress;
    const now = Date.now();
    for (const [ip, value] of this.limits) if (value.until < now) this.limits.delete(ip);
    const value = this.limits.get(key) || { count: 0, until: now + 60000 };
    if (++value.count > 12) throw failure(429, "RATE_LIMITED", "登录请求过于频繁");
    this.limits.set(key, value);
  }

  async admin(route, options = {}) {
    const base = this.env.SUPABASE_URL;
    const key = this.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key) throw failure(503, "AUTH_NOT_CONFIGURED", "服务端身份存储未配置");
    const response = await this.fetcher(`${base.replace(/\/$/, "")}/auth/v1/admin/${route}`, {
      ...options,
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw failure(502, "IDENTITY_PROVIDER_ERROR", "用户身份建档或读取失败");
    return response.json();
  }

  issue(userId, mode, usedRefresh = []) {
    if (!uuid(userId)) throw failure(502, "IDENTITY_INVALID", "用户标识无效");
    const accessToken = "kbm_" + crypto.randomBytes(32).toString("base64url");
    const refreshToken = "kbr_" + crypto.randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + 30 * 60000;
    const refreshExpiresAt = Date.now() + (mode === "development" ? 8 * 3600000 : 30 * 86400000);
    for (const [key, row] of Object.entries(this.state.sessions)) if (row.refreshExpiresAt <= Date.now()) delete this.state.sessions[key];
    this.state.sessions[hash(accessToken)] = { userId, mode, expiresAt, refreshExpiresAt, refreshHash: hash(refreshToken), usedRefresh };
    this.persist();
    return { accessToken, refreshToken, expiresAt, refreshExpiresAt, user: { id: userId }, mode, wechatVerified: mode === "wechat" };
  }

  assertDevRequest(req) {
    if (this.env.NODE_ENV === "production" || this.env.MINIPROGRAM_DEV_LOGIN !== "true"
      || !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress)
      || req.headers["x-forwarded-for"] || req.headers.forwarded || req.headers["x-real-ip"]) {
      throw failure(403, "DEV_LOGIN_DISABLED", "开发登录仅允许显式开启的本机直连");
    }
  }

  devLogin(req, input) {
    this.assertDevRequest(req);
    this.limit(req);
    const expected = this.env.MINIPROGRAM_DEV_LOGIN_SECRET || "";
    if (expected.length < 32 || hash(String(input.devSecret || "")) !== hash(expected)) throw failure(401, "AUTH_INVALID", "开发口令无效");
    const id = this.env.MINIPROGRAM_DEV_USER_ID;
    if (!uuid(id)) throw failure(503, "DEV_USER_NOT_CONFIGURED", "未指定服务端开发测试用户");
    return this.admin(`users/${id}`).then(user => {
      if ((user.user || user).id !== id) throw failure(502, "IDENTITY_INVALID", "开发用户不存在");
      return this.issue(id, "development");
    });
  }

  async wechatLogin(req, input) {
    this.limit(req);
    const { WECHAT_APPID: appid, WECHAT_APPSECRET: secret } = this.env;
    if (!appid || !secret) throw failure(503, "WECHAT_NOT_CONFIGURED", "待真实微信凭证配置与验证");
    if (this.env.WECHAT_ANONYMOUS_AUTH_ENABLED !== "true") throw failure(503, "WECHAT_IDENTITY_NOT_CONFIGURED", "需先验证 Supabase 匿名 Auth 建档配置");
    const code = String(input.code || "");
    if (!code || code.length > 256) throw failure(400, "WECHAT_CODE_REQUIRED", "需要有效微信登录 code");
    const params = new URLSearchParams({ appid, secret, js_code: code, grant_type: "authorization_code" });
    const response = await this.fetcher(`https://api.weixin.qq.com/sns/jscode2session?${params}`, { signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    if (!response.ok || data.errcode || !data.openid || !data.session_key) throw failure(401, "WECHAT_CODE_INVALID", "微信登录失败，请重新登录");
    const identityKey = hash(`${appid}:${data.openid}`);
    if (!this.logins.has(identityKey)) this.logins.set(identityKey, this.resolveIdentity(identityKey));
    let userId;
    try {
      userId = await this.logins.get(identityKey);
    } finally {
      this.logins.delete(identityKey);
    }
    return this.issue(userId, "wechat");
  }

  async resolveIdentity(identityKey) {
    if (this.state.identities[identityKey]) return this.state.identities[identityKey];
    for (let page = 1; ; page++) {
      const result = await this.admin(`users?page=${page}&per_page=100`);
      const found = (result.users || []).find(user => user.app_metadata?.koubo_wechat_identity === identityKey);
      if (found) {
        this.state.identities[identityKey] = found.id;
        this.persist();
        return found.id;
      }
      if ((result.users || []).length < 100) break;
    }
    const publicKey = this.env.SUPABASE_PUBLISHABLE_KEY;
    if (!publicKey) throw failure(503, "AUTH_NOT_CONFIGURED", "匿名 Auth 建档配置缺失");
    const response = await this.fetcher(`${this.env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: publicKey, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw failure(503, "WECHAT_IDENTITY_NOT_CONFIGURED", "Supabase 匿名建档未启用或暂不可用");
    const created = await response.json();
    const user = created.user;
    if (!uuid(user?.id)) throw failure(502, "IDENTITY_INVALID", "微信用户建档尚未通过验证");
    await this.admin(`users/${user.id}`, { method: "PUT", body: JSON.stringify({ app_metadata: { koubo_wechat_identity: identityKey } }) });
    this.state.identities[identityKey] = user.id;
    this.persist();
    return user.id;
  }

  authenticate(req, token) {
    const row = this.state.sessions[hash(token)];
    if (!row || row.expiresAt <= Date.now()) throw failure(401, "AUTH_INVALID", "登录已过期，请重新登录");
    if (row.mode === "development") this.assertDevRequest(req);
    return { id: row.userId, email: "", authType: row.mode, sessionType: "miniprogram" };
  }

  refresh(req, input) {
    this.limit(req);
    const wanted = hash(String(input.refreshToken || ""));
    const replay = Object.entries(this.state.sessions).find(([, row]) => (row.usedRefresh || []).includes(wanted));
    if (replay) {
      delete this.state.sessions[replay[0]];
      this.persist();
      throw failure(401, "AUTH_INVALID", "刷新凭证重复使用，会话已撤销");
    }
    const entry = Object.entries(this.state.sessions).find(([, row]) => row.refreshHash === wanted);
    if (!entry || entry[1].refreshExpiresAt <= Date.now()) throw failure(401, "AUTH_INVALID", "刷新凭证已失效");
    const [key, row] = entry;
    if (row.mode === "development") this.assertDevRequest(req);
    delete this.state.sessions[key];
    this.persist();
    return this.issue(row.userId, row.mode, [...(row.usedRefresh || []), wanted]);
  }

  logout(token) {
    delete this.state.sessions[hash(token)];
    this.persist();
  }
}

module.exports = { ClientSessions, failure, uuid };
