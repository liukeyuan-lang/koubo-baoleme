"""Persistent local FunASR worker. Requests arrive as JSON lines on stdin; replies use fd 3."""

import json
import os
import re
import sys
import traceback

_model = None


def model():
    global _model
    if _model is None:
        from funasr import AutoModel

        _model = AutoModel(
            model=os.getenv("LOCAL_ASR_MODEL", "paraformer-zh"),
            vad_model=os.getenv("LOCAL_ASR_VAD_MODEL", "fsmn-vad"),
            punc_model=os.getenv("LOCAL_ASR_PUNC_MODEL", "ct-punc-c"),
            vad_kwargs={"max_single_segment_time": 30000},
            device=os.getenv("LOCAL_ASR_DEVICE", "cpu"),
            disable_log=True,
        )
    return _model


def segments_from(result):
    sentence_info = result.get("sentence_info") or []
    segments = []
    for item in sentence_info:
        text = str(item.get("text") or "").strip()
        if text:
            segments.append({"text": text, "start": float(item.get("start", 0)) / 1000, "end": float(item.get("end", 0)) / 1000})
    if segments:
        return segments
    timestamps = result.get("timestamp") or []
    text = str(result.get("text") or "").strip()
    if text and timestamps:
        return [{"text": text, "start": float(timestamps[0][0]) / 1000, "end": float(timestamps[-1][1]) / 1000}]
    return [{"text": text, "start": 0, "end": 0}] if text else []


def transcribe(request):
    vocabulary = [str(value).strip() for value in request.get("vocabulary", []) if str(value).strip()][:30]
    result = model().generate(
        input=request["file"],
        language="zh",
        use_itn=True,
        batch_size_s=120,
        hotword=" ".join(vocabulary),
        sentence_timestamp=True,
    )[0]
    text = re.sub(r"\s+", " ", str(result.get("text") or "")).strip()
    segments = segments_from(result)
    duration = max((segment["end"] for segment in segments), default=0) or None
    return {"text": text, "segments": segments, "duration": duration, "engine": "funasr-paraformer"}


def reply(stream, payload):
    stream.write(json.dumps(payload, ensure_ascii=False) + "\n")
    stream.flush()


def main():
    with os.fdopen(3, "w", encoding="utf-8", buffering=1) as response_stream:
        for line in sys.stdin:
            try:
                request = json.loads(line)
                reply(response_stream, {"id": request.get("id"), "ok": True, "result": transcribe(request)})
            except Exception as error:
                traceback.print_exc(file=sys.stderr)
                reply(response_stream, {"id": request.get("id") if "request" in locals() else None, "ok": False, "code": "LOCAL_ASR_FAILED", "error": str(error)})


if __name__ == "__main__":
    main()
