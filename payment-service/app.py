import requests
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from shared.otel_config import configure_tracing

app = Flask(__name__)
CORS(app)
tracer = configure_tracing(app, "payment-service")

NOTIFICATION_SERVICE_URL = os.getenv('NOTIFICATION_SERVICE_URL', 'http://localhost:5004')

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
    app.run(host="0.0.0.0", port=5003)
