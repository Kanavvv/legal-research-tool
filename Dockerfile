FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download both AI models INTO the image at build time, so the
# container never needs to reach the internet for them at startup
RUN python -c "from sentence_transformers import SentenceTransformer, CrossEncoder; SentenceTransformer('multi-qa-mpnet-base-dot-v1'); CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')"

# Never try to check Hugging Face online at runtime -- use the baked-in cache only
ENV HF_HUB_OFFLINE=1

COPY main.py .
COPY search.py .
COPY chroma_db/ ./chroma_db/

CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
