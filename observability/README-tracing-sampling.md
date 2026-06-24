# Tracing Sampling Modes

The tracing strategy for the Docker Compose environment is controlled from one file:

```env
observability/tracing-config.env
```

Change only `TRACING_MODE`:

```env
TRACING_MODE=HEAD
```

Supported values:

| Mode | Behavior |
| --- | --- |
| `NONE` | Disables OpenTelemetry instrumentation in the Flask services. The app still works, but no new traces are exported. |
| `HEAD` | Uses 100% head sampling in every Flask service. This is equivalent to `OTEL_TRACES_SAMPLER=always_on`. |
| `PROBABILISTIC` | Uses 10% trace ID ratio sampling in every Flask service. This is equivalent to `OTEL_TRACES_SAMPLER=traceidratio` and `OTEL_TRACES_SAMPLER_ARG=0.1`. |
| `TAIL` | Services export 100% of traces to the OpenTelemetry Collector. The collector applies tail sampling and keeps traces with `ERROR` status. |

## Run An Experiment

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
```

Tail sampling:

```env
TRACING_MODE=TAIL
```

The `TAIL` mode uses `observability/otel-collector-config-tail.yaml`, selected automatically by `observability/collector-entrypoint.sh`. The other modes use `observability/otel-collector-config.yaml`.

## Notes For Measurement

- Clear old Jaeger traces between experiment modes by recreating the stack.
- In `TAIL` mode, successful traces are not expected to appear unless they contain an `ERROR` status, because the configured policy keeps only error traces.
- Use k6 or the existing traffic generator to produce identical workloads for each mode.
