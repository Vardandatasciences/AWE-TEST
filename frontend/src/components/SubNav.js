import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './SubNav.css';

const SubNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, isAdmin } = useAuth(); // Get authentication & role status

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="sub-nav-container">
      <button className="mobile-toggle" onClick={toggleMenu}>
        <i className="fas fa-bars"></i> Menu
      </button>

      <nav className={`sub-nav ${isOpen ? 'open' : ''}`}>
        {/* Show everything if Admin */}
        {isAdmin && (
          <>
            <NavLink to="/auditors" className={({ isActive }) => isActive ? 'active' : ''}>
              <i className="fas fa-user-tie"></i> Auditors
            </NavLink>

            <NavLink to="/clients" className={({ isActive }) => isActive ? 'active' : ''}>
              <i className="fas fa-building"></i> Clients
            </NavLink>

            <NavLink to="/activities" className={({ isActive }) => isActive ? 'active' : ''}>
              <i className="fas fa-clipboard-list"></i> Audits
            </NavLink>
          </>
        )}

        {/* Common for both Admins & Users */}
        <NavLink to="/tasks" className={({ isActive }) => isActive ? 'active' : ''}>
          <i className="fas fa-tasks"></i> Tasks
        </NavLink>

        <NavLink to="/mailer" className={({ isActive }) => isActive ? 'active' : ''}>
          <i className="fas fa-envelope"></i> Mailer
        </NavLink>

        <NavLink to="/analysis" className={({ isActive }) => isActive ? 'active' : ''}>
          <i className="fas fa-chart-line"></i> Analysis
        </NavLink>

        {/* Show Diary only for Users (not Admins) */}
        {!isAdmin && (
          <NavLink to="/diary" className={({ isActive }) => isActive ? 'active' : ''}>
            <i className="fas fa-book"></i> Diary
          </NavLink>
        )}
      </nav>
    </div>
  );
};

export default SubNav;
