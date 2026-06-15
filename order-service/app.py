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
tracer = trace.get_tracer("order-service")

app = Flask(__name__)
CORS(app)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

PAYMENT_SERVICE_URL = os.getenv('PAYMENT_SERVICE_URL', 'http://localhost:5002')

@app.route('/create-order', methods=['POST'])
def create_order():
    with tracer.start_as_current_span("order-create") as span:
        data = request.json
        order_id = "ORD-" + str(uuid.uuid4())[:8].upper()
        username = data.get('username')
        items = data.get('items', [])
        total = data.get('total', 0)

        span.set_attribute("order.id", order_id)
        span.set_attribute("order.total", total)
        span.set_attribute("user.name", username)

        # Forward to Payment Service
        response = requests.post(
            f"{PAYMENT_SERVICE_URL}/process-payment",
            json={**data, "order_id": order_id},
            headers={'Authorization': request.headers.get('Authorization')}
        )
        return jsonify(response.json()), response.status_code

@app.route('/api/order/health', methods=['GET'])
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "order-service"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
