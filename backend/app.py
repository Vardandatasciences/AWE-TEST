from flask import Flask, session
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_login import LoginManager
from config import Config
from models import db, Actor
from routes.activities import activities_bp
from routes.actors import actors_bp
from routes.customers import customers_bp
from routes.tasks import tasks_bp
from routes.reports import reports_bp
from routes.messages import messages_bp, init_app
from routes.analysis import analysis_bp
from routes.auth import auth_bp
from routes.forgotpassword import forgotpassword_bp
from routes.profile import profile_bp
from routes.changepassword import changepassword_bp
from routes.diary import diary_bp
from flask_bcrypt import Bcrypt
from routes.users import users_bp
from datetime import timedelta
from flask_mail import Mail


app = Flask(__name__)
app.config.from_object(Config)
app.secret_key = 'your_secret_key'  # Make sure this is set for sessions to work

# Set session timeout to 30 minutes (1800 seconds)
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)
app.config['SESSION_REFRESH_EACH_REQUEST'] = True

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'

@login_manager.user_loader
def load_user(user_id):
    return Actor.query.get(int(user_id))
# Setup CORS properly - this is critical to fix the error
CORS(app, supports_credentials=True, origins=["http://localhost:3000"], methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
 
# Remove or comment out this section as it's redundant
# CORS(app, resources={
#     r"/customers/*": {"origins": "http://localhost:3000"},
#     r"/delete_customer/*": {"origins": "http://localhost:3000"},
#     r"/add_customer": {"origins": "http://localhost:3000"},
#     r"/update_customer": {"origins": "http://localhost:3000"}
# })

# Initialize extensions
db.init_app(app)
jwt = JWTManager(app)
bcrypt = Bcrypt(app)
 
# Register blueprints
app.register_blueprint(activities_bp)
app.register_blueprint(actors_bp)
app.register_blueprint(customers_bp)
app.register_blueprint(tasks_bp)
app.register_blueprint(reports_bp)
app.register_blueprint(messages_bp)
app.register_blueprint(analysis_bp, url_prefix='/analysis')
app.register_blueprint(auth_bp, url_prefix='/')
app.register_blueprint(profile_bp)
app.register_blueprint(changepassword_bp)
app.register_blueprint(diary_bp, url_prefix='/diary')
app.register_blueprint(forgotpassword_bp)
app.register_blueprint(users_bp, url_prefix='/users')

# Initialize the email thread
init_app(app)

# Mail settings
app.config['MAIL_SERVER'] = 'smtp.gmail.com'  # Or your mail server
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'your-email@gmail.com'  # Replace with your email
app.config['MAIL_PASSWORD'] = 'your-app-password'    # Replace with your app password
app.config['MAIL_DEFAULT_SENDER'] = ('ProSync Support', 'your-email@gmail.com')

mail = Mail(app)

@app.before_request
def make_session_permanent():
    session.permanent = True

@app.route('/')
def index():
    return "AAWE API Server is running"

# For Flask 2.0+, you may need more specific CORS configuration:
@app.after_request
def after_request(response):
    # Only add header if it doesn't exist
    if 'Access-Control-Allow-Origin' not in response.headers:
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    if 'Access-Control-Allow-Headers' not in response.headers:
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    if 'Access-Control-Allow-Methods' not in response.headers:
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS')
    if 'Access-Control-Allow-Credentials' not in response.headers:
        response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
