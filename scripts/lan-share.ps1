# Shareable MediTrack SafetyNet — local preview, bound to the LAN.
#
# Prints the URL you can open from any phone/tablet/desktop on the same
# Wi-Fi. Uses the production build, so what you test is what users will see.
#
# Run:
#   .\scripts\lan-share.ps1

$portBusy = Try {
  (Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction Stop).Count -gt 0
} Catch { $false }

if (-not $portBusy) {
  Push-Location frontend
  $out = npm run preview -- --host 0.0.0.0 --port 4173 --strictPort --logLevel warn 4>&1
  Pop-Location
  Write-Output $out
}

$lan = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
  $_.IPAddress -ne '127.0.0.1' -and $_.InterfaceAlias -notmatch 'Loopback'
} | Select-Object -ExpandProperty IPAddress | Where-Object { $_ -match '^(192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[01])\.)' } | Sort-Object | Select-Object -First 1

if (-not $lan) {
  $lan = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' } | Select-Object -ExpandProperty IPAddress | Sort-Object | Select-Object -First 1
}

if ($lan) {
  "Local : http://127.0.0.1:4173/"
  "LAN   : http://${lan}:4173/"
  "Open the LAN URL on any phone/tablet on the same Wi-Fi."
} else {
  "Local : http://127.0.0.1:4173/"
  "(no LAN IPv4 address found; use 127.0.0.1 from this machine)"
}
