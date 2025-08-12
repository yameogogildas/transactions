# main.py
import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from database import engine, Base
import models  # tes modèles doivent hériter de Base

# Routers
from routes.authRoutes import auth_router
from routes.transactionRoutes import transaction_router
from routes.utilisateurRoutes import utilisateur_router
from routes.tauxChangeRoutes import taux_change_router
from routes.supervisionRoutes import supervision_router
from routes.alertesRoutes import alertes_router

app = FastAPI(
    title="API Gestion Transactions Numériques",
    description="API pour gérer les utilisateurs, transactions, taux de change, supervision et alertes.",
    version="1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# 🔐 CORS
# Pour tester rapidement sur Azure, ouvre à tous (*). Ensuite remplace par ton domaine React:
# p.ex. ["https://<ton-front>.azurestaticapps.net", "http://localhost:3000"]
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*")
allow_origins = ["*"] if ALLOWED_ORIGINS == "*" else [o.strip() for o in ALLOWED_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 📦 Création des tables au démarrage (au lieu d'exécuter à l'import)
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

# ✅ Gestionnaire d’erreur 422
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logging.error(f"Erreur de validation pour {request.url} : {exc.errors()}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# 🧩 Routers
app.include_router(auth_router)
app.include_router(transaction_router)
app.include_router(utilisateur_router)
app.include_router(taux_change_router)
app.include_router(supervision_router)
app.include_router(alertes_router)

# Healthcheck pratique pour Azure
@app.get("/health")
def health():
    return {"status": "ok"}
