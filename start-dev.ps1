# Magic Page Development Server
# Starts: PostgreSQL + Botpress + Next.js Dev Server
# Always ensures clean environment with all required services

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Starting Magic Page Development Stack    " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Clean up ALL Node.js processes for a fresh start
Write-Host "Cleaning up all Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $count = ($nodeProcesses | Measure-Object).Count
    Write-Host "  Found $count Node.js process(es) - killing all..." -ForegroundColor Gray
    try {
        Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
        Write-Host "  [OK] All Node.js processes cleaned up" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } catch {
        Write-Host "  [WARNING] Could not kill some processes (may require admin)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [OK] No Node.js processes running" -ForegroundColor Green
}
Write-Host ""

# Ensure Docker services are running (PostgreSQL + Botpress)
Write-Host "Ensuring Docker services are running..." -ForegroundColor Yellow
$containers = docker ps --format "{{.Names}}" 2>$null

$needsStart = $false
if ($containers -notmatch "botpress") {
    Write-Host "  [X] Botpress not running" -ForegroundColor Red
    $needsStart = $true
} else {
    Write-Host "  [OK] Botpress is running" -ForegroundColor Green
}

if ($containers -notmatch "postgres") {
    Write-Host "  [X] PostgreSQL not running" -ForegroundColor Red
    $needsStart = $true
} else {
    Write-Host "  [OK] PostgreSQL is running" -ForegroundColor Green
}

if ($needsStart) {
    Write-Host ""
    Write-Host "Starting Docker services (PostgreSQL + Botpress)..." -ForegroundColor Yellow
    docker-compose up -d

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[ERROR] Failed to start Docker services" -ForegroundColor Red
        Write-Host "Please ensure Docker is running and try again" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }

    Write-Host "  Waiting for services to initialize..." -ForegroundColor Gray
    Start-Sleep -Seconds 8
    Write-Host "  [OK] Docker services started" -ForegroundColor Green
}

Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "[OK] Dependencies installed" -ForegroundColor Green
    Write-Host ""
}

# Create logs directory if it doesn't exist
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# Set log file with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logFile = "logs\dev-server_$timestamp.log"

# Start dev server
Write-Host "Starting Magic Page..." -ForegroundColor Green
Write-Host ""
Write-Host "Server will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Botpress Admin available at: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Web scraping: Integrated in Next.js (Cheerio/Playwright/OpenAI)" -ForegroundColor Gray
Write-Host "Logging to: $logFile" -ForegroundColor Gray
Write-Host ""
Write-Host "To view logs in real-time, open another terminal and run:" -ForegroundColor Yellow
Write-Host "  Get-Content $logFile -Wait -Tail 50" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start with logging
npm run dev 2>&1 | Tee-Object -FilePath $logFile
