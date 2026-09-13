const crypto = require("node:crypto");

function webarConfig(env = process.env) {
  const appId = String(env.TENCENT_WEBAR_APP_ID || "").trim();
  const licenseKey = String(env.TENCENT_WEBAR_LICENSE_KEY || "").trim();
  const token = String(env.TENCENT_WEBAR_TOKEN || "").trim();
  return {
    configured: Boolean(appId && licenseKey && token),
    appId,
    licenseKey,
    token,
  };
}

function webarAuthorization(env = process.env, now = Date.now) {
  const config = webarConfig(env);
  if (!config.configured) return { configured: false, code: "WEBAR_NOT_CONFIGURED" };
  const timestamp = Math.round(Number(now()) / 1000);
  const signature = crypto
    .createHash("sha256")
    .update(`${timestamp}${config.token}${config.appId}${timestamp}`)
    .digest("hex")
    .toUpperCase();
  return {
    configured: true,
    appId: config.appId,
    licenseKey: config.licenseKey,
    signature,
    timestamp,
  };
}

module.exports = { webarAuthorization, webarConfig };
