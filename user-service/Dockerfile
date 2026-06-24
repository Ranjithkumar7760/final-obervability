FROM python:3.11-slim
WORKDIR /app
COPY user-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY shared ./shared
COPY user-service/app.py .
EXPOSE 5005
CMD ["python", "app.py"]
