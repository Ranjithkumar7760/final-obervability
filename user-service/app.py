from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from shared.otel_config import configure_tracing

app = Flask(__name__)
CORS(app)
tracer = configure_tracing(app, "user-service")

@app.route('/update-history', methods=['POST'])
def update_history():
    with tracer.start_as_current_span("user-update-history") as span:
        data = request.json
        username = data.get('username')
        order_id = data.get('order_id')
        txn_id = data.get('txn_id')
        total = data.get('total', 0)
        items = data.get('items', [])

        span.set_attribute("user.name", username)
        span.set_attribute("user.order_id", order_id)
        span.set_attribute("user.history_updated", True)

        # Final service — return full result back up the chain
        return jsonify({
            "status": "success",
            "message": "Order completed successfully",
            "trace_chain": "Auth → Order → Payment → Notification → User",
            "order_id": order_id,
            "transaction_id": txn_id,
            "username": username,
            "items": items,
            "total": total,
            "notification": "sent",
            "history": "updated"
        })

@app.route('/api/user/health', methods=['GET'])
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "user-service"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5005)
