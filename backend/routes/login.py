from flask import request, jsonify, session
from flask_restful import Resource
from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash
from backend.models.user import User

class Login(Resource):
    def post(self):
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password, password):
            # Set session data
            session['user_id'] = user.actor_id
            session['role'] = user.role
            
            access_token = create_access_token(identity=user.actor_id)
            
            return jsonify({
                'success': True,
                'user_id': user.actor_id,
                'name': user.name,
                'role': user.role,
                'access_token': access_token
            })
        
        return jsonify({'error': 'Invalid username or password'}), 401 