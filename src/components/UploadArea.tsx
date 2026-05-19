import React, { useRef } from "react";
import { UploadCloud, FileVideo, Youtube, Link } from "lucide-react";

interface UploadAreaProps {
  file: File | null;
  setFile: (file: File | null) => void;
  status: string;
}

export function UploadArea({ file, setFile, status }: UploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile.type.startsWith("video/") ||
        droppedFile.type.startsWith("audio/")
      ) {
        setFile(droppedFile);
      }
    }
  };

  if (status !== "idle" && status !== "error") return null;

  return (
    <div className="space-y-6">
      <div
        className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer backdrop-blur-sm ${
          file
            ? "border-fuchsia-500 bg-fuchsia-500/10 shadow-[0_0_30px_rgba(217,70,239,0.15)]"
            : "border-white/20 hover:bg-white/5 hover:border-white/30 bg-black/20"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="video/*,audio/*"
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files?.[0]) setFile(e.target.files[0]);
          }}
        />
        {file ? (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <div className="bg-fuchsia-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.3)]">
              <FileVideo className="w-8 h-8 text-fuchsia-400" />
            </div>
            <p className="text-xl font-medium text-white">{file.name}</p>
            <p className="text-sm text-fuchsia-300 mt-2 font-mono">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="bg-white/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-xl font-medium text-white">
              Drag & drop your media
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Supports MP4, WebM, MOV, MP3, WAV
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Chunked Uploads Enabled • Up to 2GB per file
            </p>
          </div>
        )}
      </div>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-white/10"></div>
        <span className="flex-shrink-0 mx-4 text-slate-500 text-sm font-medium uppercase tracking-wider">
          or import from url
        </span>
        <div className="flex-grow border-t border-white/10"></div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Link className="h-5 w-5 text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Paste YouTube or Google Drive URL (Coming soon)"
            className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl leading-5 bg-black/40 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 sm:text-sm transition-shadow disabled:opacity-50"
            disabled
          />
        </div>
        <button
          disabled
          className="px-6 py-3 border border-white/10 rounded-xl text-sm font-medium bg-white/5 text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          <Youtube className="w-4 h-4 text-red-500" />
          Import
        </button>
      </div>
    </div>
  );
}
