$base = "c:\Users\HP\OneDrive\Desktop\dforzze (1)\dforzze"

# Buscar por patron
$tiendaSrc   = Get-ChildItem $base -Filter "*Tienda*" | Where-Object { $_.Name -notlike "tienda.html" } | Select-Object -First 1
$catalogoSrc = Get-ChildItem $base -Filter "*logo*DFORZZE*" | Select-Object -First 1

if ($tiendaSrc) {
    [System.IO.File]::Copy($tiendaSrc.FullName, "$base\tienda.html", $true)
    Write-Host "Tienda copiada: $($tiendaSrc.Name)"
} else {
    Write-Host "ERROR: no se encontro archivo Tienda"
}

if ($catalogoSrc) {
    [System.IO.File]::Copy($catalogoSrc.FullName, "$base\catalogo.html", $true)
    Write-Host "Catalogo copiado: $($catalogoSrc.Name)"
} else {
    Write-Host "ERROR: no se encontro archivo Catalogo"
}
