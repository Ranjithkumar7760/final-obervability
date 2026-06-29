param(
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot "observability/tracing-config.env"
$kubeTracingConfig = Join-Path $repoRoot "kubernetes/tracing-config.yaml"
$kubeCollectorConfig = Join-Path $repoRoot "kubernetes/otel-collector-config.yaml"

if (-not (Test-Path $envFile)) {
  throw "Missing tracing config file: $envFile"
}

$modeLine = Get-Content $envFile | Where-Object { $_ -match '^\s*TRACING_MODE\s*=' } | Select-Object -First 1
if (-not $modeLine) {
  throw "TRACING_MODE is not defined in $envFile"
}

$mode = (($modeLine -split '=', 2)[1]).Trim().Trim('"').Trim("'").ToUpperInvariant()
$validModes = @("NONE", "HEAD", "PROBABILISTIC", "TAIL")
if ($validModes -notcontains $mode) {
  throw "Invalid TRACING_MODE=$mode. Use one of: $($validModes -join ', ')"
}

$collectorSource = if ($mode -eq "TAIL") {
  Join-Path $repoRoot "observability/otel-collector-config-tail.yaml"
} else {
  Join-Path $repoRoot "observability/otel-collector-config.yaml"
}

if (-not (Test-Path $collectorSource)) {
  throw "Missing collector config source: $collectorSource"
}

$tracingConfigContent = @"
apiVersion: v1
kind: ConfigMap
metadata:
  name: tracing-config
  namespace: ecommerce-poc
data:
  TRACING_MODE: "$mode"
"@

Set-Content -Path $kubeTracingConfig -Value $tracingConfigContent -Encoding ascii

$collectorLines = Get-Content $collectorSource
$indentedCollector = ($collectorLines | ForEach-Object { "    $_" }) -join [Environment]::NewLine
$collectorConfigContent = @"
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: ecommerce-poc
data:
  config.yaml: |
$indentedCollector
"@

Set-Content -Path $kubeCollectorConfig -Value $collectorConfigContent -Encoding ascii

Write-Host "Synced Kubernetes tracing files for TRACING_MODE=$mode"
Write-Host "Updated: kubernetes/tracing-config.yaml"
Write-Host "Updated: kubernetes/otel-collector-config.yaml"

if ($Apply) {
  kubectl apply -f (Join-Path $repoRoot "kubernetes/tracing-config.yaml")
  kubectl apply -f (Join-Path $repoRoot "kubernetes/otel-collector-config.yaml")
  kubectl apply -f (Join-Path $repoRoot "kubernetes/microservices.yaml")

  kubectl rollout restart deployment/otel-collector -n ecommerce-poc
  kubectl rollout restart deployment/auth-service -n ecommerce-poc
  kubectl rollout restart deployment/order-service -n ecommerce-poc
  kubectl rollout restart deployment/payment-service -n ecommerce-poc
  kubectl rollout restart deployment/notification-service -n ecommerce-poc
  kubectl rollout restart deployment/user-service -n ecommerce-poc

  Write-Host "Applied tracing mode and restarted tracing-aware deployments."
}
