import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import SubNav from './components/SubNav';
import Footer from './components/Footer';
import Home from './components/Home';
import Tasks from './components/Tasks';
import Activities from './components/Activities';
import Mailer from './components/Mailer';
import Employee from './components/Employee';
import Report from './components/Report';
import Analysis from './components/Analysis';
import Login from './components/Login';
import Unauthorized from './components/Unauthorized';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import Profile from './components/Profile';

// import ChangePassword from './ChangePassword';
import Diary from './components/Diary';
import WorkflowGuide from './components/WorkflowGuide';
import Dashboard from './components/Dashboard';
import WorkflowTest from './components/WorkflowTest';
import AddCustomerForm from './components/AddCustomerForm';
import { WorkflowProvider, useWorkflow } from './context/WorkflowContext';
import DashboardRouter from './components/DashboardRouter';
import Auditors from './components/Auditors';
import Clients from './components/Clients';
import './App.css';


// Create a global variable to store the workflow guide state handler
let globalSetShowWorkflowGuide = null;

// Create a function to show the workflow guide from anywhere
export const showWorkflowGuide = () => {
  if (globalSetShowWorkflowGuide) {
    console.log("Showing workflow guide via global function");
    globalSetShowWorkflowGuide(true);
  } else {
    console.error("globalSetShowWorkflowGuide is not set");
  }
};

function App() {
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);
  
  // Set the global handler when the component mounts
  useEffect(() => {
    globalSetShowWorkflowGuide = setShowWorkflowGuide;
    
    return () => {
      globalSetShowWorkflowGuide = null;
    };
  }, []);

  const handleGetStartedClick = () => {
    console.log("Get Started clicked, showing workflow guide");
    setShowWorkflowGuide(true);
  };

  return (
    <div className="app-wrapper">
      <AuthProvider>
        <WorkflowProvider>
          <Router>
            <AppContent 
              handleGetStartedClick={handleGetStartedClick} 
              showWorkflowGuide={showWorkflowGuide}
              setShowWorkflowGuide={setShowWorkflowGuide}
            />
          </Router>
        </WorkflowProvider>
      </AuthProvider>
    </div>
  );
}

// Separate component to handle route-specific logic
function AppContent({ handleGetStartedClick, showWorkflowGuide, setShowWorkflowGuide }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { getCurrentStep } = useWorkflow();
  const { logout, isAuthenticated } = useAuth();
  const userActivityTimeoutRef = useRef(null);
  
  // Session timeout - 30 minutes in milliseconds
  const SESSION_TIMEOUT = 30 * 60 * 1000;
  
  // Function to reset timer on user activity
  const resetUserActivityTimeout = () => {
    if (isAuthenticated) {
      // Clear any existing timeout
      if (userActivityTimeoutRef.current) {
        clearTimeout(userActivityTimeoutRef.current);
      }
      
      // Set a new timeout
      userActivityTimeoutRef.current = setTimeout(() => {
        console.log('User inactive for 30 minutes, logging out');
        logout();
        navigate('/login', { state: { message: 'Your session has expired due to inactivity.' } });
      }, SESSION_TIMEOUT);
    }
  };
  
  // Set up event listeners for user activity
  useEffect(() => {
    if (isAuthenticated) {
      // Initial setup of timeout
      resetUserActivityTimeout();
      
      // Events that indicate user activity
      const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      
      // Event handler function
      const handleUserActivity = () => {
        resetUserActivityTimeout();
      };
      
      // Add event listeners
      activityEvents.forEach(event => {
        window.addEventListener(event, handleUserActivity);
      });
      
      // Cleanup function
      return () => {
        if (userActivityTimeoutRef.current) {
          clearTimeout(userActivityTimeoutRef.current);
        }
        
        activityEvents.forEach(event => {
          window.removeEventListener(event, handleUserActivity);
        });
      };
    }
  }, [isAuthenticated, logout, navigate]);
  
  // Log when routes change to help with debugging
  useEffect(() => {
    console.log("Route changed to:", location.pathname);
  }, [location]);

  // Function to handle customer add success
  const handleCustomerAddSuccess = (message) => {
    console.log(message);
    // You can add a toast notification here if you want
  };

  // Handle workflow guide close with reason
  const handleWorkflowGuideClose = (reason) => {
    console.log('Workflow guide closed with reason:', reason);
    setShowWorkflowGuide(false);
    
    // If the guide was closed by clicking the X button or clicking outside
    if (reason === 'canceled') {
      // Navigate to the employee page
      navigate('/employee');
    } 
    // If the guide was closed by clicking a step
    else if (reason === 'navigated') {
      // The navigation will be handled by the Link component in WorkflowGuide
    }
    // If the guide was closed specifically to navigate to activities page
    else if (reason === 'navigated-to-activities') {
      navigate('/activities');
    }
    // If the workflow was reset to start again
    else if (reason === 'reset-workflow') {
      // Navigate to the employee page to start the first step again
      navigate('/employee');
      
      // Show a toast or notification that the workflow has been reset
      console.log('Workflow has been reset to start again');
    }
  };

  return (
    <div className="app">
      <Navbar />
      
      {/* Render WorkflowGuide inside the Router context */}
      {showWorkflowGuide && (
        <WorkflowGuide onClose={handleWorkflowGuideClose} />
      )}
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/workflow-test" element={<WorkflowTest />} />
        
        <Route path="/profile" element={
              <ProtectedRoute>
                <main className="main-content">
                  <Profile />
                </main>
              </ProtectedRoute>
            } />

        {/* Add route for customer add page */}
        <Route path="/customers/add" element={
          <ProtectedRoute adminOnly={true}>
            <SubNav />
            <main className="main-content">
              <AddCustomerForm 
                onClose={() => window.history.back()} 
                onSuccess={handleCustomerAddSuccess} 
              />
            </main>
          </ProtectedRoute>
        } />

        <Route path="/employee" element={
          <ProtectedRoute adminOnly={true}>
            <SubNav />
            <main className="main-content">
              <Employee />
            </main>
          </ProtectedRoute>
        } />
        
        <Route path="/tasks" element={
          <ProtectedRoute>
            <SubNav />
            <main className="main-content">
              <Tasks />
            </main>
          </ProtectedRoute>
        } />
        
        <Route path="/activities" element={
          <ProtectedRoute adminOnly={true}>
            <SubNav />
            <main className="main-content">
              <Activities />
            </main>
          </ProtectedRoute>
        } />
        
        <Route path="/mailer" element={
          <ProtectedRoute >
            <SubNav />
            <main className="main-content">
              <Mailer />
            </main>
          </ProtectedRoute>
        } />
        
        <Route path="/report" element={
          <ProtectedRoute>
            <SubNav />
            <main className="main-content">
              <Report />
            </main>
          </ProtectedRoute>
        } />
        
        <Route path="/analysis" element={<DashboardRouter />} />
        <Route path="/diary" element={
          <ProtectedRoute >
            <SubNav />
            <main className="main-content">
              <Diary />
            </main>
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={<DashboardRouter />} />
        <Route path="/auditors" element={<Auditors />} />
        <Route path="/clients" element={<Clients />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;
