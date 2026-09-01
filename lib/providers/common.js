"use strict";

const DEFAULT_TIMEOUT_MS = 15_000;

function valueAt(input, paths, fallback = null) {
  for (const path of paths) {
    const value = path.split(".").reduce((current, key) => current?.[key], input);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function numberAt(input, paths) {
  const value = valueAt(input, paths);
  if (value === null) return null;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function stringAt(input, paths) {
  const value = valueAt(input, paths, "");
  return typeof value === "string" ? value.trim() : String(value || "").trim();
}

function normalize(platform, sourceUrl, payload) {
  // This is the provider boundary: no object from an external API is returned.
  const raw = payload?.data?.item || payload?.data?.note || payload?.data || payload?.result || payload || {};
  return {
    platform,
    sourceUrl,
    sourceId: stringAt(raw, ["sourceId", "aweme_id", "note_id", "photo_id", "id"]),
    author: {
      name: stringAt(raw, ["author.name", "author.nickname", "user.nickname", "nickname", "author_name"]),
      avatar: stringAt(raw, ["author.avatar", "author.avatar_url", "user.avatar", "avatar"]),
    },
    content: {
      title: stringAt(raw, ["content.title", "title", "desc"]),
      description: stringAt(raw, ["content.description", "description", "desc", "text", "body"]),
      duration: numberAt(raw, ["content.duration", "duration", "video.duration"]),
    },
    metrics: {
      likes: numberAt(raw, ["metrics.likes", "statistics.digg_count", "like_count", "likes"]),
      favorites: numberAt(raw, ["metrics.favorites", "statistics.collect_count", "collect_count", "favorites"]),
      comments: numberAt(raw, ["metrics.comments", "statistics.comment_count", "comment_count", "comments"]),
      shares: numberAt(raw, ["metrics.shares", "statistics.share_count", "share_count", "shares"]),
      views: numberAt(raw, ["metrics.views", "statistics.play_count", "view_count", "views"]),
    },
    media: {
      videoUrl: stringAt(raw, ["media.videoUrl", "video.play_addr.url_list.0", "video.url", "video_url", "play_url"]),
      audioUrl: stringAt(raw, ["media.audioUrl", "music.play_url.url_list.0", "audio.url", "audio_url", "music_url"]),
      coverUrl: stringAt(raw, ["media.coverUrl", "video.cover.url_list.0", "cover.url", "cover_url", "image"]),
    },
  };
}

async function callProvider(platform, url) {
  const prefix = platform.toUpperCase();
  const endpoint = process.env[`${prefix}_PROVIDER_URL`] || process.env.CONTENT_PROVIDER_URL;
  const token = process.env[`${prefix}_PROVIDER_TOKEN`] || process.env.CONTENT_PROVIDER_TOKEN;
  if (!endpoint) {
    const error = new Error(`${platform} 内容解析 Provider 尚未配置`);
    error.code = "PROVIDER_NOT_CONFIGURED";
    throw error;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.PROVIDER_TIMEOUT_MS || DEFAULT_TIMEOUT_MS));
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ url, platform }),
      signal: controller.signal,
    });
    if (response.status === 429) { const error = new Error("内容解析服务请求过于频繁"); error.code = "PROVIDER_RATE_LIMITED"; throw error; }
    if (!response.ok) { const error = new Error(`内容解析服务返回 ${response.status}`); error.code = "PROVIDER_FAILED"; throw error; }
    const payload = await response.json();
    const result = normalize(platform, url, payload);
    if (!result.content.title && !result.content.description && !result.media.videoUrl && !result.media.audioUrl) {
      const error = new Error("内容解析服务没有返回可用数据"); error.code = "PROVIDER_EMPTY"; throw error;
    }
    return result;
  } catch (error) {
    if (error.name === "AbortError") { error.code = "PROVIDER_TIMEOUT"; error.message = "内容解析服务超时"; }
    throw error;
  } finally { clearTimeout(timeout); }
}

module.exports = { callProvider, normalize };
