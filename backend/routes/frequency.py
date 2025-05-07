from flask import Blueprint, jsonify
from models import Activity  # Make sure this import works for your project structure

frequency_bp = Blueprint('frequency', __name__)

@frequency_bp.route('/get_frequency/<int:activity_id>', methods=['GET'])
def get_frequency(activity_id):
    try:
        activity = Activity.query.filter_by(activity_id=activity_id).first()
        
        if activity:
            # Return the numeric frequency value
            return jsonify({"frequency": str(activity.frequency)})
        else:
            # Return a 404 with a message if activity not found
            return jsonify({"error": f"Activity with ID {activity_id} not found"}), 404
    except Exception as e:
        # Log the error and return a 500
        print(f"Error fetching frequency for activity {activity_id}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500