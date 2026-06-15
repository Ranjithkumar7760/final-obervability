import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
import os

provider = TracerProvider()
exporter = OTLPSpanExporter(endpoint="http://otel-collector:4317", insecure=True)
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("notification-service")

app = Flask(__name__)
CORS(app)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

USER_SERVICE_URL = os.getenv('USER_SERVICE_URL', 'http://localhost:5004')

@app.route('/send-notification', methods=['POST'])
def send_notification():
    with tracer.start_as_current_span("notification-send") as span:
        data = request.json
        order_id = data.get('order_id')
        txn_id = data.get('txn_id')
        username = data.get('username')

        span.set_attribute("notification.type", "email")
        span.set_attribute("notification.order_id", order_id)
        span.set_attribute("notification.status", "sent")

        # Forward to User Service (last in chain)
        response = requests.post(
            f"{USER_SERVICE_URL}/update-history",
            json=data,
            headers={'Authorization': request.headers.get('Authorization')}
        )
        return jsonify(response.json()), response.status_code

@app.route('/api/notification/health', methods=['GET'])
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "notification-service"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003)
