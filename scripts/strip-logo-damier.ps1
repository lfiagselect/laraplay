# LARAPLAY - Convert PNG RGB -> RGBA, strip damier blanc PRESERVE COULEURS.
# Pass 1: pixels gris clairs (R~=G~=B >=220) -> alpha 0 (damier transparent).
# Pass 2: pixels colorés (R/G/B diffèrent >=8) -> alpha 255 (logo couleur).
# Pass 3: pixels gris foncés (lum <=200, non colorés) -> alpha 255 (texte sombre).
# Pas de feather: évite affaiblir couleurs logo (problème prev).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/strip-logo-damier.ps1

param(
  [string]$Input = "public/hero-videos/effet_lara_logo.png",
  [string]$Output = "public/hero-videos/effet_lara_logo.png"
)

Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Image]::FromFile((Resolve-Path $Input))
$w = $src.Width
$h = $src.Height
$dst = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$rectSrc = New-Object System.Drawing.Rectangle 0, 0, $w, $h
$bmpSrc = New-Object System.Drawing.Bitmap $src
$dataSrc = $bmpSrc.LockBits($rectSrc, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$dataDst = $dst.LockBits($rectSrc, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$stride = $dataSrc.Stride
$len = $stride * $h
$bytes = New-Object byte[] $len
[System.Runtime.InteropServices.Marshal]::Copy($dataSrc.Scan0, $bytes, 0, $len)

# Format32bppArgb byte order: B G R A
$transparent = 0
$opaque = 0
for ($i = 0; $i -lt $len; $i += 4) {
  $b = $bytes[$i]
  $g = $bytes[$i+1]
  $r = $bytes[$i+2]

  $diffRG = [Math]::Abs([int]$r - [int]$g)
  $diffGB = [Math]::Abs([int]$g - [int]$b)
  $diffRB = [Math]::Abs([int]$r - [int]$b)
  $colored = ($diffRG -ge 8) -or ($diffGB -ge 8) -or ($diffRB -ge 8)

  if ($colored) {
    # Pixel coloré → opaque (logo)
    $bytes[$i+3] = 255
    $opaque++
  } elseif ($r -gt 220) {
    # Gris clair = damier → transparent
    $bytes[$i+3] = 0
    $transparent++
  } else {
    # Gris foncé = texte sombre éventuel → opaque
    $bytes[$i+3] = 255
    $opaque++
  }
}

[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $dataDst.Scan0, $len)
$bmpSrc.UnlockBits($dataSrc)
$dst.UnlockBits($dataDst)
$src.Dispose()
$bmpSrc.Dispose()

$dst.Save($Output, [System.Drawing.Imaging.ImageFormat]::Png)
$dst.Dispose()

$total = $transparent + $opaque
Write-Host "Done."
Write-Host "Transparent: $transparent ($([Math]::Round(100*$transparent/$total, 1))%)"
Write-Host "Opaque:      $opaque ($([Math]::Round(100*$opaque/$total, 1))%)"
