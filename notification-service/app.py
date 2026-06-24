import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from shared.otel_config import configure_tracing

app = Flask(__name__)
CORS(app)
tracer = configure_tracing(app, "notification-service")

USER_SERVICE_URL = os.getenv('USER_SERVICE_URL', 'http://localhost:5005')

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
    app.run(host="0.0.0.0", port=5004)
