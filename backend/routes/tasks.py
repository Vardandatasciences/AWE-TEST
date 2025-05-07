from flask import Blueprint, jsonify, request
from models import db, Task, ActivityAssignment, Actor, Diary1, Activity, Customer, SubTask
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import logging
import threading
import os
from models import ReminderMail, HolidayMaster
from flask_cors import cross_origin
import traceback
import json

from datetime import datetime, timedelta, time


tasks_bp = Blueprint('tasks', __name__)

@tasks_bp.route('/tasks', methods=['GET'])
def get_tasks():
    try:
        # Get user information from request
        user_id = request.args.get('user_id')
        role_id = request.args.get('role_id')
        review_mode = request.args.get('review_mode', 'false').lower() == 'true'
        
        # Get filters if provided
        auditor_id = request.args.get('auditor_id')
        client_id = request.args.get('client_id')
        
        print(f"Fetching tasks with filters - User ID: {user_id}, Role ID: {role_id}, "
              f"Auditor ID: {auditor_id}, Client ID: {client_id}, Review Mode: {review_mode}")
        
        # Get the user's name for reviewer matching
        current_user = Actor.query.get(user_id)
        if not current_user:
            return jsonify({"error": "User not found"}), 404
            
        # Base query with ordering by assigned_timestamp in descending order
        query = Task.query.order_by(Task.assigned_timestamp.desc())
        
        # Apply filters based on role and parameters
        if review_mode:
            # In review mode, get tasks where the current user's name matches the reviewer field
            query = query.filter(Task.reviewer == current_user.actor_name)
            print(f"Filtering review tasks for reviewer: {current_user.actor_name}")
        else:
            # Normal mode - get tasks assigned to the user
            if auditor_id:
                print(f"Filtering tasks for auditor_id: {auditor_id}")
                query = query.filter(Task.actor_id == auditor_id)
            elif client_id:
                print(f"Filtering tasks for client_id: {client_id}")
                customer = Customer.query.filter_by(customer_id=client_id).first()
                if customer:
                    query = query.filter(Task.customer_name == customer.customer_name)
                else:
                    return jsonify([])
            elif role_id != "11":  # Not admin
                if user_id:
                    query = query.filter(Task.actor_id == user_id)
                else:
                    return jsonify([])
        
        # Execute query and get all tasks
        tasks = query.all()
        print(f"Found {len(tasks)} tasks for the given filters")
        
        # Convert tasks to response format
        tasks_response = [{
            'id': str(task.task_id),
            'task_name': task.task_name,
            'link': task.link,
            'status': task.status,
            'criticality': task.criticality,
            'assignee': task.assigned_to,
            'actor_id': str(task.actor_id),
            'due_date': task.duedate.isoformat() if task.duedate else None,
            'initiator': task.initiator,
            'time_taken': task.duration,
            'customer_name': task.customer_name,
            'title': task.task_name,
            'remarks': task.remarks,
            'reviewer': task.reviewer,  # Add reviewer field to response
            'reviewer_status': task.reviewer_status,  # Add reviewer_status field to response
            'assigned_timestamp': task.assigned_timestamp.isoformat() if task.assigned_timestamp else None
        } for task in tasks]
        
        return jsonify(tasks_response)
        
    except Exception as e:
        print("Error fetching tasks:", e)
        # Print a more detailed traceback for debugging
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch tasks'}), 500
    

def map_status(status):
    """Map the status from the database to a user-friendly format."""
    status_mapping = {
        'Yet to Start': 'todo',
        'WIP': 'in-progress',
        'Completed': 'completed'
    }
    return status_mapping.get(status, 'todo')


def calculate_new_duedate(start_date, iteration, frequency):
    """Calculate the new due date based on frequency."""
    return start_date + timedelta(days=(365 // frequency) * iteration)

def is_weekend_or_holiday(date):
    """Check if the date is a weekend or in the holidays list."""
    return date.weekday() >= 5  # Saturday (5) or Sunday (6)

def adjust_to_previous_working_day(date):
    """Adjust the given date to the previous working day if it falls on a weekend or holiday."""
    while is_weekend_or_holiday(date):
        date -= timedelta(days=1)
    return date


def schedule_email_reminder(subject, task, email, reminder_date, email_type='reminder'):
    """Schedule an email reminder by adding it to the database"""
    try:
        # Ensure reminder_date is a date object
        if isinstance(reminder_date, datetime):
            reminder_date = reminder_date.date()
            
        # Convert reminder_date to datetime with time component for the reminder
        reminder_time = time(9, 0)  # 9:00 AM
        
        # Create new reminder entry
        new_reminder = ReminderMail(
            task_id=task.task_id,
            message_des=f"{task.task_name} for {task.customer_name}",
            date=reminder_date,
            time=reminder_time,
            email_id=email,
            status="Pending",
            email_type=email_type
        )
        
        db.session.add(new_reminder)
        db.session.commit()
        
        print(f"✅ Reminder scheduled for {reminder_date} at {reminder_time} to {email}")
        return True
    except Exception as e:
        db.session.rollback()
        print(f"❌ Failed to schedule reminder: {e}")
        return False



def calculate_reminder_date(due_date, duration):
    """Calculate when to send a reminder based on task duration and due date"""
    if not due_date:
        return None
    
    # Convert due_date to date object if it's a datetime
    if isinstance(due_date, datetime):
        due_date = due_date.date()
        
    # For tasks with duration <= 1 day, remind 1 day before
    # For longer tasks, remind earlier based on duration
    if duration and duration > 1:
        days_before = min(int(duration), 7)  # Max 7 days before
    else:
        days_before = 1  # Default 1 day before
        
    reminder_date = due_date - timedelta(days=days_before)
    
    # Ensure reminder date is not in the past
    today = datetime.now().date()
    if reminder_date < today:
        reminder_date = today
        
    return reminder_date

def send_styled_email(recipient, subject, content):
    try:
        # Define HTML email template with CSS in a proper Python string
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                /* Add other CSS styles here with double braces {{ }} for literal braces */
            </style>
        </head>
        <body>
            {content}
        </body>
        </html>
        """
        
        # Email configuration
        sender_email = "loukyarao68@gmail.com"
        password = "vafx kqve dwmj mvjv"
        
        # Create message container with the correct format for HTML emails
        msg = MIMEMultipart()
        msg['Subject'] = subject
        msg['From'] = sender_email
        msg['To'] = recipient
        
        # Attach HTML content
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Send the email
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender_email, password)
            server.send_message(msg)
            
        print(f"✅ Email sent successfully to {recipient}")
        return True
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        traceback.print_exc()
        return False

def send_email_task(subject, to_email, task, email_type='reminder'):
    """Send an email notification about a task"""
    try:
        # Use the styled email function
        success = send_styled_email(to_email, subject, content)
        
        # Log the email status in the database
        try:
            if success:
                db.session.query(ReminderMail).filter_by(
                    email_id=to_email,
                    task_id=task.task_id,
                    status="Pending"
                ).update({'status': 'Sent'})
            else:
                db.session.query(ReminderMail).filter_by(
                    email_id=to_email,
                    task_id=task.task_id,
                    status="Pending"
                ).update({'status': 'Failed'})
                
            db.session.commit()
        except Exception as update_error:
            logging.error(f"Error updating reminder status: {update_error}")
            
        return success
    except Exception as e:
        logging.error(f"Error in send_email_task: {e}")
        return False

def send_email(subject, recipient, body):
    """Send an email using SMTP"""
    try:
        # Email configuration
        sender_email = "loukyarao68@gmail.com"  # Replace with your email
        password = "vafx kqve dwmj mvjv" # Replace with your app-specific password
        
        # Create message
        message = MIMEMultipart()
        message["From"] = sender_email
        message["To"] = recipient
        message["Subject"] = subject
        
        # Add body to email
        message.attach(MIMEText(body, "plain"))
        
        # Connect to server and send email
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, password)
            server.sendmail(sender_email, recipient, message.as_string())
            
        print(f"✅ Email sent successfully to {recipient}")
        return True
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False

def adjust_due_date(date, criticality):
    """ Adjusts the due date based on weekends and holidays.
        - If criticality is 'High', shift backward.
        - Otherwise, shift forward. """

    try:
        # Fetch holiday dates correctly from the database
        holiday_dates = {holiday[0] for holiday in db.session.query(HolidayMaster.Date).all()}

        print(f"🔍 Checking Date: {date} | Criticality: {criticality}")

        # Adjust for weekends and holidays
        while date.weekday() >= 5 or date in holiday_dates:  # Saturday (5) or Sunday (6) or holiday
            if criticality.lower() == "high":
                date -= timedelta(days=1)  # Shift backward for high criticality
            else:
                date += timedelta(days=1)  # Shift forward for normal criticality
            print(f"🔄 Adjusted Date: {date}")

        return date
    except Exception as e:
        print(f"🚨 ERROR in adjust_due_date: {e}")
        return date  # Return original date if an error occurs

def calculate_time_taken(task_id):
    """Calculate total time taken from diary1 records for a task"""
    try:
        diary_records = Diary1.query.filter_by(task=str(task_id)).all()
        total_time = 0.0
       
        for record in diary_records:
            if record.start_time and record.end_time:
                # Convert time strings to datetime objects
                start = datetime.combine(record.date, record.start_time)
                end = datetime.combine(record.date, record.end_time)
               
                # Calculate difference in hours
                time_diff = (end - start).total_seconds() / 3600
                total_time += time_diff
       
        return round(total_time, 2)
    except Exception as e:
        print(f"Error calculating time taken: {e}")
        return 0.0



@tasks_bp.route('/tasks/<task_id>', methods=['PATCH'])
@cross_origin()
def update_task(task_id):
    try:
        # Get user information from request
        user_id = request.args.get('user_id')
        role_id = request.args.get('role_id')
        
        print(f"Received update request for task {task_id} from user {user_id} with role {role_id}")
        print(f"Request data: {request.json}")
        
        # Validate user authentication
        if not user_id or not role_id:
            return jsonify({
                "success": False, 
                "error": "Authentication required. Please provide user_id and role_id"
            }), 401
        
        # Get the task
        task = Task.query.filter_by(task_id=task_id).first()
        if not task:
            return jsonify({"success": False, "error": "Task not found"}), 404
        
        # Check permissions - allow both the assigned user and admins to update
        if role_id != "11" and str(task.actor_id) != str(user_id):
            return jsonify({
                "success": False, 
                "error": "You don't have permission to update this task"
            }), 403
        
        # Get the data to update
        data = request.json
        
        # Store original values for comparison
        original_status = task.status
        original_assigned_to = task.assigned_to
        original_actor_id = task.actor_id
        original_duedate = task.duedate
        original_reviewer_status = task.reviewer_status
        
        # Update the task
        if 'status' in data:
            task.status = data['status']
            print(f"Updating task status to: {task.status}")
            
            # If status is changed to Completed, calculate and update time_taken
            if task.status == 'Completed' and original_status != 'Completed':
                time_taken = calculate_time_taken(task_id)
                task.time_taken = time_taken
                task.actual_date = datetime.now().date()
                print(f"Task completed. Total time taken: {time_taken} hours")
        
        # Check if reviewer_status is being updated
        if 'reviewer_status' in data:
            task.reviewer_status = data['reviewer_status']
            print(f"Updating reviewer_status to: {task.reviewer_status}")
        
        # Update remarks if provided
        if 'remarks' in data:
            task.remarks = data['remarks']
        
        # Save changes
        db.session.commit()
        print(f"✅ Successfully updated task {task_id}")
        
        # Handle notifications (wrapped in try-except to prevent notification errors from failing the update)
        try:
            assigned_actor = Actor.query.filter_by(actor_id=task.actor_id).first()
            if assigned_actor and assigned_actor.email_id:
                # Send status update notification
                if original_status != task.status:
                    subject = f"Task Status Updated: {task.task_name}"
                    send_styled_email(assigned_actor.email_id, subject, f"The status of your task '{task.task_name}' has been updated to '{task.status}'.")
                
                # Send reviewer status update notification
                if original_reviewer_status != task.reviewer_status and task.reviewer_status is not None:
                    subject = f"Task Review Status Updated: {task.task_name}"
                    send_styled_email(assigned_actor.email_id, subject, f"The review status of your task '{task.task_name}' has been updated to '{task.reviewer_status}'.")
        except Exception as e:
            print(f"Warning: Failed to send notification: {e}")
            # Continue execution even if notification fails
        
        return jsonify({
            "success": True, 
            "message": "Task updated successfully",
            "task": {
                "id": task.task_id,
                "status": task.status,
                "reviewer_status": task.reviewer_status,
                "remarks": task.remarks
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"🚨 ERROR in update_task: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
 

@tasks_bp.route('/tasks', methods=['POST'])
def create_task():
    try:
        # Get user information from request
        role_id = request.args.get('role_id')
        
        # Only admins can create tasks
        if role_id != "11":
            return jsonify({'error': 'Only administrators can create tasks'}), 403
            
        data = request.json
        
        # Create the new task
        new_task = Task(
            task_name=data['title'],
            status=data.get('status', 'Yet to Start'),  # Use the correct status values
            criticality=data.get('criticality', 'Medium'),
            actor_id=data.get('assignee'),
            duedate=datetime.strptime(data['due_date'], '%Y-%m-%d').date() if data.get('due_date') else None,
            activity_id=data.get('activity_id'),
            customer_name=data.get('customer_name', 'General'),
            initiator=data.get('initiator', 'Admin')
        )
        
        # If an assignee is provided, get the assignee name
        assignee_email = None
        if data.get('assignee'):
            assignee = Actor.query.filter_by(actor_id=data['assignee']).first()
            if assignee:
                new_task.assigned_to = assignee.actor_name
                assignee_email = assignee.email_id
        
        # Add the task to the database
        db.session.add(new_task)
        db.session.commit()
        
        # Send assignment email if there's an assignee
        if assignee_email:
            subject = f"ProSync - New Task Assignment: {new_task.task_name}"
            send_styled_email(assignee_email, subject, f"A new task '{new_task.task_name}' has been assigned to you for customer '{new_task.customer_name}'.")
            
            # Also schedule reminder emails
            if new_task.duedate:
                # Calculate reminder date
                reminder_date = calculate_reminder_date(new_task.duedate, new_task.duration)
                
                # Schedule the reminder email
                schedule_email_reminder(
                    f"ProSync - Reminder: {new_task.task_name}",
                    new_task,
                    assignee_email,
                    reminder_date,
                    'reminder'
                )
                
                # Schedule due date reminder
                schedule_email_reminder(
                    f"ProSync - Due Today: {new_task.task_name}",
                    new_task,
                    assignee_email,
                    new_task.duedate,
                    'due_today'
                )
        
        # Return the created task data
        return jsonify({
            'id': new_task.task_id,
            'title': new_task.task_name,
            'status': new_task.status,
            'criticality': new_task.criticality,
            'assignee': new_task.actor_id,
            'due_date': new_task.duedate.isoformat() if new_task.duedate else None,
            'email_sent': assignee_email is not None
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error creating task: {e}")
        traceback.print_exc()  # Add traceback for better debugging
        return jsonify({'error': f'Failed to create task: {str(e)}'}), 500

# @tasks_bp.route('/assign_activity', methods=['POST'])
# def assign_activity():
#     try:
#         data = request.form
#         # ... existing validation code ...
        
#         # Create the task
#         new_task = Task(
#             task_id=task_id,
#             task_name=activity.activity_name,
#             criticality=criticality,
#             duration=duration,
#             status=status,
#             link=link,
#             customer_name=customer.customer_name,
#             duedate=due_date,
#             actor_id=assigned_actor_id,
#             assigned_to=assigned_to,
#             activity_id=activity_id,
#             initiator=initiator,
#             activity_type=activity_type,
#             stage_id=1,
#             assigned_timestamp=current_timestamp
#         )
#         db.session.add(new_task)
#         db.session.commit()
        
#         # ... existing email and calendar code ...
        
#         # Return the new task data along with success message
#         return jsonify({
#             'success': True,
#             'message': 'Activity assigned successfully and notification sent',
#             'email_sent': True,
#             'calendar_added': calendar_event_id is not None,
#             'reminders_scheduled': True,
#             'task': {
#                 'id': str(new_task.task_id),
#                 'task_name': new_task.task_name,
#                 'link': new_task.link,
#                 'status': new_task.status,
#                 'criticality': new_task.criticality,
#                 'assignee': new_task.assigned_to,
#                 'actor_id': str(new_task.actor_id),
#                 'due_date': new_task.duedate.isoformat() if new_task.duedate else None,
#                 'initiator': new_task.initiator,
#                 'time_taken': new_task.duration,
#                 'customer_name': new_task.customer_name,
#                 'title': new_task.task_name,
#                 'remarks': new_task.remarks,
#                 'assigned_timestamp': new_task.assigned_timestamp.isoformat()
#             }
#         })
        
#     except Exception as e:
#         db.session.rollback()
#         print(f"🚨 Error Assigning Activity: {e}")
#         return jsonify({'success': False, 'message': f'Failed to assign activity: {str(e)}'}), 500

@tasks_bp.route('/employees', methods=['GET'])
def get_employees():
    try:
        # Get user information from request
        user_id = request.args.get('user_id')
        role_id = request.args.get('role_id')
        
        # Only admins can see all employees
        if role_id == "11":
            employees = Actor.query.all()
        else:
            # Regular users can only see themselves
            employees = Actor.query.filter_by(actor_id=user_id).all()
        
        # Log the number of employees found for debugging
        print(f"Found {len(employees)} employees")
        
        # Return a simplified list with just id and name
        return jsonify([{
            'id': employee.actor_id,
            'name': employee.actor_name
        } for employee in employees])
    except Exception as e:
        print("Error fetching employees:", e)
        return jsonify({'error': 'Failed to fetch employees'}), 500

# @tasks_bp.route('/task_subtasks/<task_id>', methods=['GET'])
# def get_task_subtasks(task_id):
#     try:
#         # Get the task
#         task = Task.query.filter_by(task_id=task_id).first()
#         if not task:
#             return jsonify({"error": "Task not found"}), 404
            
#         # Get the activity associated with this task
#         activity = Activity.query.filter_by(activity_id=task.activity_id).first()
#         if not activity:
#             return jsonify([])  # No activity found, so no subtasks
            
#         # Check if activity has subtasks
#         if activity.sub_activities:
#             return jsonify(activity.sub_activities)
#         else:
#             return jsonify([])
            
#     except Exception as e:
#         print(f"Error fetching task subtasks: {e}")
#         return jsonify({"error": str(e)}), 500 

@tasks_bp.route('/subtasks/<subtask_id>', methods=['PATCH'])
@cross_origin()
def update_subtask_status(subtask_id):
    try:
        # Get user information from request
        user_id = request.json.get('user_id')
        if not user_id:
            return jsonify({"success": False, "error": "User ID is required"}), 400
            
        # Get the new status from request
        new_status = request.json.get('status')
        if not new_status:
            return jsonify({"success": False, "error": "Status is required"}), 400
            
        # Validate status value
        valid_statuses = ['Yet to Start', 'WIP', 'Completed', 'Pending']
        if new_status not in valid_statuses:
            return jsonify({"success": False, "error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400
        
        # Find the subtask in the database
        subtask = SubTask.query.filter_by(id=subtask_id).first()
        
        if not subtask:
            return jsonify({"success": False, "error": "Subtask not found"}), 404
            
        # Update the status
        old_status = subtask.status
        subtask.status = new_status
        
        # Add updated_by and updated_at information if columns exist
        if hasattr(subtask, 'updated_by'):
            subtask.updated_by = user_id
        if hasattr(subtask, 'updated_at'):
            subtask.updated_at = datetime.now()
        
        # Save changes to the database
        db.session.commit()
        
        print(f"✅ Successfully updated subtask {subtask_id} status from {old_status} to {new_status}")
        
        return jsonify({
            "success": True,
            "message": f"Subtask status updated to {new_status}",
            "data": {
                "id": subtask_id,
                "status": new_status,
                "updated_at": subtask.updated_at.isoformat() if hasattr(subtask, 'updated_at') else None
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"🚨 ERROR in update_subtask_status: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
 

@tasks_bp.route('/task_subtasks/<task_id>', methods=['GET'])
def get_task_subtasks(task_id):
    try:
        # Get the task
        task = Task.query.filter_by(task_id=task_id).first()
        if not task:
            return jsonify({"error": "Task not found"}), 404
            
        # Get the subtasks directly from the database using task_id
        subtasks = SubTask.query.filter_by(task_id=task_id).all()
        
        if subtasks:
            # Format the subtasks properly
            subtasks_response = []
            for subtask in subtasks:
                # Check if sub_task is a string that needs to be parsed as JSON
                sub_task_name = subtask.sub_task
                if isinstance(subtask.sub_task, str):
                    try:
                        # Try to parse it as JSON
                        parsed = json.loads(subtask.sub_task)
                        if isinstance(parsed, dict) and 'name' in parsed:
                            sub_task_name = parsed['name']
                    except:
                        # If parsing fails, use the string value directly
                        pass
                
                subtask_data = {
                    'id': subtask.id,
                    'name': sub_task_name,
                    'status': subtask.status or 'Pending',
                    'task_id': subtask.task_id
                }
                subtasks_response.append(subtask_data)
            
            print(f"Found {len(subtasks_response)} subtasks for task {task_id}")
            return jsonify(subtasks_response)
        
        # If no subtasks are found in the subtask table, 
        # get the activity and check its sub_activities
        activity = Activity.query.filter_by(activity_id=task.activity_id).first()
        if activity and activity.sub_activities:
            # Parse sub_activities if it's a string
            sub_activities = activity.sub_activities
            if isinstance(sub_activities, str):
                try:
                    sub_activities = json.loads(sub_activities)
                except:
                    sub_activities = []
            
            # Create subtasks in the database if they don't exist
            if isinstance(sub_activities, list) and sub_activities:
                for idx, subtask in enumerate(sub_activities):
                    if isinstance(subtask, dict) and 'name' in subtask:
                        # Create a new subtask record
                        new_subtask = SubTask(
                            task_id=task_id,
                            sub_task=subtask['name'],
                            status='Pending'
                        )
                        db.session.add(new_subtask)
                
                # Commit all new subtasks
                db.session.commit()
                
                # Now query again to get the newly created subtasks
                subtasks = SubTask.query.filter_by(task_id=task_id).all()
                subtasks_response = []
                for subtask in subtasks:
                    subtask_data = {
                        'id': subtask.id,
                        'name': subtask.sub_task,
                        'status': subtask.status or 'Pending',
                        'task_id': subtask.task_id
                    }
                    subtasks_response.append(subtask_data)
                
                return jsonify(subtasks_response)
            
            # Fallback option if creating subtasks fails
            return jsonify([])
        else:
            print(f"No subtasks found for task {task_id}")
            return jsonify([])
            
    except Exception as e:
        print(f"Error fetching task subtasks: {e}")
        return jsonify({"error": str(e)}), 500 

@tasks_bp.route('/tasks/<task_id>/update-review-status', methods=['POST'])
@cross_origin()
def update_review_status(task_id):
    try:
        # Get user information from request
        user_id = request.args.get('user_id')
        role_id = request.args.get('role_id')
        
        # Validate user authentication
        if not user_id or not role_id:
            return jsonify({
                "success": False, 
                "error": "Authentication required. Please provide user_id and role_id"
            }), 401
        
        # Get the task
        task = Task.query.filter_by(task_id=task_id).first()
        if not task:
            return jsonify({"success": False, "error": "Task not found"}), 404
        
        # Get the reviewer
        reviewer = Actor.query.filter_by(actor_name=task.reviewer).first()
        if not reviewer:
            return jsonify({"success": False, "error": "Reviewer not found for this task"}), 404
        
        # Check permissions - only the assigned reviewer or admin can update review status
        if role_id != "11" and str(reviewer.actor_id) != str(user_id):
            return jsonify({
                "success": False, 
                "error": "You don't have permission to update the review status of this task"
            }), 403
        
        # Get the data from the request
        data = request.json
        new_status = data.get('status')
        review_comments = data.get('comments', '')
        
        valid_statuses = ['under_review', 'approved', 'rejected', 'changes_requested']
        if not new_status or new_status not in valid_statuses:
            return jsonify({
                "success": False, 
                "error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            }), 400
        
        # Update the task with the new review status
        task.reviewer_status = new_status
        task.review_comments = review_comments
        
        # If approved, update task status to completed
        if new_status == 'approved':
            previous_status = task.status
            task.status = 'completed'
            print(f"Task status updated from {previous_status} to completed")
        
        # If rejected, update task status to 'Yet to Start' for reassignment
        if new_status == 'rejected':
            previous_status = task.status
            task.status = 'Yet to Start'
            print(f"Task status updated from {previous_status} to Yet to Start for reassignment")
        
        # Save changes
        db.session.commit()
        
        print(f"✅ Successfully updated review status to {new_status} for task {task_id}")
        
        # Notify the task owner by email
        try:
            task_owner = Actor.query.filter_by(actor_id=task.actor_id).first()
            if task_owner and task_owner.email_id:
                subject = f"Task Review Update: {task.task_name}"
                status_message = ""
                if new_status == 'approved':
                    status_message = "The task has been approved and marked as completed."
                elif new_status == 'rejected':
                    status_message = "The task has been rejected and requires reassignment."
                elif new_status == 'changes_requested':
                    status_message = "Changes have been requested for the task."
                
                email_content = f"""Dear {task_owner.actor_name},

The review status for task '{task.task_name}' has been updated to '{new_status}'.
{status_message}

REVIEW DETAILS:
- Reviewer: {task.reviewer}
- Status: {new_status}
- Comments: {review_comments}

Please log into the ProSync system to view the complete details.

You can view the task at: http://localhost:3000/tasks

Best regards,
ProSync Team"""

                send_email(subject, task_owner.email_id, email_content)
                print(f"✅ Review status update notification sent to {task_owner.actor_name}")
        except Exception as e:
            print(f"Warning: Failed to send review status notification: {e}")
            # Continue execution even if notification fails
        
        return jsonify({
            "success": True, 
            "message": "Review status updated successfully",
            "task": {
                "id": task.task_id,
                "reviewer": task.reviewer,
                "reviewer_status": task.reviewer_status,
                "review_comments": task.review_comments,
                "status": task.status,
                "needs_reassignment": new_status == 'rejected'
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"🚨 ERROR in update_review_status: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@tasks_bp.route('/reviewers', methods=['GET'])
def get_reviewers():
    try:
        # Get query parameters
        status = request.args.get('status', 'A')  # Default to 'A' if not provided
        
        # Query active auditors with role_id 22 or 11 (regular users and admins)
        reviewers = Actor.query.filter(
            Actor.status == status,
            Actor.role_id.in_(['22', '11'])  # Include both regular users and admins
        ).order_by(Actor.actor_name).all()
        
        # Format the response - ensure IDs are strings for consistency
        reviewers_list = [{
            'id': str(reviewer.actor_id),
            'name': reviewer.actor_name,
            'email': reviewer.email_id
        } for reviewer in reviewers]
        
        print(f"Fetched {len(reviewers_list)} potential reviewers")
        return jsonify(reviewers_list)
    
    except Exception as e:
        print(f"Error fetching reviewers: {e}")
        return jsonify({'error': 'Failed to fetch reviewers'}), 500 

@tasks_bp.route('/tasks/<task_id>/assign-reviewer', methods=['POST'])
@cross_origin()
def assign_reviewer(task_id):
    try:
        # Get user information from request
        user_id = request.args.get('user_id')
        role_id = request.args.get('role_id')
        
        # Validate user authentication
        if not user_id or not role_id:
            return jsonify({
                "success": False, 
                "error": "Authentication required. Please provide user_id and role_id"
            }), 401
        
        # Get the task
        task = Task.query.filter_by(task_id=task_id).first()
        if not task:
            return jsonify({"success": False, "error": "Task not found"}), 404
        
        # Check permissions - only admins and task owners can assign reviewers
        if role_id != "11" and str(task.actor_id) != str(user_id):
            return jsonify({
                "success": False, 
                "error": "You don't have permission to assign reviewers to this task"
            }), 403
        
        # Get the data from the request
        data = request.json
        reviewer_id = data.get('reviewer_id')
        
        if not reviewer_id:
            return jsonify({
                "success": False, 
                "error": "Reviewer ID is required"
            }), 400
        
        # Get the reviewer
        reviewer = Actor.query.filter_by(actor_id=reviewer_id).first()
        if not reviewer:
            return jsonify({"success": False, "error": "Reviewer not found"}), 404
        
        # Update the task with the reviewer
        task.reviewer = reviewer.actor_name
        task.reviewer_status = 'under_review'  # Set initial status
        
        # Save changes
        db.session.commit()
        
        print(f"✅ Successfully assigned reviewer {reviewer.actor_name} to task {task_id}")
        
        # Notify the reviewer by email
        try:
            if reviewer.email_id:
                subject = f"Task Review Request: {task.task_name}"
                email_content = f"""Dear {reviewer.actor_name},

You have been assigned to review the task '{task.task_name}' for customer '{task.customer_name}'.

TASK DETAILS:
- Task Name: {task.task_name}
- Task ID: {task.task_id}
- Criticality: {task.criticality}
- Due Date: {task.duedate.strftime('%Y-%m-%d') if task.duedate else 'Not specified'}
- Assignee: {task.assigned_to}
- Status: {task.status}

Please review this task and provide your feedback by logging into the ProSync system.

You can review the task at: http://localhost:3000/tasks

Best regards,
ProSync Team"""

                send_email(subject, reviewer.email_id, email_content)
                print(f"✅ Review request notification sent to {reviewer.actor_name}")
        except Exception as e:
            print(f"Warning: Failed to send review request notification: {e}")
            # Continue execution even if notification fails
        
        return jsonify({
            "success": True, 
            "message": "Reviewer assigned successfully",
            "task": {
                "id": task.task_id,
                "reviewer": task.reviewer,
                "reviewer_status": task.reviewer_status
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"🚨 ERROR in assign_reviewer: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@tasks_bp.route('/tasks/<task_id>/review-status', methods=['PATCH'])
@cross_origin()
def update_reviewer_status(task_id):
    try:
        # Get user information from request
        user_id = request.args.get('user_id')
        role_id = request.args.get('role_id')
        
        print(f"Received reviewer status update request for task {task_id} from user {user_id} with role {role_id}")
        print(f"Request data: {request.json}")
        
        # Validate user authentication
        if not user_id or not role_id:
            return jsonify({
                "success": False, 
                "error": "Authentication required. Please provide user_id and role_id"
            }), 401
        
        # Get the task
        task = Task.query.filter_by(task_id=task_id).first()
        if not task:
            return jsonify({"success": False, "error": "Task not found"}), 404
        
        # Get the data to update
        data = request.json
        
        # Check if reviewer_status is provided
        if 'reviewer_status' not in data:
            return jsonify({"success": False, "error": "reviewer_status is required"}), 400
        
        # Store original values for comparison
        original_reviewer_status = task.reviewer_status
        new_reviewer_status = data['reviewer_status']
        
        print(f"Updating reviewer status from {original_reviewer_status} to {new_reviewer_status}")
        
        # Update the reviewer_status
        task.reviewer_status = new_reviewer_status
        
        # Update status if provided, or automatically change status to WIP if 'rejected'
        if 'status' in data:
            original_status = task.status
            task.status = data['status']
            print(f"Updating task status from {original_status} to {task.status}")
        elif new_reviewer_status == 'rejected':
            # Automatically set status to WIP if rejected
            original_status = task.status
            task.status = 'WIP'
            print(f"Auto-updating task status from {original_status} to WIP due to rejection")
        
        # Update remarks if provided
        if 'remarks' in data and data['remarks']:
            task.remarks = data['remarks']
            print(f"Updating remarks to: {data['remarks']}")
        
        # Save changes to database
        db.session.commit()
        
        print(f"✅ Successfully updated reviewer status to {new_reviewer_status} for task {task_id}")
        
        return jsonify({
            "success": True, 
            "message": f"Reviewer status updated to {new_reviewer_status}",
            "task": {
                "id": task.task_id,
                "reviewer_status": task.reviewer_status,
                "status": task.status
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"🚨 ERROR in update_reviewer_status: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
