# ==============================================================================
# Agri-Economic Intelligence — Start Public Cloudflare Tunnel (100% Free / ₹0)
# Launches all 4 microservices + Gateway + Cloudflare Tunnel
# ==============================================================================

$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$cloudflared = Join-Path $root "bin\cloudflared.exe"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  AGRI-ECONOMIC INTELLIGENCE — ZERO-COST BACKEND RUNNER   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Start all 4 microservices + Unified Gateway on port 7860
Write-Host "[1/2] Starting Microservices + Unified Gateway (Port 7860)..." -ForegroundColor Green
$py = Join-Path $backend ".venv\Scripts\python.exe"
if (-not (Test-Path $py)) { $py = "python" }

Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "Set-Location '$backend'; Write-Host 'AGRI UNIFIED GATEWAY (Port 7860)' -ForegroundColor Green; & '$py' run_services.py"

Start-Sleep -Seconds 3

# 2. Start Cloudflare Tunnel to expose port 7860
Write-Host "[2/2] Connecting Cloudflare Tunnel to Gateway (Port 7860)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "Set-Location '$root'; Write-Host 'CLOUDFLARE PUBLIC HTTPS TUNNEL' -ForegroundColor Cyan; & '$cloudflared' tunnel --url http://127.0.0.1:7860"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "  TUNNEL LAUNCHED!                                        " -ForegroundColor Yellow
Write-Host "  Look at the Cloudflare window for your public HTTPS URL:" -ForegroundColor White
Write-Host "  https://<unique-name>.trycloudflare.com                  " -ForegroundColor Green
Write-Host "                                                          " -ForegroundColor White
Write-Host "  Copy that URL to your Vercel Project Environment        " -ForegroundColor White
Write-Host "  Variable: VITE_API_BASE_URL                              " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Yellow

