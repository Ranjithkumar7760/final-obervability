FROM python:3.11-slim
WORKDIR /app
COPY auth-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY shared ./shared
COPY auth-service/app.py .
EXPOSE 5001
CMD ["python", "app.py"]
