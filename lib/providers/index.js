"use strict";

const providers = {
  douyin: require("./douyin"),
  xiaohongshu: require("./xiaohongshu"),
  kuaishou: require("./kuaishou"),
};

const PLATFORM_HOSTS = {
  douyin: ["douyin.com", "iesdouyin.com"],
  xiaohongshu: ["xiaohongshu.com", "xhslink.com"],
  kuaishou: ["kuaishou.com", "chenzhongtech.com", "gifshow.com"],
};

function detectPlatform(value) {
  let url;
  try { url = new URL(value); } catch { const error = new Error("请输入有效的分享链接"); error.code = "INVALID_URL"; throw error; }
  if (url.protocol !== "https:" && !(process.env.ALLOW_HTTP_SOURCE_URLS === "true" && url.protocol === "http:")) {
    const error = new Error("分享链接必须使用 HTTPS"); error.code = "INVALID_URL_PROTOCOL"; throw error;
  }
  const host = url.hostname.toLowerCase();
  const platform = Object.entries(PLATFORM_HOSTS).find(([, domains]) => domains.some((domain) => host === domain || host.endsWith(`.${domain}`)))?.[0];
  if (!platform) { const error = new Error("仅支持抖音、小红书和快手分享链接"); error.code = "UNSUPPORTED_PLATFORM"; throw error; }
  url.username = ""; url.password = ""; url.hash = "";
  return { platform, url: url.toString() };
}

function getProvider(platform) {
  if (!providers[platform]) throw new Error("暂不支持这个平台");
  return providers[platform];
}

module.exports = { detectPlatform, getProvider, PLATFORM_HOSTS };
