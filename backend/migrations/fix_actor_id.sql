-- SQL script to fix actor_id column in the actors table
-- This ensures actor_id is auto-incrementing and starts from 1000 (4 digits)

-- Modify the actor_id column to be auto-incrementing
ALTER TABLE actors MODIFY COLUMN actor_id INT AUTO_INCREMENT;

-- Set the auto_increment start value to 1000 to ensure 4 digits
ALTER TABLE actors AUTO_INCREMENT = 1000;

-- Verify the changes
SHOW CREATE TABLE actors; 