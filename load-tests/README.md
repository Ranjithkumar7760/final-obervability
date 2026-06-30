# k6 Load Tests

This folder contains a k6 script for the current checkout flow:

```text
/api/auth/login -> /api/auth/place-order
```

Each successful order generates the distributed service chain:

```text
Auth -> Order -> Payment -> Notification -> User
```

## Install k6

On Windows, install k6 with one of these:

```powershell
winget install k6.k6
```

or:

```powershell
choco install k6
```

Verify:

```powershell
k6 version
```

## Run Against The EKS NodePort

First discover the current node IP and NodePort URLs:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/get-nodeport-urls.ps1
```

Then run k6 with the `Frontend` URL printed by the script:

```powershell
k6 run -e BASE_URL=http://<node-ip>:30000 load-tests/checkout-flow.k6.js
```

## Tune Load

```powershell
k6 run `
  -e BASE_URL=http://<node-ip>:30000 `
  -e SCENARIO=steady `
  -e VUS=20 `
  -e DURATION=10m `
  -e SLEEP_SECONDS=1 `
  load-tests/checkout-flow.k6.js
```

## Workload Patterns

Use the same workload patterns for each sampling mode so the comparison is fair.

### Steady Load

Constant virtual users for a fixed duration:

```powershell
k6 run `
  -e BASE_URL=http://<node-ip>:30000 `
  -e SCENARIO=steady `
  -e VUS=20 `
  -e DURATION=10m `
  load-tests/checkout-flow.k6.js
```

### Traffic Spike

Low baseline, sudden spike, then recovery:

```powershell
k6 run `
  -e BASE_URL=http://<node-ip>:30000 `
  -e SCENARIO=spike `
  -e BASE_VUS=5 `
  -e SPIKE_VUS=50 `
  load-tests/checkout-flow.k6.js
```

### Gradual Ramp

Gradually increases traffic, holds peak, then ramps down:

```powershell
k6 run `
  -e BASE_URL=http://<node-ip>:30000 `
  -e SCENARIO=ramp `
  -e PEAK_VUS=50 `
  load-tests/checkout-flow.k6.js
```

Recommended first-pass experiment matrix:

```text
Sampling modes: NONE, HEAD, PROBABILISTIC, TAIL
Workloads:      steady, spike, ramp
Runs:           12 total
```

For each run, record:

```text
k6 p95 latency
k6 request failure rate
Grafana CPU usage
Grafana memory usage
Prometheus request rate
Jaeger trace availability and trace count
```

Use small load first, then increase gradually while watching Grafana, Prometheus, and Jaeger.

## Check Observability

Frontend:

```text
http://<node-ip>:30000
```

Grafana:

```text
http://<node-ip>:30010
```

Jaeger:

```text
http://<node-ip>:31686
```

In `TAIL` sampling mode, successful traces appear as a sample, while error traces are always kept. Metrics dashboards should still show request rate and resource usage.
