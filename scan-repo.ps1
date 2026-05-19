# ============================================
# AI DUBBING PLATFORM - REPO INTELLIGENCE SCANNER
# ============================================

Write-Host ""
Write-Host "============================================"
Write-Host " AI DUBBING REPO INTELLIGENCE SCANNER"
Write-Host "============================================"
Write-Host ""

# --------------------------------------------
# REPORT DIRECTORY
# --------------------------------------------

$ReportDir = "repo-analysis"

if (!(Test-Path $ReportDir)) {
    New-Item -ItemType Directory -Path $ReportDir | Out-Null
}

# --------------------------------------------
# REPORT FILES
# --------------------------------------------

$ArchitectureReport = "$ReportDir\architecture-report.txt"
$PythonDepsReport = "$ReportDir\python-dependencies.txt"
$NodeDepsReport = "$ReportDir\node-dependencies.txt"
$GPUReport = "$ReportDir\gpu-analysis.txt"
$SpawnReport = "$ReportDir\spawn-analysis.txt"
$EnvReport = "$ReportDir\env-analysis.txt"
$RiskReport = "$ReportDir\risk-report.txt"

# Clear old reports
Remove-Item "$ReportDir\*" -Force -ErrorAction SilentlyContinue

# --------------------------------------------
# BASIC SYSTEM INFO
# --------------------------------------------

Write-Host "[INFO] Collecting system info..."

"================ SYSTEM INFO ================" | Out-File $ArchitectureReport

"DATE:" | Add-Content $ArchitectureReport
Get-Date | Add-Content $ArchitectureReport

"`nPOWERSHELL VERSION:" | Add-Content $ArchitectureReport
$PSVersionTable.PSVersion | Add-Content $ArchitectureReport

"`nWINDOWS VERSION:" | Add-Content $ArchitectureReport
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" | Add-Content $ArchitectureReport

# --------------------------------------------
# REPO STRUCTURE
# --------------------------------------------

Write-Host "[INFO] Scanning repository structure..."

"`n================ REPO STRUCTURE ================" | Add-Content $ArchitectureReport

Get-ChildItem -Recurse -Depth 4 |
Select-Object FullName |
Out-File -Append $ArchitectureReport

# --------------------------------------------
# DETECT IMPORTANT FILES
# --------------------------------------------

Write-Host "[INFO] Detecting critical project files..."

"`n================ IMPORTANT FILES ================" | Add-Content $ArchitectureReport

$ImportantFiles = @(
    "package.json",
    "requirements.txt",
    "Dockerfile",
    "docker-compose.yml",
    "server.ts",
    ".env",
    ".env.local",
    "vite.config.ts",
    "tsconfig.json",
    "Jenkinsfile"
)

foreach ($file in $ImportantFiles) {
    Get-ChildItem -Recurse -Filter $file -ErrorAction SilentlyContinue |
    Select-Object FullName |
    Add-Content $ArchitectureReport
}

# --------------------------------------------
# NODE.JS DEPENDENCIES
# --------------------------------------------

Write-Host "[INFO] Extracting Node.js dependencies..."

"================ NODE DEPENDENCIES ================" | Out-File $NodeDepsReport

Get-ChildItem -Recurse -Filter "package.json" |
ForEach-Object {

    "`nFILE: $($_.FullName)" | Add-Content $NodeDepsReport

    try {
        Get-Content $_.FullName | Add-Content $NodeDepsReport
    }
    catch {
        "FAILED TO READ FILE" | Add-Content $NodeDepsReport
    }
}

# --------------------------------------------
# PYTHON DEPENDENCIES
# --------------------------------------------

Write-Host "[INFO] Extracting Python dependencies..."

"================ PYTHON DEPENDENCIES ================" | Out-File $PythonDepsReport

Get-ChildItem -Recurse -Include "requirements.txt","*.py" |
ForEach-Object {

    "`nFILE: $($_.FullName)" | Add-Content $PythonDepsReport

    try {
        Select-String -Path $_.FullName `
            -Pattern "torch|torchaudio|whisper|whisperx|faster_whisper|TTS|pyannote|transformers|ffmpeg|pydub|cuda|device=|compute_type" `
            -SimpleMatch |
        ForEach-Object {
            $_.Line
        } | Add-Content $PythonDepsReport
    }
    catch {
        "FAILED TO PARSE FILE" | Add-Content $PythonDepsReport
    }
}

# --------------------------------------------
# SPAWN ANALYSIS
# --------------------------------------------

Write-Host "[INFO] Searching Node -> Python spawn logic..."

"================ SPAWN ANALYSIS ================" | Out-File $SpawnReport

Get-ChildItem -Recurse -Include "*.ts","*.js" |
ForEach-Object {

    try {
        Select-String -Path $_.FullName `
            -Pattern "spawn|exec|python|python3|venv|child_process" |
        ForEach-Object {

            "FILE: $($_.Path)" | Add-Content $SpawnReport
            "LINE: $($_.Line)" | Add-Content $SpawnReport
            "----------------------------------------" | Add-Content $SpawnReport
        }
    }
    catch {}
}

# --------------------------------------------
# ENVIRONMENT ANALYSIS
# --------------------------------------------

Write-Host "[INFO] Scanning environment variables..."

"================ ENVIRONMENT ANALYSIS ================" | Out-File $EnvReport

Get-ChildItem -Recurse -Include ".env*" |
ForEach-Object {

    "`nFILE: $($_.FullName)" | Add-Content $EnvReport

    try {
        Get-Content $_.FullName | Add-Content $EnvReport
    }
    catch {}
}

# --------------------------------------------
# GPU ANALYSIS
# --------------------------------------------

Write-Host "[INFO] Running GPU analysis..."

"================ GPU ANALYSIS ================" | Out-File $GPUReport

"`nNVIDIA-SMI OUTPUT:" | Add-Content $GPUReport

try {
    nvidia-smi | Add-Content $GPUReport
}
catch {
    "NVIDIA-SMI NOT FOUND" | Add-Content $GPUReport
}

"`nCUDA PATH:" | Add-Content $GPUReport

$env:CUDA_PATH | Add-Content $GPUReport

"`nPYTHON VERSION:" | Add-Content $GPUReport

try {
    python --version | Add-Content $GPUReport
}
catch {
    "PYTHON NOT FOUND" | Add-Content $GPUReport
}

"`nNODE VERSION:" | Add-Content $GPUReport

try {
    node -v | Add-Content $GPUReport
}
catch {
    "NODE NOT FOUND" | Add-Content $GPUReport
}

"`nNPM VERSION:" | Add-Content $GPUReport

try {
    npm -v | Add-Content $GPUReport
}
catch {
    "NPM NOT FOUND" | Add-Content $GPUReport
}

"`nFFMPEG VERSION:" | Add-Content $GPUReport

try {
    ffmpeg -version | Add-Content $GPUReport
}
catch {
    "FFMPEG NOT FOUND" | Add-Content $GPUReport
}

# --------------------------------------------
# RISK ANALYSIS
# --------------------------------------------

Write-Host "[INFO] Generating risk report..."

"================ RISK REPORT ================" | Out-File $RiskReport

# WhisperX
$WhisperX = Get-ChildItem -Recurse -Include "*.py" |
Select-String "whisperx"

if ($WhisperX) {
    "[HIGH RISK] WhisperX detected - possible CUDA/ctranslate issues" | Add-Content $RiskReport
}

# pyannote
$Pyannote = Get-ChildItem -Recurse -Include "*.py" |
Select-String "pyannote"

if ($Pyannote) {
    "[HIGH RISK] pyannote detected - auth/model/version instability possible" | Add-Content $RiskReport
}

# XTTS
$XTTS = Get-ChildItem -Recurse -Include "*.py" |
Select-String "TTS"

if ($XTTS) {
    "[INFO] XTTS/TTS usage detected" | Add-Content $RiskReport
}

# CUDA
if (!(Get-Command nvidia-smi -ErrorAction SilentlyContinue)) {
    "[CRITICAL] NVIDIA GPU tools not found" | Add-Content $RiskReport
}

# ffmpeg
if (!(Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    "[CRITICAL] ffmpeg not installed or not in PATH" | Add-Content $RiskReport
}

# --------------------------------------------
# COMPLETION
# --------------------------------------------

Write-Host ""
Write-Host "============================================"
Write-Host " SCAN COMPLETED"
Write-Host "============================================"
Write-Host ""

Write-Host "Generated Reports:"
Write-Host ""

Get-ChildItem $ReportDir

Write-Host ""
Write-Host "NEXT STEP:"
Write-Host "Open repo-analysis folder and inspect reports."
Write-Host ""
