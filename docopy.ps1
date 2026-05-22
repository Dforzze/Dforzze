$base = "c:\Users\HP\OneDrive\Desktop\dforzze (1)\dforzze"

$tiendaSrc   = Get-ChildItem $base | Where-Object { $_.Name -like "*Tienda*" -and $_.Name -ne "tienda.html" } | Select-Object -First 1
$catalogoSrc = Get-ChildItem $base | Where-Object { $_.Name -like "*DFORZZE.html" -and $_.Name -ne "catalogo.html" } | Select-Object -First 1

Write-Host "Tienda src: $($tiendaSrc.FullName)"
Write-Host "Catalogo src: $($catalogoSrc.FullName)"

if ($tiendaSrc) {
    [System.IO.File]::Copy($tiendaSrc.FullName, "$base\tienda.html", $true)
    Write-Host "OK tienda"
}
if ($catalogoSrc) {
    [System.IO.File]::Copy($catalogoSrc.FullName, "$base\catalogo.html", $true)
    Write-Host "OK catalogo"
}
