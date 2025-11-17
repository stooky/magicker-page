# Magic Page + Botpress - Windows Setup Script
# Run this in PowerShell as Administrator

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Magic Page + Botpress Setup (Windows)    " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  WARNING: Not running as Administrator" -ForegroundColor Yellow
    Write-Host "Some features may not work. Consider running as Admin." -ForegroundColor Yellow
    Write-Host ""
}

# Function to check if command exists
function Test-Command {
    param($Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) {
            return $true
        }
    }
    catch {
        return $false
    }
}

# Step 1: Check Prerequisites
Write-Host "Step 1: Checking Prerequisites..." -ForegroundColor Green
Write-Host ""

# Check Docker
Write-Host "Checking Docker..." -NoNewline
if (Test-Command docker) {
    $dockerVersion = docker --version
    Write-Host " ✓ FOUND" -ForegroundColor Green
    Write-Host "  Version: $dockerVersion" -ForegroundColor Gray

    # Check if Docker is running
    $dockerRunning = docker ps 2>$null
    if ($?) {
        Write-Host "  Docker is running ✓" -ForegroundColor Green
    } else {
        Write-Host "  Docker is installed but NOT running ✗" -ForegroundColor Yellow
        Write-Host "  Please start Docker Desktop and run this script again." -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host " ✗ NOT FOUND" -ForegroundColor Red
    Write-Host ""
    Write-Host "Docker is required but not installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Docker Desktop:" -ForegroundColor Yellow
    Write-Host "  1. Download: https://www.docker.com/products/docker-desktop" -ForegroundColor Cyan
    Write-Host "  2. Install Docker Desktop" -ForegroundColor Cyan
    Write-Host "  3. Restart your computer" -ForegroundColor Cyan
    Write-Host "  4. Run this script again" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Node.js
Write-Host "Checking Node.js..." -NoNewline
if (Test-Command node) {
    $nodeVersion = node --version
    Write-Host " ✓ FOUND" -ForegroundColor Green
    Write-Host "  Version: $nodeVersion" -ForegroundColor Gray
} else {
    Write-Host " ✗ NOT FOUND" -ForegroundColor Red
    Write-Host ""
    Write-Host "Node.js is required but not installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js:" -ForegroundColor Yellow
    Write-Host "  1. Download: https://nodejs.org/ (LTS version)" -ForegroundColor Cyan
    Write-Host "  2. Install Node.js" -ForegroundColor Cyan
    Write-Host "  3. Restart PowerShell" -ForegroundColor Cyan
    Write-Host "  4. Run this script again" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check npm
Write-Host "Checking npm..." -NoNewline
if (Test-Command npm) {
    $npmVersion = npm --version
    Write-Host " ✓ FOUND" -ForegroundColor Green
    Write-Host "  Version: $npmVersion" -ForegroundColor Gray
} else {
    Write-Host " ✗ NOT FOUND" -ForegroundColor Red
    Write-Host "  npm should come with Node.js. Please reinstall Node.js." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Python (for scraper service)
Write-Host "Checking Python..." -NoNewline
if (Test-Command python) {
    $pythonVersion = python --version
    Write-Host " ✓ FOUND" -ForegroundColor Green
    Write-Host "  Version: $pythonVersion" -ForegroundColor Gray
} else {
    Write-Host " ⚠ NOT FOUND (scraper service will not work)" -ForegroundColor Yellow
    Write-Host "  Install Python 3.8+ from https://www.python.org/ to use web scraping" -ForegroundColor Yellow
}

# Check PostgreSQL (optional)
Write-Host "Checking PostgreSQL..." -NoNewline
if (Test-Command psql) {
    $psqlVersion = psql --version
    Write-Host " ✓ FOUND" -ForegroundColor Green
    Write-Host "  Version: $psqlVersion" -ForegroundColor Gray
} else {
    Write-Host " ⚠ NOT FOUND (will use Docker PostgreSQL)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Prerequisites check complete! ✓" -ForegroundColor Green
Write-Host ""
Start-Sleep -Seconds 2

# Step 2: Start Botpress
Write-Host "Step 2: Starting Botpress with Docker..." -ForegroundColor Green
Write-Host ""

try {
    Write-Host "Running: docker-compose up -d" -ForegroundColor Gray
    docker-compose up -d

    if ($?) {
        Write-Host ""
        Write-Host "✓ Botpress containers started successfully!" -ForegroundColor Green
        Write-Host ""

        # Wait for services to be ready
        Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10

        # Check running containers
        Write-Host ""
        Write-Host "Running containers:" -ForegroundColor Cyan
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        Write-Host ""
    } else {
        Write-Host "✗ Failed to start containers" -ForegroundColor Red
        Write-Host "Check docker-compose.yml for errors" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "✗ Error starting Docker containers: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Install npm dependencies
Write-Host "Step 3: Installing npm dependencies..." -ForegroundColor Green
Write-Host ""

try {
    Write-Host "Running: npm install" -ForegroundColor Gray
    npm install

    if ($?) {
        Write-Host ""
        Write-Host "✓ Dependencies installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Error installing dependencies: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Install Playwright browsers for web scraping
Write-Host ""
Write-Host "Step 4: Installing Playwright browsers..." -ForegroundColor Green
Write-Host ""

$installPlaywright = Read-Host "Install Playwright browsers for web scraping? (Recommended) (y/n)"
if ($installPlaywright -eq 'y' -or $installPlaywright -eq 'Y') {
    try {
        Write-Host "Installing Playwright Chromium browser..." -ForegroundColor Gray
        npx playwright install chromium --with-deps

        if ($?) {
            Write-Host ""
            Write-Host "✓ Playwright browsers installed successfully!" -ForegroundColor Green
        } else {
            Write-Host "⚠ Playwright browser installation failed" -ForegroundColor Yellow
            Write-Host "  You can install it later with: npx playwright install chromium" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠ Error installing Playwright: $_" -ForegroundColor Yellow
        Write-Host "  You can install it later with: npx playwright install chromium" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ Skipping Playwright - you can install it later with: npx playwright install chromium" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Automated Setup Complete! ✓              " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Step 5: Manual steps required
Write-Host "🔧 MANUAL STEPS REQUIRED:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. CREATE YOUR BOT:" -ForegroundColor Cyan
Write-Host "   a. Open browser: http://localhost:3001" -ForegroundColor White
Write-Host "   b. Create admin account (first time only)" -ForegroundColor White
Write-Host "   c. Click 'Create Bot'" -ForegroundColor White
Write-Host "   d. Name: magic-page-lead-bot" -ForegroundColor White
Write-Host "   e. Template: Empty Bot" -ForegroundColor White
Write-Host "   f. COPY THE BOT ID from the URL" -ForegroundColor Yellow
Write-Host "      (Example: http://localhost:3001/studio/YOUR-BOT-ID)" -ForegroundColor Gray
Write-Host ""

Write-Host "2. CONFIGURE ENVIRONMENT:" -ForegroundColor Cyan
Write-Host "   a. Open: .env.local" -ForegroundColor White
Write-Host "   b. Find: BOTPRESS_BOT_ID=your-bot-id-here" -ForegroundColor White
Write-Host "   c. Replace with your actual Bot ID" -ForegroundColor White
Write-Host "   d. Update DB_PASSWORD if needed" -ForegroundColor White
Write-Host ""

Write-Host "3. SETUP DATABASE:" -ForegroundColor Cyan
Write-Host "   Option A - Use existing PostgreSQL:" -ForegroundColor White
Write-Host "     psql -U postgres -d mp -f scripts\update_database_for_botpress.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "   Option B - Use Docker PostgreSQL (easier):" -ForegroundColor White
Write-Host "     docker exec -i botpress_postgres psql -U postgres -d mp -f - < scripts\update_database_for_botpress.sql" -ForegroundColor Gray
Write-Host "     (Note: You may need to create the 'mp' database first)" -ForegroundColor Yellow
Write-Host ""

Write-Host "4. CREATE BOT FLOW:" -ForegroundColor Cyan
Write-Host "   Follow instructions in: QUICKSTART.md (Step 6)" -ForegroundColor White
Write-Host "   Or use the visual flow builder in Botpress Studio" -ForegroundColor White
Write-Host ""

Write-Host "5. START MAGIC PAGE:" -ForegroundColor Cyan
Write-Host "   Run: npm run dev" -ForegroundColor White
Write-Host "   Then visit: http://localhost:3000" -ForegroundColor White
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Offer to open Botpress in browser
$openBrowser = Read-Host "Would you like to open Botpress Admin now? (y/n)"
if ($openBrowser -eq 'y' -or $openBrowser -eq 'Y') {
    Start-Process "http://localhost:3001"
    Write-Host ""
    Write-Host "✓ Opening Botpress Admin in browser..." -ForegroundColor Green
    Write-Host ""
}

# Offer to open .env.local
$openEnv = Read-Host "Would you like to open .env.local in Notepad? (y/n)"
if ($openEnv -eq 'y' -or $openEnv -eq 'Y') {
    Start-Process notepad.exe ".env.local"
    Write-Host ""
    Write-Host "✓ Opening .env.local in Notepad..." -ForegroundColor Green
    Write-Host ""
}

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Complete the manual steps above" -ForegroundColor White
Write-Host "  2. Read QUICKSTART.md for detailed instructions" -ForegroundColor White
Write-Host "  3. Run: npm run dev" -ForegroundColor White
Write-Host ""

Write-Host "Need help? Check:" -ForegroundColor Cyan
Write-Host "  - QUICKSTART.md" -ForegroundColor White
Write-Host "  - IMPLEMENTATION_CHECKLIST.md" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
