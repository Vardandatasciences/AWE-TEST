from flask import Blueprint, jsonify, request, current_app,Flask
from models import db, Message, Customer, Group, MessageQueue
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import re
import threading
import time
import os
from sqlalchemy import desc

messages_bp = Blueprint('messages', __name__)

# Email configuration - update with your SMTP settings
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'your-email@gmail.com')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', 'your-password')
EMAIL_USE_TLS = True
EMAIL_FROM = os.environ.get('EMAIL_FROM', 'your-email@gmail.com')

# Global flag to control the background thread
email_thread_running = False
email_thread = None

# Flag to track if the thread has been started
thread_started = False

def send_email(recipient, subject, message_body):
    """Send an email using SMTP"""
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_FROM
        msg['To'] = recipient
        msg['Subject'] = subject
        
        msg.attach(MIMEText(message_body, 'html'))
        
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            if EMAIL_USE_TLS:
                server.starttls()
            server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
            server.send_message(msg)
        
        print(f"Email sent successfully to {recipient}")
        return True
    except Exception as e:
        print(f"Failed to send email to {recipient}: {e}")
        return False

def process_message_queue(app):
    """Process the message queue and send emails"""
    with app.app_context():  # Create application context for the thread
        print("Email processing thread started within app context")
        while email_thread_running:
            try:

                db.session.remove()  # Close the session to clear any old state
                db.session.commit()
                # Get current date and time
                now = datetime.now()
                current_date = now.date()
                current_time = now.time()

                # print(current_date,current_time)
                
                # print(f"Checking for messages at {now.strftime('%Y-%m-%d %H:%M:%S')}")

                
                # Find messages that are scheduled for now or earlier
                messages_to_send = MessageQueue.query.filter(
                    MessageQueue.time <= current_time,
                    MessageQueue.date <= current_date,
                    MessageQueue.status == "Scheduled"
                    
                ).all()

                # groups = Group.query.all()
                # print(messages_to_send)
                
                if messages_to_send:
                    print(f"Found {len(messages_to_send)} messages to process")
                
                for message in messages_to_send:
                    # Check if the time has passed for today's messages
                    if message.date == current_date and message.time > current_time:
                        print(f"Message {message.s_no} scheduled for later today at {message.time}")
                        continue
                    
                    # Send the email
                    print(f"Sending email to {message.email_id}")
                    subject = "Scheduled Message"
                    success = send_email(message.email_id, subject, message.message_des)
                    
                    # Update the message status
                    if success:
                        message.status = "Sent"
                        print(f"Email sent successfully to {message.email_id}")
                    else:
                        message.status = "Failed"
                        print(f"Failed to send email to {message.email_id}")
                    
                    db.session.commit()
                
                # Sleep for 5 seconds before checking again
                time.sleep(30)
            except Exception as e:
                print(f"Error processing message queue: {e}")
                time.sleep(30)  # Still sleep on error to avoid tight loop

def start_email_thread(app=None):
    """Start the background thread for email processing"""
    global email_thread_running, email_thread, thread_started
    
    if email_thread_running:
        print("Email thread is already running")
        return
    
    if thread_started:
        print("Thread has already been started once")
        return
    
    if app is None:
        app = current_app._get_current_object()  # Get the current Flask app
    
    email_thread_running = True
    thread_started = True
    email_thread = threading.Thread(target=process_message_queue, args=(app,))
    email_thread.daemon = True  # Thread will exit when main thread exits
    email_thread.start()
    print("Email processing thread started")

# Register a function to start the email thread when the app is ready
def init_app(app: Flask):
    """Initialize the email thread when the app is ready"""
    # In Flask 2.0+, we need to use a different approach since before_first_request is removed
    # Start the thread immediately
    with app.app_context():
        start_email_thread(app)

def group_id_from_group_table(group_name):
    """Get group ID from group name"""
    try:
        # Use the correct model name from models.py
        group = Group.query.filter_by(group_name=group_name).first()
        if group:
            print(f"Group found: {group_name}, Group ID: {group.group_id}")
            return group.group_id
        else:
            print(f"Group name '{group_name}' not found in the database.")
            return None
    except Exception as e:
        print(f"Error finding group: {e}")
        return None

def fetch_customer_details(group_id=None):
    """Fetch customer details from the customer table"""
    try:
        if group_id:
            customers = Customer.query.filter(Customer.group_id==group_id, Customer.status=="A").all()
        else:
            customers = Customer.query.filter_by(status="A").all()
        return [(customer.customer_name, customer.email_id) for customer in customers]
    except Exception as e:
        print(f"Error fetching customer details: {e}")
        return []

def get_customer_count_in_group(group_id):
    """Get count of customers in a group"""
    try:
        return Customer.query.filter_by(group_id=group_id).count()
    except Exception as e:
        print(f"Error counting customers: {e}")
        return 0

def schedule_message_to_queue(message_des, date, time_str, email_id, status):
    """Schedule a message in the message queue"""
    if not time_str:
        raise ValueError("Time is required")
   
    try:
        new_message = MessageQueue(
            message_des=message_des,
            date=date,
            time=time_str,
            email_id=email_id,
            status=status
        )
        db.session.add(new_message)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error scheduling message: {e}")
        raise

def is_valid_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return re.match(pattern, email)

def send_custom_messages_to_group(group_id, message_description, date, time_str, email_id, status, group_name):
    """Send custom messages to all members of a group"""
    try:
        customer_details = fetch_customer_details(group_id)
        for customer_name, customer_email in customer_details:
            schedule_message_to_queue(message_description, date, time_str, customer_email, status)
            print(f"Message scheduled successfully for {customer_name} ({customer_email})!")
    except Exception as e:
        print(f"Error sending messages to group: {e}")
        raise

def calculate_future_dates(base_date, frequency, count=12):
    """Calculate future dates based on frequency"""
    dates = []
    try:
        base_date = datetime.strptime(base_date, '%Y-%m-%d').date() if isinstance(base_date, str) else base_date
        
        if frequency == 0:  # One-time
            return [base_date]
        
        for i in range(count):
            if frequency == 1:  # Yearly
                future_date = base_date.replace(year=base_date.year + i)
            elif frequency == 12:  # Monthly
                future_month = base_date.month + i
                future_year = base_date.year + (future_month - 1) // 12
                future_month = ((future_month - 1) % 12) + 1
                # Handle month with fewer days
                future_day = min(base_date.day, [31, 29 if future_year % 4 == 0 and (future_year % 100 != 0 or future_year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][future_month - 1])
                future_date = base_date.replace(year=future_year, month=future_month, day=future_day)
            elif frequency == 4:  # Quarterly
                months_to_add = i * 3
                future_month = base_date.month + months_to_add
                future_year = base_date.year + (future_month - 1) // 12
                future_month = ((future_month - 1) % 12) + 1
                future_day = min(base_date.day, [31, 29 if future_year % 4 == 0 and (future_year % 100 != 0 or future_year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][future_month - 1])
                future_date = base_date.replace(year=future_year, month=future_month, day=future_day)
            elif frequency == 26:  # Fortnightly
                future_date = base_date + timedelta(days=14 * i)
            elif frequency == 52:  # Weekly
                future_date = base_date + timedelta(days=7 * i)
            elif frequency == 365:  # Daily
                future_date = base_date + timedelta(days=i)
            elif frequency == 3:  # Every 4 months
                months_to_add = i * 4
                future_month = base_date.month + months_to_add
                future_year = base_date.year + (future_month - 1) // 12
                future_month = ((future_month - 1) % 12) + 1
                future_day = min(base_date.day, [31, 29 if future_year % 4 == 0 and (future_year % 100 != 0 or future_year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][future_month - 1])
                future_date = base_date.replace(year=future_year, month=future_month, day=future_day)
            elif frequency == 6:  # Every 2 months
                months_to_add = i * 2
                future_month = base_date.month + months_to_add
                future_year = base_date.year + (future_month - 1) // 12
                future_month = ((future_month - 1) % 12) + 1
                future_day = min(base_date.day, [31, 29 if future_year % 4 == 0 and (future_year % 100 != 0 or future_year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][future_month - 1])
                future_date = base_date.replace(year=future_year, month=future_month, day=future_day)
            else:
                raise ValueError(f"Unsupported frequency: {frequency}")
            
            dates.append(future_date)
        
        return dates
    except Exception as e:
        print(f"Error calculating future dates: {e}")
        return [base_date]  # Return just the base date in case of error

@messages_bp.route('/add_message', methods=['POST'])
def add_message():
    """Add a new message to the messages table"""
    try:
        data = request.json
        print("Received Data:", data)
        
        frequency = data.get('frequency', "0")
        if frequency == "":
            return jsonify({"error": "Frequency is required"}), 400
        
        # Convert group_name to string if it's a list
        group_name = data.get('group_name')
        if isinstance(group_name, list):
            group_name = ','.join(group_name)
        
        new_message = Message(
            message_description=data.get('message_description'),
            group_name=group_name,
            frequency=frequency,
            date=datetime.strptime(data.get('date'), '%Y-%m-%d').date() if data.get('date') else None,
            email_id=data.get('email_id'),
            time=data.get('time'),
            status='A'
        )
        
        db.session.add(new_message)
        db.session.commit()
        
        return jsonify({"message": "Message added successfully"}), 201
    except Exception as e:
        db.session.rollback()
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

@messages_bp.route('/messages/<int:message_id>', methods=['GET'])
def get_message(message_id):
    """Get a message by ID"""
    try:
        message = Message.query.get_or_404(message_id)
        
        # Handle timedelta conversion to time string
        time_str = None
        if message.time:
            if isinstance(message.time, timedelta):
                # Convert timedelta to total seconds
                total_seconds = int(message.time.total_seconds())
                # Extract hours, minutes, seconds
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                seconds = total_seconds % 60
                time_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
            else:
                # If it's already a string or time object
                time_str = str(message.time)
        
        message_dict = {
            'message_id': message.message_id,
            'message_description': message.message_description,
            'group_name': message.group_name.split(',') if message.group_name else [],
            'frequency': message.frequency,
            'date': message.date.strftime('%Y-%m-%d') if message.date else None,
            'email_id': message.email_id,
            'time': time_str,
            'status': message.status
        }
        return jsonify(message_dict)
    except Exception as e:
        print(f"Error getting message: {e}")
        return jsonify({"error": str(e)}), 500

@messages_bp.route('/message_descriptions', methods=['GET'])
def get_message_descriptions():
    """Get all message descriptions"""
    try:
        messages = Message.query.with_entities(Message.message_id, Message.message_description).all()
        return jsonify([{"message_id": msg.message_id, "message_description": msg.message_description} for msg in messages])
    except Exception as e:
        print(f"Error getting message descriptions: {e}")
        return jsonify({"error": str(e)}), 500

@messages_bp.route('/groups', methods=['GET'])
def get_groups():
    """Get all groups"""
    try:
        # Make sure we're using the correct model name from models.py
        groups = Group.query.all()
        # print(groups)
        
        # Create a simple list of dictionaries if to_dict() is not available
        result = []
        for group in groups:
            try:
                # Try to use to_dict() if available
                result.append(group.to_dict())
            except AttributeError:
                # Fallback if to_dict() is not available
                result.append({
                    "group_id": group.group_id,
                    "group_name": group.group_name,
                    "group_des": group.group_des
                })
        
        return jsonify(result)
    except Exception as e:
        print(f"Error getting groups: {e}")
        return jsonify({"error": str(e)}), 500

@messages_bp.route('/schedule_message', methods=['POST'])
def schedule_message_route():
    """Schedule an existing message to groups or individual email"""
    try:
        message_id = request.form.get('message_id')
        date = request.form.get('date')
        time = request.form.get('time')
        group_name_list = request.form.getlist('group_name[]')
        email_id = request.form.get('email_id')
        
        # Fetch the message details
        message = Message.query.get_or_404(message_id)
        message_description = message.message_description
        frequency = int(message.frequency) if message.frequency else 0
        
        # If date is not provided, use the message's date
        if not date and message.date:
            date = message.date
        
        # If time is not provided, use the message's time
        if not time and message.time:
            time = message.time
        
        # Calculate future dates based on frequency
        future_dates = calculate_future_dates(date, frequency)
        
        if email_id:
            # Schedule for individual email
            for future_date in future_dates:
                status = "Scheduled"
                schedule_message_to_queue(message_description, future_date, time, email_id, status)
            
            return jsonify({"message": f"Message scheduled successfully for {email_id}"}), 200
        elif group_name_list:
            # Schedule for groups
            for group_name in group_name_list:
                group_id = group_id_from_group_table(group_name)
                if group_id:
                    customer_count = get_customer_count_in_group(group_id)
                    for future_date in future_dates:
                        send_custom_messages_to_group(group_id, message_description, future_date, time, email_id, "Scheduled", group_name)
                    
                    return jsonify({"message": f"Message scheduled successfully for group {group_name} with {customer_count} customers"}), 200
                else:
                    return jsonify({"error": f"Group {group_name} not found"}), 404
        else:
            return jsonify({"error": "Either email or group must be provided"}), 400
    except Exception as e:
        print(f"Error scheduling message: {e}")
        return jsonify({"error": str(e)}), 500

@messages_bp.route('/custom_message', methods=['POST'])
def custom_message_route():
    """Create and schedule a custom message"""
    try:
        message_description = request.form.get('message_description')
        date = request.form.get('date')
        time = request.form.get('time')
        group_name_list = request.form.getlist('group_name[]')
        email_id = request.form.get('email_id')
        frequency = int(request.form.get('frequency', 0))
        
        # First, save the message to the messages table
        # Convert group_name to string if it's a list
        group_name = ','.join(group_name_list) if group_name_list else None
        
        new_message = Message(
            message_description=message_description,
            group_name=group_name,
            frequency=str(frequency),
            date=datetime.strptime(date, '%Y-%m-%d').date() if date else None,
            email_id=email_id,
            time=time,
            status='A'
        )
        
        db.session.add(new_message)
        db.session.commit()
        
        # Calculate future dates based on frequency
        future_dates = calculate_future_dates(date, frequency)
        
        if email_id:
            # Schedule for individual email
            for future_date in future_dates:
                status = "Scheduled"
                schedule_message_to_queue(message_description, future_date, time, email_id, status)
            
            return jsonify({"message": f"Custom message scheduled successfully for {email_id}"}), 200
        elif group_name_list:
            # Schedule for groups
            for group_name in group_name_list:
                group_id = group_id_from_group_table(group_name)
                if group_id:
                    customer_count = get_customer_count_in_group(group_id)
                    for future_date in future_dates:
                        send_custom_messages_to_group(group_id, message_description, future_date, time, email_id, "Scheduled", group_name)
            
            return jsonify({"message": f"Custom message scheduled successfully for {len(group_name_list)} groups"}), 200
        else:
            return jsonify({"error": "Either email or group must be provided"}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error scheduling custom message: {e}")
        return jsonify({"error": str(e)}), 500
    
@messages_bp.route('/recent_messages', methods=['GET'])
def get_recent_messages():
    try:
        # Get query parameters with defaults
        status = request.args.get('status', 'Sent')
        limit = request.args.get('limit', 5, type=int)
        
        # Query the most recent sent messages
        recent_messages = MessageQueue.query.filter_by(status=status)\
            .order_by(desc(MessageQueue.date), desc(MessageQueue.time))\
            .limit(limit)\
            .all()
        
        # Convert to JSON serializable format
        result = []
        for message in recent_messages:
            result.append({
                's_no': message.s_no,
                'message_des': message.message_des,
                'date': message.date.isoformat() if message.date else None,
                'email_id': message.email_id,
                'time': message.time.isoformat() if message.time else None,
                'status': message.status
            })
        
        # Always return an array, even if empty
        return jsonify(result)
    
    except Exception as e:
        print(f"Error fetching recent messages: {str(e)}")
        # Return an empty array on error
        return jsonify([]), 500


@messages_bp.route('/stop_email_thread', methods=['POST'])
def stop_email_thread():
    """API endpoint to stop the email processing thread"""
    global email_thread_running
    email_thread_running = False
    return jsonify({"message": "Email processing thread stopped"}), 200

@messages_bp.route('/start_email_thread', methods=['POST'])
def restart_email_thread():
    """API endpoint to start the email processing thread"""
    start_email_thread()
    return jsonify({"message": "Email processing thread started"}), 200

# Add a route to manually trigger email sending for testing
@messages_bp.route('/send_pending_emails', methods=['POST'])
def send_pending_emails():
    """Manually trigger sending of pending emails"""
    try:
        # Get current date and time
        now = datetime.now()
        current_date = now.date()
        
        # Find messages that are scheduled for today or earlier
        messages_to_send = MessageQueue.query.filter(
            MessageQueue.date <= current_date,
            MessageQueue.status == "Scheduled"
        ).all()
        
        sent_count = 0
        for message in messages_to_send:
            # Send the email
            subject = "Scheduled Message"
            success = send_email(message.email_id, subject, message.message_des)
            
            # Update the message status
            if success:
                message.status = "Sent"
                sent_count += 1
            else:
                message.status = "Failed"
            
            db.session.commit()
        
        return jsonify({
            "message": f"Processed {len(messages_to_send)} messages, sent {sent_count} emails successfully"
        }), 200
    except Exception as e:
        print(f"Error sending pending emails: {e}")
        return jsonify({"error": str(e)}), 500

@messages_bp.route('/api/schedule_message', methods=['POST'])
def schedule_message_api():
    try:
        # Get data from request
        data = request.json
        message_id = data.get('message_id')
        group_names = data.get('group_name', [])
        date = data.get('date')
        time = data.get('time')
        email_id = data.get('email_id', '')

        # Validate required fields
        if not message_id:
            return jsonify({"error": "Message ID is required"}), 400
        if not date:
            return jsonify({"error": "Date is required"}), 400
        if not time:
            return jsonify({"error": "Time is required"}), 400
        
        # Fetch the message details
        message = Message.query.get_or_404(message_id)
        message_description = message.message_description
        frequency = int(message.frequency) if message.frequency else 0
        
        # Calculate future dates based on frequency
        future_dates = calculate_future_dates(date, frequency)
        
        if email_id:
            # Schedule for individual email
            for future_date in future_dates:
                new_queue_item = MessageQueue(
                    message_des=message_description,
                    date=future_date,
                    time=time,
                    email_id=email_id,
                    status="Scheduled"
                )
                db.session.add(new_queue_item)
            
            db.session.commit()
            return jsonify({"message": f"Message scheduled successfully for {email_id}"}), 200
            
        elif group_names:
            # Schedule for groups
            scheduled_count = 0
            
            for group_name in group_names:
                if isinstance(group_name, str):
                    group_id = group_id_from_group_table(group_name)
                    if group_id:
                        # Get all customers in this group
                        customers = fetch_customer_details(group_id)
                        for customer_name, customer_email in customers:
                            # Schedule for each date
                            for future_date in future_dates:
                                new_queue_item = MessageQueue(
                                    message_des=message_description,
                                    date=future_date,
                                    time=time,
                                    email_id=customer_email,
                                    status="Scheduled"
                                )
                                db.session.add(new_queue_item)
                                scheduled_count += 1
            
            db.session.commit()
            return jsonify({"message": f"Message scheduled successfully for {scheduled_count} recipients"}), 200
        else:
            return jsonify({"error": "Either email or group must be provided"}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error scheduling message: {str(e)}")
        return jsonify({"error": str(e)}), 500

@messages_bp.route('/api/custom_message', methods=['POST'])
def custom_message_api():
    try:
        # Get data from request
        data = request.json
        message_description = data.get('message_description')
        group_names = data.get('group_name', [])
        date = data.get('date')
        time = data.get('time')
        email_id = data.get('email_id', '')
        frequency = int(data.get('frequency', '0'))

        # Validate required fields
        if not message_description:
            return jsonify({"error": "Message description is required"}), 400
        if not date:
            return jsonify({"error": "Date is required"}), 400
        if not time:
            return jsonify({"error": "Time is required"}), 400
        
        # First, save the message to the messages table
        # Convert group_name to string if it's a list
        group_name = ','.join(group_names) if isinstance(group_names, list) else group_names
        
        new_message = Message(
            message_description=message_description,
            group_name=group_name,
            frequency=str(frequency),
            date=datetime.strptime(date, '%Y-%m-%d').date() if date else None,
            email_id=email_id,
            time=time,
            status='A'
        )
        
        db.session.add(new_message)
        db.session.commit()
        
        # Calculate future dates based on frequency
        future_dates = calculate_future_dates(date, frequency)
        
        if email_id:
            # Schedule for individual email
            for future_date in future_dates:
                new_queue_item = MessageQueue(
                    message_des=message_description,
                    date=future_date,
                    time=time,
                    email_id=email_id,
                    status="Scheduled"
                )
                db.session.add(new_queue_item)
            
            db.session.commit()
            return jsonify({"message": f"Custom message scheduled successfully for {email_id}"}), 200
            
        elif group_names:
            # Schedule for groups
            scheduled_count = 0
            
            for group_name in group_names:
                if isinstance(group_name, str):
                    group_id = group_id_from_group_table(group_name)
                    if group_id:
                        # Get all customers in this group
                        customers = fetch_customer_details(group_id)
                        for customer_name, customer_email in customers:
                            # Schedule for each date
                            for future_date in future_dates:
                                new_queue_item = MessageQueue(
                                    message_des=message_description,
                                    date=future_date,
                                    time=time,
                                    email_id=customer_email,
                                    status="Scheduled"
                                )
                                db.session.add(new_queue_item)
                                scheduled_count += 1
            
            db.session.commit()
            return jsonify({"message": f"Custom message scheduled successfully for {scheduled_count} recipients"}), 200
        else:
            return jsonify({"error": "Either email or group must be provided"}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error scheduling custom message: {str(e)}")
        return jsonify({"error": str(e)}), 500
