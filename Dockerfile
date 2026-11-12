FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download both AI models INTO the image at build time
RUN python -c "from sentence_transformers import SentenceTransformer, CrossEncoder; SentenceTransformer('multi-qa-mpnet-base-dot-v1'); CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')"

ENV HF_HUB_OFFLINE=1

COPY main.py .
COPY search.py .
COPY guard.py .
COPY plans.py .
COPY features.py .
COPY extras.py .
COPY safety.py .
COPY wa_more.py .
COPY admin.py .
COPY tools.py .
COPY control.py .
COPY growth.py .
<<<<<<< HEAD
COPY library.py .
COPY cases.py .
=======
>>>>>>> origin/main

CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
