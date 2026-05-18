# LARAPLAY - Convert PNG RGB → RGBA, strip damier blanc.
# Pixels R≈G≈B ≥220 (gris clairs/damier) → alpha 0.
# Pixels transition lum 200-220 → alpha fade (anti-aliasing).
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

# Lock bits pour accès rapide
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
$partial = 0
for ($i = 0; $i -lt $len; $i += 4) {
  $b = $bytes[$i]
  $g = $bytes[$i+1]
  $r = $bytes[$i+2]

  $diffRG = [Math]::Abs([int]$r - [int]$g)
  $diffGB = [Math]::Abs([int]$g - [int]$b)
  $grayIsh = ($diffRG -lt 10) -and ($diffGB -lt 10) -and ($r -gt 220)

  if ($grayIsh) {
    $bytes[$i+3] = 0
    $transparent++
  } else {
    $lum = [int](0.299 * $r + 0.587 * $g + 0.114 * $b)
    if ($lum -gt 200 -and $lum -le 220) {
      $a = [Math]::Max(0, [Math]::Min(255, (220 - $lum) * 12))
      $bytes[$i+3] = [byte]$a
      $partial++
    } else {
      $bytes[$i+3] = 255
      $opaque++
    }
  }
}

[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $dataDst.Scan0, $len)
$bmpSrc.UnlockBits($dataSrc)
$dst.UnlockBits($dataDst)
$src.Dispose()
$bmpSrc.Dispose()

$outPath = (Resolve-Path $Output -ErrorAction SilentlyContinue) ?? $Output
$dst.Save($Output, [System.Drawing.Imaging.ImageFormat]::Png)
$dst.Dispose()

$total = $transparent + $opaque + $partial
Write-Host "Done."
Write-Host "Transparent: $transparent ($([Math]::Round(100*$transparent/$total, 1))%)"
Write-Host "Opaque:      $opaque ($([Math]::Round(100*$opaque/$total, 1))%)"
Write-Host "Partial:     $partial ($([Math]::Round(100*$partial/$total, 1))%)"
