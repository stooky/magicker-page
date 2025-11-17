# Start the scraper service
# This script starts the Flask server with proper environment configuration

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Starting Web Scraper Service" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if OpenAI API key is set
if ($env:OPENAI_API_KEY) {
    Write-Host "OpenAI API Key: Set (extraction enabled)" -ForegroundColor Green
} else {
    Write-Host "WARNING: OPENAI_API_KEY not set!" -ForegroundColor Yellow
    Write-Host "OpenAI extraction will be disabled." -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Do you want to set it now? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        $apiKey = Read-Host "Enter your OpenAI API key"
        $env:OPENAI_API_KEY = $apiKey
        Write-Host "API key set for this session" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Starting Flask server on port 5001..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Start the server
python server.py
