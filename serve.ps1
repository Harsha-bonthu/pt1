# Simple PowerShell static server helper (requires Python)
# Usage: .\serve.ps1 -Port 8081
param([int]$Port = 8081)
Write-Host "Starting simple static server on http://localhost:$Port"
python -m http.server $Port
