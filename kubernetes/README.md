# E-Commerce POC - Kubernetes Deployment Guide

This directory contains the Kubernetes manifests to deploy the entire microservices application along with the observability stack (Jaeger, OpenTelemetry Collector, Prometheus, and Grafana) on any Kubernetes cluster (e.g., Minikube, Kind, or managed cloud services like GKE/EKS).

## Architecture & Configuration

*   **Microservices Deployment (`microservices.yaml`)**:
    *   Deploys `auth-service`, `order-service`, `payment-service`, `notification-service`, `user-service`, and `frontend`.
    *   Creates a `NodePort` service for the frontend on port `30000` to allow accessing it easily from the host machine.
    *   Uses standard DNS-based service discovery (e.g. `http://auth-service:5001`).
*   **Observability Stack (`observability.yaml`)**:
    *   Deploys Jaeger (Distributed Tracing), OpenTelemetry Collector, Prometheus (Metrics Database), and Grafana (Visualizations).
    *   Creates a `NodePort` service for Grafana on port `30010`.
*   **Platform-Agnostic Metrics Discovery**:
    *   The Prometheus configuration (`prometheus-config.yaml`) sets up secure scraping of Kubernetes native cAdvisor metrics via Kubelet API.
    *   Grafana dashboards (`grafana-dashboards.yaml`) use dynamically unified PromQL queries utilizing the `label_replace` function to aggregate metrics from both Docker Compose (`container_label_com_docker_compose_service`) and Kubernetes (`container`) environments seamlessly.

---

## Getting Started

### 1. Build and Load Docker Images

If you are using **Minikube** or **Kind** for local development, you should build the Docker images and load them directly into your cluster's image registry.

#### For Minikube:
```bash
# Point your shell to Minikube's Docker daemon
eval $(minikube docker-env)

# Build the microservices
docker build -f auth-service/Dockerfile -t auth-service:latest .
docker build -f order-service/Dockerfile -t order-service:latest .
docker build -f payment-service/Dockerfile -t payment-service:latest .
docker build -f notification-service/Dockerfile -t notification-service:latest .
docker build -f user-service/Dockerfile -t user-service:latest .
docker build -t frontend:latest ./frontend
```

#### For Kind:
```bash
# Build the microservices locally
docker build -f auth-service/Dockerfile -t auth-service:latest .
docker build -f order-service/Dockerfile -t order-service:latest .
docker build -f payment-service/Dockerfile -t payment-service:latest .
docker build -f notification-service/Dockerfile -t notification-service:latest .
docker build -f user-service/Dockerfile -t user-service:latest .
docker build -t frontend:latest ./frontend

# Load images into the Kind cluster
kind load docker-image auth-service:latest
kind load docker-image order-service:latest
kind load docker-image payment-service:latest
kind load docker-image notification-service:latest
kind load docker-image user-service:latest
kind load docker-image frontend:latest
```

---

### 2. Deploy Manifests to the Cluster

Apply the configurations in the following order:

```bash
# Create the namespace and deploy microservices
kubectl apply -f kubernetes/microservices.yaml

# Deploy config maps for OpenTelemetry and Prometheus
kubectl apply -f kubernetes/otel-collector-config.yaml
kubectl apply -f kubernetes/prometheus-config.yaml

# Deploy config maps for Grafana datasources and dashboards
kubectl apply -f kubernetes/grafana-dashboards.yaml

# Deploy the core observability stack pods and services
kubectl apply -f kubernetes/observability.yaml
```

---

### 3. Verify the Deployment

Check that all pods in the `ecommerce-poc` namespace are up and running:

```bash
kubectl get pods -n ecommerce-poc
```

### 4. Access the Applications

*   **Frontend UI**: Access via `http://<node-ip>:30000` (For Minikube, run `minikube service frontend -n ecommerce-poc`).
*   **Grafana Dashboards**: Access via `http://<node-ip>:30010` (For Minikube, run `minikube service grafana -n ecommerce-poc` or port-forward using `kubectl port-forward svc/grafana 30010:3010 -n ecommerce-poc`).
*   **Jaeger UI**: Port-forward using `kubectl port-forward svc/jaeger 16686:16686 -n ecommerce-poc`.
*   **Prometheus UI**: Port-forward using `kubectl port-forward svc/prometheus 9090:9090 -n ecommerce-poc`.

---

## Deploying to AWS EKS

Deploying to managed environments like AWS EKS requires pushing your Docker images to a registry (such as Amazon ECR) and ensuring Kubelet metrics are scraping correctly.

### 1. Build and Push Images to Amazon ECR
Create ECR repositories for your services and push the built images:

```bash
# Log in to Amazon ECR
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.<region>.amazonaws.com

# Build and tag your microservices (e.g. auth-service)
docker build -f auth-service/Dockerfile -t auth-service:latest .
docker tag auth-service:latest <aws_account_id>.dkr.ecr.<region>.amazonaws.com/auth-service:latest

# Push to your ECR repository
docker push <aws_account_id>.dkr.ecr.<region>.amazonaws.com/auth-service:latest
```
Repeat for all 6 microservices (`auth-service`, `order-service`, `payment-service`, `notification-service`, `user-service`, `frontend`).

### 2. Update Image Paths in Kubernetes Manifests
Update the `image:` fields in `kubernetes/microservices.yaml` from `auth-service:latest`, etc. to point to your ECR repository URLs:
```yaml
      containers:
        - name: auth-service
          image: <aws_account_id>.dkr.ecr.<region>.amazonaws.com/auth-service:latest
```

### 3. Service Access on AWS EKS
In EKS, local NodePorts (`30000`/`30010`) are accessible on node IPs, but it is recommended to change the service types to `LoadBalancer` to provision AWS NLB/ALB:
```yaml
# In kubernetes/microservices.yaml for frontend service:
spec:
  type: LoadBalancer
```

### 4. cAdvisor Metrics Scraping on EKS
* **Kubelet Metrics:** The prometheus configuration in `kubernetes/prometheus-config.yaml` is pre-configured to scrape cAdvisor metrics from the nodes using Kubelet's metrics endpoint `/metrics/cadvisor` via the Kubernetes API server proxy.
* **Security Groups:** Ensure that the security group of your EKS control plane allows ingress traffic on port `10250` (kubelet) from the node security groups so the API server can proxy scraping requests.
* **Compatibility:** Grafana dashboards (`grafana-dashboards.yaml`) automatically read these Kubernetes cAdvisor metrics (`container` labels) and populate CPU/Memory metrics dynamically.

