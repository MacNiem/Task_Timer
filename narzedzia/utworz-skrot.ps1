# Tworzy skrót „Task Timer” na pulpicie i w folderze aplikacji.
# Skrót otwiera index.html w trybie aplikacji (osobne okno bez paska adresu) w Google Chrome,
# a gdy go nie ma — w Brave albo Microsoft Edge.
# Po przeniesieniu folderu aplikacji uruchom ponownie Utworz-skrot.cmd.
$ErrorActionPreference = 'Stop'

$root  = Split-Path -Parent $PSScriptRoot
$index = Join-Path $root 'index.html'
$icon  = Join-Path $root 'icons\icon.ico'

# Przeglądarka: najpierw rejestr (App Paths), potem typowe miejsca instalacji.
function Find-Browser($exe, $folder) {
  foreach ($key in "HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths\$exe",
                   "HKLM:\Software\Microsoft\Windows\CurrentVersion\App Paths\$exe") {
    if (Test-Path $key) {
      $path = (Get-ItemProperty $key).'(default)'
      if ($path -and (Test-Path $path)) { return $path }
    }
  }
  @("$env:ProgramFiles\$folder\$exe", "${env:ProgramFiles(x86)}\$folder\$exe", "$env:LocalAppData\$folder\$exe") |
    Where-Object { Test-Path $_ } | Select-Object -First 1
}

$browser = Find-Browser 'chrome.exe' 'Google\Chrome\Application'
if (-not $browser) { $browser = Find-Browser 'brave.exe' 'BraveSoftware\Brave-Browser\Application' }
if (-not $browser) { $browser = Find-Browser 'msedge.exe' 'Microsoft\Edge\Application' }
if (-not $browser) {
  Write-Host 'Nie znaleziono Chrome, Brave ani Edge. Zainstaluj jedną z tych przeglądarek i uruchom skrypt ponownie.'
  exit 1
}
Write-Host "Przeglądarka: $browser"

$url   = ([System.Uri]$index).AbsoluteUri
$shell = New-Object -ComObject WScript.Shell
foreach ($dir in [Environment]::GetFolderPath('Desktop'), $root) {
  $file = Join-Path $dir 'Task Timer.lnk'
  $lnk = $shell.CreateShortcut($file)
  $lnk.TargetPath       = $browser
  $lnk.Arguments        = "--app=`"$url`""
  $lnk.IconLocation     = "$icon,0"
  $lnk.WorkingDirectory = $root
  $lnk.Description      = 'Task Timer - mierzenie czasu zadań'
  $lnk.Save()
  Write-Host "Utworzono skrót: $file"
}
