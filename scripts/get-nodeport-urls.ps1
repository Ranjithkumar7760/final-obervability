param(
  [string]$Namespace = "ecommerce-poc"
)

$ErrorActionPreference = "Stop"

$nodes = kubectl get nodes -o json | ConvertFrom-Json
$node = $nodes.items | Select-Object -First 1
if (-not $node) {
  throw "No Kubernetes nodes found. Check your current kubectl context."
}

$externalIp = ($node.status.addresses | Where-Object { $_.type -eq "ExternalIP" } | Select-Object -First 1).address
$internalIp = ($node.status.addresses | Where-Object { $_.type -eq "InternalIP" } | Select-Object -First 1).address
$nodeIp = if ($externalIp) { $externalIp } else { $internalIp }

if (-not $nodeIp) {
  throw "Could not find an ExternalIP or InternalIP for node $($node.metadata.name)."
}

$services = kubectl get svc -n $Namespace -o json | ConvertFrom-Json

function Get-NodePortUrl {
  param(
    [string]$ServiceName,
    [string]$PortName
  )

  $service = $services.items | Where-Object { $_.metadata.name -eq $ServiceName } | Select-Object -First 1
  if (-not $service) {
    return $null
  }

  $port = if ($PortName) {
    $service.spec.ports | Where-Object { $_.name -eq $PortName } | Select-Object -First 1
  } else {
    $service.spec.ports | Select-Object -First 1
  }

  if (-not $port -or -not $port.nodePort) {
    return $null
  }

  return "http://${nodeIp}:$($port.nodePort)"
}

$frontendUrl = Get-NodePortUrl -ServiceName "frontend"
$grafanaUrl = Get-NodePortUrl -ServiceName "grafana"
$jaegerUrl = Get-NodePortUrl -ServiceName "jaeger" -PortName "ui"

Write-Host "Node IP: $nodeIp"
Write-Host ""
Write-Host "Frontend: $frontendUrl"
Write-Host "Grafana:  $grafanaUrl"
Write-Host "Jaeger:   $jaegerUrl"
Write-Host ""
Write-Host "k6 command:"
Write-Host "k6 run -e BASE_URL=$frontendUrl load-tests/checkout-flow.k6.js"
