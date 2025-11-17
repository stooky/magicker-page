# Kill all hung development servers
# Use this if you have port conflicts or hung Node.js processes

Write-Host "Cleaning up hung development servers..." -ForegroundColor Yellow
Write-Host ""

# Find processes on common dev ports
$ports = @(3000, 3001, 3002, 3003, 5001)
$pidsToKill = @()

foreach ($port in $ports) {
    $connections = netstat -ano | Select-String ":$port.*LISTENING"

    foreach ($conn in $connections) {
        if ($conn -match "\s+(\d+)\s*$") {
            $pid = $matches[1]
            if ($pid -and $pid -notin $pidsToKill) {
                $pidsToKill += $pid

                # Get process name
                try {
                    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($proc) {
                        Write-Host "  Found: Port $port - PID $pid ($($proc.ProcessName))" -ForegroundColor Gray
                    }
                } catch {
                    Write-Host "  Found: Port $port - PID $pid" -ForegroundColor Gray
                }
            }
        }
    }
}

if ($pidsToKill.Count -eq 0) {
    Write-Host "✓ No hung servers found!" -ForegroundColor Green
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "Found $($pidsToKill.Count) process(es) to kill" -ForegroundColor Yellow
$confirm = Read-Host "Kill these processes? (y/n)"

if ($confirm -eq 'y' -or $confirm -eq 'Y') {
    foreach ($pid in $pidsToKill) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction Stop
            Write-Host "  ✓ Killed PID $pid" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Failed to kill PID $pid" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "✓ Cleanup complete!" -ForegroundColor Green
} else {
    Write-Host "Cancelled." -ForegroundColor Yellow
}

Write-Host ""
