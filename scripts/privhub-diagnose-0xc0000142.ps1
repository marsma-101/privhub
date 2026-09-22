# privhub-diagnose-0xc0000142.ps1
#
# Purpose: find the cause of "Application Error (0xc0000142)" when starting
#          console programs (cmd.exe, git.exe, ...).
#
# Already ruled out for this machine:
#   - corrupt Git install      (disk files complete, versions consistent)
#   - AppInit_DLLs injection   (empty, LoadAppInit_DLLs = 0)
#   - third-party antivirus    (only Windows Defender present)
# So this script checks what is left:
#   A. something spawning cmd.exe / git.exe at high frequency
#   B. handle / ephemeral-port / desktop-heap exhaustion
#   C. which parent process is doing the spawning
#
# Usage (Administrator PowerShell recommended; non-admin still works partially):
#     powershell -ExecutionPolicy Bypass -File scripts\privhub-diagnose-0xc0000142.ps1
#
# ASCII-only ON PURPOSE. Windows PowerShell 5.1 reads .ps1 as ANSI unless it has
# a UTF-8 BOM; a BOM-less UTF-8 file containing Chinese comments gets mangled
# into parse errors (this exact failure was reproduced while writing this file,
# and is the same accident documented in scripts/build-deploy.ps1).

$ErrorActionPreference = 'Continue'

function Section($t) { Write-Host ''; Write-Host "== $t ==" -ForegroundColor Cyan }

Section 'A1. Live cmd.exe / git.exe instances (with parent process)'
try {
  $procs = Get-CimInstance Win32_Process -Filter "Name='cmd.exe' OR Name='git.exe'" -ErrorAction Stop
  if (-not $procs) { Write-Host '  (no cmd.exe / git.exe running right now)' }
  foreach ($p in $procs) {
    $parent = '?'
    try { $parent = (Get-CimInstance Win32_Process -Filter "ProcessId=$($p.ParentProcessId)" -ErrorAction SilentlyContinue).Name } catch { }
    Write-Host ("  pid={0,-6} {1,-9} ppid={2,-6} parent={3,-22} start={4}" -f $p.ProcessId, $p.Name, $p.ParentProcessId, $parent, $p.CreationDate)
    if ($p.CommandLine) { Write-Host ('      cmd: ' + $p.CommandLine) }
  }
} catch { Write-Host "  WMI query failed: $($_.Exception.Message)" }

Section 'A2. cmd.exe launches since boot (high frequency = high collision odds)'
try {
  $boot = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
  $log = Get-WinEvent -FilterHashtable @{ LogName = 'Security'; Id = 4688; StartTime = $boot } -ErrorAction Stop
  $cmdCount = 0; $gitCount = 0
  foreach ($e in $log) {
    $m = $e.Message
    if ($m -match 'cmd\.exe') { $cmdCount++ }
    if ($m -match 'git\.exe') { $gitCount++ }
  }
  Write-Host "  cmd.exe launches : $cmdCount"
  Write-Host "  git.exe launches : $gitCount"
  Write-Host '  (a big number means something polls by spawning processes - the soil for 0xc0000142)'
} catch {
  Write-Host '  Cannot read event id 4688 (process-creation auditing is off by default). Skipping.'
  Write-Host '  To measure it, run as Administrator:'
  Write-Host '    auditpol /set /subcategory:"Process Creation" /success:enable'
}

Section 'B1. Handles / ephemeral ports / process count'
Write-Host ('  processes        : {0}' -f (Get-Process).Count)
Write-Host ('  handles (total)  : {0}' -f ((Get-Process | Measure-Object -Property HandleCount -Sum).Sum))
try {
  $tcp = Get-NetTCPConnection -ErrorAction Stop
  $tw = ($tcp | Where-Object { $_.State -eq 'TimeWait' }).Count
  Write-Host ('  TCP connections  : {0}  (TIME_WAIT {1})' -f $tcp.Count, $tw)
} catch { Write-Host "  TCP stats failed: $($_.Exception.Message)" }
try {
  $dyn = netsh int ipv4 show dynamicport tcp
  Write-Host '  dynamic port range:'
  $dyn | Select-String 'Start Port|Number of Ports|Protocol' | ForEach-Object { Write-Host ('    ' + $_.Line.Trim()) }
} catch { }

Section 'B2. desktop heap (non-interactive heap exhaustion = classic 0xc0000142)'
$subKey = 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\SubSystems'
try {
  $win = (Get-ItemProperty $subKey -Name Windows -ErrorAction Stop).Windows
  $shared = ($win -split '\s+' | Where-Object { $_ -like 'SharedSection=*' }) -join ' '
  Write-Host "  $shared"
  Write-Host '  Format: SharedSection=<system>,<interactive desktop>,<non-interactive desktop> (KB)'
  Write-Host '  A small third value (e.g. 512) makes console-process startup fail under load.'
} catch { Write-Host "  read failed: $($_.Exception.Message)" }

Section 'B3. Logged-on sessions'
try { query session 2>$null | ForEach-Object { Write-Host ('  ' + $_) } } catch { Write-Host '  query session unavailable' }

Section 'C. Security / hardening / editor agents that hook other processes'
$suspects = '360', 'huorong', 'hrsword', 'qqpcmgr', 'Tencent', 'kxe', 'kav', 'avp', 'nod32', 'ekrn', 'MsMpEng', 'SEP', 'sophos', 'mcafee', 'eset', 'Trae', 'Code', 'GitHubDesktop', 'Docker', 'vmware', 'vbox'
Get-Process -ErrorAction SilentlyContinue |
  Where-Object { $n = $_.ProcessName; $suspects | Where-Object { $n -match $_ } } |
  Select-Object -Unique ProcessName, Id |
  Sort-Object ProcessName |
  ForEach-Object { Write-Host ("  {0,-20} pid={1}" -f $_.ProcessName, $_.Id) }

Section 'D. How to read the result'
Write-Host @'
  A2 shows many git.exe launches -> PrivHub git-backup probes every 60s;
                                    fix: configurable absolute git path + longer interval
  B1 near a limit                -> handle/socket leak; fix the leak first
  B2 third value small           -> raise SharedSection (reboot) or spawn less from services
  C shows a security/agent tool  -> exit it for a day and see if the error disappears
  nothing obvious                -> catch it live: when the dialog appears DO NOT click OK,
                                    then run (in another CMD):
                                    wmic process where "name='cmd.exe' or name='git.exe'" get ProcessId,ParentProcessId,CommandLine
'@

Write-Host ''
Write-Host 'Cheapest live capture (do this before clicking OK on the error box):' -ForegroundColor Yellow
Write-Host '  wmic process where "name=''cmd.exe'' or name=''git.exe''" get ProcessId,ParentProcessId,CommandLine' -ForegroundColor Yellow
