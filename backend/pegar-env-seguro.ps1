# Script para pegar valores en .env de forma SEGURA
# Cada Read-Host pide el valor y se guarda directamente al archivo, sin pasar por el chat
# Ejecutar: powershell -ExecutionPolicy Bypass -File pegar-env-seguro.ps1

$envPath = "c:\Users\Cesar\Documents\GRUPO EMPRESARIAL REYES\PROYECTOS\libreriasQR\backend\.env"

Write-Host "=== Pegar variables de entorno (seguro) ===" -ForegroundColor Cyan
Write-Host "El archivo .env esta vacio. Pegar cada valor cuando lo pida." -ForegroundColor Yellow
Write-Host "Los valores NO aparecen en el chat ni en pantalla." -ForegroundColor Yellow
Write-Host ""

# Leer .env actual en memoria
$lines = Get-Content $envPath

function Set-EnvValue {
    param([string]$VarName, [string]$Prompt)
    Write-Host ""
    Write-Host "--- $VarName ---" -ForegroundColor Green
    Write-Host $Prompt -ForegroundColor Gray
    $secValue = Read-Host -AsSecureString
    if ($secValue.Length -eq 0) {
        Write-Host "  [salteado, queda vacio]" -ForegroundColor DarkYellow
        return
    }
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secValue)
    $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    $script:lines = $script:lines | ForEach-Object {
        if ($_ -match "^$VarName=") { "$VarName=$plain" } else { $_ }
    }
    Write-Host "  [guardado]" -ForegroundColor Green
}

Set-EnvValue "SUPABASE_URL" "Pega aca la URL de tu proyecto (https://hbqkcawfkqpyttjiumtp.supabase.co)"
Set-EnvValue "SUPABASE_SERVICE_ROLE_KEY" "Ve a Supabase Dashboard > Settings > API > service_role key. Pegala aca."
Set-EnvValue "SUPABASE_DB_URL" "Ve a Supabase Dashboard > Settings > Database > Connection string > URI. Pegala aca (es postgresql://postgres:...@db....supabase.co:5432/postgres)"
Set-EnvValue "GROQ_API_KEY" "Ve a https://console.groq.com/keys. Pega la key que empieza con gsk_..."
Set-EnvValue "NVIDIA_API_KEY" "Ve a https://build.nvidia.com. Pega la key que empieza con nvapi-..."

# Guardar .env final
$lines | Set-Content $envPath -NoNewline
Write-Host ""
Write-Host "=== .env guardado ===" -ForegroundColor Cyan
Write-Host "Verifico que no quedo vacio..." -ForegroundColor Gray
Get-Content $envPath | ForEach-Object {
    $name = ($_ -split '=',2)[0]
    $val = ($_ -split '=',2)[1]
    $state = if ([string]::IsNullOrEmpty($val)) { '<EMPTY>' } else { '<SET>' }
    Write-Host "  $name=$state"
}
Write-Host ""
Write-Host "Listo. Vuelve al chat y avisa 'listo'." -ForegroundColor Green