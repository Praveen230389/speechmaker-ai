import React, { useState, useEffect } from "react";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  FileJson,
  FileText,
  Cpu,
  Server,
  XCircle,
  Terminal,
  FileDown,
  Activity,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProgressPanelProps {
  status: "idle" | "processing" | "completed" | "error";
  progressMsg: string;
  jobId: string | null;
  metrics?: Record<string, string>;
  reset: () => void;
}

export function ProgressPanel({
  status,
  progressMsg,
  jobId,
  metrics,
  reset,
}: ProgressPanelProps) {
  const [activeTab, setActiveTab] = useState<"pipeline" | "logs">("pipeline");
  const [logs, setLogs] = useState<string>("Loading logs...");
  const [aborting, setAborting] = useState(false);

  useEffect(() => {
    let interval: any;
    if (activeTab === "logs" && jobId && status !== "idle") {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/logs/${jobId}`);
          if (res.ok) {
            const text = await res.text();
            setLogs(text || "No logs yet...");
          }
        } catch (e) {}
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [activeTab, jobId, status]);

  const handleAbort = async () => {
    if (!jobId) return;
    setAborting(true);
    try {
      await fetch(`/api/dub/cancel/${jobId}`, { method: "POST" });
    } catch (e) {
      console.error(e);
    } finally {
      setAborting(false);
    }
  };

  if (status === "idle") return null;

  // Derive visual stage based on progress message matching server.ts progress messages
  let currentStage = 0;
  if (progressMsg.includes("Extracting") || progressMsg.includes("Uploaded"))
    currentStage = 1;
  else if (progressMsg.includes("Whisper"))
    currentStage = 2; // Matches both Whisper and WhisperX
  else if (progressMsg.includes("Translating")) currentStage = 3;
  else if (progressMsg.includes("AI Voices") || progressMsg.includes("XTTS"))
    currentStage = 4;
  else if (progressMsg.includes("Aligning")) currentStage = 5;
  else if (progressMsg.includes("Merging")) currentStage = 6;
  else if (status === "completed") currentStage = 8;
  else if (progressMsg.includes("Cancelled")) currentStage = 0; // Cancelled

  const stages = [
    "Upload & Init",
    "Audio Extraction (FFmpeg)",
    "Transcription & Sync (Whisper)",
    "Translation (NLLB-200)",
    "Voice Cloning (XTTS-v2)",
    "Audio Alignment (Pydub)",
    "Video Assembly",
  ];

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl shadow-indigo-900/10 border border-white/10 overflow-hidden flex flex-col mt-8">
      <div className="bg-black/40 border-b border-white/10 px-6 py-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            {status === "processing" && (
              <Loader2 className="w-5 h-5 text-fuchsia-400 animate-spin" />
            )}
            {status === "completed" && (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            )}
            {status === "error" && (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            Job Status: {status.charAt(0).toUpperCase() + status.slice(1)}
          </h3>
          {jobId && (
            <p className="text-xs text-slate-400 font-mono mt-1">ID: {jobId}</p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {status === "processing" && (
            <button
              onClick={handleAbort}
              disabled={aborting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs font-medium text-red-400 transition"
            >
              {aborting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              Abort
            </button>
          )}
          <div className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs font-medium text-indigo-300">
            <Server className="w-3.5 h-3.5" />
            GPU Worker Cluster
          </div>
        </div>
      </div>

      <div className="border-b border-white/10 flex px-4 bg-black/20">
        <button
          className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "pipeline" ? "border-fuchsia-500 text-fuchsia-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          onClick={() => setActiveTab("pipeline")}
        >
          Pipeline Visualization
        </button>
        <button
          className={`px-4 py-4 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "logs" ? "border-fuchsia-500 text-fuchsia-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          onClick={() => setActiveTab("logs")}
        >
          <Terminal className="w-4 h-4" /> Live Execution Logs
        </button>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === "logs" ? (
            <motion.div 
              key="logs"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-black/80 rounded-xl overflow-hidden border border-white/5 relative"
            >
              <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />
              <div className="max-h-96 overflow-y-auto p-4 pt-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap leading-relaxed">
                  {logs}
                </pre>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
            </motion.div>
          ) : status === "error" ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 text-red-200 p-6 rounded-xl border border-red-500/20"
            >
              <h4 className="font-bold flex items-center gap-2 mb-3 text-red-400 text-lg">
                <AlertCircle className="w-6 h-6" /> Pipeline Failed / Cancelled
              </h4>
              <p className="font-mono text-sm bg-black/40 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap text-red-300/80 border border-red-500/10">
                {progressMsg}
              </p>
              <button
                onClick={reset}
                className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                Reset & Try Again
              </button>
            </motion.div>
          ) : (
            <motion.div key="pipeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="bg-black/40 p-5 rounded-2xl border border-white/5flex items-center gap-4">
                <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden flex-shrink-0">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 transition-all duration-700 ease-out"
                    style={{
                      width: `${status === 'error' ? 100 : Math.min(100, Math.max(5, (currentStage / stages.length) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-bold text-fuchsia-400 w-12 text-right">
                  {Math.round((currentStage / stages.length) * 100)}%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Operations Graph
                  </h4>
                  <div className="space-y-5 px-2">
                    {stages.map((stage, i) => {
                      const isActive = currentStage === i + 1;
                      const isDone = currentStage > i + 1 || status === "completed";

                      return (
                        <div
                          key={i}
                          className={`flex items-start gap-4 transition-all duration-300 ${isActive ? "opacity-100 scale-105 transform origin-left" : isDone ? "opacity-60" : "opacity-30"}`}
                        >
                          <div
                            className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0 shadow-lg ${
                              isDone
                                ? "bg-emerald-500 border-emerald-500 shadow-emerald-500/20"
                                : isActive
                                  ? "border-fuchsia-500 text-fuchsia-400 shadow-fuchsia-500/20"
                                  : "border-white/20"
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle className="w-4 h-4 text-white" />
                            ) : isActive ? (
                              <div className="w-2.5 h-2.5 bg-fuchsia-500 rounded-full animate-ping" />
                            ) : null}
                          </div>
                          <div>
                            <p
                              className={`text-sm font-semibold ${isActive ? "text-fuchsia-300" : "text-slate-300"}`}
                            >
                              {stage}
                            </p>
                            {isActive && (
                              <p className="text-xs text-indigo-300 mt-1.5 font-mono bg-black/40 px-2 py-1 rounded inline-block">
                                {progressMsg}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Cpu className="w-4 h-4" /> Worker Telemetry
                    </h4>
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-5">
                      {metrics && Object.keys(metrics).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(metrics).map(([key, val]) => (
                            <div
                              key={key}
                              className="flex justify-between text-sm items-center border-b border-white/5 pb-2 last:border-0 last:pb-0"
                            >
                              <span className="text-slate-400 capitalize flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-indigo-400/70" /> {key}
                              </span>
                              <span className="font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                {val}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-32 flex items-center justify-center">
                           <p className="text-sm text-slate-500 italic text-center flex flex-col items-center gap-2">
                             <Loader2 className="w-4 h-4 animate-spin opacity-50" />
                             Metrics will appear as stages complete...
                           </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {status === "completed" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                        Artifacts
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <a
                          href={`/api/download/${jobId}`}
                          className="flex flex-col items-center gap-3 justify-center p-5 bg-gradient-to-br from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white rounded-2xl transition-all col-span-2 shadow-lg shadow-fuchsia-900/20 group"
                        >
                          <Download className="w-7 h-7 animate-bounce group-hover:animate-none group-hover:scale-110 transition-transform" />
                          <span className="font-bold tracking-wide">
                            Download Dubbed Media
                          </span>
                        </a>
                        <button
                          className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors rounded-xl text-xs font-semibold shadow-sm"
                        >
                          <FileJson className="w-4 h-4 text-amber-400" /> Transcripts
                        </button>
                        <button
                          className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors rounded-xl text-xs font-semibold shadow-sm"
                        >
                          <FileText className="w-4 h-4 text-emerald-400" /> Subtitles
                        </button>
                        <button
                          className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors rounded-xl text-xs font-semibold shadow-sm col-span-2"
                        >
                          <FileDown className="w-4 h-4 text-indigo-400" /> Extracted Audio Core
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
