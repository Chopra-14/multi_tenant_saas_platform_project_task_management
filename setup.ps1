# Ensure containers are up
docker-compose up -d

# Health check (optional)
curl.exe -s http://localhost:5000/api/health | ConvertFrom-Json | Format-List

# Register tenant
$tenantPayload = @{
    tenantName    = 'DemoCo'
    subdomain     = 'demo'
    adminEmail    = 'admin@demo.com'
    adminPassword = 'Demo@123'
    adminFullName = 'Demo Admin'
}

$registerResponse = Invoke-RestMethod -Method Post `
    -Uri http://localhost:5000/api/auth/register-tenant `
    -Headers @{ 'Content-Type' = 'application/json' } `
    -Body (ConvertTo-Json $tenantPayload -Compress)

Write-Host "\nRegister response:`n$registerResponse"

$jwt = $registerResponse.data.token
Write-Host "\nJWT obtained:`n$jwt"

if (-not $jwt) {
    Write-Error "Registration failed - aborting"
    return
}

# Create project
$projectPayload = @{
    name        = 'Demo Project'
    description = 'First project'
}

$projectResponse = Invoke-RestMethod -Method Post `
    -Uri http://localhost:5000/api/projects `
    -Headers @{ 'Content-Type' = 'application/json'; 'Authorization' = "Bearer $jwt" } `
    -Body (ConvertTo-Json $projectPayload -Compress)

Write-Host "\nProject creation response:`n$projectResponse"
$projectId = $projectResponse.data.id
Write-Host "Project ID: $projectId"

if (-not $projectId) {
    Write-Error "Project creation failed - aborting"
    return
}

# Create task
$taskPayload = @{
    title       = 'Setup repository'
    description = 'Initialize Git repo'
    priority    = 'high'
}

$taskResponse = Invoke-RestMethod -Method Post `
    -Uri "http://localhost:5000/api/tasks/$projectId" `
    -Headers @{ 'Content-Type' = 'application/json'; 'Authorization' = "Bearer $jwt" } `
    -Body (ConvertTo-Json $taskPayload -Compress)

Write-Host "\nTask creation response:`n$taskResponse"

# List data
Write-Host "\n--- Tenants ---"
Invoke-RestMethod -Uri http://localhost:5000/api/tenants -Headers @{ Authorization = "Bearer $jwt" } | Format-List

Write-Host "\n--- Projects ---"
Invoke-RestMethod -Uri http://localhost:5000/api/projects -Headers @{ Authorization = "Bearer $jwt" } | Format-List

Write-Host "\n--- Tasks for project $projectId ---"
Invoke-RestMethod -Uri "http://localhost:5000/api/tasks/$projectId" -Headers @{ Authorization = "Bearer $jwt" } | Format-List