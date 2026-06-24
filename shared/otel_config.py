import os


_REQUESTS_INSTRUMENTED = False


class _NoopSpan:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def set_attribute(self, *_args, **_kwargs):
        return self


class _NoopTracer:
    def start_as_current_span(self, *_args, **_kwargs):
        return _NoopSpan()


def configure_tracing(app, service_name):
    """Configure OpenTelemetry once per service from TRACING_MODE."""
    mode = os.getenv("TRACING_MODE", "HEAD").strip().upper()

    if mode == "NONE":
        app.logger.info("OpenTelemetry tracing disabled for %s", service_name)
        return _NoopTracer()

    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.flask import FlaskInstrumentor
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    provider = TracerProvider(
        resource=Resource.create({"service.name": service_name}),
        sampler=_sampler_for_mode(mode),
    )

    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317")
    insecure = _env_bool("OTEL_EXPORTER_OTLP_INSECURE", default=True)
    exporter = OTLPSpanExporter(endpoint=endpoint, insecure=insecure)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    FlaskInstrumentor().instrument_app(app)
    _instrument_requests_once()

    app.logger.info("OpenTelemetry tracing mode for %s: %s", service_name, mode)
    return trace.get_tracer(service_name)


def _sampler_for_mode(mode):
    from opentelemetry.sdk.trace.sampling import ALWAYS_ON, ParentBased, TraceIdRatioBased

    if mode in {"HEAD", "TAIL"}:
        return ParentBased(ALWAYS_ON)
    if mode == "PROBABILISTIC":
        sample_rate = float(os.getenv("OTEL_TRACES_SAMPLER_ARG", "0.1"))
        return ParentBased(TraceIdRatioBased(sample_rate))
    raise RuntimeError(
        "Invalid TRACING_MODE. Use one of: NONE, HEAD, PROBABILISTIC, TAIL"
    )


def _instrument_requests_once():
    global _REQUESTS_INSTRUMENTED
    if not _REQUESTS_INSTRUMENTED:
        from opentelemetry.instrumentation.requests import RequestsInstrumentor

        RequestsInstrumentor().instrument()
        _REQUESTS_INSTRUMENTED = True


def _env_bool(name, default=False):
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() == "true"
