# Magic Page + Botpress Cloud - Windows Setup Script
# Use this when using Botpress Cloud (not self-hosted)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Magic Page + Botpress Cloud Setup        " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

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

# Check Prerequisites
Write-Host "Checking Prerequisites..." -ForegroundColor Green
Write-Host ""

# Check Docker
Write-Host "Checking Docker..." -NoNewline
if (Test-Command docker) {
    $dockerVersion = docker --version
    Write-Host " ✓ FOUND" -ForegroundColor Green
    Write-Host "  Version: $dockerVersion" -ForegroundColor Gray

    $dockerTest = docker ps 2>&1
    if ($LASTEXITCODE -eq 0) {
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
    Write-Host "Docker is required for the database." -ForegroundColor Red
    Write-Host "Download: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Node.js
Write-Host "Checking Node.js..." -NoNewline
if (Test-Command node) {
    $nodeVersion = node --version
    Write-Host " ✓ FOUND ($nodeVersion)" -ForegroundColor Green
} else {
    Write-Host " ✗ NOT FOUND" -ForegroundColor Red
    Write-Host "Download: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "✓ Prerequisites OK!" -ForegroundColor Green
Write-Host ""

# Start PostgreSQL
Write-Host "Starting PostgreSQL database..." -ForegroundColor Green
Write-Host ""

try {
    Write-Host "Running: docker-compose -f docker-compose-db-only.yml up -d" -ForegroundColor Gray
    docker-compose -f docker-compose-db-only.yml up -d

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ PostgreSQL started successfully!" -ForegroundColor Green
        Write-Host ""
        Start-Sleep -Seconds 5

        # Show container status
        docker ps --filter "name=magicpage_postgres" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        Write-Host ""
    } else {
        Write-Host "✗ Failed to start PostgreSQL" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Failed to start PostgreSQL: $_" -ForegroundColor Red
    exit 1
}

# Setup database schema
Write-Host "Setting up database schema..." -ForegroundColor Green
Write-Host ""

Write-Host "Running database scripts..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Create initial schema
Write-Host "  1. Creating initial schema..." -NoNewline
Get-Content scripts/database_scheme.sql | docker exec -i magicpage_postgres psql -U postgres -d mp 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host " (may already exist)" -ForegroundColor Yellow
}

# Run Botpress migration
Write-Host "  2. Running Botpress migration..." -NoNewline
Get-Content scripts/update_database_for_botpress.sql | docker exec -i magicpage_postgres psql -U postgres -d mp 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host " (may already be applied)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✓ Database setup complete!" -ForegroundColor Green
Write-Host ""

# Install npm dependencies
Write-Host "Installing npm dependencies..." -ForegroundColor Green
Write-Host ""

try {
    npm install

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Dependencies installed!" -ForegroundColor Green
    } else {
        Write-Host "⚠ Some warnings during install (usually OK)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Failed to install dependencies: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Setup Complete! ✓                         " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Show configuration
Write-Host "CONFIGURATION:" -ForegroundColor Cyan
Write-Host "  Botpress: Cloud (https://chat.botpress.cloud)" -ForegroundColor White
Write-Host "  Bot ID: 3809961f-f802-40a3-aa5a-9eb91c0dedbb" -ForegroundColor White
Write-Host "  Database: PostgreSQL (Docker)" -ForegroundColor White
Write-Host "  Database Port: 5432" -ForegroundColor White
Write-Host ""

Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Configure your Botpress Cloud bot:" -ForegroundColor Cyan
Write-Host "   a. Go to your bot in Botpress Cloud" -ForegroundColor White
Write-Host "   b. Create conversation flows (see QUICKSTART.md)" -ForegroundColor White
Write-Host "   c. Add the saveLeadToMagicPage webhook" -ForegroundColor White
Write-Host ""
Write-Host "2. Start Magic Page:" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "3. Visit: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

# Offer to start dev server
$startDev = Read-Host "Start Magic Page now? (y/n)"
if ($startDev -eq 'y' -or $startDev -eq 'Y') {
    Write-Host ""
    Write-Host "Starting Magic Page..." -ForegroundColor Green
    Write-Host "Visit: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    npm run dev
} else {
    Write-Host ""
    Write-Host "To start later, run: npm run dev" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
}
