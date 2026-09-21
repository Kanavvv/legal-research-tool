FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY search.py .
COPY chroma_db/ ./chroma_db/

# Cloud Run provides the port to listen on via the PORT env var (usually 8080)
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
