$conns = Get-NetTCPConnection | Where-Object { $_.RemoteAddress -eq '104.18.38.10' -or $_.RemoteAddress -eq '172.64.149.246' }
foreach ($c in $conns) {
    $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
    [PSCustomObject]@{
        PID = $c.OwningProcess
        ProcessName = $proc.ProcessName
        WindowTitle = $proc.MainWindowTitle
        State = $c.State
        RemoteAddress = $c.RemoteAddress
    }
}

