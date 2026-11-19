Get-Process chrome | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object Id, MainWindowTitle

