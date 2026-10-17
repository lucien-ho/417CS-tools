param([string]$InstallRoot = '', [switch]$ValidateOnly)
$ErrorActionPreference = 'Stop'
$sourceRoot = $PSScriptRoot
$extensionId = (Get-Content -LiteralPath (Join-Path $sourceRoot 'extension-id.txt') -Raw).Trim()
if ($extensionId -notmatch '^[a-p]{32}$') { throw 'Invalid extension identity' }
$registryPath = 'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.csswitch.science_companion'
if (!$InstallRoot) {
    $InstallRoot = Join-Path $env:LOCALAPPDATA 'CSSwitch\Science-Companion'
    if (Test-Path -LiteralPath $registryPath) {
        $existing = (Get-Item -LiteralPath $registryPath).GetValue('')
        if ($existing -and [IO.Path]::IsPathRooted($existing)) {
            $previousRoot = Split-Path (Split-Path $existing -Parent) -Parent
            $previousMarker = Join-Path $previousRoot 'extension-id.txt'
            if ((Test-Path -LiteralPath $previousMarker) -and (Get-Content -LiteralPath $previousMarker -Raw).Trim() -eq $extensionId) { $InstallRoot = $previousRoot }
        }
    }
}
$InstallRoot = [IO.Path]::GetFullPath($InstallRoot)
if ($InstallRoot.TrimEnd('\') -eq [IO.Path]::GetPathRoot($InstallRoot).TrimEnd('\')) { throw 'Choose an application subfolder, not a drive root' }
$marker = Join-Path $InstallRoot 'extension-id.txt'
if ((Test-Path -LiteralPath $InstallRoot) -and (!(Test-Path -LiteralPath $marker) -or (Get-Content -LiteralPath $marker -Raw).Trim() -ne $extensionId)) { throw 'Destination is not this extension; nothing overwritten' }
$hostManifest = Join-Path $InstallRoot 'native\com.csswitch.science_companion.json'
if (Test-Path -LiteralPath $registryPath) {
    $oldPath = (Get-Item -LiteralPath $registryPath).GetValue('')
    if ($oldPath -and $oldPath -ne $hostManifest -and !$ValidateOnly) { throw 'A different native host is registered; use its existing folder or unregister it first' }
}
$files = @('extension\manifest.json','extension\common.js','extension\resolve-file.js','extension\translations.js','extension\catalog.js','extension\content.js','extension\background.js','extension\popup.html','extension\popup.css','extension\popup.js','native\ScienceCompanionHost.exe','native\com.csswitch.science_companion.json','extension-id.txt','README.md','Unregister.ps1','Install.ps1','Install-or-Update.cmd')
foreach ($relative in $files) { if (!(Test-Path -LiteralPath (Join-Path $sourceRoot $relative) -PathType Leaf)) { throw "Missing package file: $relative" } }
if ($ValidateOnly) {
    @{validated=$true;installRoot=$InstallRoot;extensionId=$extensionId;registryUnchanged=$true} | ConvertTo-Json
    exit 0
}
foreach ($folder in @('extension','native')) { New-Item -ItemType Directory -Force -Path (Join-Path $InstallRoot $folder) | Out-Null }
foreach ($relative in $files) {
    $from = Join-Path $sourceRoot $relative; $to = Join-Path $InstallRoot $relative
    if ([IO.Path]::GetFullPath($from) -ne [IO.Path]::GetFullPath($to)) { Copy-Item -LiteralPath $from -Destination $to -Force }
    if ((Get-FileHash -LiteralPath $from -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $to -Algorithm SHA256).Hash) { throw "Copy verification failed: $relative" }
}
New-Item -Path $registryPath -Force | Out-Null
Set-Item -Path $registryPath -Value $hostManifest
Write-Host ''
Write-Host '安装完成。请在 Edge 的 edge://extensions 中开启开发人员模式，加载以下文件夹：'
Write-Host (Join-Path $InstallRoot 'extension')
Write-Host '浏览器扩展需要手动加载。已有扩展请点击重新加载，然后刷新 Science 网页。'
Write-Host '新版直接打开本机原文件；仅在明确同意后为远程文件或附件保存缓存副本。'
