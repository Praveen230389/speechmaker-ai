# DubStudio Pro - Deployment Guide

This guide covers the deployment of the AI Video Dubbing pipeline on GPU-accelerated cloud instances (RunPod, vast.ai, AWS EC2).

## Hardware Expectations
- **GPU Minimum:** 1x NVIDIA GPU with 8GB VRAM (e.g., RTX 3080/4080, A10g)
- **GPU Recommended:** 16GB+ VRAM (e.g., RTX 4090, A100, RTX 6000 Ada) to avoid Out-Of-Memory (OOM) errors during WhisperX and XTTS load.
- **RAM:** 32GB+ system memory recommended.
- **Disk Space:** 50GB+ minimum free space for models, pip cache, and video processing. (Models take roughly 10-15GB: XTTS v2, WhisperX large-v2, NLLB-200 600M).

### Expected Processing Times (RTX 4090 / A100)
- **WhisperX Extraction:** ~5-10 seconds per minute of audio.
- **NLLB-200 Translation:** ~5 seconds per minute of text.
- **XTTS-v2 Synthesis:** ~30-40 seconds per minute of generated audio.
- **Overall Pipeline:** Expect a 1-minute video to take roughly 1-1.5 minutes to process entirely. Stages process **sequentially** to preserve VRAM.

## Platform Setup

### 1. RunPod or Vast.ai Setup
The easiest method for testing is deploying a PyTorch container on RunPod/vast.ai.
1. Select a secure cloud template like `RunPod PyTorch 2.1` or `Nvidia CUDA 11.8+`.
2. Connect via SSH or Jupyter Lab terminal.
3. Verify CUDA is active using `nvidia-smi`.

### 2. AWS EC2 Setup (G5/G4dn instances)
1. Launch an EC2 instance with GPU (e.g., `g5.xlarge`).
2. Use the **Deep Learning AMI GPU PyTorch** template.
3. SSH into the server and verify CUDA with `nvidia-smi`.

### 3. Basic System Prerequisites
If you are starting from a bare Ubuntu machine:
```bash
# Install ffmpeg and build dependencies
sudo apt update && sudo apt install -y ffmpeg curl nodejs npm
# Ensure Nvidia drivers and Container Toolkit are installed if you plan to use Docker
```

## First-Run Execution Order

To run the pipeline deterministically and verify models are fetched, follow the strict order:

**1. Clone and Install Dependencies:**
```bash
npm install
pip install -r requirements.txt
```
*(Make sure `--extra-index-url https://download.pytorch.org/whl/cu118` succeeds for PyTorch)*

**2. Verify Environment Constraints:**
```bash
python3 python_workers/verify_env.py
```
This script checks CUDA, PyTorch, disk space, and `ffmpeg` presence.

**3. Model Warmup / Download:**
Downloading the offline models during the first API request is guaranteed to cause timeouts. Preload them first:
```bash
npm run warmup
```
*(Wait until WhisperX and XTTS-v2 models are successfully downloaded into `~/.cache/huggingface`)*

**4. CLI Pipeline Validation:**
Before relying on Express or React orchestration, test the Python scripts independently:
```bash
chmod +x test_pipeline.sh
./test_pipeline.sh path/to/your/sample_video.mp4
```

**5. Launch Full Stack Server:**
```bash
npm run build
npm start
```
Go to `http://<INSTANCE_IP>:3000` to access the frontend.

## Sample Assets

We provide sample test data to help mimic real backend states without processing large videos.
Check the `test_assets/` folder to run pipeline tests independently:
- `test_assets/sample_transcript.json` -> Run NLLB directly.
- `test_assets/sample_translated.json` -> Run XTTS directly.

## Health API

The backend has an automated health endpoint. Always hit it upon boot.
`GET http://localhost:3000/api/health`
Expected response:
```json
{
  "status": "ok",
  "checks": {
    "gpu": "connected",
    "ffmpeg": "installed",
    "diskSpace": "healthy (>10GB)"
  }
}
```

## Known Failure Modes

1. **Torch OOM (CUDA Out of Memory)**
   * **Why:** You triggered WhisperX and XTTS-v2 concurrently or leaked VRAM.
   * **Fix:** The app now strictly runs stages sequentially and executes `torch.cuda.empty_cache()`. Do NOT run parallel dub requests on low-RAM GPUs.
2. **Missing `ffmpeg` codecs**
   * **Why:** The system OS `ffmpeg` lacks `libx264` or `aac` formatters.
   * **Fix:** Install `ffmpeg` via package manager correctly instead of pip (e.g., `apt install ffmpeg`).
3. **NLLB / Transformer Issues**
   * **Why:** Sometimes `sentencepiece` or `protobuf` mismatches cause tokenizer crash.
   * **Fix:** Verify `pip install sentencepiece transformers`.
4. **HuggingFace Gate Errors**
   * **Why:** Some models require accepting terms, but XTTS and NLLB used here are open. If cache paths lack write permission, downloads fail.
   * **Fix:** `export HF_HOME=/writable/path/cache` in your `.env`.
5. **XTTS Voice Cloning Noise**
   * **Why:** The reference audio extracted from original video has background music or noise.
   * **Fix:** Currently unhandled. (Roadmap: Demucs isolation before passing to XTTS).
