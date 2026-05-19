# AI Video Dubbing Pipeline

This project contains a full Full-Stack React + Express orchestration system that connects your cloned repositories and creates a seamless end-to-end Video Dubbing Pipeline.

## Architecture Steps Implemented

The Express server (`server.ts`) exposes three endpoints for the UI:
1. `POST /api/dub` - Starts a background dubbing job.
2. `GET /api/status/:jobId` - Polled by UI to retrieve the current status step.
3. `GET /api/download/:jobId` - Pulls the final output MP4.

The orchestrator currently drives these phases in a job queue:
1. **Extraction:** `ffmpeg` to pull `.wav` audio.
2. **Transcription:** Invokes `run_whisperx.py` to get words & timestamps.
3. **Translation:** Intended to hit an LLM API (like Gemini or OpenAI) to translate the transcript JSON while preserving object structures.
4. **Dubbing:** Invokes `run_xtts.py` providing the target language, reference audio (extracted in step 1) and translated transcript.
5. **Alignment:** Invokes `run_pydub.py` to time-stretch or pad the TTS audio to match original time slots.
6. **Merging:** `ffmpeg` merges the new synchronized audio back onto the original visual track.

## Production (GPU) Setup

Once you deploy this to an environment with a GPU (e.g. AWS or RunPod):
1. Install Python dependencies (`pip install whisperx TTS pydub`).
2. Open `server.ts` and uncomment the actual `python3 scripts/...` invocations under `# --- MOCK PIPELINE ---`.
3. Start the node server (`npm run build && npm run start`).

## Technologies Used
- **Frontend**: React + Tailwind + Vite
- **Backend**: Express + Multer (Video handling) + fluent-ffmpeg
- **Python Bridge**: Standard `child_process.exec` wrappers.
