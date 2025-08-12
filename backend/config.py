import os
from fastapi_jwt_auth import AuthJWT
from pydantic import BaseModel
from dotenv import load_dotenv

# Chargement du fichier .env
load_dotenv()

class Settings(BaseModel):
    authjwt_secret_key: str = os.getenv('JWT_SECRET')
    authjwt_access_token_expires: int = 3600
    authjwt_refresh_token_expires: int = 86400

@AuthJWT.load_config
def get_config():
    return Settings()
