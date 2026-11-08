# -- Agri Intelligence - Launch All Services ---------------------------------
# Starts 4 Python backends + the Vite frontend, each in its own window.
# Run this from the project root: .\start_all.ps1

$root    = $PSScriptRoot
$backend = Join-Path $root "backend"
$venv    = Join-Path $backend ".venv\Scripts\python.exe"

# Use venv python if available, else system python
$py = if (Test-Path $venv) { $venv } else { "python" }

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Agri Intelligence - Starting all services       " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Python interpreter : $py" -ForegroundColor DarkGray
Write-Host ""

# -- Backend 1 : Schemes API (port 8000) -------------------------------------
Write-Host "[1/5] Schemes API         -> http://127.0.0.1:8000" -ForegroundColor Green
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "Set-Location '$backend'; Write-Host 'SCHEMES API (port 8000)' -ForegroundColor Green; & '$py' -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Milliseconds 800

# -- Backend 2 : Crop Production API (port 8002) ------------------------------
Write-Host "[2/5] Crop Production API -> http://127.0.0.1:8002" -ForegroundColor Green
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "Set-Location '$backend'; Write-Host 'CROP PRODUCTION API (port 8002)' -ForegroundColor Green; & '$py' -m uvicorn main:app --host 127.0.0.1 --port 8002 --reload"

Start-Sleep -Milliseconds 800

# -- Backend 3 : Health/Market/Soil/Lac/Pearl API (port 8003) -----------------
Write-Host "[3/5] Health/Market API   -> http://127.0.0.1:8003" -ForegroundColor Green
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "Set-Location '$backend'; Write-Host 'HEALTH / MARKET / SOIL / LAC / PEARL API (port 8003)' -ForegroundColor Green; & '$py' -m uvicorn health_api:app --host 127.0.0.1 --port 8003 --reload"

Start-Sleep -Milliseconds 800

# -- Backend 4 : Voice / AI Agent API (port 8004) -----------------------------
Write-Host "[4/5] Voice AI Agent      -> http://127.0.0.1:8004" -ForegroundColor Green
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "Set-Location '$backend'; Write-Host 'VOICE AI AGENT (port 8004)' -ForegroundColor Green; Write-Host 'Loading Whisper + Gemini...' -ForegroundColor Yellow; & '$py' -m uvicorn voice_api:app --host 127.0.0.1 --port 8004 --reload"

Start-Sleep -Milliseconds 1200

# -- Frontend : Vite Dev Server ------------------------------------------------
Write-Host "[5/5] Frontend            -> http://localhost:5174" -ForegroundColor Green
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "Set-Location '$root'; Write-Host 'VITE FRONTEND (port 5174)' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  All 5 services launched in separate windows     " -ForegroundColor Cyan
Write-Host "  Frontend : http://localhost:5174                " -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Give backends ~10s to fully start before using the AI assistant." -ForegroundColor DarkGray
