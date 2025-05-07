from flask import Blueprint, jsonify, request
from models import db, Actor
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import bcrypt
from datetime import datetime, timedelta
import hashlib
 
forgotpassword_bp = Blueprint('forgotpassword', __name__)
 
def generate_otp():
    return str(random.randint(100000, 999999))
 
def send_otp_via_email(email, otp):
    try:
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        smtp_email = "loukyarao68@gmail.com"
        smtp_password = "vafx kqve dwmj mvjv"
 
        msg = MIMEMultipart()
        msg['From'] = smtp_email
        msg['To'] = email
        msg['Subject'] = "Password Reset OTP"
 
        body = f"""
Dear User,
 
Your OTP for password reset is: {otp}
 
This OTP will expire in 10 minutes.
 
Please do not share this OTP with anyone.
 
Best regards,
AWE Team
"""
        msg.attach(MIMEText(body, 'plain'))
 
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.send_message(msg)
            print("OTP email sent successfully.")
            return True
    except Exception as e:
        print(f"Failed to send OTP: {e}")
        return False
 
def is_valid_password(password):
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    if not any(c in "@$!%*?&" for c in password):
        return False, "Password must contain at least one special character (@$!%*?&)"
    return True, "Password is valid"

def is_same_as_current_password(password, stored_password):
    # Check if new password matches the stored password (SHA256)
    sha256_hash = hashlib.sha256(password.encode()).hexdigest()
    if sha256_hash == stored_password:
        return True
    
    # Try bcrypt check if the password is stored in bcrypt format
    try:
        if bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8')):
            return True
    except Exception as e:
        print(f"Bcrypt check error: {e}")
        # If we get an error in bcrypt check, formats are different so passwords are likely different
        pass
    
    return False
 
# Store OTP and its expiry time
otp_store = {}
 
@forgotpassword_bp.route('/request-otp', methods=['POST'])
def request_otp():
    try:
        data = request.json
        email = data.get('email')
        actor_id = data.get('actorId')
 
        if not email or not actor_id:
            return jsonify({
                'success': False,
                'message': 'Both email and Actor ID are required'
            }), 400
 
        # Check if actor exists with matching email and actor_id
        actor = Actor.query.filter_by(email_id=email, actor_id=actor_id).first()
        if not actor:
            return jsonify({
                'success': False,
                'message': 'No account found with the provided Email and Actor ID combination'
            }), 404
 
        # Generate and store OTP with expiry time
        otp = generate_otp()
        otp_store[email] = {
            'otp': otp,
            'expiry': datetime.now() + timedelta(minutes=10),
            'actor_id': actor.actor_id
        }
 
        # Send OTP via email
        if send_otp_via_email(email, otp):
            return jsonify({
                'success': True,
                'message': 'OTP sent successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to send OTP'
            }), 500
 
    except Exception as e:
        print(f"Error in request_otp: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500
 
@forgotpassword_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    try:
        data = request.json
        email = data.get('email')
        otp = data.get('otp')
 
        # Check if OTP exists and is valid
        if email not in otp_store:
            return jsonify({
                'success': False,
                'message': 'No OTP request found'
            }), 400
 
        stored_data = otp_store[email]
        if datetime.now() > stored_data['expiry']:
            del otp_store[email]
            return jsonify({
                'success': False,
                'message': 'OTP has expired'
            }), 400
 
        if otp != stored_data['otp']:
            return jsonify({
                'success': False,
                'message': 'Invalid OTP'
            }), 400
 
        return jsonify({
            'success': True,
            'message': 'OTP verified successfully'
        })
 
    except Exception as e:
        print(f"Error in verify_otp: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500
 
@forgotpassword_bp.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.json
        email = data.get('email')
        new_password = data.get('password')
        confirm_password = data.get('confirmPassword')
 
        if email not in otp_store:
            return jsonify({
                'success': False,
                'message': 'Invalid password reset request'
            }), 400
 
        if new_password != confirm_password:
            return jsonify({
                'success': False,
                'message': 'Passwords do not match'
            }), 400
 
        # Validate password
        is_valid, message = is_valid_password(new_password)
        if not is_valid:
            return jsonify({
                'success': False,
                'message': message
            }), 400
 
        # Get actor_id from stored OTP data
        actor_id = otp_store[email]['actor_id']
       
        # Get user from database
        actor = Actor.query.filter_by(actor_id=actor_id).first()
        if not actor:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Check if new password is the same as the current password
        if is_same_as_current_password(new_password, actor.password):
            return jsonify({
                'success': False,
                'message': 'New password must be different from your current password'
            }), 400
           
        # Update password in database
        if actor:
            hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            actor.password = hashed_password
            db.session.commit()
           
            # Clear OTP data
            del otp_store[email]
           
            return jsonify({
                'success': True,
                'message': 'Password reset successful'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
 
    except Exception as e:
        print(f"Error in reset_password: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500
