FROM python:3.11-slim

# (Optionnel) outils de build si tu compiles des libs natives
RUN apt-get update && apt-get install -y --no-install-recommends build-essential curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Déps Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code
COPY . .

# Uvicorn écoute sur 8000
EXPOSE 8000

# Démarrage (prod). En dev on overridera la commande dans docker-compose.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
