import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAdmin, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if token exists in localStorage (more reliable than state)
  const hasToken = !!localStorage.getItem('token');
  
  // Effect to handle back button/history navigation
  useEffect(() => {
    if (!hasToken) {
      navigate('/login', { replace: true });
    }
    
    // Add listener for page visibility changes (browser tab focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Re-check authentication when tab becomes visible
        if (!localStorage.getItem('token')) {
          logout();
          navigate('/login', { replace: true });
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate, logout, hasToken]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!hasToken) {
    // Redirect to login page but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin && !['/mailer', '/analysis'].includes(location.pathname)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

export default ProtectedRoute; 