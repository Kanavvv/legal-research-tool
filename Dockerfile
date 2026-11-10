FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download both AI models INTO the image at build time
RUN python -c "from sentence_transformers import SentenceTransformer, CrossEncoder; SentenceTransformer('multi-qa-mpnet-base-dot-v1'); CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')"

ENV HF_HUB_OFFLINE=1

COPY main.py .
COPY search.py .

CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
