# compatibility_analyzer.py
import json

def analyze(report):

    result = {
        "ASR": "UNKNOWN",
        "TTS": "UNKNOWN",
        "VOICE_CLONING": "UNKNOWN",
        "DIARIZATION": "UNKNOWN",
        "PIPELINE_READY": False,
        "NOTES": []
    }

    # --- ASR (Whisper)
    if report.get("whisper", {}).get("installed"):
        result["ASR"] = "OK"
    else:
        result["ASR"] = "MISSING"

    # --- TTS (basic check)
    if report.get("TTS", {}).get("installed"):
        result["TTS"] = "OK"
    else:
        result["TTS"] = "NOT INSTALLED"

    # --- Voice cloning (XTTS depends on TTS + torch GPU)
    if report.get("TTS", {}).get("installed") and report["cuda_available"]:
        result["VOICE_CLONING"] = "POSSIBLE"
    else:
        result["VOICE_CLONING"] = "NOT READY"

    # --- WhisperX check
    if report.get("whisperx", {}).get("installed"):
        result["DIARIZATION"] = "AVAILABLE (if models work)"
    else:
        result["DIARIZATION"] = "NOT AVAILABLE"

    # --- Final pipeline readiness
    if (
        result["ASR"] == "OK"
        and report["ffmpeg"]
    ):
        result["PIPELINE_READY"] = True
        result["NOTES"].append("Basic SpeechMaker pipeline is working")

    if not report["ffmpeg"]:
        result["NOTES"].append("FFmpeg missing or broken")

    if report["cuda_available"]:
        result["NOTES"].append("GPU available")

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    # you will pipe JSON from env_probe
    import sys
    data = json.load(sys.stdin)
    analyze(data)
