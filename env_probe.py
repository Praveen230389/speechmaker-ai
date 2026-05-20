# env_probe.py
import importlib
import subprocess
import json
import torch

def check_module(name):
    try:
        mod = importlib.import_module(name)
        return True, getattr(mod, "__version__", "unknown")
    except Exception as e:
        return False, str(e)

def check_ffmpeg():
    try:
        subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except:
        return False

def main():
    report = {}

    report["torch"] = torch.__version__
    report["cuda_available"] = torch.cuda.is_available()

    modules = [
        "whisper",
        "faster_whisper",
        "whisperx",
        "TTS",
        "transformers",
        "pyannote.audio",
        "speechbrain"
    ]

    for m in modules:
        ok, ver = check_module(m)
        report[m] = {"installed": ok, "version/info": ver}

    report["ffmpeg"] = check_ffmpeg()

    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()
