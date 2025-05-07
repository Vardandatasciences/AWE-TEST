from flask import jsonify, session, Blueprint, request
from models import db, Actor  # Import your database and Actor model

users_bp = Blueprint('users', __name__)

@users_bp.route('/current_user')
def current_user():
    if 'user_id' in session:
        user = Actor.query.filter_by(actor_id=session['user_id']).first()
            
        if user:
            return jsonify({
                'user_id': user.actor_id,
                'name': user.name,
                'role': user.role
            })
    
    return jsonify({'error': 'User not authenticated'}), 401 