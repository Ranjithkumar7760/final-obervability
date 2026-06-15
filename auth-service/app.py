import jwt
import datetime
import requests
from flask import Flask, request, jsonify
from functools import wraps
import os
from flask_cors import CORS
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor

provider = TracerProvider()
exporter = OTLPSpanExporter(endpoint="http://otel-collector:4317", insecure=True)
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("auth-service")

app = Flask(__name__)
CORS(app)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'poc-secret-key-2024')
ORDER_SERVICE_URL = os.getenv('ORDER_SERVICE_URL', 'http://localhost:5001')

users = {
    'user1': 'pass123',
    'demo': 'demo123'
}

# ── Login ──────────────────────────────────────────────
@app.route('/login', methods=['POST'])
def login():
    with tracer.start_as_current_span("auth-login") as span:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        span.set_attribute("user.name", username)
        if username in users and users[username] == password:
            token = jwt.encode({
                'user': username,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
            }, app.config['SECRET_KEY'], algorithm='HS256')
            span.set_attribute("auth.status", "success")
            return jsonify({'token': token, 'username': username})
        span.set_attribute("auth.status", "failed")
        return jsonify({'error': 'Invalid credentials'}), 401

# ── Place Order: validate token → forward to Order Service ──
@app.route('/place-order', methods=['POST'])
def place_order():
    with tracer.start_as_current_span("auth-validate-token") as span:
        # Step 1: Validate JWT token from React
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        try:
            decoded = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            username = decoded['user']
            span.set_attribute("auth.status", "valid")
            span.set_attribute("user.name", username)
        except Exception as e:
            span.set_attribute("auth.status", "invalid")
            return jsonify({'error': 'Invalid token'}), 401

        # Step 2: Forward to Order Service with username
        data = request.json
        data['username'] = username
        response = requests.post(
            f"{ORDER_SERVICE_URL}/create-order",
            json=data,
            headers={'Authorization': request.headers.get('Authorization')}
        )
        return jsonify(response.json()), response.status_code

@app.route('/api/auth/health', methods=['GET'])
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "auth-service"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
