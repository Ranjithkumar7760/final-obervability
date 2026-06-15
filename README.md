# ShopPOC - E-Commerce Microservices Demo

A proof-of-concept e-commerce application built with **React** frontend and **Flask** microservices, all running in Docker containers.

## Architecture

```
Auth Service (port 5001) — JWT login/validation
    ↓
Order Service (port 5002) — create orders (status: pending)
    ↓
Payment Service (port 5003) — mock payment (user-initiated)
    ↓
Notification Service (port 5004) — send confirmation
    ↓
User Service (port 5005) — update order history
```

Each service is an independent container. The frontend (Nginx + React) proxies API requests to the correct backend.

## Flow

1. **Sign In** → Auth Service returns JWT token
2. **Browse products** → Add items to cart
3. **Place Order** → Order Service creates order with `pending` status
4. **Pay Now** → User initiates payment via Payment Service
   - Payment Service updates Order Service → `paid`
   - Payment Service calls Notification Service
   - Payment Service calls User Service (history)

## Run

```bash
docker compose up -d
```

Then open **http://localhost:3000**

## Credentials

| Username | Password |
|----------|----------|
| `demo`   | `demo123`|
| `user1`  | `pass123`|

## Tech Stack

- **Frontend:** React 18 (built into Nginx image)
- **Backend:** Flask 3.0 (Python 3.11)
- **Auth:** JWT (PyJWT)
- **Containers:** Docker Compose
- **Storage:** In-memory (POC — no database)
- **Observability:** OpenTelemetry (SDK & Collector), Jaeger (Distributed Tracing), Prometheus (Metrics storage), Grafana (Visualization), cAdvisor (Container Resource monitoring)

## Observability Stack

The POC includes a fully automated observability stack containing Jaeger, OpenTelemetry Collector, Prometheus, cAdvisor, and Grafana.

### How to Run

Build and run the entire stack:
```bash
docker compose up -d --build
```

### Verification Endpoints

After launching the services, you can verify and access the observability tools at the following URLs:

| Service | URL | Description |
|---|---|---|
| **Jaeger UI** | [http://localhost:16686](http://localhost:16686) | Distributed Tracing visualizer |
| **Prometheus UI** | [http://localhost:9090](http://localhost:9090) | Metrics query browser |
| **Grafana UI** | [http://localhost:3010](http://localhost:3010) | Observability dashboards & panels |

### Pre-provisioned Dashboards

Grafana is configured with automatic datasource and dashboard provisioning. When you open Grafana, the Prometheus datasource is pre-configured and connected. You can find the following pre-built dashboards in the **Observability** folder:

1. **Dashboard 1: Microservices Overview**
   - Shows Requests/sec per service (calculated via spanmetrics)
   - Total Trace count / Span count
   - Active Service Activity distribution
2. **Dashboard 2: Container Resource Usage**
   - Shows CPU usage by service (cAdvisor)
   - Memory usage by service (cAdvisor)
   - Incoming & Outgoing network traffic per service (cAdvisor)
3. **Dashboard 3: Research Dashboard**
   - Compiles request rates, throughput, CPU utilization, memory utilization, and average service response latency trends

