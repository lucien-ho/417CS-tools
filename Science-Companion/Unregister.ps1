$ErrorActionPreference = 'Stop'
$registryPath = 'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.csswitch.science_companion'
$expected = Join-Path $PSScriptRoot 'native\com.csswitch.science_companion.json'
if (Test-Path $registryPath) {
    if ((Get-Item $registryPath).GetValue('') -ne $expected) { throw 'Native host belongs to another installation; unchanged' }
    Remove-Item -LiteralPath $registryPath
}
Write-Output 'Native host unregistered. Exported files are preserved. Remove the browser extension in Edge separately.'
