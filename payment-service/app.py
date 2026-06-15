import requests
import uuid
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
tracer = trace.get_tracer("payment-service")

app = Flask(__name__)
CORS(app)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

NOTIFICATION_SERVICE_URL = os.getenv('NOTIFICATION_SERVICE_URL', 'http://localhost:5003')

@app.route('/process-payment', methods=['POST'])
def process_payment():
    with tracer.start_as_current_span("payment-process") as span:
        data = request.json
        txn_id = "TXN-" + str(uuid.uuid4())[:8].upper()
        order_id = data.get('order_id')
        total = data.get('total', 0)

        span.set_attribute("payment.txn_id", txn_id)
        span.set_attribute("payment.amount", total)
        span.set_attribute("payment.status", "success")

        # Forward to Notification Service
        response = requests.post(
            f"{NOTIFICATION_SERVICE_URL}/send-notification",
            json={**data, "txn_id": txn_id},
            headers={'Authorization': request.headers.get('Authorization')}
        )
        return jsonify(response.json()), response.status_code

@app.route('/api/payment/health', methods=['GET'])
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "payment-service"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)
