/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect } from "react";
import { Play, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { UploadArea } from "./components/UploadArea";
import { ConfigurationPanel } from "./components/ConfigurationPanel";
import { ProgressPanel } from "./components/ProgressPanel";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("hi");
  
  // Voice clone state lifted
  const [voiceTab, setVoiceTab] = useState<"presets" | "custom">("presets");
  const [presetMode, setPresetMode] = useState<"clone" | "library">("clone");
  const [presetVoice, setPresetVoice] = useState("Claribel Dervla");
  const [customVoiceFile, setCustomVoiceFile] = useState<File | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "processing" | "completed" | "error"
  >("idle");
  const [progressMsg, setProgressMsg] = useState("");
  const [metrics, setMetrics] = useState<Record<string, string>>({});

  // Poll job status
  useEffect(() => {
    if (!jobId || status === "completed" || status === "error") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        if (!res.ok) throw new Error("Status check failed");
        const data = await res.json();

        setStatus(data.status);
        setProgressMsg(data.progress);
        if (data.metrics) setMetrics(data.metrics);

        if (data.status === "completed" || data.status === "error") {
          if (data.error) setProgressMsg(`Error: ${data.error}`);
          clearInterval(interval);
        }
      } catch (err) {
        console.error(err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, status]);

  const handleUpload = async () => {
    if (!file) return;

    setStatus("processing");
    setProgressMsg("Requesting upload URL...");
    setMetrics({});

    try {
      // 1. Get Presigned URL
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "video/mp4",
        }),
      });
      const { uploadUrl, fileId, key, mode } = await presignRes.json();

      if (!uploadUrl) throw new Error("Failed to get upload URL");

      setProgressMsg(
        `Uploading to storage (${mode === "s3" ? "Cloudflare R2/S3" : "Local Fallback"})...`,
      );

      // 2. Upload file to storage
      await fetch(uploadUrl, {
        method: "PUT",
        headers:
          mode === "s3" ? { "Content-Type": file.type || "video/mp4" } : {},
        body: file,
      });

      // Optional: upload custom voice file here if custom voice is selected,
      // for now, we just pass the info to the backend.
      let customVoiceKey = null;
      if (voiceTab === "custom" && customVoiceFile) {
        setProgressMsg("Uploading custom voice reference...");
        const vPresignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: customVoiceFile.name,
            contentType: customVoiceFile.type || "audio/mpeg",
          }),
        });
        const vUploadInfo = await vPresignRes.json();
        await fetch(vUploadInfo.uploadUrl, {
          method: "PUT",
          headers: mode === "s3" ? { "Content-Type": customVoiceFile.type || "audio/mpeg" } : {},
          body: customVoiceFile,
        });
        customVoiceKey = vUploadInfo.key;
      }

      // 3. Start Dubbing Job
      setProgressMsg("Upload complete. Scheduling job...");
      const startRes = await fetch("/api/dub/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          key,
          sourceLang,
          targetLang,
          mode,
          voiceSettings: {
            mode: voiceTab === "custom" ? "custom" : presetMode,
            presetVoice: presetMode === "library" ? presetVoice : null,
            customVoiceKey: customVoiceKey
          }
        }),
      });

      const { jobId: newJobId, error } = await startRes.json();
      if (error) throw new Error(error);

      setJobId(newJobId);
    } catch (error: any) {
      console.error(error);
      setStatus("error");
      setProgressMsg(error.message || "Failed to upload video");
    }
  };

  const reset = () => {
    setStatus("idle");
    setJobId(null);
    setFile(null);
    setProgressMsg("");
    setMetrics({});
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-slate-200 font-sans selection:bg-fuchsia-500/30 selection:text-fuchsia-200 overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-fuchsia-600/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      {/* Top Navbar */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-fuchsia-900/20">
              D
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              DubStudio <span className="font-light text-fuchsia-400">Pro</span>
            </span>
            <span className="bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ml-2">
              v2.0
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <a
              href="#"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Docs
            </a>
            <div className="w-px h-4 bg-white/10"></div>
            <a
              href="/api/health"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 hover:bg-white/5 px-3 py-1.5 rounded-full transition-all border border-white/5"
              title="View System Health JSON"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
              <span className="text-slate-300">GPU Online</span>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 flex flex-col lg:flex-row gap-8 items-start relative z-10 pb-24">
        <AnimatePresence mode="wait">
          {status === "idle" ? (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full lg:w-2/3 space-y-6 flex-shrink-0"
            >
              {/* Header Title Space */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Configure Dubbing Pipeline</h1>
                <p className="text-slate-400">Upload media and fine-tune AI translation, voice cloning, and audio mechanics.</p>
              </div>

              <UploadArea file={file} setFile={setFile} status={status} />
              
              <ConfigurationPanel
                sourceLang={sourceLang}
                setSourceLang={setSourceLang}
                targetLang={targetLang}
                setTargetLang={setTargetLang}
                voiceTab={voiceTab}
                setVoiceTab={setVoiceTab}
                presetMode={presetMode}
                setPresetMode={setPresetMode}
                presetVoice={presetVoice}
                setPresetVoice={setPresetVoice}
                customVoiceFile={customVoiceFile}
                setCustomVoiceFile={setCustomVoiceFile}
              />

              <div className="pt-6">
                <button
                  onClick={handleUpload}
                  disabled={!file}
                  className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-2xl font-semibold tracking-wide transition-all shadow-lg hover:shadow-fuchsia-900/20 flex items-center justify-center gap-3 text-lg"
                >
                  <Play className="w-5 h-5 fill-current" />
                  {file ? "Initialize Processing Pipeline" : "Awaiting Media Upload"}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="progress"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full lg:w-3/4 mx-auto max-w-4xl"
            >
              <ProgressPanel
                status={status}
                progressMsg={progressMsg}
                jobId={jobId}
                metrics={metrics}
                reset={reset}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Column: Information Panel (Only in idle) */}
        {status === "idle" && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full lg:w-1/3 space-y-6 hidden lg:block sticky top-24"
          >
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4 text-fuchsia-400" />
                Pipeline Architecture
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                DubStudio orchestrates 4 deep learning models continuously to produce synchronous AI dubs.
              </p>
              <ol className="text-sm text-slate-300 space-y-4 font-medium">
                <li className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs shrink-0 text-fuchsia-400">1</div>
                  <span><strong className="text-white block">WhisperX</strong> precise word-level alignment & transcription</span>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs shrink-0 text-fuchsia-400">2</div>
                  <span><strong className="text-white block">NLLB-200</strong> robust multilingual translation</span>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs shrink-0 text-fuchsia-400">3</div>
                  <span><strong className="text-white block">XTTS-v2</strong> contextual voice cloning & generation</span>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs shrink-0 text-fuchsia-400">4</div>
                  <span><strong className="text-white block">FFmpeg + Pydub</strong> dynamic tempo-sync & compositing</span>
                </li>
              </ol>
            </div>

            <div className="bg-black/20 border border-white/5 rounded-2xl p-6">
              <h4 className="font-semibold text-white mb-3 text-sm flex justify-between items-center">
                System Status
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">ALL NOMINAL</span>
              </h4>
              <div className="space-y-3 text-sm text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Engine Runtime</span>
                  <span className="font-mono text-slate-200 text-xs">PyTorch CUDA 12.1</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>VRAM Allocation</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="w-3/4 h-full bg-indigo-500"></div>
                    </div>
                    <span className="font-mono text-slate-200 text-xs">~18GB</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

