import os
import subprocess
import json
import importlib
import torch


def run_cmd(cmd):
    try:
        out = subprocess.check_output(cmd, stderr=subprocess.STDOUT)
        return out.decode()
    except Exception as e:
        return str(e)


def check_python_module(name):
    try:
        mod = importlib.import_module(name)
        version = getattr(mod, "__version__", "unknown")
        return {"installed": True, "version": version}
    except Exception as e:
        return {"installed": False, "error": str(e)}


def check_ffmpeg():
    return run_cmd(["ffmpeg", "-version"]).split("\n")[0]


def check_gpu():
    return {
        "cuda_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
    }


def test_whisper():
    try:
        import whisper
        model = whisper.load_model("base")
        return {"whisper": "loaded OK"}
    except Exception as e:
        return {"whisper": str(e)}


def test_faster_whisper():
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel("base")
        return {"faster_whisper": "loaded OK"}
    except Exception as e:
        return {"faster_whisper": str(e)}


def test_tts():
    try:
        import TTS
        return {"TTS": "installed OK"}
    except Exception as e:
        return {"TTS": str(e)}


def test_transformers():
    try:
        import transformers
        return {"transformers": transformers.__version__}
    except Exception as e:
        return {"transformers": str(e)}


def main():
    report = {}

    report["gpu"] = check_gpu()
    report["ffmpeg"] = check_ffmpeg()

    report["modules"] = {
        "whisper": check_python_module("whisper"),
        "faster_whisper": check_python_module("faster_whisper"),
        "TTS": check_python_module("TTS"),
        "transformers": check_python_module("transformers"),
        "torch": check_python_module("torch"),
        "pyannote": check_python_module("pyannote.audio"),
        "speechbrain": check_python_module("speechbrain"),
    }

    report["runtime_tests"] = {
        "whisper": test_whisper(),
        "faster_whisper": test_faster_whisper(),
        "TTS": test_tts(),
        "transformers": test_transformers(),
    }

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
