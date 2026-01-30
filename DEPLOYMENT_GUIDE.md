# Backend Deployment Guide

This guide explains how to deploy the Medical Diagnosis Expert System API as a backend service.

## Overview

The API is built with **FastAPI** and includes:
- `/diagnose` endpoint for medical diagnosis
- Three modes: rule-based, RAG, and hybrid
- Dependencies: FastAPI, Uvicorn, FAISS, Sentence Transformers, LLM clients

---

## Prerequisites

- Python 3.9+
- pip package manager
- Git
- Cloud platform account (optional, for deployment)
- API keys for LLM providers (Gemini, OpenAI, or local LLM)

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/saad2134/expert-system-medical-diagnosis
cd expert-system-medical-diagnosis
```

### 2. Create Virtual Environment

```bash
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Build RAG Index (if not already built)

```bash
python src/build_rag_index.py
```

This creates the vector index in `data/rag_index/`.

### 5. Configure Environment Variables

Create a `.env` file in the `src/` directory:

```bash
# LLM Provider Configuration (choose one or more)

# For Google Gemini
GOOGLE_API_KEY=your_gemini_api_key_here

# For OpenAI (fallback)
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Model selection
LLM_MODEL=gemini-pro  # or gpt-4, gpt-3.5-turbo
```

### 6. Run the API Server

```bash
cd src
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`.

Access the interactive API documentation at `http://localhost:8000/docs`.

---

## API Endpoint Specification

### POST /diagnose

Diagnoses medical conditions based on symptoms.

**Request Body:**
```json
{
  "symptoms": {
    "fever": true,
    "cough": true,
    "sore_throat": false
  },
  "text": "I feel very weak and have a bad headache",
  "mode": "hybrid"
}
```

**Parameters:**
- `symptoms` (object): Key-value pairs of symptom names (booleans)
- `text` (string, optional): User's description of symptoms
- `mode` (string): `"rules"`, `"rag"`, or `"hybrid"`

**Response Examples:**

**Rule Mode:**
```json
{
  "mode": "rules",
  "matches": [
    {
      "name": "Flu",
      "severity": "moderate",
      "emergency": false,
      "explanation": "Common viral infection with fever and respiratory symptoms."
    }
  ]
}
```

**RAG Mode:**
```json
{
  "mode": "rag",
  "retrieved": [
    {
      "score": 0.892,
      "text": "Fever with cough and body pain often indicates viral infections like flu or COVID-19."
    }
  ]
}
```

**Hybrid Mode:**
```json
{
  "mode": "hybrid",
  "rule_matches": [...],
  "retrieved": [...],
  "llm_summary": "Based on symptoms of fever and cough, possible conditions include Flu (moderate confidence)..."
}
```

---

## Deployment Options

### Option 1: Docker (Recommended)

#### Create Dockerfile

Create a `Dockerfile` in the project root:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/
COPY data/ ./data/

# Expose port
EXPOSE 8000

# Run the API server
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Create .dockerignore

```
venv/
.git/
.gitignore
__pycache__/
*.pyc
*.pyo
*.pyd
.pytest_cache/
.env
```

#### Build and Run Docker Container

```bash
# Build image
docker build -t medical-diagnosis-api .

# Run container
docker run -d \
  -p 8000:8000 \
  --env-file src/.env \
  --name diagnosis-api \
  medical-diagnosis-api
```

#### Push to Docker Registry (for cloud deployment)

```bash
# Tag for Docker Hub
docker tag medical-diagnosis-api yourusername/medical-diagnosis-api:latest

# Push to Docker Hub
docker push yourusername/medical-diagnosis-api:latest
```

---

### Option 2: Render (Easiest Cloud Platform)

1. Create a `render.yaml` file:

```yaml
services:
  - type: pserv
    name: medical-diagnosis-api
    runtime: python
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn src.api:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: GOOGLE_API_KEY
        sync: false
      - key: PORT
        value: 8000
```

2. Push your code to GitHub with the `.env` variables set in Render's dashboard.

3. Connect Render to your GitHub repository and deploy.

---

### Option 3: Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and initialize:
```bash
railway login
railway init
```

3. Select "Python" as the runtime and configure:
   - **Start Command**: `uvicorn src.api:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**: Add your API keys

4. Deploy:
```bash
railway up
```

---

### Option 4: AWS (EC2 or ECS)

#### Using EC2

1. Launch an EC2 instance (Ubuntu 22.04 recommended)

2. SSH into the instance:
```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

3. Install dependencies:
```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv git
```

4. Clone repository and setup:
```bash
git clone https://github.com/saad2134/expert-system-medical-diagnosis
cd expert-system-medical-diagnosis
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

5. Install and configure Nginx as reverse proxy:
```bash
sudo apt install -y nginx
```

6. Configure Nginx (edit `/etc/nginx/sites-available/default`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

7. Restart Nginx:
```bash
sudo systemctl restart nginx
```

8. Create systemd service (`/etc/systemd/system/medical-diagnosis.service`):
```ini
[Unit]
Description=Medical Diagnosis API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/expert-system-medical-diagnosis
Environment="PATH=/home/ubuntu/expert-system-medical-diagnosis/venv/bin"
EnvironmentFile=/home/ubuntu/expert-system-medical-diagnosis/src/.env
ExecStart=/home/ubuntu/expert-system-medical-diagnosis/venv/bin/uvicorn src.api:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

9. Enable and start service:
```bash
sudo systemctl enable medical-diagnosis
sudo systemctl start medical-diagnosis
```

#### Using AWS ECS + Fargate

1. Push Docker image to AWS ECR
2. Create ECS task definition with your container
3. Set up Application Load Balancer
4. Deploy ECS service

---

### Option 5: Google Cloud Run

```bash
# Build image
gcloud builds submit --tag gcr.io/PROJECT-ID/medical-diagnosis-api

# Deploy
gcloud run deploy medical-diagnosis-api \
  --image gcr.io/PROJECT-ID/medical-diagnosis-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=your-key
```

---

### Option 6: Heroku

1. Create `Procfile`:
```
web: uvicorn src.api:app --host 0.0.0.0 --port $PORT
```

2. Create `runtime.txt`:
```
python-3.11
```

3. Deploy:
```bash
heroku create your-app-name
heroku config:set GOOGLE_API_KEY=your-key
git push heroku main
```

---

## Production Considerations

### Security

1. **API Keys**: Never commit `.env` files. Use platform environment variables.
2. **CORS**: Configure allowed origins in FastAPI:
   ```python
   from fastapi.middleware.cors import CORSMiddleware

   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://your-frontend.com"],
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```
3. **Rate Limiting**: Implement rate limiting with `slowapi` or similar.
4. **HTTPS**: Use TLS certificates (Let's Encrypt with Nginx, or platform-provided).

### Performance

1. **Caching**: Cache RAG index in memory (already implemented).
2. **Load Balancing**: Use multiple instances behind a load balancer.
3. **CDN**: Serve static assets via CDN if applicable.

### Monitoring

1. **Logs**: Use platform logging (CloudWatch, Datadog, etc.)
2. **Health Checks**: Add a `/health` endpoint:
   ```python
   @app.get("/health")
   def health():
       return {"status": "healthy"}
   ```

### Scaling

- **Horizontal Scaling**: Deploy multiple instances behind a load balancer
- **Vertical Scaling**: Increase instance size for higher compute needs

---

## Testing the Deployed API

```bash
# Test with curl
curl -X POST https://your-api-url.com/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "symptoms": {"fever": true, "cough": true},
    "mode": "rules"
  }'
```

---

## Troubleshooting

### Common Issues

1. **Port already in use**: Use a different port or kill the process
   ```bash
   # On Windows
   netstat -ano | findstr :8000
   taskkill /PID <PID> /F
   ```

2. **Import errors**: Ensure all dependencies are installed
   ```bash
   pip install -r requirements.txt --upgrade
   ```

3. **RAG index not found**: Run `build_rag_index.py` first

4. **LLM API errors**: Verify API keys in environment variables

---

## Connecting from Next.js Frontend

See `NEXTJS_FRONTEND_EXAMPLE.tsx` for a complete React component that connects to this API.

Set the environment variable in your Next.js `.env.local`:
```
NEXT_PUBLIC_API_URL=https://your-deployed-api-url.com
```

---

## Support

For issues or questions:
- Open an issue on GitHub
- Check FastAPI docs: https://fastapi.tiangolo.com
- Review deployment platform documentation
