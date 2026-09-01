import argparse
import asyncio
import json
import os
import re
import sys
from dataclasses import asdict
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import ProxyHandler, build_opener

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


def emit(payload, code=0):
    print(json.dumps(payload, ensure_ascii=False))
    raise SystemExit(code)


def cdp_websocket(endpoint):
    if endpoint.startswith("ws://") or endpoint.startswith("wss://"):
        return endpoint
    opener = build_opener(ProxyHandler({}))
    with opener.open(endpoint.rstrip("/") + "/json/version", timeout=5) as response:
        return json.load(response)["webSocketDebuggerUrl"]


def video_sources(page):
    return page.evaluate(
        r"""() => {
          const values = [];
          const add = value => {
            if (!value || value.startsWith('blob:') || values.includes(value)) return;
            try { values.push(new URL(value, location.href).toString()); } catch { values.push(value); }
          };
          document.querySelectorAll('video, video source').forEach(node => {
            add(node.currentSrc); add(node.src); add(node.getAttribute('src'));
          });
          performance.getEntriesByType('resource').forEach(entry => {
            const name = entry.name || '';
            if (/\.mp4|\.m3u8|video|sns-video|fe-video/i.test(name)) add(name);
          });
          const state = document.querySelector('#__INITIAL_STATE__')?.textContent || '';
          for (const match of state.matchAll(/https?:\\?\\?\/\\?\/[^\"'\\s]+?\\.(?:mp4|m3u8)[^\"'\\s]*/gi)) {
            add(match[0].replaceAll('\\\\u002F','/').replaceAll('\\/','/'));
          }
          return values.slice(0, 12);
        }"""
    )


def wait_for_stable_page(page, timeout_ms=15000):
    previous = ""
    stable_rounds = 0
    rounds = max(1, timeout_ms // 400)
    for _ in range(rounds):
        try:
            current = page.url
            if current == previous and current not in ("", "about:blank"):
                stable_rounds += 1
            else:
                previous = current
                stable_rounds = 0
            if stable_rounds >= 3:
                try:
                    page.wait_for_load_state("domcontentloaded", timeout=1500)
                except Exception:
                    pass
                return
            page.wait_for_timeout(400)
        except Exception:
            page.wait_for_timeout(400)


def wait_for_note_page(page, timeout_ms=45000):
    """Wait through xhslink redirects and Xiaohongshu's late client navigation."""
    deadline_rounds = max(1, timeout_ms // 500)
    stable_url = ""
    stable_rounds = 0
    last_error = ""
    for _ in range(deadline_rounds):
        try:
            current_url = page.url
            is_note = bool(re.search(r"/(?:discovery/item|explore)/[0-9a-f]{16,}", current_url, re.I))
            body_ready = page.locator("body").count() > 0
            if is_note and body_ready:
                if current_url == stable_url:
                    stable_rounds += 1
                else:
                    stable_url = current_url
                    stable_rounds = 1
                # Require two full seconds without another client-side redirect.
                if stable_rounds >= 4:
                    return current_url
            else:
                stable_url = current_url
                stable_rounds = 0
        except Exception as exc:
            last_error = str(exc)
            stable_rounds = 0
        page.wait_for_timeout(500)
    if last_error:
        raise RuntimeError(last_error)
    return page.url


def extract_note_stably(page, fallback, extractor, attempts=8):
    """Retry DOM extraction when Xiaohongshu replaces the execution context."""
    last_error = None
    for _ in range(attempts):
        try:
            body_text = page.locator("body").inner_text(timeout=5000)
            if re.search(r"安全验证|验证后继续|访问受限|网络环境存在风险", body_text):
                return None, body_text
            note = asdict(extractor(page, {**fallback, "note_url": page.url, "title": safe_title(page)}))
            if note.get("body") or note.get("author"):
                return note, body_text
        except Exception as exc:
            last_error = exc
        page.wait_for_timeout(750)
    if last_error:
        raise last_error
    raise RuntimeError("页面已打开，但帖子正文尚未渲染")


def is_navigation_interruption(exc):
    message = str(exc)
    return bool(re.search(
        r"Execution context was destroyed|Cannot find context|Target page, context or browser has been closed|navigation",
        message,
        re.I,
    ))


def safe_title(page):
    for _ in range(4):
        try:
            return page.title()
        except Exception as exc:
            if "Execution context was destroyed" not in str(exc):
                break
            page.wait_for_timeout(500)
    return ""


def new_background_page(context):
    """Create a separate minimized CDP window without touching the user's tab."""
    existing = list(context.pages)
    if not existing:
        raise RuntimeError("BACKGROUND_BROWSER_UNAVAILABLE: 托管浏览器没有可复用的登录窗口")
    session = context.new_cdp_session(existing[0])
    target_id = ""
    try:
        created = session.send("Target.createTarget", {
            "url": "about:blank",
            "newWindow": True,
            "background": True,
        })
        target_id = created.get("targetId", "")
        window = session.send("Browser.getWindowForTarget", {"targetId": target_id})
        session.send("Browser.setWindowBounds", {
            "windowId": window["windowId"],
            "bounds": {"windowState": "minimized"},
        })
        for _ in range(25):
            for candidate in context.pages:
                if candidate not in existing and not candidate.is_closed():
                    return candidate
            existing[0].wait_for_timeout(100)
        if target_id:
            session.send("Target.closeTarget", {"targetId": target_id})
        raise RuntimeError("BACKGROUND_BROWSER_UNAVAILABLE: 无法创建隔离的采集窗口")
    finally:
        session.detach()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--cdp", default=os.environ.get("XHS_CDP_URL", "http://127.0.0.1:18800"))
    parser.add_argument("--workbench", default=os.environ.get("XHS_WORKBENCH_PATH", r"C:\Users\liukeyuan\Desktop\xiaohongshu-analysis-workbench"))
    parser.add_argument("--max-comments", type=int, default=50)
    args = parser.parse_args()

    parsed = urlparse(args.url)
    if parsed.scheme not in ("http", "https") or not re.search(r"(^|\.)xiaohongshu\.com$|(^|\.)xhslink\.com$", parsed.hostname or "", re.I):
        emit({"ok": False, "code": "INVALID_URL", "error": "只支持小红书公开链接"}, 2)

    workbench = Path(args.workbench).resolve()
    vendor = workbench / "vendor" / "xiaohongshu-relay-scrape" / "scripts"
    if not vendor.exists():
        emit({"ok": False, "code": "RUNTIME_MISSING", "error": "未找到本机小红书采集运行时"}, 2)
    sys.path.insert(0, str(vendor))
    sys.path.insert(0, str(workbench / "scripts"))

    try:
        from playwright.sync_api import sync_playwright
        from scrape_xiaohongshu_search import extract_note_from_dom
        from audience_collection import _click_more_replies, _dom_comments, _profile_snapshot, _scroll_comments
    except Exception as exc:
        emit({"ok": False, "code": "RUNTIME_IMPORT_FAILED", "error": str(exc)}, 2)

    try:
        websocket = cdp_websocket(args.cdp)
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(websocket)
            contexts = browser.contexts
            if not contexts:
                emit({"ok": False, "code": "BROWSER_NOT_READY", "error": "托管浏览器未就绪"}, 2)
            context = contexts[0]
            page = new_background_page(context)
            captured_media = []

            def capture_media(response):
                try:
                    content_type = response.headers.get("content-type", "")
                    url = response.url
                    if "video" in content_type.lower() or re.search(r"\.mp4(?:\?|$)|\.m3u8(?:\?|$)", url, re.I):
                        if url not in captured_media:
                            captured_media.append(url)
                except Exception:
                    pass

            page.on("response", capture_media)
            if page.url.split("?")[0] != args.url.split("?")[0]:
                page.goto(args.url, wait_until="domcontentloaded", timeout=45000)
            final_url = wait_for_note_page(page)
            if not re.search(r"/(?:discovery/item|explore)/[0-9a-f]{16,}", final_url, re.I):
                page.close()
                emit({
                    "ok": False,
                    "code": "LOGIN_OR_LINK_EXPIRED",
                    "error": "小红书没有打开目标帖子，当前登录状态已失效或分享链接的访问令牌已过期",
                }, 3)
            fallback = {"note_url": page.url, "title": safe_title(page)}
            note, body_text = extract_note_stably(page, fallback, extract_note_from_dom)
            if note is None:
                page.close()
                emit({"ok": False, "code": "SECURITY_VERIFICATION_REQUIRED", "error": "小红书需要人工完成安全验证"}, 3)
            comments = {}
            stagnant = 0
            collection_warnings = []
            for _ in range(60):
                try:
                    for item in _dom_comments(page, note.get("note_id", ""), page.url):
                        identity = item.get("comment_id") or f"{item.get('user_id','')}:{item.get('text','')}"
                        if identity:
                            comments[identity] = item
                    if len(comments) >= args.max_comments:
                        break
                    before = len(comments)
                    _click_more_replies(page)
                    _scroll_comments(page)
                    page.wait_for_timeout(700)
                    for item in _dom_comments(page, note.get("note_id", ""), page.url):
                        identity = item.get("comment_id") or f"{item.get('user_id','')}:{item.get('text','')}"
                        if identity:
                            comments[identity] = item
                    stagnant = stagnant + 1 if len(comments) == before else 0
                    if stagnant >= 6:
                        break
                except Exception as exc:
                    if not is_navigation_interruption(exc):
                        collection_warnings.append(f"comments: {exc}")
                        break
                    collection_warnings.append("comments: page navigation interrupted collection")
                    try:
                        wait_for_note_page(page, timeout_ms=10000)
                    except Exception:
                        break
                    continue

            try:
                videos = video_sources(page)
                if page.locator("video").count() and not videos:
                    page.reload(wait_until="domcontentloaded", timeout=45000)
                    wait_for_note_page(page)
                    videos = video_sources(page)
            except Exception as exc:
                collection_warnings.append(f"video: {exc}")
                videos = []
            videos = list(dict.fromkeys(videos + captured_media))[:12]
            content_type = "video" if videos or page.locator("video").count() else "image_text"
            author_profile = {}
            if note.get("author_profile"):
                try:
                    page.goto(note["author_profile"], wait_until="domcontentloaded", timeout=45000)
                    wait_for_stable_page(page)
                    page.wait_for_timeout(1200)
                    author_profile = _profile_snapshot(page)
                except Exception:
                    author_profile = {}
            payload = {
                "ok": True,
                "source": "managed_browser",
                "contentType": content_type,
                "note": note,
                "authorProfile": author_profile,
                "comments": list(comments.values())[: args.max_comments],
                "commentCollection": {
                    "expected": note.get("comment_count"),
                    "collected": min(len(comments), args.max_comments),
                    "target": args.max_comments,
                    "complete": bool(note.get("comment_count")) and str(note.get("comment_count")) == str(min(len(comments), args.max_comments)),
                    "stopReason": "target_reached" if len(comments) >= args.max_comments else "page_exhausted_or_stalled",
                },
                "videoUrls": videos,
                "collectionWarnings": collection_warnings,
                "collectedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
            }
            page.close()
            emit(payload)
    except SystemExit:
        raise
    except Exception as exc:
        if str(exc).startswith("BACKGROUND_BROWSER_UNAVAILABLE:"):
            emit({"ok": False, "code": "BACKGROUND_BROWSER_UNAVAILABLE", "error": str(exc).split(":", 1)[1].strip()}, 2)
        emit({"ok": False, "code": "COLLECTION_FAILED", "error": str(exc)}, 2)


if __name__ == "__main__":
    main()
