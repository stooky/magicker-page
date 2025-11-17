# View development server logs in real-time
# This script tails the most recent log file

$logFiles = Get-ChildItem -Path "logs" -Filter "dev-server_*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending

if ($logFiles.Count -eq 0) {
    Write-Host "No log files found in logs/ directory" -ForegroundColor Yellow
    Write-Host "Start the dev server first with: .\start-dev.ps1" -ForegroundColor Cyan
    exit 1
}

$latestLog = $logFiles[0].FullName

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Viewing Development Server Logs" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Log file: $($logFiles[0].Name)" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop viewing logs" -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Tail the log file
Get-Content $latestLog -Wait -Tail 50
