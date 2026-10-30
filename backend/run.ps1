Get-Content ..\.env | ForEach-Object {
    if ($_ -match '^\s*([^#=\s]+)\s*=\s*(.*)$') {
        $k = $matches[1]
        $v = $matches[2]
        [System.Environment]::SetEnvironmentVariable($k, $v, 'Process')
    }
}
mvn spring-boot:run
