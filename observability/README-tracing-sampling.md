# Tracing Sampling Modes

The tracing strategy for the Docker Compose environment is controlled from one file:

```env
observability/tracing-config.env
```

Change only `TRACING_MODE`:

```env
TRACING_MODE=HEAD
```

For Kubernetes/EKS, sync the env file into Kubernetes manifests and optionally deploy it:

```powershell
# Regenerate kubernetes/tracing-config.yaml and kubernetes/otel-collector-config.yaml
powershell -ExecutionPolicy Bypass -File scripts/sync-tracing-mode.ps1

# Regenerate, apply to the cluster, and restart tracing-aware deployments
powershell -ExecutionPolicy Bypass -File scripts/sync-tracing-mode.ps1 -Apply
```

Supported values:

| Mode | Behavior |
| --- | --- |
| `NONE` | Disables OpenTelemetry instrumentation in the Flask services. The app still works, but no new traces are exported. |
| `HEAD` | Uses 100% head sampling in every Flask service. This is equivalent to `OTEL_TRACES_SAMPLER=always_on`. |
| `PROBABILISTIC` | Uses 10% trace ID ratio sampling in every Flask service. This is equivalent to `OTEL_TRACES_SAMPLER=traceidratio` and `OTEL_TRACES_SAMPLER_ARG=0.1`, so Jaeger should show roughly 10% of successful traces after enough traffic. |
| `TAIL` | Services export 100% of traces to the OpenTelemetry Collector. The collector applies tail sampling, keeps all traces with `ERROR` status, and keeps a 50% sample of successful traces. |

## Run An Experiment

### Docker Compose

1. Edit `observability/tracing-config.env`.
2. Start or recreate the stack:

```bash
docker compose up -d --build
```

For clean repeatable experiments, recreate containers between modes:

```bash
docker compose down
docker compose up -d --build
```

If Docker Compose does not recreate containers after only changing the env file, force recreation:

```bash
docker compose up -d --build --force-recreate
```

### Kubernetes/EKS

1. Edit `observability/tracing-config.env`.
2. Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync-tracing-mode.ps1 -Apply
```

## Mode Examples

Baseline:

```env
TRACING_MODE=NONE
```

100% head sampling:

```env
TRACING_MODE=HEAD
```

10% probabilistic sampling:

```env
TRACING_MODE=PROBABILISTIC
OTEL_TRACES_SAMPLER_ARG=0.1
```

Tail sampling:

```env
TRACING_MODE=TAIL
```

The `TAIL` mode uses `observability/otel-collector-config-tail.yaml`, selected automatically by `observability/collector-entrypoint.sh`. The other modes use `observability/otel-collector-config.yaml`.

## Notes For Measurement

- Clear old Jaeger traces between experiment modes by recreating the stack.
- In `PROBABILISTIC` mode, successful traces are sampled at 10%, so run enough traffic and use a wider Jaeger lookback such as Last 1 Hour.
- In `TAIL` mode, successful traces are sampled at 50%, while error traces are always kept by the collector policy.
- Use k6 or the existing traffic generator to produce identical workloads for each mode.
