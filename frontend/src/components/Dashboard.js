import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';
import { useAuth } from '../context/AuthContext';
import { showWorkflowGuide } from '../App';

const Dashboard = ({ onGetStarted }) => {
  const { user } = useAuth();
  const isAdmin = user && user.role === 'admin';

  // For debugging - log when the component mounts
  useEffect(() => {
    console.log("Dashboard component mounted");
    console.log("onGetStarted prop is:", onGetStarted ? "defined" : "undefined");
    
    return () => {
      console.log("Dashboard component unmounted");
    };
  }, [onGetStarted]);

  const handleGetStartedClick = () => {
    console.log("Dashboard: Get Started button clicked");
    
    // Try both methods to ensure the workflow guide shows up
    if (onGetStarted) {
      console.log("Calling onGetStarted prop");
      onGetStarted();
    }
    
    // Also try the global function as a backup
    showWorkflowGuide();
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome to ProSync Dashboard</h1>
        <p>Manage your activities, auditors, and clients all in one place</p>
      </div>

      {isAdmin && (
        <div className="admin-welcome-card">
          <div className="admin-welcome-content">
            <h2>Welcome, Admin!</h2>
            <p>Get started with your workflow by following these steps:</p>
            <ul>
              <li>Create new clients</li>
              <li>Set up activities</li>
              <li>Assign auditors to activities</li>
            </ul>
            <button 
              className="get-started-button"
              onClick={handleGetStartedClick}
            >
              Get Started
            </button>
          </div>
          <div className="admin-welcome-image">
            {/* You can add an illustration or image here */}
          </div>
        </div>
      )}

      <div className="dashboard-stats">
        {/* Your dashboard statistics */}
        <div className="stat-card">
          <h3>Clients</h3>
          <p className="stat-number">0</p>
          <Link to="/customers" className="stat-link">View All</Link>
        </div>
        <div className="stat-card">
          <h3>Activities</h3>
          <p className="stat-number">0</p>
          <Link to="/activities" className="stat-link">View All</Link>
        </div>
        <div className="stat-card">
          <h3>Auditors</h3>
          <p className="stat-number">0</p>
          <Link to="/employees" className="stat-link">View All</Link>
        </div>
      </div>

      <div className="dashboard-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <Link to="/add-customer" className="action-button">
            <span className="action-icon">+</span>
            <span>Add Client</span>
          </Link>
          <Link to="/add-activity" className="action-button">
            <span className="action-icon">+</span>
            <span>Add Activity</span>
          </Link>
          <Link to="/assign-employee" className="action-button">
            <span className="action-icon">+</span>
            <span>Assign Auditor</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 