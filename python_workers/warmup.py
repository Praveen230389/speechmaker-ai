import torch
import os

def warmup_whisperx():
    try:
        import whisperx
        is_cpu_mode = os.environ.get("CPU_MODE") == "true"
        model_size = "tiny" if is_cpu_mode else "large-v2"
        print(f"Downloading/Loading WhisperX {model_size}...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        compute_type = "float16" if device == "cuda" else "int8"
        model = whisperx.load_model(model_size, device, compute_type=compute_type)
        print("WhisperX loaded successfully.")
        del model
        torch.cuda.empty_cache()
    except Exception as e:
        print(f"WhisperX warmup failed: {e}")

def warmup_xtts():
    if os.environ.get("CPU_MODE") == "true":
        print("CPU_MODE enabled. Skipping XTTS warmup to save time.")
        return
    try:
        from TTS.api import TTS
        print("Downloading/Loading XTTS-v2...")
        # Will download the model to the huggingface cache
        tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        print("XTTS-v2 loaded successfully.")
        del tts
        torch.cuda.empty_cache()
    except Exception as e:
        print(f"XTTS warmup failed: {e}")

if __name__ == "__main__":
    print("--- Starting Models Warmup ---")
    warmup_whisperx()
    warmup_xtts()
    print("--- Models Warmup Complete ---")
