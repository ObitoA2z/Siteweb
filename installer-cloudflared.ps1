$url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
$dest = "C:\Users\2596535\Desktop\Siteweb\Siteweb\cloudflared.exe"
Write-Host "Telechargement de cloudflared..."
Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
Write-Host "OK - cloudflared telecharge dans : $dest"
