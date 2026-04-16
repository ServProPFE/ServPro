param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectId,

    [Parameter(Mandatory = $false)]
    [string]$Region = "europe-west1",

    [Parameter(Mandatory = $false)]
    [string]$ArtifactRepo = "servpro",

    [Parameter(Mandatory = $true)]
    [string]$MongoDbUri,

    [Parameter(Mandatory = $true)]
    [string]$JwtSecret,

    [Parameter(Mandatory = $false)]
    [string]$PythonAiService = "http://localhost:5000"
)

$ErrorActionPreference = "Stop"

Set-StrictMode -Version Latest

function Require-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' is not installed or not in PATH."
    }
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Invoke-Gcloud {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args,

        [Parameter(Mandatory = $false)]
        [switch]$AllowFailure
    )

    $output = & gcloud @Args 2>&1
    $exitCode = $LASTEXITCODE

    if (-not $AllowFailure -and $exitCode -ne 0) {
        $cmdText = ($Args -join " ")
        throw "gcloud command failed ($exitCode): gcloud $cmdText`n$output"
    }

    return $output
}

function Assert-ProjectIdFormat {
    param([string]$Value)

    # GCP project IDs are lowercase, 6-30 chars, start with a letter, and can include digits/hyphens.
    if ($Value -notmatch '^[a-z][a-z0-9-]{4,28}[a-z0-9]$') {
        throw "Invalid ProjectId '$Value'. Use the project ID (example: servpro-492013), not the project name."
    }
}

function Assert-ProjectExists {
    param([string]$Value)

    Invoke-Gcloud -Args @("projects", "describe", $Value, "--format", "value(projectId)") | Out-Null
}

function Assert-BillingEnabled {
    param([string]$Value)

    $billingStatus = (Invoke-Gcloud -Args @("billing", "projects", "describe", $Value, "--format", "value(billingEnabled)")).ToString().Trim()
    if ($billingStatus -ne "True") {
        throw "Billing is not enabled on project '$Value'. Enable billing first in Google Cloud Console, then rerun this script."
    }
}

function Build-Image {
    param(
        [string]$ServiceFolder,
        [string]$ImageUri
    )

    Write-Step "Building image for $ServiceFolder"
    Invoke-Gcloud -Args @("builds", "submit", $ServiceFolder, "--tag", $ImageUri, "--quiet") | Out-Null
}

function Deploy-Service {
    param(
        [string]$Name,
        [string]$ImageUri,
        [int]$Port,
        [string]$EnvFile
    )

    Write-Step "Deploying Cloud Run service: $Name"

    $args = @(
        "run", "deploy", $Name,
        "--image", $ImageUri,
        "--region", $Region,
        "--platform", "managed",
        "--allow-unauthenticated",
        "--port", "$Port"
    )

    if ($EnvFile) {
        $args += @("--env-vars-file", $EnvFile)
    }

    $args += @("--quiet")
    Invoke-Gcloud -Args $args | Out-Null
}

function Get-ServiceUrl {
    param([string]$Name)

    $result = Invoke-Gcloud -Args @("run", "services", "describe", $Name, "--region", $Region, "--format", "value(status.url)")
    $url = ($result.ToString()).Trim()
    if (-not $url) {
        throw "Unable to resolve URL for Cloud Run service '$Name'."
    }
    return $url
}

Require-Command "gcloud"

$activeAccount = ((Invoke-Gcloud -Args @("auth", "list", "--filter=status:ACTIVE", "--format", "value(account)")).ToString()).Trim()
if (-not $activeAccount) {
    throw "No active gcloud account. Run: gcloud auth login"
}

Assert-ProjectIdFormat -Value $ProjectId
Assert-ProjectExists -Value $ProjectId
Assert-BillingEnabled -Value $ProjectId

$root = $PSScriptRoot
$backendDir = Join-Path $root "ServProBackend"
$dashboardDir = Join-Path $root "ServProDashboard"
$frontendDir = Join-Path $root "ServProFrontEnd"

if (-not (Test-Path $backendDir)) { throw "Missing folder: $backendDir" }
if (-not (Test-Path $dashboardDir)) { throw "Missing folder: $dashboardDir" }
if (-not (Test-Path $frontendDir)) { throw "Missing folder: $frontendDir" }

$registryHost = "$Region-docker.pkg.dev"
$backendImage = "$registryHost/$ProjectId/$ArtifactRepo/backend:latest"
$dashboardImage = "$registryHost/$ProjectId/$ArtifactRepo/dashboard:latest"
$frontendImage = "$registryHost/$ProjectId/$ArtifactRepo/frontend:latest"

Write-Step "Setting active project"
Invoke-Gcloud -Args @("config", "set", "project", $ProjectId) | Out-Null

Write-Step "Enabling required APIs"
Invoke-Gcloud -Args @("services", "enable", "run.googleapis.com", "cloudbuild.googleapis.com", "artifactregistry.googleapis.com", "containerregistry.googleapis.com", "--project", $ProjectId, "--quiet") | Out-Null

Write-Step "Ensuring Artifact Registry repository exists"
$repoExists = $true
try {
    Invoke-Gcloud -Args @("artifacts", "repositories", "describe", $ArtifactRepo, "--location", $Region, "--project", $ProjectId) | Out-Null
}
catch {
    $repoExists = $false
}

if (-not $repoExists) {
    Invoke-Gcloud -Args @("artifacts", "repositories", "create", $ArtifactRepo, "--repository-format", "docker", "--location", $Region, "--project", $ProjectId, "--quiet") | Out-Null
}

Write-Step "Configuring Docker auth for Artifact Registry"
Invoke-Gcloud -Args @("auth", "configure-docker", $registryHost, "--quiet") | Out-Null

Build-Image -ServiceFolder $backendDir -ImageUri $backendImage
Build-Image -ServiceFolder $dashboardDir -ImageUri $dashboardImage
Build-Image -ServiceFolder $frontendDir -ImageUri $frontendImage

$backendEnvFile = Join-Path $root "backend.cloudrun.env.yaml"
$dashboardEnvFile = Join-Path $root "dashboard.cloudrun.env.yaml"
$frontendEnvFile = Join-Path $root "frontend.cloudrun.env.yaml"

try {
    # First backend deploy uses local fallback CORS; updated after frontend/dashboard URLs are known.
    @"
NODE_ENV: "production"
MONGODB_URI: "$MongoDbUri"
JWT_SECRET: "$JwtSecret"
PYTHON_AI_SERVICE: "$PythonAiService"
CORS_ORIGINS: "http://localhost:5173,http://localhost:5174"
"@ | Set-Content -Path $backendEnvFile -Encoding UTF8

    Deploy-Service -Name "backend" -ImageUri $backendImage -Port 4000 -EnvFile $backendEnvFile
    $backendUrl = Get-ServiceUrl -Name "backend"

    @"
VITE_API_BASE_URL: "$backendUrl"
"@ | Set-Content -Path $dashboardEnvFile -Encoding UTF8

    @"
VITE_API_BASE_URL: "$backendUrl"
"@ | Set-Content -Path $frontendEnvFile -Encoding UTF8

    Deploy-Service -Name "dashboard" -ImageUri $dashboardImage -Port 5174 -EnvFile $dashboardEnvFile
    Deploy-Service -Name "frontend" -ImageUri $frontendImage -Port 5173 -EnvFile $frontendEnvFile

    $dashboardUrl = Get-ServiceUrl -Name "dashboard"
    $frontendUrl = Get-ServiceUrl -Name "frontend"

    # Redeploy backend with Cloud Run frontend origins allowed.
    @"
NODE_ENV: "production"
MONGODB_URI: "$MongoDbUri"
JWT_SECRET: "$JwtSecret"
PYTHON_AI_SERVICE: "$PythonAiService"
CORS_ORIGINS: "$frontendUrl,$dashboardUrl,http://localhost:5173,http://localhost:5174"
"@ | Set-Content -Path $backendEnvFile -Encoding UTF8

    Deploy-Service -Name "backend" -ImageUri $backendImage -Port 4000 -EnvFile $backendEnvFile
    $backendUrl = Get-ServiceUrl -Name "backend"

    Write-Step "Deployment complete"
    Write-Host "Backend  : $backendUrl"
    Write-Host "Dashboard: $dashboardUrl"
    Write-Host "Frontend : $frontendUrl"
}
finally {
    if (Test-Path $backendEnvFile) { Remove-Item $backendEnvFile -Force }
    if (Test-Path $dashboardEnvFile) { Remove-Item $dashboardEnvFile -Force }
    if (Test-Path $frontendEnvFile) { Remove-Item $frontendEnvFile -Force }
}
