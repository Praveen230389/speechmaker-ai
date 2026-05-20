import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import cors from "cors";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import axios from "axios";

dotenv.config();

const execPromise = promisify(exec);

const getPythonBin = () => {
  const venvPath = path.join(process.cwd(), "venv", "bin", "python");
  return fs.existsSync(venvPath) ? venvPath : "python3";
};

// We will track active processes so they can be aborted
const activeProcesses: Record<string, ReturnType<typeof spawn>> = {};

const runWorker = (
  jobId: string,
  cmd: string,
  args: string[],
  logFile: string,
) => {
  return new Promise<void>((resolve, reject) => {
    const outStream = fs.createWriteStream(logFile, { flags: "a" });
    const process = spawn(cmd, args);

    activeProcesses[jobId] = process;

    process.stdout.pipe(outStream);
    process.stderr.pipe(outStream);

    process.on("close", (code) => {
      delete activeProcesses[jobId];
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `Process failed with code ${code}. Check ${logFile} for details.`,
          ),
        );
    });
    process.on("error", (err) => {
      delete activeProcesses[jobId];
      reject(err);
    });
  });
};

// Object Storage Config
const USE_S3 = !!process.env.S3_BUCKET_NAME;
const s3Client = USE_S3
  ? new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      },
    })
  : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Setup file directories
  const uploadDir = path.join(process.cwd(), "uploads");
  const tempDir = path.join(process.cwd(), "temp");
  const outputDir = path.join(process.cwd(), "outputs");
  const logsDir = path.join(process.cwd(), "logs");

  [uploadDir, tempDir, outputDir, logsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const jobs: Record<
    string,
    {
      status: "processing" | "completed" | "error";
      progress: string;
      outputFile?: string;
      outputUrl?: string;
      error?: string;
      metrics?: Record<string, string>;
    }
  > = {};

  app.get("/api/health", async (req, res) => {
    try {
      let gpuAvailable = false;
      let ffmpegAvailable = false;
      let diskSpaceOk = false;

      try {
        const { stdout } = await execPromise(
          'python3 -c "import torch; print(torch.cuda.is_available())"',
        );
        gpuAvailable = stdout.trim() === "True";
      } catch (e) {}

      try {
        const { stdout } = await execPromise("ffmpeg -version");
        ffmpegAvailable = stdout.toLowerCase().includes("ffmpeg");
      } catch (e) {}

      try {
        const { stdout } = await execPromise(
          "df -k . | awk 'NR==2 {print $4}'",
        );
        const freeKb = parseInt(stdout.trim(), 10);
        diskSpaceOk = freeKb > 10 * 1024 * 1024; // > 10GB
      } catch (e) {}

      res.json({
        status: "ok",
        checks: {
          mode: USE_S3 ? "S3/Object Storage" : "Local Fallback",
          cpu_mode: process.env.CPU_MODE === "true",
          gpu: gpuAvailable ? "connected" : "missing",
          ffmpeg: ffmpegAvailable ? "installed" : "missing",
          diskSpace: diskSpaceOk ? "healthy (>10GB)" : "low",
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/status/:jobId", (req, res) => {
    const job = jobs[req.params.jobId];
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });

  app.post("/api/dub/cancel/:jobId", (req, res) => {
    const jobId = req.params.jobId;
    if (activeProcesses[jobId]) {
      activeProcesses[jobId].kill("SIGKILL");
      delete activeProcesses[jobId];
    }
    if (jobs[jobId]) {
      jobs[jobId].status = "error";
      jobs[jobId].progress = "Cancelled by user";
      jobs[jobId].error = "Job aborted manually.";
    }
    cleanupTempFiles(jobId, tempDir);
    res.json({ success: true, message: "Job cancelled successfully" });
  });

  app.get("/api/logs/:jobId", (req, res) => {
    const jobId = req.params.jobId;
    // We can read the logs for transparent frontend display
    let combinedLogs = "";
    const logFiles = [
      `${jobId}_ffmpeg_extract.log`,
      `${jobId}_whisperx.log`,
      `${jobId}_nllb.log`,
      `${jobId}_xtts.log`,
      `${jobId}_pydub.log`,
      `${jobId}_ffmpeg_merge.log`,
    ];

    for (const logFile of logFiles) {
      const logPath = path.join(logsDir, logFile);
      if (fs.existsSync(logPath)) {
        try {
          const logContent = fs.readFileSync(logPath, "utf8");
          if (logContent.trim()) {
            combinedLogs += `\n========== [STAGE: ${logFile.replace(jobId + "_", "")}] ==========\n${logContent.trim()}`;
          }
        } catch (e) {}
      }
    }
    res.send(
      combinedLogs || "Initializing worker threads and gathering logs...",
    );
  });

  // 1. Presign URL for direct upload
  app.post("/api/upload/presign", async (req, res) => {
    try {
      const { filename, contentType } = req.body;
      const fileId = uuidv4();
      const ext = path.extname(filename || ".mp4");
      const key = `inputs/${fileId}${ext}`;

      if (USE_S3 && s3Client) {
        const command = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: key,
          ContentType: contentType || "video/mp4",
        });
        const uploadUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 3600,
        });
        res.json({ uploadUrl, fileId, key, mode: "s3" });
      } else {
        // Fallback to local upload endpoint
        const uploadUrl = `/api/upload/local/${fileId}${ext}`;
        res.json({ uploadUrl, fileId, key: `${fileId}${ext}`, mode: "local" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Local Fallback Upload Receiver (streams directly to disk)
  app.put("/api/upload/local/:filename", (req, res) => {
    const filename = req.params.filename;
    const destPath = path.join(uploadDir, filename);
    const writeStream = fs.createWriteStream(destPath);
    req.pipe(writeStream);
    req.on("end", () => {
      res.json({ success: true, message: "File uploaded to local fallback" });
    });
    req.on("error", (err) => {
      res.status(500).json({ error: "Upload failed" });
    });
  });

  // 3. Start Dubbing Pipeline
  app.post("/api/dub/start", async (req, res) => {
    try {
      const { fileId, key, sourceLang, targetLang, mode } = req.body;
      if (!fileId || !sourceLang || !targetLang) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      jobs[fileId] = {
        status: "processing",
        progress: "Job scheduled...",
        metrics: {},
      };
      res.json({ jobId: fileId });

      processDubbingJob(
        fileId,
        key,
        mode,
        sourceLang,
        targetLang,
        tempDir,
        outputDir,
        logsDir,
        uploadDir,
      ).catch((e) => {
        console.error(`Error in job ${fileId}:`, e);
        if (jobs[fileId] && jobs[fileId].status !== "error") {
          jobs[fileId] = {
            ...jobs[fileId],
            status: "error",
            progress: "Failed",
            error: e.message,
          };
        }
        cleanupTempFiles(fileId, tempDir);
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/download/:jobId", (req, res) => {
    const job = jobs[req.params.jobId];
    if (!job) return res.status(404).send("File not found");
    if (job.outputUrl && USE_S3) {
      return res.redirect(job.outputUrl);
    }
    if (job.outputFile && fs.existsSync(job.outputFile)) {
      return res.download(job.outputFile, `dubbed_${req.params.jobId}.mp4`);
    }
    return res.status(404).send("File not found");
  });

  function cleanupTempFiles(jobId: string, tempDir: string) {
    if (process.env.DEBUG === "true") {
      console.log(`[DEBUG] Preserving temp files for job ${jobId}`);
      return;
    }
    try {
      const videoPath = path.join(tempDir, `${jobId}_input.mp4`);
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      const tempAudio = path.join(tempDir, `${jobId}_audio.wav`);
      const transcript = path.join(tempDir, `${jobId}_transcript.json`);
      const translated = path.join(tempDir, `${jobId}_translated.json`);
      const genFolder = path.join(tempDir, `${jobId}_gen`);
      const alignedAudio = path.join(tempDir, `${jobId}_aligned.wav`);

      if (fs.existsSync(tempAudio)) fs.unlinkSync(tempAudio);
      if (fs.existsSync(transcript)) fs.unlinkSync(transcript);
      if (fs.existsSync(translated)) fs.unlinkSync(translated);
      if (fs.existsSync(alignedAudio)) fs.unlinkSync(alignedAudio);
      if (fs.existsSync(genFolder))
        fs.rmSync(genFolder, { recursive: true, force: true });
    } catch (e) {
      console.error(`Failed to cleanup temp files for ${jobId}`, e);
    }
  }

  // REAL PIPELINE IMPLEMENTATION WITH CLOUD FETCH/UPLOAD
  async function processDubbingJob(
    jobId: string,
    key: string,
    mode: string,
    sourceLang: string,
    targetLang: string,
    tempDir: string,
    outputDir: string,
    logsDir: string,
    uploadDir: string,
  ) {
    const videoPath = path.join(tempDir, `${jobId}_input.mp4`);
    const audioExtractPath = path.join(tempDir, `${jobId}_audio.wav`);
    const transcriptPath = path.join(tempDir, `${jobId}_transcript.json`);
    const translatedPath = path.join(tempDir, `${jobId}_translated.json`);
    const alignedAudioPath = path.join(tempDir, `${jobId}_aligned.wav`);
    const finalOutputPath = path.join(outputDir, `${jobId}_dubbed.mp4`);
    const genFolder = path.join(tempDir, `${jobId}_gen`);

    // Logs
    const ffmpegExtractLog = path.join(logsDir, `${jobId}_ffmpeg_extract.log`);
    const whisperxLog = path.join(logsDir, `${jobId}_whisperx.log`);
    const nllbLog = path.join(logsDir, `${jobId}_nllb.log`);
    const xttsLog = path.join(logsDir, `${jobId}_xtts.log`);
    const pydubLog = path.join(logsDir, `${jobId}_pydub.log`);
    const ffmpegMergeLog = path.join(logsDir, `${jobId}_ffmpeg_merge.log`);

    if (!fs.existsSync(genFolder)) fs.mkdirSync(genFolder);

    const measureTime = async (name: string, fn: () => Promise<void>) => {
      const start = Date.now();
      await fn();
      if (jobs[jobId] && jobs[jobId].metrics) {
        jobs[jobId].metrics![name] =
          `${((Date.now() - start) / 1000).toFixed(1)}s`;
      }
    };

    try {
      // 1. Fetch File
      jobs[jobId].progress = "Downloading video to worker...";
      await measureTime("fetch", async () => {
        if (mode === "s3" && s3Client) {
          const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: key,
          });
          const s3Url = await getSignedUrl(s3Client, command, {
            expiresIn: 3600,
          });

          const response = await axios({
            method: "GET",
            url: s3Url,
            responseType: "stream",
          });
          const writer = fs.createWriteStream(videoPath);
          response.data.pipe(writer);
          await new Promise<void>((resolve, reject) => {
            writer.on("finish", () => resolve());
            writer.on("error", (err) => reject(err));
          });
        } else {
          // Local fallback
          const localFile = path.join(uploadDir, key);
          if (!fs.existsSync(localFile))
            throw new Error(`Local file ${localFile} not found`);
          fs.copyFileSync(localFile, videoPath);
        }
      });

      jobs[jobId].progress = "Extracting audio from video using FFmpeg...";
      await measureTime("extraction", async () => {
        await runWorker(
          jobId,
          "ffmpeg",
          [
            "-i",
            videoPath,
            "-q:a",
            "0",
            "-map",
            "a",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-y",
            audioExtractPath,
          ],
          ffmpegExtractLog,
        );
      });

      jobs[jobId].progress =
        "Running Whisper for Speech-to-Text and Timestamp alignment...";
      await measureTime("whisper", async () => {
        await runWorker(
          jobId,
          getPythonBin(),
          [
            "python_workers/transcribe.py",
            "--audio",
            audioExtractPath,
            "--output",
            transcriptPath,
            "--lang",
            sourceLang,
          ],
          whisperxLog,
        );
      });

      jobs[jobId].progress =
        `Translating transcript from ${sourceLang} to ${targetLang} using NLLB-200 (CPU_MODE: ${process.env.CPU_MODE})...`;
      await measureTime("translation", async () => {
        await runWorker(
          jobId,
          getPythonBin(),
          [
            "python_workers/run_nllb.py",
            "--transcript",
            transcriptPath,
            "--output",
            translatedPath,
            "--src_lang",
            sourceLang,
            "--tgt_lang",
            targetLang,
          ],
          nllbLog,
        );
      });

      jobs[jobId].progress = "Generating AI Voices using Coqui XTTS-v2...";
      await measureTime("xtts", async () => {
        await runWorker(
          jobId,
          getPythonBin(),
          [
            "python_workers/run_xtts.py",
            "--transcript",
            translatedPath,
            "--lang",
            targetLang,
            "--ref_audio",
            audioExtractPath,
            "--output",
            genFolder,
          ],
          xttsLog,
        );
      });

      jobs[jobId].progress =
        "Aligning generated audio with original pauses using pydub...";
      await measureTime("alignment", async () => {
        await runWorker(
          jobId,
          getPythonBin(),
          [
            "python_workers/run_pydub.py",
            "--transcript",
            translatedPath,
            "--gen_folder",
            genFolder,
            "--output",
            alignedAudioPath,
          ],
          pydubLog,
        );
      });

      jobs[jobId].progress = "Merging AI dubbed audio back into the video...";
      await measureTime("merge", async () => {
        // specific mkv/mp4 compatibility flags and explicit map types
        await runWorker(
          jobId,
          "ffmpeg",
          [
            "-i",
            videoPath,
            "-i",
            alignedAudioPath,
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-shortest",
            "-y",
            finalOutputPath,
          ],
          ffmpegMergeLog,
        );
      });

      // 8. Upload back to Storage
      jobs[jobId].progress = "Uploading dubbed output to storage...";
      await measureTime("upload_output", async () => {
        if (mode === "s3" && s3Client) {
          const outKey = `outputs/${jobId}_dubbed.mp4`;
          const fileStream = fs.createReadStream(finalOutputPath);
          const putCommand = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: outKey,
            Body: fileStream,
            ContentType: "video/mp4",
          });
          await s3Client.send(putCommand);

          // To provide a download link, either presign a get URL or return public URL pattern
          if (process.env.S3_PUBLIC_URL) {
            jobs[jobId].outputUrl = `${process.env.S3_PUBLIC_URL}/${outKey}`;
          } else {
            const getCommand = new GetObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME!,
              Key: outKey,
            });
            jobs[jobId].outputUrl = await getSignedUrl(s3Client, getCommand, {
              expiresIn: 86400,
            });
          }
        } else {
          jobs[jobId].outputFile = finalOutputPath;
        }
      });

      jobs[jobId].progress = "Completed successfully!";
      jobs[jobId].status = "completed";
    } catch (err: any) {
      jobs[jobId].status = "error";
      jobs[jobId].error = `pipeline_failed: ${err.message}`;
      throw err;
    } finally {
      cleanupTempFiles(jobId, tempDir);
      // Clean up original download in temp and upload if local
      if (mode === "local") {
        const localFile = path.join(uploadDir, key);
        if (fs.existsSync(localFile) && process.env.DEBUG !== "true")
          fs.unlinkSync(localFile);
      }
    }
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
