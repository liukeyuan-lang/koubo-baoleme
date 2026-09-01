let extracted = null;
const $ = (selector) => document.querySelector(selector);
function compact(value) { return value == null || value === "" ? "未获取" : String(value); }
async function settings() { return chrome.storage.local.get({ appUrl: "http://127.0.0.1:4173", token: "" }); }
async function extractCurrentPost() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https:\/\/(?:www\.)?xiaohongshu\.com\//i.test(tab.url)) throw new Error("请先打开一篇小红书帖子");
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => {
    const text = (el) => el?.textContent?.trim() || "";
    const first = (...selectors) => selectors.map((selector) => document.querySelector(selector)).find(Boolean);
    const firstIn = (root, ...selectors) => selectors.map((selector) => root.querySelector(selector)).find(Boolean);
    const countPattern = /\d+(?:\.\d+)?(?:万|w|k)?/i;
    const directMetric = (selectors) => { for (const selector of selectors) { const value = text(document.querySelector(selector)).match(countPattern)?.[0]; if (value) return value; } return ""; };
    const actionBarCounts = () => { const bar = first('[class*="engage-bar"]', '[class*="interactions"]', '[class*="note-bottom"]'); return bar ? [...bar.querySelectorAll("span")].map((node) => text(node).match(/^\d+(?:\.\d+)?(?:万|w|k)?$/i)?.[0]).filter(Boolean) : []; };
    const barCounts = actionBarCounts();
    const bodyNode = first("#detail-desc", '[class*="desc"]', '[class*="note-content"]');
    const noteRoot = bodyNode?.closest('[role="dialog"], [class*="note-detail"], [class*="noteDetail"], [class*="note-container"], [class*="noteContainer"]') || document;
    const commentNodes = [...noteRoot.querySelectorAll('[class*="comment-item"], [class*="commentItem"]')].slice(0, 50);
    const comments = commentNodes.map((node) => ({ text: text(node.querySelector('[class*="content"]')) || text(node), author: text(node.querySelector('[class*="author"],a')), likeCount: text(node.querySelector('[class*="like"]')) })).filter((item) => item.text);
    const title = text(firstIn(noteRoot, "#detail-title", '[class*="title"]', "h1")) || document.title.replace(/\s*[-_]\s*小红书.*$/, "");
    const body = text(bodyNode);
    const video = noteRoot.querySelector("video");
    const candidateMap = new Map();
    const addVideo = (value, initiatorType = "", source = "resource", resourceSize = 0) => { if (!value || value.startsWith("blob:")) return; try { const url = new URL(value, location.href).toString(); const strongMediaUrl = /(?:^|[\/_\-.])(video|stream|sns-video|avc|hevc)(?:[\/_\-.?]|$)|\.(?:mp4|m3u8|m4s|ts)(?:\?|$)/i.test(url); const isImage = /\.(?:jpg|jpeg|png|webp|gif|avif)(?:\?|$)/i.test(url); if (!/xhscdn\.com/i.test(url) || !strongMediaUrl || isImage) return; const segmented = /\.m4s(?:\?|$)|\.ts(?:\?|$)|[?&](?:range|start|end)=/i.test(url); const sizeScore = resourceSize > 500000 ? 30 : resourceSize > 100000 ? 15 : 0; const score = (source === "video-element" ? 120 : source === "initial-state" ? 80 : 30) + (/\.mp4(?:\?|$)/i.test(url) ? 50 : 0) + (/sns-video|stream/i.test(url) ? 20 : 0) + sizeScore - (segmented ? 120 : 0) - (/\.m3u8(?:\?|$)/i.test(url) ? 30 : 0); const current = candidateMap.get(url); if (!current || score > current.score) candidateMap.set(url, { url, score, segmented }); } catch {} };
    noteRoot.querySelectorAll("video,video source").forEach((node) => { addVideo(node.currentSrc, "video", "video-element"); addVideo(node.src, "video", "video-element"); addVideo(node.getAttribute("src"), "video", "video-element"); });
    if (video) {
      try { performance.getEntriesByType("resource").forEach((entry) => addVideo(entry.name, entry.initiatorType, "resource", Number(entry.transferSize || entry.encodedBodySize || 0))); } catch {}
      let initialState = document.querySelector("#__INITIAL_STATE__")?.textContent || "";
      try { if (window.__INITIAL_STATE__) initialState += `\n${JSON.stringify(window.__INITIAL_STATE__)}`; } catch {}
      initialState = initialState.replaceAll("\\u002F", "/").replaceAll("\\/", "/");
      for (const match of initialState.matchAll(/https?:\/\/[^"'\s]+?(?:\.mp4|\.m3u8|sns-video|stream|\/video\/)[^"'\s]*/gi)) addVideo(match[0], "initial-state", "initial-state");
    }
    const videoCandidates = [...candidateMap.values()].sort((a, b) => b.score - a.score).map((item) => item.url);
    return { url: location.href, contentType: video ? "video" : "image_text", author: { name: text(first('[class*="author"] [class*="name"]', '[class*="username"]')) }, metrics: {
      likes: directMetric(['.buttons.engage-bar-style .like-wrapper .count', '[class*="engage-bar"] [class*="like-wrapper"] [class*="count"]', '[aria-label*="点赞"] [class*="count"]']) || barCounts[0] || "",
      collects: directMetric(['.buttons.engage-bar-style .collect-wrapper .count', '[class*="engage-bar"] [class*="collect-wrapper"] [class*="count"]', '[aria-label*="收藏"] [class*="count"]']) || barCounts[1] || "",
      commentsCount: directMetric(['.buttons.engage-bar-style .chat-wrapper .count', '[class*="engage-bar"] [class*="chat-wrapper"] [class*="count"]', '[aria-label*="评论"] [class*="count"]']) || barCounts[2] || "",
    }, content: { title, text: body, transcript: "" }, comments, media: { videoUrl: videoCandidates[0] || "", videoCandidates: videoCandidates.slice(0, 8) } };
  }});
  return result;
}
async function init() {
  const config = await settings(); $("#app-url").value = config.appUrl; $("#token").value = config.token;
  try { extracted = await extractCurrentPost(); $("#title").textContent = extracted.content.title || "未获取标题"; $("#stats").innerHTML = `<span>${compact(extracted.metrics.likes)}赞</span><span>${compact(extracted.metrics.collects)}收藏</span><span>${compact(extracted.metrics.commentsCount)}评论</span>`; const candidateCount = extracted.media?.videoCandidates?.length || 0; $("#summary").textContent = `正文 ${extracted.content.text.length} 字${extracted.contentType === "video" ? candidateCount ? ` · 已识别 ${candidateCount} 个视频源，将依次尝试转写` : " · 未识别视频源，逐字稿需手动补充" : ""}`; $("#comment-count").textContent = `将发送 ${extracted.comments.length} 条当前已加载的公开评论（非整个评论区）`; $("#preview").hidden = false; $("#status").textContent = "请确认预览内容后发送。"; $("#send").disabled = false; } catch (error) { $("#status").textContent = error.message; }
}
$("#save").addEventListener("click", async () => { await chrome.storage.local.set({ appUrl: $("#app-url").value.trim().replace(/\/$/, ""), token: $("#token").value.trim() }); $("#status").textContent = "设置已保存。"; });
$("#send").addEventListener("click", async () => { $("#send").disabled = true; $("#status").textContent = "正在发送……"; try { const config = await settings(); const response = await fetch(`${config.appUrl}/api/import-browser-post`, { method: "POST", headers: { "Content-Type": "application/json", ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}) }, body: JSON.stringify(extracted) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "发送失败"); await chrome.tabs.create({ url: `${config.appUrl}/?import=${encodeURIComponent(data.importId)}` }); window.close(); } catch (error) { $("#status").textContent = error.message; $("#send").disabled = false; } });
init();
