# database.py
import os
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Charge .env en local (inoffensif en prod)
load_dotenv()

def _ensure_ssl_if_azure(url: str) -> str:
    """
    Si l'URL pointe vers Azure Postgres (*.postgres.database.azure.com)
    et qu'il n'y a pas de sslmode, on ajoute sslmode=require.
    """
    if not url:
        return url
    if "postgres.database.azure.com" not in url or "sslmode=" in url:
        return url

    # Ajout propre du paramètre sslmode=require
    parsed = urlparse(url)
    q = dict(parse_qsl(parsed.query))
    q.setdefault("sslmode", "require")
    new_query = urlencode(q)
    return urlunparse(parsed._replace(query=new_query))

# Récupère DATABASE_URL (App Settings sur Azure, .env en local)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL est manquant (définis-le dans les App Settings Azure ou .env)")

DATABASE_URL = _ensure_ssl_if_azure(DATABASE_URL)

# Engine SQLAlchemy avec options adaptées à App Service
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,     # évite les connexions mortes
    pool_recycle=300,       # recycle les connexions (5 min)
    future=True,
    echo=False,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
Base = declarative_base()

# Dépendance FastAPI pour obtenir une session par requête
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
