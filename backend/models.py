from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Actor(db.Model):
    __tablename__ = 'actors'
    
    actor_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    actor_name = db.Column(db.String(255), nullable=False)
    gender = db.Column(db.String(1))
    DOB = db.Column(db.Date)
    mobile1 = db.Column(db.String(20), nullable=False)
    mobile2 = db.Column(db.String(20))
    email_id = db.Column(db.String(255), nullable=False)
    password = db.Column(db.String(255))
    group_id = db.Column(db.Integer)
    role_id = db.Column(db.Integer)
    status = db.Column(db.String(10))
    
    # Define the relationship without backref to avoid circular reference
    tasks = db.relationship('Task', backref='actor', lazy=True)
    
    def to_dict(self):
        return {
            'actor_id': self.actor_id,
            'actor_name': self.actor_name,
            'gender': self.gender,
            'DOB': self.DOB.strftime('%Y-%m-%d') if self.DOB else None,
            'mobile1': self.mobile1,
            'mobile2': self.mobile2,
            'email_id': self.email_id,
            'password': self.password,
            'group_id': self.group_id,
            'role_id': self.role_id,
            'status': self.status
        }

class Group(db.Model):
    __tablename__ = 'group a'
    
    group_id = db.Column(db.Integer, primary_key=True)
    group_name = db.Column(db.String(255), nullable=False)
    group_des = db.Column(db.String(255))
    

    
    def to_dict(self):
        return {
            'group_id': self.group_id,
            'group_name': self.group_name,
            'group_des': self.group_des
        }

class Customer(db.Model):
    __tablename__ = 'customers'
    
    customer_id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(255), nullable=False)
    customer_type = db.Column(db.String(50))
    gender = db.Column(db.String(10))
    DOB = db.Column(db.Date)
    email_id = db.Column(db.String(255), nullable=False)
    mobile1 = db.Column(db.String(20), nullable=False)
    mobile2 = db.Column(db.String(20))
    address = db.Column(db.String(255))
    city = db.Column(db.String(100))
    pincode = db.Column(db.String(20))
    country = db.Column(db.String(100))
    group_id = db.Column(db.Integer)
    status = db.Column(db.String(10))
    
    # Define the relationship without backref
    # group = db.relationship('Group', foreign_keys=[group_id])
    
    def to_dict(self):
        return {
            'customer_id': self.customer_id,
            'customer_name': self.customer_name,
            'customer_type': self.customer_type,
            'gender': self.gender,
            'DOB': self.DOB.strftime('%Y-%m-%d') if self.DOB else None,
            'email_id': self.email_id,
            'mobile1': self.mobile1,
            'mobile2': self.mobile2,
            'address': self.address,
            'city': self.city,
            'pincode': self.pincode,
            'country': self.country,
            'group_id': self.group_id,
            'status': self.status
        }

class Activity(db.Model):
    __tablename__ = 'activities'
    
    activity_id = db.Column(db.Integer, primary_key=True)
    activity_name = db.Column(db.String(255), nullable=False)
    standard_time = db.Column(db.Float, default=0)
    act_des = db.Column(db.Text)
    criticality = db.Column(db.String(50), default='Low')
    duration = db.Column(db.Integer, default=0)
    role_id = db.Column(db.Integer, default=0)
    frequency = db.Column(db.Integer, default=0)
    due_by = db.Column(db.Date, default=datetime(2000, 1, 1))
    activity_type = db.Column(db.String(10), default='R')
    status = db.Column(db.String(1), default='A')  # 'A' for Active, 'O' for Obsolete
    sub_activities = db.Column(db.JSON)  # New JSON column for subtasks
    
    # Relationships
    # tasks = db.relationship('Task', backref='activity', lazy=True)
    
    def to_dict(self):
        return {
            'activity_id': self.activity_id,
            'activity_name': self.activity_name,
            'standard_time': self.standard_time,
            'act_des': self.act_des,
            'criticality': self.criticality,
            'duration': self.duration,
            'role_id': self.role_id,
            'frequency': self.frequency,
            'due_by': self.due_by.strftime('%Y-%m-%d') if self.due_by else None,
            'activity_type': self.activity_type,
            'status': self.status,
            'sub_activities': self.sub_activities  # Include subtasks in the response
        }

class Task(db.Model):
    __tablename__ = 'tasks'
    
    task_id = db.Column(db.Integer, primary_key=True)
    task_name = db.Column(db.String(255))
    criticality = db.Column(db.String(50))
    customer_name = db.Column(db.String(255))
    duedate = db.Column(db.Date)
    actor_id = db.Column(db.Integer, db.ForeignKey('actors.actor_id'))
    assigned_to = db.Column(db.String(255))
    reviewer = db.Column(db.String(255))
    status = db.Column(db.String(50))
    reviewer_status = db.Column(db.String(50))
    link = db.Column(db.String(255))
    activity_id = db.Column(db.Integer, db.ForeignKey('activities.activity_id'))
    time_taken = db.Column(db.Float)
    actual_date = db.Column(db.Date)
    initiator = db.Column(db.String(255))
    duration = db.Column(db.Float)
    stage_id = db.Column(db.Integer, default=1)
    activity_type = db.Column(db.String(10))
    remarks = db.Column(db.Text)
    assigned_timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'task_id': self.task_id,
            'task_name': self.task_name,
            'criticality': self.criticality,
            'customer_name': self.customer_name,
            'duedate': self.duedate.strftime('%Y-%m-%d') if self.duedate else None,
            'actor_id': self.actor_id,
            'assigned_to': self.assigned_to,
            'reviewer': self.reviewer,
            'status': self.status,
            'reviewer_status': self.reviewer_status,
            'link': self.link,
            'activity_id': self.activity_id,
            'time_taken': self.time_taken,
            'actual_date': self.actual_date.strftime('%Y-%m-%d') if self.actual_date else None,
            'initiator': self.initiator,
            'duration': self.duration,
            'stage_id': self.stage_id,
            'activity_type': self.activity_type,
            'remarks': self.remarks,
            'assigned_timestamp': self.assigned_timestamp.strftime('%Y-%m-%d %H:%M:%S') if self.assigned_timestamp else None
        }


class ActivityAssignment(db.Model):
    __tablename__ = 'activity_assignments'
    
    assignment_id = db.Column(db.Integer, primary_key=True)
    activity_id = db.Column(db.Integer, db.ForeignKey('activities.activity_id'))
    assignee_id = db.Column(db.Integer, db.ForeignKey('actors.actor_id'))
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'))
    
    # Relationships
    activity = db.relationship('Activity')
    assignee = db.relationship('Actor')
    customer = db.relationship('Customer')
    
    def to_dict(self):
        return {
            'assignment_id': self.assignment_id,
            'activity_id': self.activity_id,
            'assignee_id': self.assignee_id,
            'customer_id': self.customer_id
        }

class Message(db.Model):
    __tablename__ = 'messages'
    
    message_id = db.Column(db.Integer, primary_key=True)
    message_description = db.Column(db.Text)
    group_name = db.Column(db.String(255))
    frequency = db.Column(db.String(20), default="0")
    date = db.Column(db.Date)
    email_id = db.Column(db.String(255))
    time = db.Column(db.String(50))
    status = db.Column(db.String(10), default='A')
    
    def to_dict(self):
        return {
            'message_id': self.message_id,
            'message_description': self.message_description,
            'group_name': self.group_name,
            'frequency': self.frequency,
            'date': self.date.strftime('%Y-%m-%d') if self.date else None,
            'email_id': self.email_id,
            'time': self.time,
            'status': self.status
        }

class SubTask(db.Model):
    __tablename__ = 'sub_task'
    
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.String(50), db.ForeignKey('tasks.task_id'), nullable=False)
    sub_task = db.Column(db.JSON)
    status = db.Column(db.String(50), default='Pending')
    
    # Relationship
    task = db.relationship('Task', backref='subtasks')
    
    def to_dict(self):
        return {
            'id': self.id,
            'task_id': self.task_id,
            'sub_task': self.sub_task,
            'status': self.status
        }

class Error_Message(db.Model):
    __tablename__ = 'error_message'
 
    code = db.Column(db.String(50), primary_key=True)
    English = db.Column(db.String(255), nullable=False)
    Type=db.Column(db.String(50),nullable=False)

class CustomerActivity(db.Model):
    __tablename__ = 'customer_activity'
    __table_args__ = {'extend_existing': True}  # Add this to prevent duplicate declaration

    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), primary_key=True)
    activity_id = db.Column(db.Integer, db.ForeignKey('activities.activity_id'), primary_key=True)
    actor_id = db.Column(db.Integer, db.ForeignKey('actors.actor_id'), nullable=False)
    remarks = db.Column(db.String(255), nullable=True)

class ReminderMail(db.Model):
    __tablename__ = 'reminder_mails'
    task_id = db.Column(db.String(50))
    message_des = db.Column(db.String(255))
    date = db.Column(db.Date)
    time = db.Column(db.Time)
    email_id = db.Column(db.String(45))
    status = db.Column(db.String(45))
    sno=db.Column(db.Integer,primary_key=True)

class HolidayMaster(db.Model):
    __tablename__ = 'holiday_master'
   
    Date = db.Column(db.Date, primary_key=True)
    Description = db.Column(db.String(50))

class MessageQueue(db.Model):
    __tablename__ = 'message_queue'
    s_no = db.Column(db.Integer, primary_key=True)
    message_des = db.Column(db.String(255))

    date = db.Column(db.Date)
    email_id = db.Column(db.String(255))
    time = db.Column(db.Time)
    status = db.Column(db.String(10))
    
class Diary1(db.Model):
    __tablename__ = 'diary1'
    id = db.Column(db.Integer, primary_key=True)
    actor_id = db.Column(db.Integer, nullable=False)
    date = db.Column(db.Date, nullable=True)
    start_time = db.Column(db.Time, nullable=True)
    end_time = db.Column(db.Time, nullable=True)
    task = db.Column(db.String(500), nullable=True)
    subtask = db.Column(db.String(500), nullable=True)
    remarks = db.Column(db.String(255), nullable=True)
 
    def to_dict(self):
        return {
            "id": self.id,
            "actor_id": self.actor_id,
            "date": self.date.strftime('%Y-%m-%d') if self.date else None,
            "start_time": self.start_time.strftime('%H:%M') if self.start_time else None,
            "end_time": self.end_time.strftime('%H:%M') if self.end_time else None,
            "task": self.task,
            "subtask": self.subtask,
            "remarks": self.remarks
        }
        
    @staticmethod
    def from_dict(data):
        """Create or update a Diary1 instance from dictionary data"""
        from datetime import datetime
        
        diary = Diary1()
        
        if 'id' in data and data['id']:
            diary.id = data['id']
            
        if 'actor_id' in data and data['actor_id']:
            diary.actor_id = data['actor_id']
            
        if 'date' in data and data['date']:
            if isinstance(data['date'], str):
                diary.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
            else:
                diary.date = data['date']
                
        if 'start_time' in data and data['start_time']:
            if isinstance(data['start_time'], str):
                diary.start_time = datetime.strptime(data['start_time'], '%H:%M').time()
            else:
                diary.start_time = data['start_time']
                
        if 'end_time' in data and data['end_time']:
            if isinstance(data['end_time'], str):
                diary.end_time = datetime.strptime(data['end_time'], '%H:%M').time()
            else:
                diary.end_time = data['end_time']
                
        if 'task' in data:
            diary.task = data['task']
            
        if 'subtask' in data:
            diary.subtask = data['subtask']
            
        if 'remarks' in data:
            diary.remarks = data['remarks']
            
        return diary

class Role(db.Model):
    __tablename__ = 'roles'
    
    role_id = db.Column(db.Integer, primary_key=True)
    role_name = db.Column(db.String(45), nullable=False)
    activity_id = db.Column(db.Integer)
    stage_id = db.Column(db.Integer)
    
    def to_dict(self):
        return {
            'role_id': self.role_id,
            'role_name': self.role_name,
            'activity_id': self.activity_id,
            'stage_id': self.stage_id
        }


    