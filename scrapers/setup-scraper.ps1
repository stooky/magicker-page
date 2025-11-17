# Setup script for Web Scraper Service
# This script installs dependencies and sets up the scraping environment

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Web Scraper Setup (Scrapy + Playwright + OpenAI)" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
Write-Host "Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Python not found!" -ForegroundColor Red
    Write-Host "  Please install Python 3.8+ from https://www.python.org/" -ForegroundColor Red
    exit 1
}

# Check Python version
$versionMatch = $pythonVersion -match "Python (\d+)\.(\d+)"
if ($versionMatch) {
    $major = [int]$matches[1]
    $minor = [int]$matches[2]
    if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 8)) {
        Write-Host "  ERROR: Python 3.8+ required (found $major.$minor)" -ForegroundColor Red
        exit 1
    }
}

# Install Python dependencies
Write-Host ""
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "  Dependencies installed successfully" -ForegroundColor Green

# Install Playwright browsers
Write-Host ""
Write-Host "Installing Playwright browsers..." -ForegroundColor Yellow
playwright install chromium
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Failed to install Playwright browsers" -ForegroundColor Red
    exit 1
}
Write-Host "  Playwright browsers installed successfully" -ForegroundColor Green

# Check for OpenAI API key
Write-Host ""
Write-Host "Checking OpenAI configuration..." -ForegroundColor Yellow
if ($env:OPENAI_API_KEY) {
    Write-Host "  OpenAI API key found in environment" -ForegroundColor Green
} else {
    Write-Host "  WARNING: OPENAI_API_KEY not set!" -ForegroundColor Yellow
    Write-Host "  OpenAI extraction will be disabled unless you set it" -ForegroundColor Yellow
    Write-Host "  Set it with: `$env:OPENAI_API_KEY='your-key-here'" -ForegroundColor Yellow
}

# Setup complete
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Set your OpenAI API key (if not already set):" -ForegroundColor White
Write-Host "     `$env:OPENAI_API_KEY='sk-your-key-here'" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Start the scraper service:" -ForegroundColor White
Write-Host "     python server.py" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. In another terminal, start Next.js:" -ForegroundColor White
Write-Host "     cd .." -ForegroundColor Gray
Write-Host "     npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "The scraper service will run on http://localhost:5001" -ForegroundColor Cyan
Write-Host ""
