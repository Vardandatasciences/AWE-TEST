import React, { useEffect, useState } from 'react';
import Analysis from './Analysis';
import UserAnalysis from './UserAnalysis';

function DashboardRouter() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is admin based on localStorage
    const checkAdminStatus = () => {
      const role = localStorage.getItem('userRole');
      console.log("User role:", role); // Debug log
      setIsAdmin(role === 'admin');
      setLoading(false);
    };
    
    checkAdminStatus();
  }, []);

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  console.log("Rendering dashboard as:", isAdmin ? "admin" : "user"); // Debug log
  
  // Render either admin or user dashboard based on role
  return isAdmin ? <Analysis /> : <UserAnalysis />;
}

export default DashboardRouter; 