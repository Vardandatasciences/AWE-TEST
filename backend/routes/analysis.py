import pandas as pd
import numpy as np
from sqlalchemy import create_engine
import datetime
from flask import Blueprint, render_template_string, jsonify, request
from flask_cors import CORS

analysis_bp = Blueprint('analysis', __name__)
CORS(analysis_bp)

# Database connection setup
DATABASE_URI = 'mysql+mysqlconnector://root:root@localhost:3306/aawe'
engine = create_engine(
    DATABASE_URI,
    connect_args={
        'ssl_ca': r"C:\Users\rupin\OneDrive\Desktop\AAWE\glenridge\ap-south-1-bundle.pem",
        'ssl_disabled': True
    }
)

# Function to categorize tasks
def categorize_tasks(df):
    current_date = pd.Timestamp.today().date()
    status_column = 'status' if 'status' in df.columns else 'task_status'

    result_df = df.copy()

    # Ensure 'duedate' is in date format
    if 'duedate' in result_df.columns:
        result_df['duedate'] = pd.to_datetime(result_df['duedate']).dt.date

    # Ensure 'actual_date' column exists and is in date format
    if 'actual_date' not in result_df.columns:
        result_df['actual_date'] = pd.NaT
    else:
        result_df['actual_date'] = pd.to_datetime(result_df['actual_date'], errors='coerce').fillna(pd.NaT)

    # Apply categorization logic
    result_df['task_status'] = np.select(
        [
            (result_df[status_column] == 'Pending'),  # Pending directly from DB
            (result_df[status_column] == 'WIP') & (result_df['duedate'] >= current_date),  # Ongoing
            (result_df[status_column] == 'WIP') & (result_df['duedate'] < current_date),  # Ongoing with Delay
            (result_df[status_column] == 'completed') & (result_df['actual_date'] <= result_df['duedate']),  # Completed
            (result_df[status_column] == 'completed') & (result_df['actual_date'] > result_df['duedate']),  # Completed with Delay
            (result_df[status_column] == 'Yet to Start') & (result_df['duedate'] >= current_date),  # Due
            (result_df[status_column] == 'Yet to Start') & (result_df['duedate'] < current_date)  # Due with Delay
        ],
        [
            'Pending', 'Ongoing', 'Ongoing with Delay', 'Completed', 'Completed with Delay', 'Due', 'Due with Delay'  # Corrected list length
        ],
        default='Unknown'  # In case none of the conditions match
    )

    return result_df

# Function to apply both activity and period filters
def apply_filters(df, activity_filter, period_filter):
   
     # Apply activity filter
    if activity_filter == 'Regulatory':
        df = df[df['activity_type'] == 'R']
    elif activity_filter == 'Internal':
        df = df[df['activity_type'] == 'I']
    elif activity_filter == 'Customer':
        df = df[df['activity_type'] == 'C']
    elif activity_filter != 'All':
        df = df[df['activity_type'] == activity_filter]
    
    # Apply period filter - handle both frontend and backend period name formats
    current_date = pd.Timestamp.today().date()
    if period_filter == 'Previous Month':
        previous_month_start = (current_date.replace(day=1) - pd.DateOffset(months=1)).date()
        previous_month_end = (current_date.replace(day=1) - pd.DateOffset(days=1)).date()
        df = df[(df['duedate'] >= previous_month_start) & (df['duedate'] <= previous_month_end)]
    elif period_filter == 'Current Month':
        month_start = current_date.replace(day=1)
        next_month_start = (month_start + pd.DateOffset(months=1)).date()
        df = df[(df['duedate'] >= month_start) & (df['duedate'] < next_month_start)]
    elif period_filter in ['6 Months', 'Upcoming 6 Months']:
        month_start = current_date.replace(day=1)
        six_months_ahead = (month_start + pd.DateOffset(months=6)).date()
        df = df[(df['duedate'] >= month_start) & (df['duedate'] <= six_months_ahead)]
   
    return df

# Function to fetch tasks by criticality
def fetch_task_counts_by_criticality():
    query = """
    SELECT t.criticality, t.duedate, a.activity_type, t.status as status, COUNT(*) as task_count,
       CASE WHEN t.status = 'completed' THEN t.actual_date ELSE NULL END as actual_date
    FROM tasks t
    JOIN activities a ON t.activity_id = a.activity_id
    GROUP BY t.criticality, t.duedate, a.activity_type, t.status, t.actual_date
    """
    with engine.connect() as connection:
        result = connection.execute(query)
        df = pd.DataFrame(result.fetchall(), columns=result.keys())
    return df

# Function to fetch task data based on selected status or other filters
def fetch_task_data(status=None, activity_type=None, task_name=None, criticality=None, period_filter='All'):
    query = """
    SELECT t.task_id, t.task_name, t.duedate, t.status, t.criticality, a.activity_type, t.assigned_to,
        CASE WHEN t.status = 'completed' THEN t.actual_date ELSE NULL END as actual_date
    FROM tasks t
    JOIN activities a ON t.activity_id = a.activity_id
    WHERE 1=1
    """
    
    # Add filters based on parameters
    if status:
        query += f" AND t.status = '{status}'"
    if activity_type and activity_type != 'All':
        query += f" AND a.activity_type = '{activity_type}'"
    if task_name:
        query += f" AND t.task_name LIKE '%{task_name}%'"
    if criticality:
        query += f" AND t.criticality = '{criticality}'"
    
    # Execute the query
    with engine.connect() as connection:
        result = connection.execute(query)
        df = pd.DataFrame(result.fetchall(), columns=result.keys())
        
    # Convert the duedate column to date format
    df['duedate'] = pd.to_datetime(df['duedate']).dt.date
    
    # Apply period filter if needed
    if period_filter != 'All':
        current_date = pd.Timestamp.today().date()
        if period_filter == 'Previous Month':
            previous_month_start = (current_date.replace(day=1) - pd.DateOffset(months=1)).date()
            previous_month_end = (current_date.replace(day=1) - pd.DateOffset(days=1)).date()
            df = df[(df['duedate'] >= previous_month_start) & (df['duedate'] <= previous_month_end)]
        elif period_filter == 'Current Month':
            month_start = current_date.replace(day=1)
            df = df[df['duedate'] >= month_start]
        elif period_filter == '6 Months':
            month_start = current_date.replace(day=1)
            six_months_ahead = (month_start + pd.DateOffset(months=6)).date()
            df = df[(df['duedate'] >= month_start) & (df['duedate'] <= six_months_ahead)]
    
    # Categorize tasks to get task_status
    df = categorize_tasks(df)
    
    return df

# Fix for the filtered_bar_data route
@analysis_bp.route('/filtered-bar-data')
def filtered_bar_data():
    try:
        status_filter = request.args.get('status')
        activity_filter = request.args.get('activity', 'All')
        period_filter = request.args.get('period', 'All')
        
        # Base query to get all task data
        query = """
            SELECT t.task_name, t.duedate, t.status, a.activity_type, t.criticality,
                CASE WHEN t.status = 'completed' THEN t.actual_date ELSE NULL END as actual_date
            FROM tasks t
            JOIN activities a ON t.activity_id = a.activity_id
        """
        
        # Apply activity filter
        if activity_filter != 'All':
            if activity_filter == 'Regulatory':
                query += " WHERE a.activity_type = 'R'"
            elif activity_filter == 'Internal':
                query += " WHERE a.activity_type = 'I'"
            elif activity_filter == 'Customer':
                query += " WHERE a.activity_type = 'C'"
            else:
                query += f" WHERE a.activity_type = '{activity_filter}'"
        
        with engine.connect() as connection:
            result = connection.execute(query)
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
        
        # Apply the same filters as before
        df['duedate'] = pd.to_datetime(df['duedate']).dt.date
        df['actual_date'] = pd.to_datetime(df['actual_date'], errors='coerce').fillna(pd.NaT)
        
        # Apply period filter
        if period_filter != 'All':
            current_date = pd.Timestamp.today().date()
            if period_filter == 'Previous Month':
                previous_month_start = (current_date.replace(day=1) - pd.DateOffset(months=1)).date()
                previous_month_end = (current_date.replace(day=1) - pd.DateOffset(days=1)).date()
                df = df[(df['duedate'] >= previous_month_start) & (df['duedate'] <= previous_month_end)]
            elif period_filter == 'Current Month':
                month_start = current_date.replace(day=1)
                df = df[df['duedate'] >= month_start]
            elif period_filter == '6 Months':
                month_start = current_date.replace(day=1)
                six_months_ahead = (month_start + pd.DateOffset(months=6)).date()
                df = df[(df['duedate'] >= month_start) & (df['duedate'] <= six_months_ahead)]
            
        # Categorize tasks
        df = categorize_tasks(df)
        
        # Filter by the selected status
        df = df[df['task_status'] == status_filter]
        
        # Group by task_name and count occurrences
        bar_chart_data = df.groupby('task_name').size().reset_index(name='task_count')
        
        bar_chart = {
            "labels": bar_chart_data["task_name"].tolist(),
            "data": bar_chart_data["task_count"].astype(int).tolist()
        }
        
        return jsonify(bar_chart)
    except Exception as e:
        import traceback
        print(f"Error in filtered_bar_data: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e), 'labels': [], 'data': []})

# Flask route to serve React frontend inside Flask template
@analysis_bp.route('/')
def index():
    template = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Dashboard</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://unpkg.com/react@17/umd/react.development.js"></script>
        <script src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>
        <script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>
        <style>
            body {
            margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
        }

        .dashboard {
            display: flex;
                gap: 20px;
        }

        .left-section {
                width: 300px;
        }

        .stats-container {
            display: flex;
            flex-direction: column;
                gap: 10px;
        }

        .box {
                padding: 15px;
            border-radius: 8px;
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .total { background-color: #6c757d; }
        .completed { background-color: #28a745; }
            .completed-delay { background-color: #fd7e14; }
        .ongoing { background-color: #007bff; }
            .ongoing-delay { background-color: #dc3545; }
        .due { background-color: #17a2b8; }
            .due-delay { background-color: #ffcc00; }

        .right-section {
                flex: 1;
            }

            .filter-buttons {
            display: flex;
            justify-content: space-between;
                margin-bottom: 20px;
        }

            .period-filters, .activity-filters {
            display: flex;
                gap: 10px;
            }

            .button {
                padding: 8px 16px;
                border: 2px solid #007bff;
                border-radius: 4px;
            background: white;
                cursor: pointer;
            }

            .button.selected {
                background: #007bff;
                color: white;
            }

            .charts-container {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin-bottom: 20px;
            }

            .chart-box {
            background: white;
                border-radius: 8px;
                padding: 20px;
            height: 300px;
            }

            .chart-box.full-width {
                grid-column: span 2;
        }
        </style>
    </head>
    <body>
        <div class="dashboard">
            <div class="left-section">
                <div class="stats-container">
                    <div class="box total">
                        <span>Total Tasks</span>
                        <span id="total-tasks">0</span>
                    </div>
                    <div class="box completed">
                        <span>Completed</span>
                        <span id="completed-tasks">0</span>
                    </div>
                    <div class="box completed-delay">
                        <span>Completed with Delay</span>
                        <span id="completed-delay">0</span>
                    </div>
                    <div class="box ongoing">
                        <span>Ongoing</span>
                        <span id="ongoing-tasks">0</span>
                    </div>
                    <div class="box ongoing-delay">
                        <span>Ongoing with Delay</span>
                        <span id="ongoing-delay">0</span>
                    </div>
                    <div class="box due">
                        <span>Due</span>
                        <span id="due-tasks">0</span>
                    </div>
                    <div class="box due-delay">
                        <span>Due with Delay</span>
                        <span id="due-delay">0</span>
                    </div>
                    <div class="box pending">
                        <span>Pending</span>
                        <span id="pending-tasks">0</span>
                    </div>


                </div>
            </div>

            <div class="right-section">
                <div class="filter-buttons">
                    <div class="period-filters">
                        <button class="button selected" data-period="All">All</button>
                        <button class="button" data-period="Previous Month">Previous Month</button>
                        <button class="button" data-period="Current Month">Current Month</button>
                        <button class="button" data-period="Upcoming 6 Months">Upcoming 6 Months</button>
                    </div>
                    <div class="activity-filters">
                        <button class="button selected" data-activity="All">All</button>
                        <button class="button" data-activity="Regulatory">Regulatory</button>
                        <button class="button" data-activity="Internal">Internal</button>
                        <button class="button" data-activity="Customer">Customer</button>
                    </div>
                </div>

                <div class="charts-container">
                    <div class="chart-box">
                        <h4>Task Status Distribution</h4>
                        <canvas id="pieChart"></canvas>
                    </div>
                    <div class="chart-box">
                        <h4>Task Distribution</h4>
                        <canvas id="barChart"></canvas>
                    </div>
                    <div class="chart-box full-width">
                        <h4>Task Criticality Analysis</h4>
                        <canvas id="criticalityChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <script>
            let selectedPeriod = 'All';
            let selectedActivity = 'All';

            async function loadDashboardData() {
                try {
                    const response = await fetch(`/analysis/task-stats?period=${selectedPeriod}&activity=${selectedActivity}`);
        const data = await response.json();
                    updateDashboard(data);
    } catch (error) {
                    console.error('Error loading dashboard data:', error);
                }
            }

            function updateDashboard(data) {
                // Update stats
                document.getElementById('total-tasks').textContent = data.total_activities;
                document.getElementById('completed-tasks').textContent = data.completed_activities;
                document.getElementById('completed-delay').textContent = data.completed_with_delay;
                document.getElementById('ongoing-tasks').textContent = data.ongoing_activities;
                document.getElementById('ongoing-delay').textContent = data.ongoing_with_delay;
                document.getElementById('due-tasks').textContent = data.yet_to_start;
                document.getElementById('due-delay').textContent = data.yet_to_start_with_delay;
                document.getElementById('pending-tasks').textContent = data.pending_tasks;


                // Update charts
                updatePieChart(data.pie_chart);
                updateBarChart(data.bar_chart);
                updateCriticalityChart(data.criticality_chart);
            }

            // Initialize charts and event listeners
            document.addEventListener('DOMContentLoaded', function() {
                initializeCharts();
                loadDashboardData();

                // Add event listeners for filters
                document.querySelectorAll('.button').forEach(button => {
                    button.addEventListener('click', function() {
                        const type = this.dataset.period ? 'period' : 'activity';
                        const value = this.dataset[type];
                        
                        // Update selected button
                        this.parentElement.querySelectorAll('.button').forEach(btn => {
                            btn.classList.remove('selected');
                        });
                        this.classList.add('selected');

                        // Update selected filter and reload data
                        if (type === 'period') {
                            selectedPeriod = value;
                        } else {
                            selectedActivity = value;
                        }
                        loadDashboardData();
                    });
                });
            });

            function initializeCharts() {
                // Initialize your charts here using Chart.js
                // ... (your chart initialization code)
            }

            function updatePieChart(data) {
                // Update pie chart
                // ... (your pie chart update code)
            }

            function updateBarChart(data) {
                // Update bar chart
                // ... (your bar chart update code)
            }

            function updateCriticalityChart(data) {
                // Update criticality chart
                // ... (your criticality chart update code)
            }
        </script>
    </body>
    </html>
    """
    return render_template_string(template)

@analysis_bp.route('/task-stats')
def task_stats():
    try:
        # Get filter parameters from the request
        activity_filter = request.args.get('activity', 'All')
        period_filter = request.args.get('period', 'All')

        # SQL Query
        query = """
            SELECT t.task_name, t.duedate, t.status, a.activity_type, t.criticality, COUNT(*) as task_count,
                CASE WHEN t.status = 'completed' THEN t.actual_date ELSE NULL END as actual_date
            FROM tasks t
            JOIN activities a ON t.activity_id = a.activity_id
            GROUP BY t.task_name, t.duedate, t.status, a.activity_type, t.criticality, t.actual_date
        """
        with engine.connect() as connection:
            result = connection.execute(query)
            df = pd.DataFrame(result.fetchall(), columns=result.keys())

        # Convert date columns to datetime
        df['duedate'] = pd.to_datetime(df['duedate']).dt.date
        df['actual_date'] = pd.to_datetime(df['actual_date'], errors='coerce').fillna(pd.NaT)

        # Apply both filters correctly
        df = apply_filters(df, activity_filter, period_filter) 

        # Categorize tasks after filtering
        df = categorize_tasks(df)

        # Pie Chart Data
        pie_chart_data = {
            status: int(df[df['task_status'] == status]['task_count'].sum()) 
            for status in df['task_status'].unique()
        }

        # Bar Chart Data
        bar_chart_data = df.groupby('task_name')['task_count'].sum().reset_index()
        bar_chart = {
            "labels": bar_chart_data["task_name"].tolist(),
            "data": bar_chart_data["task_count"].astype(int).tolist()
        }

        # Criticality Data
        criticality_df = fetch_task_counts_by_criticality()
        if not criticality_df.empty:
            criticality_df = apply_filters(criticality_df, activity_filter, period_filter)
            criticality_df = categorize_tasks(criticality_df)

            grouped_df = criticality_df.groupby(['criticality', 'task_status'])['task_count'].sum().reset_index()
            criticality_values = sorted(grouped_df['criticality'].unique())

            task_statuses = ['Completed', 'Completed with Delay', 'Ongoing', 'Ongoing with Delay', 'Due', 'Due with Delay']
            colors = {
                'Completed': '#28a745', 'Completed with Delay': '#fd7e14',
                'Ongoing': '#007bff', 'Ongoing with Delay': '#dc3545',
                'Due': '#17a2b8', 'Due with Delay': '#ffcc00'
            }

            datasets = [{
                'label': status,
                'data': [int(grouped_df[(grouped_df['criticality'] == crit) & 
                        (grouped_df['task_status'] == status)]['task_count'].sum()) 
                        for crit in criticality_values],
                'backgroundColor': colors.get(status, '#6c757d')
            } for status in task_statuses]

            criticality_chart = {'labels': criticality_values, 'datasets': datasets}
        else:
            criticality_chart = {'labels': [], 'datasets': []}

        # Response JSON
        return jsonify({
            'total_activities': int(df['task_count'].sum()),
            'completed_activities': int(df[df['task_status'] == 'Completed']['task_count'].sum()),
            'completed_with_delay': int(df[df['task_status'] == 'Completed with Delay']['task_count'].sum()),
            'ongoing_activities': int(df[df['task_status'] == 'Ongoing']['task_count'].sum()),
            'ongoing_with_delay': int(df[df['task_status'] == 'Ongoing with Delay']['task_count'].sum()),
            'yet_to_start': int(df[df['task_status'] == 'Due']['task_count'].sum()),
            'yet_to_start_with_delay': int(df[df['task_status'] == 'Due with Delay']['task_count'].sum()),
            'pending_tasks': int(df[df['task_status'] == 'Pending']['task_count'].sum()),
            'pie_chart': pie_chart_data,
            'bar_chart': bar_chart,
            'criticality_chart': criticality_chart
        })
    
    except Exception as e:
        print(f"Error in task_stats: {str(e)}")
        return jsonify({'error': str(e)})


# Fix for the task_details route
@analysis_bp.route('/task-details')
def task_details():
    try:
        filter_type = request.args.get('filterType')
        filter_value = request.args.get('filterValue')
        activity_type = request.args.get('activityType', 'All')
        activity_filter = request.args.get('activity', 'All')
        period_filter = request.args.get('period', 'All')
        
        print(f"Debug: filter_type={filter_type}, filter_value={filter_value}, activity_filter={activity_filter}, period_filter={period_filter}")
        
        if not filter_type or not filter_value:
            return jsonify([])
        
        # Get the base query with all tasks
        query = """
        SELECT t.task_id, t.task_name, t.duedate, t.status, t.criticality, a.activity_type, t.assigned_to,
            CASE WHEN t.status = 'completed' THEN t.actual_date ELSE NULL END as actual_date
        FROM tasks t
        JOIN activities a ON t.activity_id = a.activity_id
        WHERE 1=1
        """
        
        # Apply activity filter if needed
        if activity_filter != 'All':
            if activity_filter == 'Regulatory':
                query += " AND a.activity_type = 'R'"
            elif activity_filter == 'Internal':
                query += " AND a.activity_type = 'I'"
            elif activity_filter == 'Customer':
                query += " AND a.activity_type = 'C'"
            else:
                query += f" AND a.activity_type = '{activity_filter}'"
        
        # Get the data from the database
        with engine.connect() as connection:
            result = connection.execute(query)
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
        
        # Convert date columns to datetime
        df['duedate'] = pd.to_datetime(df['duedate']).dt.date
        df['actual_date'] = pd.to_datetime(df['actual_date'], errors='coerce').fillna(pd.NaT)
        
        # Apply period filter
        if period_filter != 'All':
            current_date = pd.Timestamp.today().date()
            if period_filter == 'Previous Month':
                previous_month_start = (current_date.replace(day=1) - pd.DateOffset(months=1)).date()
                previous_month_end = (current_date.replace(day=1) - pd.DateOffset(days=1)).date()
                df = df[(df['duedate'] >= previous_month_start) & (df['duedate'] <= previous_month_end)]
            elif period_filter == 'Current Month':
                month_start = current_date.replace(day=1)
                df = df[df['duedate'] >= month_start]
            elif period_filter == '6 Months':
                month_start = current_date.replace(day=1)
                six_months_ahead = (month_start + pd.DateOffset(months=6)).date()
                df = df[(df['duedate'] >= month_start) & (df['duedate'] <= six_months_ahead)]
        
        # Categorize tasks
        df = categorize_tasks(df)
        
        print(f"All task names: {df['task_name'].tolist()}")
        
        # Apply specific filter for the clicked item
        if filter_type == 'status':
            filtered_df = df[df['task_status'] == filter_value]
        elif filter_type == 'taskName':
            # First try exact match
            filtered_df = df[df['task_name'] == filter_value]
            
            # If no exact matches, try case-insensitive match
            if filtered_df.empty:
                filtered_df = df[df['task_name'].str.lower() == filter_value.lower()]
            
            # If still no matches, try contains
            if filtered_df.empty:
                filtered_df = df[df['task_name'].str.lower().str.contains(filter_value.lower())]
                
            print(f"Task names in database: {df['task_name'].unique()}")
            print(f"Searching for: {filter_value}")
            print(f"Matches found: {len(filtered_df)}")
        elif filter_type == 'criticality':
            if activity_type != 'All':
                filtered_df = df[(df['criticality'] == filter_value) & (df['task_status'] == activity_type)]
            else:
                filtered_df = df[df['criticality'] == filter_value]
        else:
            return jsonify([])
        
        # Convert DataFrame to JSON-friendly format
        result = []
        for _, row in filtered_df.iterrows():
            task_dict = {
                'task_id': int(row['task_id']),
                'task_name': row['task_name'],
                'duedate': row['duedate'].strftime('%Y-%m-%d') if row['duedate'] else None,
                'status': row['status'],
                'task_status': row['task_status'],
                'criticality': row['criticality'],
                'activity_type': row['activity_type'],
                'assigned_to': row['assigned_to']
            }
            result.append(task_dict)
        
        return jsonify(result)
    except Exception as e:
        import traceback
        print(f"Error in task_details: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)})

# @analysis_bp.route('/analysis/')
# def dash_board():
#     return dash_app.index() 

# Add this new route for user-specific dashboard data
@analysis_bp.route('/user-task-stats')
def user_task_stats():
    try:
        # Get filter parameters and user ID from the request
        activity_filter = request.args.get('activity', 'All')
        period_filter = request.args.get('period', 'All')
        user_id = request.args.get('userId')
        
        print(f"User task stats requested for user {user_id}, activity: {activity_filter}, period: {period_filter}")
        
        if not user_id:
            return jsonify({'error': 'User ID is required'})

        # Ensure user_id is the correct type
        try:
            user_id = int(user_id)
        except ValueError:
            # If it can't be converted to int, keep it as string
            user_id = str(user_id)

        # SQL Query with FIXED COLUMN NAME (actor_id instead of assigned_to)
        query = """
            SELECT t.task_name, t.duedate, t.status, a.activity_type, t.criticality, COUNT(*) as task_count,
                CASE WHEN t.status = 'completed' THEN t.actual_date ELSE NULL END as actual_date
            FROM tasks t
            LEFT JOIN activities a ON t.activity_id = a.activity_id
            WHERE t.actor_id = %s
            GROUP BY t.task_name, t.duedate, t.status, a.activity_type, t.criticality, t.actual_date
        """
        
        with engine.connect() as connection:
            result = connection.execute(query, (user_id,))
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
            
        # If no data for this user, return empty stats
        if df.empty:
            return jsonify({
                'total_activities': 0,
                'completed_activities': 0,
                'completed_with_delay': 0,
                'ongoing_activities': 0,
                'ongoing_with_delay': 0,
                'yet_to_start': 0,
                'yet_to_start_with_delay': 0,
                'pie_chart': {},
                'bar_chart': {"labels": [], "data": []},
                'criticality_chart': {'labels': [], 'datasets': []}
            })

        # Convert date columns to datetime
        df['duedate'] = pd.to_datetime(df['duedate']).dt.date
        df['actual_date'] = pd.to_datetime(df['actual_date'], errors='coerce').fillna(pd.NaT)

        # Apply both filters correctly
        df = apply_filters(df, activity_filter, period_filter) 

        # Categorize tasks after filtering
        df = categorize_tasks(df)

        # Pie Chart Data
        pie_chart_data = {
            status: int(df[df['task_status'] == status]['task_count'].sum()) 
            for status in df['task_status'].unique()
        }
        print(f"Pie chart data: {pie_chart_data}")
        # Bar Chart Data
        bar_chart_data = df.groupby('task_name')['task_count'].sum().reset_index()
        bar_chart = {
            "labels": bar_chart_data["task_name"].tolist(),
            "data": bar_chart_data["task_count"].astype(int).tolist()
        }

        # Criticality Data
        # Modify the fetch_task_counts_by_criticality function to include user filter
        criticality_query = """
        SELECT t.criticality, t.duedate, a.activity_type, t.status as status, COUNT(*) as task_count,
           CASE WHEN t.status = 'completed' THEN t.actual_date ELSE NULL END as actual_date
        FROM tasks t
        JOIN activities a ON t.activity_id = a.activity_id
        WHERE t.actor_id = %s
        GROUP BY t.criticality, t.duedate, a.activity_type, t.status, t.actual_date
        """
        with engine.connect() as connection:
            result = connection.execute(criticality_query, (user_id,))
            criticality_df = pd.DataFrame(result.fetchall(), columns=result.keys())
        
        if not criticality_df.empty:
            criticality_df = apply_filters(criticality_df, activity_filter, period_filter)
            criticality_df = categorize_tasks(criticality_df)

            grouped_df = criticality_df.groupby(['criticality', 'task_status'])['task_count'].sum().reset_index()
            criticality_values = sorted(grouped_df['criticality'].unique())

            task_statuses = ['Completed', 'Completed with Delay', 'Ongoing', 'Ongoing with Delay', 'Due', 'Due with Delay']
            colors = {
                'Completed': '#28a745', 'Completed with Delay': '#fd7e14',
                'Ongoing': '#007bff', 'Ongoing with Delay': '#dc3545',
                'Due': '#17a2b8', 'Due with Delay': '#ffcc00'
            }

            datasets = [{
                'label': status,
                'data': [int(grouped_df[(grouped_df['criticality'] == crit) & 
                        (grouped_df['task_status'] == status)]['task_count'].sum()) 
                        for crit in criticality_values],
                'backgroundColor': colors.get(status, '#6c757d')
            } for status in task_statuses]

            criticality_chart = {'labels': criticality_values, 'datasets': datasets}
        else:
            criticality_chart = {'labels': [], 'datasets': []}

        # Response JSON
        return jsonify({
            'total_activities': int(df['task_count'].sum()),
            'completed_activities': int(df[df['task_status'] == 'Completed']['task_count'].sum()),
            'completed_with_delay': int(df[df['task_status'] == 'Completed with Delay']['task_count'].sum()),
            'ongoing_activities': int(df[df['task_status'] == 'Ongoing']['task_count'].sum()),
            'ongoing_with_delay': int(df[df['task_status'] == 'Ongoing with Delay']['task_count'].sum()),
            'yet_to_start': int(df[df['task_status'] == 'Due']['task_count'].sum()),
            'yet_to_start_with_delay': int(df[df['task_status'] == 'Due with Delay']['task_count'].sum()),
            'pending_tasks': int(df[df['task_status'] == 'Pending']['task_count'].sum()), 
            'pie_chart': pie_chart_data,
            'bar_chart': bar_chart,
            'criticality_chart': criticality_chart
        })
    
    except Exception as e:
        print(f"Error in user_task_stats: {str(e)}")
        return jsonify({'error': str(e)})

# Add a user-specific task details route
@analysis_bp.route('/user-task-details')
def user_task_details():
    try:
        filter_type = request.args.get('filterType')
        filter_value = request.args.get('filterValue')
        activity_type = request.args.get('activityType', 'All')
        activity_filter = request.args.get('activity', 'All')
        period_filter = request.args.get('period', 'All')
        user_id = request.args.get('userId')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'})
            
        if not filter_type or not filter_value:
            return jsonify([])
        
        # Get the base query with all tasks for this user
        query = """
        SELECT t.task_id, t.task_name, t.duedate, t.status, t.criticality, a.activity_type, t.assigned_to,
            CASE WHEN t.status = 'completed' THEN t.actual_date ELSE NULL END as actual_date
        FROM tasks t
        JOIN activities a ON t.activity_id = a.activity_id
        WHERE t.actor_id = %s
        """
        
        # Apply activity filter if needed
        if activity_filter != 'All':
            if activity_filter == 'Regulatory':
                query += " AND a.activity_type = 'R'"
            elif activity_filter == 'Internal':
                query += " AND a.activity_type = 'I'"
            elif activity_filter == 'Customer':
                query += " AND a.activity_type = 'C'"
            else:
                query += f" AND a.activity_type = '{activity_filter}'"
        
        # Get the data from the database
        with engine.connect() as connection:
            result = connection.execute(query, (user_id,))
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
        
        # Convert date columns to datetime
        df['duedate'] = pd.to_datetime(df['duedate']).dt.date
        df['actual_date'] = pd.to_datetime(df['actual_date'], errors='coerce').fillna(pd.NaT)
        
        # Apply period filter
        if period_filter != 'All':
            current_date = pd.Timestamp.today().date()
            if period_filter == 'Previous Month':
                previous_month_start = (current_date.replace(day=1) - pd.DateOffset(months=1)).date()
                previous_month_end = (current_date.replace(day=1) - pd.DateOffset(days=1)).date()
                df = df[(df['duedate'] >= previous_month_start) & (df['duedate'] <= previous_month_end)]
            elif period_filter == 'Current Month':
                month_start = current_date.replace(day=1)
                df = df[df['duedate'] >= month_start]
            elif period_filter == '6 Months':
                month_start = current_date.replace(day=1)
                six_months_ahead = (month_start + pd.DateOffset(months=6)).date()
                df = df[(df['duedate'] >= month_start) & (df['duedate'] <= six_months_ahead)]
        
        # Categorize tasks
        df = categorize_tasks(df)
        
        # Apply specific filter for the clicked item
        if filter_type == 'status':
            filtered_df = df[df['task_status'] == filter_value]
        elif filter_type == 'taskName':
            # First try exact match
            filtered_df = df[df['task_name'] == filter_value]
            
            # If no exact matches, try case-insensitive match
            if filtered_df.empty:
                filtered_df = df[df['task_name'].str.lower() == filter_value.lower()]
            
            # If still no matches, try contains
            if filtered_df.empty:
                filtered_df = df[df['task_name'].str.lower().str.contains(filter_value.lower())]
        elif filter_type == 'criticality':
            if activity_type != 'All':
                filtered_df = df[(df['criticality'] == filter_value) & (df['task_status'] == activity_type)]
            else:
                filtered_df = df[df['criticality'] == filter_value]
        else:
            return jsonify([])
        
        # Convert DataFrame to JSON-friendly format
        result = []
        for _, row in filtered_df.iterrows():
            task_dict = {
                'task_id': int(row['task_id']),
                'task_name': row['task_name'],
                'duedate': row['duedate'].strftime('%Y-%m-%d') if row['duedate'] else None,
                'status': row['status'],
                'task_status': row['task_status'],
                'criticality': row['criticality'],
                'activity_type': row['activity_type'],
                'assigned_to': row['assigned_to']
            }
            result.append(task_dict)
        
        return jsonify(result)
    except Exception as e:
        print(f"Error in user_task_details: {str(e)}")
        return jsonify({'error': str(e)})

# Add a user-specific filtered bar data route
@analysis_bp.route('/user-filtered-bar-data')
def user_filtered_bar_data():
    try:
        status_filter = request.args.get('status')
        activity_filter = request.args.get('activity', 'All')
        period_filter = request.args.get('period', 'All')
        user_id = request.args.get('userId')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'})
        
        # Base query to get all task data for this user
        query = """
            SELECT t.task_name, t.duedate, t.status, a.activity_type, t.criticality,
                CASE WHEN t.status = 'completed' THEN t.actual_date ELSE NULL END as actual_date
            FROM tasks t
            JOIN activities a ON t.activity_id = a.activity_id
            WHERE t.actor_id = %s
        """
        
        # Apply activity filter
        if activity_filter != 'All':
            if activity_filter == 'Regulatory':
                query += " AND a.activity_type = 'R'"
            elif activity_filter == 'Internal':
                query += " AND a.activity_type = 'I'"
            elif activity_filter == 'Customer':
                query += " AND a.activity_type = 'C'"
            else:
                query += f" AND a.activity_type = '{activity_filter}'"
        
        with engine.connect() as connection:
            result = connection.execute(query, (user_id,))
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
        
        # Apply the same filters as before
        df['duedate'] = pd.to_datetime(df['duedate']).dt.date
        df['actual_date'] = pd.to_datetime(df['actual_date'], errors='coerce').fillna(pd.NaT)
        
        # Apply period filter
        if period_filter != 'All':
            current_date = pd.Timestamp.today().date()
            if period_filter == 'Previous Month':
                previous_month_start = (current_date.replace(day=1) - pd.DateOffset(months=1)).date()
                previous_month_end = (current_date.replace(day=1) - pd.DateOffset(days=1)).date()
                df = df[(df['duedate'] >= previous_month_start) & (df['duedate'] <= previous_month_end)]
            elif period_filter == 'Current Month':
                month_start = current_date.replace(day=1)
                df = df[df['duedate'] >= month_start]
            elif period_filter == '6 Months':
                month_start = current_date.replace(day=1)
                six_months_ahead = (month_start + pd.DateOffset(months=6)).date()
                df = df[(df['duedate'] >= month_start) & (df['duedate'] <= six_months_ahead)]
            
        # Categorize tasks
        df = categorize_tasks(df)
        
        # Filter by the selected status
        df = df[df['task_status'] == status_filter]
        
        # Group by task_name and count occurrences
        bar_chart_data = df.groupby('task_name').size().reset_index(name='task_count')
        
        bar_chart = {
            "labels": bar_chart_data["task_name"].tolist(),
            "data": bar_chart_data["task_count"].astype(int).tolist()
        }
        
        return jsonify(bar_chart)
    except Exception as e:
        print(f"Error in user_filtered_bar_data: {str(e)}")
        return jsonify({'error': str(e), 'labels': [], 'data': []})

@analysis_bp.route('/debug-user-tasks')
def debug_user_tasks():
    user_id = request.args.get('userId')
    
    if not user_id:
        return jsonify({'error': 'User ID is required'})
    
    # Fix column name from assigned_to to actor_id
    query = "SELECT * FROM tasks WHERE actor_id = %s"
    
    with engine.connect() as connection:
        result = connection.execute(query, (user_id,))
        tasks = [dict(zip(result.keys(), row)) for row in result.fetchall()]
    
    return jsonify({
        'tasks_found': len(tasks),
        'first_few_tasks': tasks[:5] if tasks else [],
        'user_id_provided': user_id
    })

@analysis_bp.route('/simple-user-tasks')
def simple_user_tasks():
    user_id = request.args.get('userId')
    
    if not user_id:
        return jsonify({'error': 'User ID is required'})
    
    # Fix column name from assigned_to to actor_id
    query = """
    SELECT task_id, task_name, actor_id, status 
    FROM tasks 
    WHERE actor_id = %s
    """
    
    with engine.connect() as connection:
        result = connection.execute(query, (user_id,))
        tasks = [dict(zip(result.keys(), row)) for row in result.fetchall()]
    
    return jsonify(tasks)

@analysis_bp.route('/tasks-by-date')
def tasks_by_date():
    user_id = request.args.get('userId')
    date = request.args.get('date')  # Format: YYYY-MM-DD
    
    query = """
    SELECT * FROM tasks 
    WHERE 1=1
    """
    
    params = []
    
    if user_id:
        query += " AND actor_id = %s"
        params.append(user_id)
        
    if date:
        query += " AND duedate = %s"
        params.append(date)
    
    with engine.connect() as connection:
        result = connection.execute(query, tuple(params))
        tasks = [dict(zip(result.keys(), row)) for row in result.fetchall()]
    
    return jsonify({
        'tasks_found': len(tasks),
        'tasks': tasks,
        'params_used': {'userId': user_id, 'date': date}
    }) 