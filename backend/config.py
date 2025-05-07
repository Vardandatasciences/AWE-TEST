import os
from dotenv import load_dotenv
from datetime import timedelta

# Load environment variables from .env file if it exists
load_dotenv()

class Config:
    # Database configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI', 'mysql+mysqlconnector://root:root@localhost/aawe')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # CORS settings     
    CORS_HEADERS = 'Content-Type'
    
    # Secret key for session management
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
    
    # JWT settings
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24) 