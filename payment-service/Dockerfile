FROM python:3.11-slim
WORKDIR /app
COPY payment-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY shared ./shared
COPY payment-service/app.py .
EXPOSE 5003
CMD ["python", "app.py"]
