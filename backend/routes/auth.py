from flask import Blueprint, jsonify, request
from models import db, Actor
from flask_jwt_extended import create_access_token
import datetime
import bcrypt
import time
from collections import defaultdict, Counter

auth_bp = Blueprint('auth', __name__)

# In-memory storage for login attempts
# Structure: {actor_id: [timestamp1, timestamp2, ...]}
login_attempts = defaultdict(list)
# Structure: {actor_id: locked_until_timestamp}
locked_accounts = {}

# Constants
MAX_ATTEMPTS = 5
LOCKOUT_DURATION = 30 * 60  # 30 minutes in seconds

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        actor_id = data.get('actorId')
        password = data.get('password')
        
        print(f"Login attempt with Actor ID: {actor_id}")
        
        if not actor_id or not password:
            return jsonify({"error": "Actor ID and password are required"}), 400
        
        # Convert actor_id to integer if it's a string
        if isinstance(actor_id, str) and actor_id.isdigit():
            actor_id = int(actor_id)
        
        # Check if account is locked
        current_time = time.time()
        if actor_id in locked_accounts:
            lock_until = locked_accounts[actor_id]
            if current_time < lock_until:
                remaining_minutes = int((lock_until - current_time) / 60) + 1
                print(f"Account {actor_id} is locked. Remaining time: {remaining_minutes} minutes")
                return jsonify({"error": f"Too many failed attempts. Try again after {remaining_minutes} minutes."}), 429
            else:
                # Lock period has expired, remove from locked accounts
                del locked_accounts[actor_id]
                # Clear previous login attempts
                login_attempts[actor_id] = []
        
        # Find user by actor_id
        try:
            user = Actor.query.filter_by(actor_id=actor_id).first()
            
            if not user:
                print(f"No user found with actor_id: {actor_id}")
                # Record failed attempt for non-existent users too
                record_failed_attempt(actor_id)
                return jsonify({"error": "Invalid credentials"}), 401
                
            print(f"User found: {user.actor_name}")
            
        except Exception as e:
            print(f"Database error: {e}")
            return jsonify({"error": "Database error occurred"}), 500
        
        # Check password
        login_successful = False
        if hasattr(user, 'password'):
            if bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
                login_successful = True
            else:
                print("Password mismatch")
                record_failed_attempt(actor_id)
                return jsonify({"error": "Invalid credentials"}), 401
        else:
            # If the user doesn't have a password field, use a default check
            # This is just for development - in production, all users should have passwords
            print("User has no password field, using default check")
            if password == "default":
                login_successful = True
            else:
                record_failed_attempt(actor_id)
                return jsonify({"error": "Invalid credentials"}), 401
        
        # Check if user is active (if status field exists)
        if hasattr(user, 'status') and user.status != 'A':
            print(f"User account is inactive: {user.status}")
            return jsonify({"error": "Account is inactive"}), 403
        
        # If we got here, login was successful
        # Clear login attempts for this user
        if actor_id in login_attempts:
            login_attempts[actor_id] = []
        
        # Determine if user is admin based on role_id
        is_admin = False
        if hasattr(user, 'role_id'):
            is_admin = user.role_id == 11
        
        # Create user identity object
        user_identity = {
            "user_id": user.actor_id,
            "name": user.actor_name,
            "email": user.email_id if hasattr(user, 'email_id') else "",
            "role": "admin" if is_admin else "user",
            "role_id": user.role_id if hasattr(user, 'role_id') else None
        }
        
        # Create access token
        access_token = create_access_token(
            identity=user_identity,
            expires_delta=datetime.timedelta(days=1)
        )
        
        print(f"Login successful for user: {user.actor_name}, role: {'admin' if is_admin else 'user'}")
        
        return jsonify({
            "token": access_token,
            "user": user_identity
        }), 200
        
    except Exception as e:
        print("Login error:", e)
        return jsonify({"error": "An error occurred during login"}), 500

def record_failed_attempt(actor_id):
    """Record a failed login attempt and lock account if necessary"""
    current_time = time.time()
    
    # Add current timestamp to the list of attempts
    login_attempts[actor_id].append(current_time)
    
    # Keep only attempts from the last hour to avoid unlimited growth
    one_hour_ago = current_time - 3600
    login_attempts[actor_id] = [t for t in login_attempts[actor_id] if t > one_hour_ago]
    
    # Check if we need to lock the account
    recent_attempts = login_attempts[actor_id]
    if len(recent_attempts) >= MAX_ATTEMPTS:
        # Lock account for LOCKOUT_DURATION seconds
        locked_accounts[actor_id] = current_time + LOCKOUT_DURATION
        print(f"Account {actor_id} locked until {datetime.datetime.fromtimestamp(locked_accounts[actor_id])}")

@auth_bp.route('/logout', methods=['POST'])
def logout():
    # In a stateless JWT system, the client simply discards the token
    # Send headers to prevent caching to help with browser back button issues
    response = jsonify({"message": "Logged out successfully"})
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response, 200