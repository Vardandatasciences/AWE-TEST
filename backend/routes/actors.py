from flask import Blueprint, jsonify, request, make_response
from models import db, Actor, Task
from datetime import datetime
import traceback
from flask_bcrypt import Bcrypt
from flask import current_app
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from io import BytesIO
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

actors_bp = Blueprint('actors', __name__)

# Initialize Bcrypt with your Flask app
bcrypt = Bcrypt()

# Email configuration
SENDER_EMAIL = "loukyarao68@gmail.com"  # Use the email from your tasks.py
EMAIL_PASSWORD = "vafx kqve dwmj mvjv"  # Use the password from your tasks.py

def send_welcome_email(recipient_email, actor_name, actor_id, password):
    try:
        # Create message container
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Welcome to ProSync - Your Account Details"
        msg['From'] = SENDER_EMAIL
        msg['To'] = recipient_email

        # Create the HTML version of your message
        html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #3498db; color: white; padding: 15px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #999; }}
                .credentials {{ background-color: #f0f0f0; padding: 15px; margin: 15px 0; border-left: 4px solid #3498db; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to ProSync!</h1>
                </div>
                <div class="content">
                    <p>Hello {actor_name},</p>
                    
                    <p>Welcome to ProSync! Your account has been successfully created. We're excited to have you on board.</p>
                    
                    <div class="credentials">
                        <p><strong>Your login credentials:</strong></p>
                        <p>Actor ID: {actor_id}</p>
                        <p>Password: {password}</p>
                    </div>
                    
                    <p>Please keep this information secure. We recommend changing your password after your first login.</p>
                    
                    <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                    
                    <p>Best regards,<br>The ProSync Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Attach parts to the message
        part = MIMEText(html, 'html')
        msg.attach(part)

        # Setup the server
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, EMAIL_PASSWORD)
        
        # Send the message
        server.sendmail(SENDER_EMAIL, recipient_email, msg.as_string())
        server.quit()
        
        print(f"Welcome email sent successfully to {recipient_email}")
        return True
    except Exception as e:
        print(f"Failed to send welcome email: {str(e)}")
        traceback.print_exc()
        return False

@actors_bp.route('/actors', methods=['GET'])
def get_actors():
    try:
        actors = Actor.query.all()
        # Use explicit serialization to ensure it works properly
        actor_list = []
        for actor in actors:
            actor_dict = actor.to_dict()
            actor_list.append(actor_dict)
        
        print("Returning actors:", actor_list)  # Debug log
        return jsonify(actor_list)
    except Exception as e:
        print("Error in get_actors:", e)
        traceback.print_exc()
        return jsonify([]), 500  # Return empty array on error with 500 status

@actors_bp.route('/actors_assign', methods=['GET'])
def get_actors_assign():
    try:
        # Fetch actors but exclude those with role_id = 11
        actors = Actor.query.filter(Actor.role_id != 11, Actor.status != 'O').all()
        
        return jsonify([
    {"actor_id": actor.actor_id, "actor_name": actor.actor_name, "role_id": actor.role_id} 
    for actor in actors
])

    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

@actors_bp.route('/add_actor', methods=['POST'])
def add_actor_endpoint():
    try:
        data = request.json
        
        # Ensure required fields are present
        if not data.get('actor_name') or not data.get('mobile1') or not data.get('email_id'):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Format gender to match database column size
        gender = data.get('gender')
        if gender:
            if gender.lower() == 'male':
                gender = 'M'
            elif gender.lower() == 'female':
                gender = 'F'
            else:
                gender = gender[:1]  # Take first character if it's something else
        
        # Store original password for email
        original_password = data.get('password')
        
        # Hash the password if provided
        hashed_password = None
        if original_password:
            hashed_password = bcrypt.generate_password_hash(original_password).decode('utf-8')
        
        # Create a new actor without specifying actor_id (let it be auto-generated)
        new_actor = Actor(
            actor_name=data.get('actor_name'),
            gender=gender,
            DOB=datetime.strptime(data.get('DOB'), '%Y-%m-%d').date() if data.get('DOB') else None,
            mobile1=data.get('mobile1'),
            mobile2=data.get('mobile2'),
            email_id=data.get('email_id'),
            password=hashed_password,  # Store the hashed password
            group_id=data.get('group_id'),
            role_id=data.get('role_id'),
            status=data.get('status')
        )
        
        db.session.add(new_actor)
        db.session.commit()
        
        # Send welcome email with account details
        email_sent = False
        if data.get('email_id') and original_password:
            email_sent = send_welcome_email(
                data.get('email_id'),
                data.get('actor_name'),
                new_actor.actor_id,
                original_password
            )
        
        response = {
            "message": "Actor added successfully", 
            "actor_id": new_actor.actor_id,
            "email_sent": email_sent
        }
        
        return jsonify(response), 201
    except Exception as e:
        db.session.rollback()
        print("Error:", e)
        traceback.print_exc()  # Add traceback for better debugging
        return jsonify({"error": str(e)}), 500

@actors_bp.route('/delete_actor/<int:actor_id>', methods=['DELETE'])
def delete_actor(actor_id):
    try:
        actor = Actor.query.get_or_404(actor_id)
        db.session.delete(actor)
        db.session.commit()
        return jsonify({"message": "Actor deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@actors_bp.route('/actors/update', methods=['PUT'])
def update_actor():
    try:
        data = request.json
        actor = Actor.query.get(data['actor_id'])
        
        if not actor:
            return jsonify({"error": "Actor not found"}), 404
            
        # Update fields
        actor.actor_name = data.get('actor_name', actor.actor_name)
        actor.email_id = data.get('email_id', actor.email_id)
        actor.mobile1 = data.get('mobile1', actor.mobile1)
        actor.gender = data.get('gender', actor.gender)
        actor.status = data.get('status', actor.status)
        
        db.session.commit()
        return jsonify({"message": "Actor updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@actors_bp.route('/actors/performance-report/<int:actor_id>', methods=['GET'])
def get_performance_report(actor_id):
    try:
        # Get actor information
        actor = Actor.query.get_or_404(actor_id)
        
        # Get tasks assigned to this actor
        tasks = Task.query.filter_by(actor_id=actor_id).all()
        
        # Create a BytesIO buffer to store the PDF
        buffer = BytesIO()
        
        # Create a PDF document
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        
        # Add styles
        styles = getSampleStyleSheet()
        title_style = styles['Heading1']
        subtitle_style = styles['Heading2']
        normal_style = styles['Normal']
        
        # Add title
        elements.append(Paragraph(f"Performance Report: {actor.actor_name}", title_style))
        elements.append(Spacer(1, 20))
        
        # Add actor information
        elements.append(Paragraph("Auditor Information", subtitle_style))
        elements.append(Spacer(1, 10))
        
        actor_data = [
            ["ID", str(actor.actor_id)],
            ["Name", actor.actor_name],
            ["Email", actor.email_id],
            ["Phone", actor.mobile1],
            ["Status", "Active" if actor.status == 'A' else "Inactive"]
        ]
        
        actor_table = Table(actor_data, colWidths=[100, 300])
        actor_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(actor_table)
        elements.append(Spacer(1, 20))
        
        # Add tasks information
        elements.append(Paragraph("Task Performance", subtitle_style))
        elements.append(Spacer(1, 10))
        
        if tasks:
            # Create table header
            task_data = [["Task Name", "Customer", "Status", "Due Date", "Time Taken"]]
            
            # Add task rows
            for task in tasks:
                task_data.append([
                    task.task_name or "N/A",
                    task.customer_name or "N/A",
                    task.status or "N/A",
                    task.duedate.strftime('%Y-%m-%d') if task.duedate else "N/A",
                    f"{task.time_taken or 0} hours"
                ])
            
            task_table = Table(task_data, colWidths=[120, 120, 80, 80, 80])
            task_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            elements.append(task_table)
            
            # Add performance summary statistics
            completed_tasks = sum(1 for task in tasks if task.status == 'Completed')
            pending_tasks = sum(1 for task in tasks if task.status == 'Pending')
            in_progress = sum(1 for task in tasks if task.status == 'WIP')
            not_started = sum(1 for task in tasks if task.status == 'Yet to Start')
            
            elements.append(Spacer(1, 20))
            elements.append(Paragraph("Performance Summary", subtitle_style))
            elements.append(Spacer(1, 10))
            
            summary_data = [
                ["Total Tasks", str(len(tasks))],
                ["Completed", str(completed_tasks)],
                ["In Progress", str(in_progress)],
                ["Pending", str(pending_tasks)],
                ["Not Started", str(not_started)],
                ["Completion Rate", f"{int(completed_tasks / len(tasks) * 100) if tasks else 0}%"]
            ]
            
            summary_table = Table(summary_data, colWidths=[120, 120])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('BACKGROUND', (0, -1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            elements.append(summary_table)
        else:
            elements.append(Paragraph("No tasks assigned to this auditor", normal_style))
        
        # Build the PDF
        doc.build(elements)
        
        # Get the PDF data from the buffer
        pdf_data = buffer.getvalue()
        buffer.close()
        
        # Prepare response
        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=Auditor_{actor.actor_name.replace(" ", "_")}_Report.pdf'
        
        return response
        
    except Exception as e:
        print(f"Error generating PDF: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@actors_bp.route('/actors/deactivate', methods=['POST'])
def deactivate_actor():
    try:
        data = request.json
        actor_id = data.get('actor_id')
        
        actor = Actor.query.get(actor_id)
        if not actor:
            return jsonify({"error": "Actor not found"}), 404
            
        # Update actor status to inactive
        actor.status = 'O'  # Assuming 'O' is the status code for inactive
        
        # Find active tasks assigned to this actor
        active_tasks = Task.query.filter(
            Task.actor_id == actor_id,
            Task.status.in_(['Yet to Start', 'WIP'])
        ).all()
        
        # Update tasks to pending status
        affected_tasks = 0
        task_details = []
        
        for task in active_tasks:
            task.status = 'Pending'
            task.remarks = f"Previous assignee {actor.actor_name} was deactivated"
            affected_tasks += 1
            task_details.append({
                'task_id': task.task_id,
                'task_name': task.task_name,
                'activity_id': task.activity_id,
                'due_date': task.duedate.isoformat() if task.duedate else None
            })
        
        db.session.commit()
        
        return jsonify({
            "message": "Actor deactivated successfully",
            "actor_name": actor.actor_name,
            "affected_tasks": affected_tasks,
            "task_details": task_details
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500 
