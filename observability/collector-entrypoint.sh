#!/bin/sh
set -eu

MODE=$(printf '%s' "${TRACING_MODE:-HEAD}" | tr '[:lower:]' '[:upper:]')

case "$MODE" in
  NONE|HEAD|PROBABILISTIC)
    CONFIG=/etc/otelcol/otel-collector-config.yaml
    ;;
  TAIL)
    CONFIG=/etc/otelcol/otel-collector-config-tail.yaml
    ;;
  *)
    echo "Invalid TRACING_MODE=$MODE. Use one of: NONE, HEAD, PROBABILISTIC, TAIL" >&2
    exit 1
    ;;
esac

echo "Starting OpenTelemetry Collector with TRACING_MODE=$MODE and config=$CONFIG"
exec /otelcol-contrib --config="$CONFIG"
