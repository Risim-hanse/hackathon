$ErrorActionPreference = "Stop"

Write-Host "== Frontend: typecheck =="
Push-Location frontend
npm run typecheck
Write-Host "== Frontend: tests =="
npm run test
Write-Host "== Frontend: build =="
npm run build
Pop-Location

Write-Host "== Backend: tests =="
Push-Location backend
if (Get-Command py -ErrorAction SilentlyContinue) {
  py -m pytest -q
} else {
  python -m pytest -q
}
Pop-Location

Write-Host "ALL CHECKS PASSED"
