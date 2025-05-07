"""
Migration script to ensure actor_id is properly set up as an auto-incrementing primary key
with a 4-digit format.

To run this migration:
1. Make sure your Flask app is not running
2. Run this script directly: python actor_id_migration.py
"""

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import sys
import os

# Add the parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import the db and app from your main application
from app import app, db
from models import Actor

def run_migration():
    with app.app_context():
        try:
            # Check if we need to modify the actor_id column
            print("Starting migration for actor_id...")
            
            # Execute raw SQL to modify the actor_id column if needed
            # This will ensure it's auto-incrementing and starts from 1000 (4 digits)
            db.session.execute("""
            ALTER TABLE actors MODIFY COLUMN actor_id INT AUTO_INCREMENT;
            """)
            
            # Set the auto_increment start value to 1000 to ensure 4 digits
            db.session.execute("""
            ALTER TABLE actors AUTO_INCREMENT = 1000;
            """)
            
            db.session.commit()
            print("Migration completed successfully!")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error during migration: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    run_migration() 