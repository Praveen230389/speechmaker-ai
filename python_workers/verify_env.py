import os
import shutil
import sys

def check_cuda():
    is_cpu_mode = os.environ.get("CPU_MODE") == "true"
    try:
        import torch
        print(f"PyTorch version: {torch.__version__}")
        if torch.cuda.is_available():
            print(f"CUDA is available: {torch.cuda.get_device_name(0)}")
            print(f"CUDA Version: {torch.version.cuda}")
            t = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            print(f"Total VRAM: {t:.2f} GB")
        else:
            if is_cpu_mode:
                print("CPU_MODE enabled. Skipping CUDA checks.")
            else:
                print("WARNING: CUDA is not available. PyTorch cannot use GPU.")
    except ImportError:
        print("ERROR: torch is not installed.")

def check_ffmpeg():
    if shutil.which("ffmpeg"):
         print("ffmpeg is installed.")
    else:
         print("ERROR: ffmpeg is not installed or not in PATH.")

def check_disk_space(path="."):
    total, used, free = shutil.disk_usage(path)
    free_gb = free / (1024**3)
    print(f"Free disk space on {path}: {free_gb:.2f} GB")
    if free_gb < 10:
         print("WARNING: Less than 10GB free space. Models might fail to download.")

def check_hf_cache():
    hf_cache = os.environ.get("HF_HOME", os.path.expanduser("~/.cache/huggingface"))
    print(f"HuggingFace Cache Path: {hf_cache}")
    if not os.path.exists(hf_cache):
        try:
            os.makedirs(hf_cache, exist_ok=True)
            print("Created HuggingFace cache directory.")
        except Exception as e:
            print(f"ERROR: Cannot create HuggingFace cache directory: {e}")
            return
    if os.access(hf_cache, os.W_OK):
        print("HuggingFace cache directory is writable.")
    else:
        print("ERROR: HuggingFace cache directory is NOT writable.")

if __name__ == "__main__":
    print("--- Environment Verification ---")
    check_cuda()
    check_ffmpeg()
    check_disk_space()
    check_hf_cache()
    print("--------------------------------")
