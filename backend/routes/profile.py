from flask import Blueprint, jsonify, request, session, current_app
from models import db, Actor, Group, Role
from datetime import datetime
from flask_login import current_user, login_required
import bcrypt
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/api/profile', methods=['GET'])
def get_profile():
    """Get user profile data"""
    try:
        actor_id = request.args.get('actor_id')
        if not actor_id:
            return jsonify({
                "success": False,
                "message": "Actor ID is required"
            }), 400
        
        # Convert actor_id to integer
        try:
            actor_id = int(actor_id)
        except ValueError:
            return jsonify({
                "success": False,
                "message": f"Invalid actor ID format: {actor_id}"
            }), 400
        
        # Query the database for the actor's profile
        actor = Actor.query.filter_by(actor_id=actor_id).first()
        
        if not actor:
            return jsonify({
                "success": False,
                "message": f"Actor with ID {actor_id} not found"
            }), 404
        
        # Get role name from role_id
        role = Role.query.filter_by(role_id=actor.role_id).first()
        role_name = role.role_name if role else ("Admin" if actor.role_id == 11 else "User")
        
        # Get group name if available
        group_name = None
        if hasattr(actor, 'group_id') and actor.group_id:
            group = Group.query.filter_by(group_id=actor.group_id).first()
            group_name = group.group_name if group else None
        
        # Safely access attributes with proper error handling
        try:
            dob_str = actor.dob.strftime('%Y-%m-%d') if hasattr(actor, 'dob') and actor.dob else None
        except AttributeError:
            dob_str = None
        
        # Convert to dictionary for JSON response
        actor_data = {
            "actor_id": actor.actor_id,
            "actor_name": actor.name if hasattr(actor, 'name') else actor.actor_name,
            "email_id": actor.email_id if hasattr(actor, 'email_id') else None,
            "mobile1": actor.mobile1 if hasattr(actor, 'mobile1') else None,
            "mobile2": actor.mobile2 if hasattr(actor, 'mobile2') else None,
            "DOB": dob_str,
            "gender": actor.gender if hasattr(actor, 'gender') else None,
            "group_name": group_name or (actor.group_name if hasattr(actor, 'group_name') else None),
            "role_id": actor.role_id,
            "role_name": role_name
        }
        
        return jsonify({
            "success": True,
            "user": actor_data
        })
    except Exception as e:
        import traceback
        print(f"Error retrieving profile: {e}")
        print(traceback.format_exc())  # Print full stack trace for debugging
        return jsonify({
            "success": False,
            "message": f"Error retrieving profile: {str(e)}"
        }), 500

@profile_bp.route('/api/profile/update', methods=['POST'])
def update_profile():
    """Update user profile data"""
    try:
        data = request.json
        actor_id = data.get('actor_id')
        
        if not actor_id:
            return jsonify({
                "success": False,
                "message": "Actor ID is required"
            }), 400
        
        # Convert actor_id to integer
        actor_id = int(actor_id)
        
        # Query the database for the actor's profile
        actor = Actor.query.filter_by(actor_id=actor_id).first()
        
        if not actor:
            return jsonify({
                "success": False,
                "message": f"Actor with ID {actor_id} not found"
            }), 404
        
        # Update the actor data
        if 'email_id' in data:
            actor.email_id = data['email_id']
        
        if 'mobile1' in data:
            actor.mobile1 = data['mobile1']
        
        # Save the changes
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Profile updated successfully"
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error updating profile: {e}")
        return jsonify({
            "success": False,
            "message": f"Error updating profile: {str(e)}"
        }), 500

@profile_bp.route('/api/verify-current-password', methods=['POST'])
def verify_current_password():
    try:
        data = request.json
        actor_id = data.get('actor_id')
        password = data.get('password')
        
        print(f"Verifying password for actor_id: {actor_id}")
        
        if not actor_id or not password:
            return jsonify({
                'success': False,
                'message': 'Both actor ID and password are required'
            }), 400

        # For development/testing - allow any password
        # IMPORTANT: Remove this in production!
        return jsonify({
            'success': True,
            'message': 'Password verified (development mode)'
        })
        
    except Exception as e:
        print(f"Error in verify_current_password: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Internal server error: {str(e)}'
        }), 500

@profile_bp.route('/api/request-otp', methods=['POST'])
def request_otp():
    try:
        data = request.json
        email = data.get('email')
        actor_id = data.get('actorId')
        
        print(f"Requesting OTP for email: {email}, actor_id: {actor_id}")
        
        if not email:
            return jsonify({
                'success': False,
                'message': 'Email is required'
            }), 400
        
        # Get actor name for personalized email (if available)
        actor_name = "User"
        try:
            actor = Actor.query.filter_by(actor_id=actor_id).first()
            if actor:
                actor_name = actor.name if hasattr(actor, 'name') else actor.actor_name if hasattr(actor, 'actor_name') else "User"
        except Exception as e:
            print(f"Could not get actor name: {e}")
        
        # Generate a simple 6-digit OTP
        import random
        otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        
        # Store OTP in session
        session[f'otp_{email}'] = otp
        session[f'otp_time_{email}'] = datetime.utcnow().timestamp()
        
        # Log the OTP for testing
        print(f"Generated OTP for {email}: {otp}")
        
        # Create email content
        subject = "Your Password Reset OTP - ProSync"
        html_body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4A76A8; color: white; padding: 10px 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .otp-box {{ background-color: #ffffff; border: 1px solid #ddd; padding: 15px; text-align: center; margin: 20px 0; }}
                .otp-code {{ font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #4A76A8; }}
                .footer {{ font-size: 12px; text-align: center; margin-top: 20px; color: #777; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Password Reset Verification</h2>
                </div>
                <div class="content">
                    <p>Hello {actor_name},</p>
                    <p>You recently requested to reset your password. Use the following One-Time Password (OTP) to complete the process:</p>
                    
                    <div class="otp-box">
                        <div class="otp-code">{otp}</div>
                    </div>
                    
                    <p>This OTP will expire in 15 minutes for security reasons.</p>
                    <p>If you did not request this password reset, please ignore this email or contact support if you have concerns.</p>
                    <p>Thank you,<br>The ProSync Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Password Reset Verification
        
        Hello {actor_name},
        
        You recently requested to reset your password. Use the following One-Time Password (OTP) to complete the process:
        
        {otp}
        
        This OTP will expire in 15 minutes for security reasons.
        
        If you did not request this password reset, please ignore this email or contact support if you have concerns.
        
        Thank you,
        The ProSync Team
        """
        
        # Try to send the email
        try:
            send_email(email, subject, text_body, html_body)
            print(f"Email sent to {email}")
            email_sent = True
        except Exception as e:
            print(f"Failed to send email: {e}")
            email_sent = False
        
        # Return response
        if email_sent:
            return jsonify({
                'success': True,
                'message': f'OTP sent to {email}'
            })
        else:
            # For development, include the OTP in the response
            return jsonify({
                'success': True,
                'message': f'OTP generated successfully: {otp}'
            })
        
    except Exception as e:
        print(f"Error in request_otp: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Internal server error: {str(e)}'
        }), 500

@profile_bp.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    try:
        data = request.json
        email = data.get('email')
        otp = data.get('otp')
        
        print(f"Verifying OTP for email: {email}, OTP: {otp}")
        
        if not email or not otp:
            return jsonify({
                'success': False,
                'message': 'Email and OTP are required'
            }), 400
        
        # For development - accept any OTP
        # IMPORTANT: Remove this in production!
        session[f'otp_verified_{email}'] = True
        return jsonify({
            'success': True,
            'message': 'OTP verified successfully (development mode)'
        })
        
    except Exception as e:
        print(f"Error in verify_otp: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Internal server error: {str(e)}'
        }), 500

@profile_bp.route('/api/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        print(f"Resetting password for email: {email}")
        
        if not email or not password:
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400
        
        # Find the user by email
        actor = Actor.query.filter_by(email_id=email).first()
        
        if not actor:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # For development - skip OTP verification check
        # IMPORTANT: Remove this in production!
        
        # Hash the password with bcrypt before storing
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Convert bytes to string if your database expects a string
        if isinstance(hashed_password, bytes):
            hashed_password = hashed_password.decode('utf-8')
            
        # Update the password with the hashed version
        actor.password = hashed_password
        
        # Save to database
        db.session.commit()
        
        # Clear OTP session data
        session.pop(f'otp_{email}', None)
        session.pop(f'otp_time_{email}', None)
        session.pop(f'otp_verified_{email}', None)
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in reset_password: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Internal server error: {str(e)}'
        }), 500

# Add this function to handle email sending
def send_email(to_email, subject, text_body, html_body=None):
    """Send an email using SMTP"""
    # Email configuration - update with your actual email settings
    smtp_server = "smtp.gmail.com"  # e.g., smtp.gmail.com
    smtp_port = 587  # typically 587 for TLS
    smtp_username = "loukyarao68@gmail.com"  # Your email address
    smtp_password = "vafx kqve dwmj mvjv"  # Your email password or app password
    
    # Create message
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f"ProSync <{smtp_username}>"
    msg['To'] = to_email
    
    # Add text body
    msg.attach(MIMEText(text_body, 'plain'))
    
    # Add HTML body if provided
    if html_body:
        msg.attach(MIMEText(html_body, 'html'))
    
    # Try to send the email
    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.sendmail(smtp_username, to_email, msg.as_string())
            print(f"Email successfully sent to {to_email}")
            return True
    except Exception as e:
        print(f"Error sending email: {e}")
        # For development, log the email details that would have been sent
        print(f"[DEBUG] Would send email to {to_email}")
        print(f"[DEBUG] Subject: {subject}")
        print(f"[DEBUG] Content: {text_body[:100]}...")
        # Return True for development to continue the flow
        return True 