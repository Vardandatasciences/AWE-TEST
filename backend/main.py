from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from datetime import datetime
import pandas as pd
from io import BytesIO
from dash import Dash
from dash import html
from dash import dcc
from routes.tasks import tasks_bp
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, Actor, Group, Customer, Activity, Task, ActivityAssignment, Message, Report, Analytics

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://root:root@localhost/aawe'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
CORS(app)  # Enable CORS to allow frontend requests

# Register blueprints
app.register_blueprint(tasks_bp)

print("app.py --------------------------------------------entered")

# Initialize SQLAlchemy with the app
db.init_app(app)

# Initialize Dash application
dash_app = Dash(__name__, server=app, url_base_pathname="/analysis/")
# dash_app.layout = html.Div([
#     html.H1("Dash Analysis Dashboard"),
#     html.P("This is the Analysis section served by Dash.")
# ])

# Routes
@app.route('/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.all()
    return jsonify([{
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'status': task.status,
        'priority': task.priority,
        'assignee': task.assignee,
        'due_date': task.due_date.isoformat() if task.due_date else None
    } for task in tasks])

from flask_jwt_extended import jwt_required, get_jwt_identity

@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    current_user_email = get_jwt_identity()  # Get logged-in user's email from token
    user = Actor.query.filter_by(email_id=current_user_email).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "actor_id": user.actor_id,
        "actor_name": user.actor_name,
        "email_id": user.email_id,
        "role_id": user.role_id
    })


@app.route('/tasks/<int:task_id>', methods=['PATCH'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.json
    for key, value in data.items():
        setattr(task, key, value)
    db.session.commit()
    return jsonify({'message': 'Task updated successfully'})

@app.route('/activities', methods=['GET'])
def get_activities():
    try:
        activities = Activity.query.all()
        return jsonify([activity.to_dict() for activity in activities])
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/add_activity', methods=['POST'])
def add_activity():
    try:
        data = request.json
        
        new_activity = Activity(
            activity_name=data.get('activity_name', 'Unnamed Activity'),
            standard_time=data.get('standard_time', 0),
            act_des=data.get('act_des', ''),
            criticality=data.get('criticality', 'Low'),
            duration=data.get('duration', 0),
            role_id=data.get('role_id', 0),
            frequency=data.get('frequency', 0),
            due_by=datetime.strptime(data.get('due_by', '2000-01-01'), '%Y-%m-%d').date(),
            activity_type=data.get('activity_type', 'R')
        )
        
        db.session.add(new_activity)
        db.session.commit()
        
        return jsonify({"message": "Activity added successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/actors', methods=['GET'])
def get_actors():
    try:
        actors = Actor.query.all()
        return jsonify([actor.to_dict() for actor in actors])
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/actors_assign', methods=['GET'])
def get_actors_assign():
    try:
        actors = Actor.query.with_entities(Actor.actor_name).all()
        return jsonify([{"actor_name": actor.actor_name} for actor in actors])
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/customers_assign', methods=['GET'])
def get_customers_assign():
    try:
        customers = Customer.query.with_entities(Customer.customer_name).all()
        return jsonify([{"customer_name": customer.customer_name} for customer in customers])
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/groups', methods=['GET'])
def get_groups():
    try:
        groups = Group.query.all()
        return jsonify([group.to_dict() for group in groups])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/customers', methods=['GET'])
def get_customers():
    try:
        customers = Customer.query.all()
        return jsonify([customer.to_dict() for customer in customers])
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/assign_activity', methods=['POST'])
def assign_activity():
    try:
        data = request.json
        
        new_assignment = ActivityAssignment(
            activity_id=data['activity_id'],
            assignee_id=data['assignee_id'],
            customer_id=data['customer_id']
        )
        
        db.session.add(new_assignment)
        db.session.commit()
        
        return jsonify({"message": "Activity assigned successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/add_message', methods=['POST'])
def add_message():
    try:
        data = request.json
        print("Received Data:", data)
        
        frequency = data.get('frequency', "0")
        if frequency == "":
            return jsonify({"error": "Frequency is required"}), 400
        
        new_message = Message(
            message_description=data.get('message_description'),
            group_name=data.get('group_name'),
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

@app.route('/delete_actor/<int:actor_id>', methods=['DELETE'])
def delete_actor(actor_id):
    try:
        actor = Actor.query.get_or_404(actor_id)
        db.session.delete(actor)
        db.session.commit()
        return jsonify({"message": "Actor deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/delete_customer/<int:customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    try:
        customer = Customer.query.get_or_404(customer_id)
        db.session.delete(customer)
        db.session.commit()
        return jsonify({"message": "Customer deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/update_actor', methods=['PUT'])
def update_actor():
    try:
        data = request.json
        actor = Actor.query.get_or_404(data['actor_id'])
        
        actor.actor_name = data['actor_name']
        actor.mobile1 = data['mobile1']
        actor.email_id = data['email_id']
        actor.group_id = data['group_id']
        actor.role_id = data['role_id']
        
        db.session.commit()
        return jsonify({"message": "Actor updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/update_customer', methods=['PUT'])
def update_customer():
    try:
        data = request.json
        customer = Customer.query.get_or_404(data['customer_id'])
        
        customer.customer_name = data['customer_name']
        customer.email_id = data['email_id']
        customer.group_id = data['group_id']
        customer.mobile1 = data['mobile1']
        customer.address = data['address']
        customer.city = data['city']
        customer.pincode = data['pincode']
        
        db.session.commit()
        return jsonify({"message": "Customer updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/actors', methods=['POST'])
def add_actor():
    try:
        data = request.json
        print("Received Data:", data)
        
        # Ensure required fields are present
        if not data.get('actor_name') or not data.get('mobile1') or not data.get('email_id'):
            return jsonify({"error": "Missing required fields"}), 400
        
        new_actor = Actor(
            actor_name=data.get('actor_name'),
            gender=data.get('gender'),
            DOB=datetime.strptime(data.get('DOB'), '%Y-%m-%d').date() if data.get('DOB') else None,
            mobile1=data.get('mobile1'),
            mobile2=data.get('mobile2'),
            email_id=data.get('email_id'),
            password=data.get('password'),
            group_id=data.get('group_id'),
            role_id=data.get('role_id'),
            status=data.get('status')
        )
        
        db.session.add(new_actor)
        db.session.commit()
        
        return jsonify({"message": "Actor added successfully"}), 201
    except Exception as e:
        db.session.rollback()
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/add_customer', methods=['POST'])
def add_customer():
    try:
        data = request.json
        print("Received Data:", data)
        
        # Ensure required fields are present
        if not data.get('customer_name') or not data.get('email_id') or not data.get('mobile1'):
            return jsonify({"error": "Missing required fields"}), 400
        
        new_customer = Customer(
            customer_name=data.get('customer_name'),
            customer_type=data.get('customer_type'),
            gender=data.get('gender'),
            DOB=datetime.strptime(data.get('DOB'), '%Y-%m-%d').date() if data.get('DOB') else None,
            email_id=data.get('email_id'),
            mobile1=data.get('mobile1'),
            mobile2=data.get('mobile2'),
            address=data.get('address'),
            city=data.get('city'),
            pincode=data.get('pincode'),
            country=data.get('country'),
            group_id=data.get('group_id'),
            status=data.get('status')
        )
        
        db.session.add(new_customer)
        db.session.commit()
        
        return jsonify({"message": "Customer added successfully"}), 201
    except Exception as e:
        db.session.rollback()
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/delete_activity/<int:activity_id>', methods=['DELETE'])
def delete_activity(activity_id):
    try:
        activity = Activity.query.get_or_404(activity_id)
        db.session.delete(activity)
        db.session.commit()
        return jsonify({"message": "Activity deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/update_activity', methods=['PUT'])
def update_activity():
    try:
        data = request.json
        activity = Activity.query.get_or_404(data['activity_id'])
        
        activity.activity_name = data['activity_name']
        activity.criticality = data['criticality']
        activity.duration = data['duration']
        activity.role_id = data['role_id']
        activity.frequency = data['frequency']
        activity.due_by = datetime.strptime(data['due_by'], '%Y-%m-%d').date() if data['due_by'] else None
        
        db.session.commit()
        return jsonify({"message": "Activity updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/message_descriptions', methods=['GET'])
def get_message_descriptions():
    try:
        messages = Message.query.with_entities(Message.message_id, Message.message_description).all()
        return jsonify([{"message_id": msg.message_id, "message_description": msg.message_description} for msg in messages])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/view_activity_report')
def view_activity_report():
    try:
        activities = Activity.query.with_entities(Activity.activity_id, Activity.activity_name).all()
        return jsonify([{
            "activity_id": activity.activity_id,
            "activity_name": activity.activity_name
        } for activity in activities])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get_activity_data', methods=['POST'])
def get_activity_data():
    try:
        data = request.json
        activity_id = data.get("activity_id")
        
        # Get standard time
        activity = Activity.query.get_or_404(activity_id)
        standard_time = activity.standard_time
        
        # Get all completed tasks for the activity
        tasks = Task.query.filter_by(activity_id=activity_id, status='completed').all()
        
        task_list = [{
            "employee_id": task.actor_id,
            "name": task.assigned_to,
            "task_id": task.task_id,
            "time_taken": task.time_taken,
            "completion_date": task.actual_date.strftime('%Y-%m-%d') if task.actual_date else None
        } for task in tasks]
        
        return jsonify({"tasks": task_list, "standard_time": standard_time})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate_activity_report', methods=['GET'])
def generate_activity_report():
    try:
        # Get all activities
        activities = Activity.query.all()
        
        # Create Excel file in memory
        excel_buffer = BytesIO()
        
        with pd.ExcelWriter(excel_buffer, engine="openpyxl") as writer:
            for activity in activities:
                # Get all completed tasks for the activity
                tasks = Task.query.filter_by(activity_id=activity.activity_id, status='completed').all()
                
                # Convert to DataFrame format
                task_data = [
                    {
                        "Employee ID": task.actor_id,
                        "Name": task.assigned_to,
                        "Task ID": task.task_id,
                        "Time Taken": task.time_taken if task.time_taken is not None else 0,
                        "Date of Completion": task.actual_date.strftime('%Y-%m-%d') if task.actual_date else None,
                        "Standard Time": activity.standard_time,
                        "Status": (
                            "Early" if (task.time_taken is not None and task.time_taken < activity.standard_time)
                            else "On-Time" if (task.time_taken == activity.standard_time)
                            else "Delay"
                        )
                    }
                    for task in tasks
                ]
                
                df = pd.DataFrame(task_data)
                
                # Create sheet name
                sheet_name = f"{activity.activity_id}_{activity.activity_name}"[:31]
                df.to_excel(writer, index=False, sheet_name=sheet_name)
        
        # Return file for download
        excel_buffer.seek(0)
        current_date = datetime.now().strftime("%Y-%m-%d")
        file_name = f"{current_date}_ActivityReport.xlsx"
        
        return send_file(
            excel_buffer,
            as_attachment=True,
            download_name=file_name,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate_employee_report', methods=['GET'])
def generate_employee_report():
    try:
        # Get all employees (actors with role_id=22)
        actors = Actor.query.filter_by(role_id=22).all()
        
        # Create Excel file in memory
        excel_buffer = BytesIO()
        
        with pd.ExcelWriter(excel_buffer, engine="openpyxl") as writer:
            for actor in actors:
                # Get completed tasks with activity info using join
                tasks = db.session.query(
                    Task, Activity.activity_name, Activity.standard_time
                ).join(
                    Activity, Task.activity_id == Activity.activity_id
                ).filter(
                    Task.actor_id == actor.actor_id,
                    Task.status == 'completed'
                ).all()
                
                # Convert to DataFrame format
                task_data = [
                    {
                        "Activity ID": task[0].activity_id,
                        "Activity Name": task[1],
                        "Task ID": task[0].task_id,
                        "Date of Completion": task[0].actual_date.strftime('%Y-%m-%d') if task[0].actual_date else None,
                        "Time Taken": task[0].time_taken if task[0].time_taken is not None else 0,
                        "Standard Time": task[2],
                        "Status": (
                            "Early" if (task[0].time_taken is not None and task[0].time_taken < task[2])
                            else "On-Time" if (task[0].time_taken == task[2])
                            else "Delay"
                        )
                    }
                    for task in tasks
                ]
                
                df = pd.DataFrame(task_data)
                
                # Create sheet name
                sheet_name = f"{actor.actor_id}_{actor.actor_name}"[:31]
                df.to_excel(writer, index=False, sheet_name=sheet_name)
        
        # Return file for download
        excel_buffer.seek(0)
        current_date = datetime.now().strftime("%Y-%m-%d")
        file_name = f"{current_date}_EmployeeReport.xlsx"
        
        return send_file(
            excel_buffer,
            as_attachment=True,
            download_name=file_name,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/view_employee_report', methods=['GET'])
def view_employee_report():
    try:
        actors = Actor.query.filter_by(role_id=22).all()
        return jsonify([{
            "actor_id": actor.actor_id,
            "actor_name": actor.actor_name
        } for actor in actors])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get_employee_data', methods=['POST'])
def get_employee_data():
    try:
        data = request.json
        actor_id = data.get("actor_id")
        
        # Get all completed tasks for this employee with activity and actor info
        tasks = db.session.query(
            Task, Activity.activity_name, Activity.standard_time, Actor.actor_name
        ).join(
            Activity, Task.activity_id == Activity.activity_id
        ).join(
            Actor, Task.actor_id == Actor.actor_id
        ).filter(
            Task.actor_id == actor_id,
            Task.status == 'completed'
        ).all()
        
        task_list = [{
            "activity_id": task[0].activity_id,
            "activity_name": task[1],
            "task_id": task[0].task_id,
            "task_name": task[0].task_name,
            "time_taken": task[0].time_taken,
            "completion_date": task[0].actual_date.strftime('%Y-%m-%d') if task[0].actual_date else None,
            "actor_id": task[0].actor_id,
            "actor_name": task[3],
            "standard_time": task[2]
        } for task in tasks]
        
        return jsonify({"tasks": task_list})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analytics', methods=['GET'])
def get_analytics():
    time_range = request.args.get('timeRange', 'month')
    # Sample analytics data - replace with actual database queries
    return jsonify({
        'summaryStats': {
            'totalTasks': 150,
            'completedTasks': 85,
            'inProgressTasks': 45,
            'avgCompletionTime': '3.5 days',
            'efficiency': '78%'
        },
        'taskCompletion': {
            'labels': ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            'datasets': [{
                'label': 'Tasks Completed',
                'data': [12, 19, 15, 21]
            }]
        }
    })

@app.route('/reports', methods=['GET'])
def get_reports():
    report_type = request.args.get('type', 'all')
    # Sample reports data - replace with actual database queries
    return jsonify([
        {
            'id': 1,
            'title': 'Monthly Task Completion Report',
            'description': 'Summary of all completed tasks for the current month',
            'type': 'task',
            'createdAt': '2024-03-07',
            'status': 'completed',
            'format': 'PDF'
        },
        {
            'id': 2,
            'title': 'Team Performance Analysis',
            'description': 'Analysis of team performance and task completion rates',
            'type': 'performance',
            'createdAt': '2024-03-07',
            'status': 'completed',
            'format': 'Excel'
        }
    ])




@app.route('/Analysis')
def dash_board():
    return dash_app.index()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)