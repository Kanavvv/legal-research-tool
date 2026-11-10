FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model at build time, same as the main backend
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('multi-qa-mpnet-base-dot-v1')"

ENV HF_HUB_OFFLINE=1

COPY weekly_pipeline.py .

CMD ["python", "weekly_pipeline.py"]
