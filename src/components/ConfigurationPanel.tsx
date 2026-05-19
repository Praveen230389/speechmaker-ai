import React from "react";
import {
  Globe,
  Mic,
  Settings,
  Layers,
  Zap,
  Clock,
  Type,
  ShieldAlert,
  Sliders,
  Volume2,
  FileDown,
  Cpu,
} from "lucide-react";

interface ConfigurationProps {
  sourceLang: string;
  setSourceLang: (val: string) => void;
  targetLang: string;
  setTargetLang: (val: string) => void;
  voiceTab: "presets" | "custom";
  setVoiceTab: (val: "presets" | "custom") => void;
  presetMode: "clone" | "library";
  setPresetMode: (val: "clone" | "library") => void;
  presetVoice: string;
  setPresetVoice: (val: string) => void;
  customVoiceFile: File | null;
  setCustomVoiceFile: (val: File | null) => void;
}

export function ConfigurationPanel({
  sourceLang,
  setSourceLang,
  targetLang,
  setTargetLang,
  voiceTab,
  setVoiceTab,
  presetMode,
  setPresetMode,
  presetVoice,
  setPresetVoice,
  customVoiceFile,
  setCustomVoiceFile,
}: ConfigurationProps) {

  return (
    <div className="space-y-8">
      {/* LANGUAGE OPTIONS */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-400" />
          Translation & Language
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-6 rounded-2xl border border-white/10 shadow-sm backdrop-blur-sm">
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300 flex justify-between">
              Source Language
              <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 rounded-full flex items-center">
                Auto-detect available
              </span>
            </label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
            >
              <option value="auto">Auto-Detect Language</option>
              <option value="en">English (US/UK)</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="hi">Hindi</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
              <option value="zh">Mandarin</option>
              <option value="ru">Russian</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300">
              Target Language (Dub)
            </label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-fuchsia-500 outline-none transition-shadow border-l-4 border-l-fuchsia-500"
            >
              <option value="en">English (US/UK)</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="hi">Hindi</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
              <option value="zh">Mandarin</option>
              <option value="ru">Russian</option>
            </select>
          </div>

          <div className="md:col-span-2 pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-400">
                Translation Engine:{" "}
              </span>
              <span className="text-sm font-medium text-slate-200">
                NLLB-200 (600M Distilled)
              </span>
            </div>
            <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
              <button className="px-3 py-1 text-xs font-medium rounded-md bg-white/10 text-white shadow-sm filter drop-shadow-sm">
                Natural Flow
              </button>
              <button
                className="px-3 py-1 text-xs font-medium rounded-md text-slate-400 hover:text-white transition"
              >
                Literal Translation
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* VOICE OPTIONS */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Mic className="w-5 h-5 text-fuchsia-400" />
          Voice Profiles (XTTS-v2 Engine)
        </h3>

        <div className="bg-white/5 rounded-2xl border border-white/10 shadow-sm overflow-hidden backdrop-blur-sm">
          {/* Tabs header */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setVoiceTab("presets")}
              className={`flex-1 py-3 px-4 text-sm font-medium text-center transition-colors ${
                voiceTab === "presets"
                  ? "bg-fuchsia-500/10 text-fuchsia-300 border-b-2 border-fuchsia-500"
                  : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              Available Voices & Presets
            </button>
            <button
              onClick={() => setVoiceTab("custom")}
              className={`flex-1 py-3 px-4 text-sm font-medium text-center transition-colors ${
                voiceTab === "custom"
                  ? "bg-fuchsia-500/10 text-fuchsia-300 border-b-2 border-fuchsia-500"
                  : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              Upload Custom Voice (Clone)
            </button>
          </div>

          {/* Tabs content */}
          <div className="p-6">
            {voiceTab === "presets" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className={`relative flex cursor-pointer rounded-2xl border p-4 focus:outline-none transition-colors ${presetMode === "clone" ? "border-fuchsia-500 bg-fuchsia-500/10" : "border-white/10 bg-black/20 hover:border-white/30"}`}>
                    <input
                      type="radio"
                      name="voice_mode"
                      value="clone"
                      className="sr-only"
                      checked={presetMode === "clone"}
                      onChange={() => setPresetMode("clone")}
                    />
                    <span className="flex flex-col">
                      <span className={`block text-sm font-semibold ${presetMode === "clone" ? "text-white" : "text-slate-300"}`}>
                        Clone Original Speaker
                      </span>
                      <span className={`mt-1 flex items-center text-xs ${presetMode === "clone" ? "text-fuchsia-300" : "text-slate-500"}`}>
                        Extracts voice from your uploaded video automatically
                      </span>
                    </span>
                    {presetMode === "clone" && <CheckIcon className="absolute top-4 right-4 h-5 w-5 text-fuchsia-400" />}
                  </label>

                  <label className={`relative flex cursor-pointer rounded-2xl border p-4 focus:outline-none transition-colors ${presetMode === "library" ? "border-fuchsia-500 bg-fuchsia-500/10" : "border-white/10 bg-black/20 hover:border-white/30"}`}>
                    <input
                      type="radio"
                      name="voice_mode"
                      value="library"
                      className="sr-only"
                      checked={presetMode === "library"}
                      onChange={() => setPresetMode("library")}
                    />
                    <span className="flex flex-col">
                      <span className={`block text-sm font-semibold ${presetMode === "library" ? "text-white" : "text-slate-300"}`}>
                        Choose From Library
                      </span>
                      <span className={`mt-1 flex items-center text-xs ${presetMode === "library" ? "text-fuchsia-300" : "text-slate-500"}`}>
                        Select an existing XTTS-v2 narrator voice
                      </span>
                    </span>
                    {presetMode === "library" && <CheckIcon className="absolute top-4 right-4 h-5 w-5 text-fuchsia-400" />}
                  </label>
                </div>

                <div className={`bg-black/40 p-4 rounded-xl border border-white/5 transition-opacity ${presetMode === "clone" ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
                  <label className="text-sm font-medium text-slate-400 block mb-2">Available Studio Voices</label>
                  <select 
                    disabled={presetMode === "clone"}
                    value={presetVoice}
                    onChange={(e) => setPresetVoice(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-fuchsia-500 outline-none transition-shadow"
                  >
                    <optgroup label="Female Voices">
                      <option value="Claribel Dervla">Claribel Dervla (Calm & Professional)</option>
                      <option value="Daisy Studious">Daisy Studious (Energetic)</option>
                      <option value="Gracie Wise">Gracie Wise (Storyteller)</option>
                      <option value="Tammie Ema">Tammie Ema (Warm & Friendly)</option>
                      <option value="Alison Dietlinde">Alison Dietlinde (Authoritative)</option>
                      <option value="Ana Florence">Ana Florence (Youthful)</option>
                    </optgroup>
                    <optgroup label="Male Voices">
                      <option value="Royston Min">Royston Min (Deep & Cinematic)</option>
                      <option value="Jared Dunn">Jared Dunn (Corporate)</option>
                      <option value="Marcus Spark">Marcus Spark (Energetic)</option>
                      <option value="Luis Moray">Luis Moray (Casual & Friendly)</option>
                      <option value="Craig Lukas">Craig Lukas (Documentary)</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/20 rounded-xl bg-black/20 hover:bg-black/40 transition-colors">
                <div className="bg-white/5 p-3 rounded-full shadow-sm mb-4">
                  <Mic className="w-8 h-8 text-fuchsia-400" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  Upload Custom Reference Audio
                </h4>
                <p className="text-xs text-slate-400 mb-4 text-center max-w-md">
                  Upload a 10 to 30 second clear audio clip of the target voice. No background music or noise. English samples work best.
                </p>
                {customVoiceFile ? (
                  <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-300 px-4 py-2 rounded-lg text-sm font-medium border border-emerald-500/20">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    {customVoiceFile.name}
                    <button 
                      onClick={() => setCustomVoiceFile(null)} 
                      className="ml-2 text-emerald-400 hover:text-emerald-200 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 bg-fuchsia-600 text-white rounded-lg text-sm font-medium hover:bg-fuchsia-500 transition">
                    <input 
                      type="file" 
                      accept="audio/*" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setCustomVoiceFile(e.target.files[0]);
                        }
                      }}
                    />
                    Select Audio File
                  </label>
                )}
                <div className="mt-4 flex gap-2">
                   <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">Supports WAV, MP3</span>
                   <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">Max size 5MB</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* AUDIO & SUBTITLE CONTROLS GRID */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            Audio Controls
          </h3>
          <div className="bg-white/5 rounded-2xl border border-white/10 shadow-sm flex flex-col p-6 space-y-6 backdrop-blur-sm">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-300">Voice Speed</span>
                <span className="text-fuchsia-400">1.0x</span>
              </div>
              <input type="range" className="w-full accent-fuchsia-500" min="0.5" max="2" step="0.1" defaultValue="1" />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-300">Emotion / Energy Level</span>
                <span className="text-fuchsia-400">Neutral</span>
              </div>
              <input type="range" className="w-full accent-fuchsia-500" min="0" max="100" defaultValue="50" />
            </div>
            
             <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-sm">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="font-medium text-slate-300">Preserve Background Audio</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Type className="w-5 h-5 text-amber-400" />
            Subtitle Controls
          </h3>
          <div className="bg-white/5 rounded-2xl border border-white/10 shadow-sm flex flex-col p-6 space-y-6 backdrop-blur-sm">
             <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="block font-medium text-slate-300">Burn Subtitles</span>
                <span className="block text-slate-500 text-xs mt-1">Embed directly into video</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="block font-medium text-slate-300">Dual Subtitles</span>
                <span className="block text-slate-500 text-xs mt-1">Show Source + Target</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            
            <div className="pt-4 border-t border-white/10">
               <button className="flex items-center gap-2 text-sm text-amber-400 font-medium hover:text-amber-300 transition">
                 <FileDown className="w-4 h-4" /> Download Example SRT Layout
               </button>
            </div>
          </div>
        </div>
      </section>

      {/* PIPELINE MECHANICS OPTIONS */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Processing Controls
          </h3>
          <div className="flex bg-black/40 border border-white/10 p-1 rounded-lg">
              <button className="px-3 py-1 flex items-center gap-1.5 text-xs font-semibold rounded-md bg-white/10 text-white shadow-sm filter drop-shadow-sm">
                <Cpu className="w-3.5 h-3.5" /> CPU Mode
              </button>
              <button
                className="px-3 py-1 flex items-center gap-1.5 text-xs font-medium rounded-md text-slate-400 hover:text-white transition"
              >
                <Zap className="w-3.5 h-3.5" /> GPU Accelerated
              </button>
            </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-sm divide-y divide-white/5">
          <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex items-start gap-4">
              <div className="bg-black/40 border border-white/5 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-200">
                  Strict Audio Alignment (Pydub)
                </h4>
                <p className="text-sm text-slate-400">
                  Matches the exact duration of original speech segments by stretching/shrinking
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
            </label>
          </div>
          
           <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex items-start gap-4">
              <div className="bg-black/40 border border-white/5 p-2 rounded-lg">
                <Volume2 className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-200">
                  Audio Normalization
                </h4>
                <p className="text-sm text-slate-400">
                  Normalize volume output to -14 LUFS (streaming standard)
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
            </label>
          </div>

        </div>
      </section>
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx={12} cy={12} r={12} fill="currentColor" opacity="0.2" />
      <path
        d="M7 13l3 3 7-7"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
