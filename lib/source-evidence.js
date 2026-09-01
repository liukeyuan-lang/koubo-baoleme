"use strict";

function present(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.values(value).some((item) => item !== null && item !== undefined && item !== "");
  return value !== null && value !== undefined && value !== "";
}

function buildEvidence(source, transcript = null, comments = []) {
  const content = source?.content || {};
  const metrics = source?.metrics || {};
  const transcriptData = transcript?.segments || [];
  const contentData = { title: content.title || "", description: content.description || "" };
  const metricsData = {
    likes: metrics.likes ?? null, favorites: metrics.favorites ?? null,
    comments: metrics.comments ?? null, shares: metrics.shares ?? null, views: metrics.views ?? null,
  };
  return {
    transcript: { available: transcriptData.length > 0 || Boolean(transcript?.text), data: transcriptData },
    content: { available: present(contentData), data: contentData },
    metrics: { available: present(metricsData), data: metricsData },
    comments: { available: comments.length > 0, data: comments },
  };
}

function toAnalysisSource(source, transcript, evidence) {
  return {
    platform: source.platform,
    url: source.sourceUrl,
    sourceId: source.sourceId,
    contentType: source.media?.videoUrl || source.media?.audioUrl ? "video" : "image_text",
    author: { name: source.author?.name || "无法获取", avatar: source.author?.avatar || "", followers: null },
    metrics: {
      likes: source.metrics?.likes ?? null,
      collects: source.metrics?.favorites ?? null,
      commentsCount: source.metrics?.comments ?? null,
      shares: source.metrics?.shares ?? null,
      views: source.metrics?.views ?? null,
    },
    content: {
      title: source.content?.title || "",
      text: source.content?.description || "",
      transcript: transcript?.text || "",
    },
    comments: evidence.comments.data,
    media: { videoUrls: source.media?.videoUrl ? [source.media.videoUrl] : [], audioUrl: source.media?.audioUrl || "", coverUrl: source.media?.coverUrl || "" },
    videoAnalysis: transcript ? { duration: transcript.duration, segments: transcript.segments } : null,
    evidence,
    sourceStatus: {
      fetchedAt: new Date().toISOString(), source: "content_provider",
      fieldsAvailable: Object.entries(evidence).filter(([, item]) => item.available).map(([key]) => key),
      transcription: transcript ? "complete" : "unavailable",
    },
  };
}

module.exports = { buildEvidence, toAnalysisSource };
