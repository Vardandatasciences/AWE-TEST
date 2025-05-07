import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Login.css';
import { useAuth } from '../context/AuthContext';
 
const Login = () => {
  const [actorId, setActorId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
 
  // Account lockout states
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(null);
 
  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState('email'); // email, otp, or reset
  const [resetMessage, setResetMessage] = useState({ type: '', text: '' });
 
  // Add actorId to forgot password states
  const [forgotPasswordActorId, setForgotPasswordActorId] = useState('');
 
  useEffect(() => {
    // Start countdown timer if account is locked
    if (isLocked && lockoutRemaining > 0) {
      const timer = setInterval(() => {
        setLockoutRemaining(prev => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            clearInterval(timer);
            setIsLocked(false);
            setError('');
            return 0;
          }
          return newValue;
        });
      }, 1000);
      
      setLockoutTimer(timer);
      
      // Clean up timer on unmount
      return () => clearInterval(timer);
    }
  }, [isLocked, lockoutRemaining]);
 
  // Redirect if already logged in
  useEffect(() => {
    // Check authentication status whenever the component mounts
    if (!isAuthenticated) {
      // Clear any stored tokens if not authenticated
      localStorage.removeItem('token');
      localStorage.removeItem('role_id');
      localStorage.removeItem('actor_id');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userRole');
    } else {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }

    // Handle browser back/forward navigation
    const handlePopState = () => {
      if (!isAuthenticated) {
        navigate('/login', { replace: true });
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Clean up the event listener
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (lockoutTimer) {
        clearInterval(lockoutTimer);
      }
    };
  }, [isAuthenticated, navigate, location, lockoutTimer]);
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Don't submit if account is locked
    if (isLocked) {
      return;
    }
    
    setError('');
    setLoading(true);
   
    try {
      const response = await axios.post('http://localhost:5000/login', {
        actorId,
        password
      });
     
      // Store token and user info
      localStorage.setItem('role_id', response.data.user.role_id); // Store role ID
      localStorage.setItem('actor_id', response.data.user.user_id);
      localStorage.setItem('userId', response.data.user.user_id);
      localStorage.setItem('userName', response.data.user.name);
      localStorage.setItem('userRole', response.data.user.role);
      login(response.data.token, response.data.user);
     
      // Redirect to the page they were trying to access or home
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
     
    } catch (err) {
      console.error('Login error:', err);
      
      // Handle account lockout (HTTP 429 Too Many Requests)
      if (err.response && err.response.status === 429) {
        setIsLocked(true);
        
        // Extract minutes from error message if available
        const errorMsg = err.response.data.error || '';
        const minutesMatch = errorMsg.match(/Try again after (\d+) minutes/);
        const lockMinutes = minutesMatch ? parseInt(minutesMatch[1]) : 30;
        
        setLockoutRemaining(lockMinutes * 60); // Convert minutes to seconds
        setError(`Too many failed login attempts. Account locked for ${lockMinutes} minutes.`);
      } else if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
 
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
 
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setResetMessage({ type: '', text: '' });
    setLoading(true);
 
    try {
      const response = await axios.post('http://localhost:5000/request-otp', {
        email,
        actorId: forgotPasswordActorId
      });
      if (response.data.success) {
        setResetStep('otp');
        setResetMessage({ type: 'success', text: 'OTP sent successfully! Please check your email.' });
      }
    } catch (err) {
      setResetMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to send OTP. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
 
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setResetMessage({ type: '', text: '' });
    setLoading(true);
 
    try {
      const response = await axios.post('http://localhost:5000/verify-otp', { email, otp });
      if (response.data.success) {
        setResetStep('reset');
        setResetMessage({ type: 'success', text: 'OTP verified successfully!' });
      }
    } catch (err) {
      setResetMessage({
        type: 'error',
        text: err.response?.data?.message || 'Invalid OTP. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
 
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetMessage({ type: '', text: '' });
    setLoading(true);
 
    try {
      const response = await axios.post('http://localhost:5000/reset-password', {
        email,
        password: newPassword,
        confirmPassword
      });
     
      if (response.data.success) {
        setResetMessage({ type: 'success', text: 'Password reset successful! Please login with your new password.' });
        setTimeout(() => {
          setShowForgotPassword(false);
          resetForgotPasswordForm();
        }, 2000);
      }
    } catch (err) {
      setResetMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to reset password. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
 
  const resetForgotPasswordForm = () => {
    setEmail('');
    setForgotPasswordActorId('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setResetStep('email');
    setResetMessage({ type: '', text: '' });
  };
 
  const renderForgotPasswordContent = () => {
    switch (resetStep) {
      case 'email':
        return (
          <form onSubmit={handleRequestOTP} className="forgot-password-form">
            <div className="form-group">
              <label htmlFor="actorId">
                <i className="fas fa-user"></i> Actor ID
              </label>
              <input
                type="text"
                id="forgotPasswordActorId"
                value={forgotPasswordActorId}
                onChange={(e) => setForgotPasswordActorId(e.target.value)}
                placeholder="Enter your Actor ID"
                required
                className="input-field"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">
                <i className="fas fa-envelope"></i> Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                required
                className="input-field"
              />
            </div>
            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                <><i className="fas fa-spinner fa-spin"></i> Sending OTP...</>
              ) : (
                <>Send OTP <i className="fas fa-paper-plane"></i></>
              )}
            </button>
          </form>
        );
 
      case 'otp':
        return (
          <form onSubmit={handleVerifyOTP} className="forgot-password-form">
            <div className="form-group">
              <label htmlFor="otp">
                <i className="fas fa-key"></i> Enter OTP
              </label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter the OTP sent to your email"
                required
                className="input-field"
                maxLength="6"
              />
            </div>
            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                <><i className="fas fa-spinner fa-spin"></i> Verifying...</>
              ) : (
                <>Verify OTP <i className="fas fa-check"></i></>
              )}
            </button>
          </form>
        );
 
      case 'reset':
        return (
          <form onSubmit={handleResetPassword} className="forgot-password-form">
            <div className="form-group">
              <label htmlFor="newPassword">
                <i className="fas fa-lock"></i> New Password
              </label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="input-field"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">
                <i className="fas fa-lock"></i> Confirm Password
              </label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="input-field"
                />
              </div>
            </div>
            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                <><i className="fas fa-spinner fa-spin"></i> Resetting...</>
              ) : (
                <>Reset Password <i className="fas fa-save"></i></>
              )}
            </button>
          </form>
        );
    }
  };
 
  // Helper function to format remaining time
  const formatLockoutTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const renderLockoutMessage = () => {
    if (!isLocked) return null;
    
    return (
      <div className="lockout-message">
        <i className="fas fa-lock"></i>
        <span>Account locked. Try again in {formatLockoutTime(lockoutRemaining)}</span>
      </div>
    );
  };
 
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-container">
            <div className="logo-icon">
              <i className="fas fa-tasks"></i>
            </div>
            <h1>ProSync</h1>
          </div>
          <h2>{showForgotPassword ? 'Reset Password' : 'Welcome Back'}</h2>
          <p>{showForgotPassword ? 'Follow the steps to reset your password' : 'Enter your credentials to access your account'}</p>
        </div>
       
        {(error || resetMessage.text) && (
          <div className={`message ${resetMessage.type || 'error'}`}>
            <i className={`fas ${resetMessage.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            {error || resetMessage.text}
          </div>
        )}
        
        {renderLockoutMessage()}
       
        {showForgotPassword ? (
          <>
            {renderForgotPasswordContent()}
            <div className="login-footer">
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  resetForgotPasswordForm();
                }}
                className="back-to-login"
              >
                <i className="fas fa-arrow-left"></i> Back to Login
              </button>
            </div>
          </>
        ) : (
          <>
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="actorId">
                  <i className="fas fa-user"></i> Actor ID
                </label>
                <input
                  type="text"
                  id="actorId"
                  value={actorId}
                  onChange={(e) => setActorId(e.target.value)}
                  placeholder="Enter your Actor ID"
                  required
                  className="input-field"
                  disabled={isLocked}
                />
                <div className="input-animation"></div>
              </div>
             
              <div className="form-group">
                <label htmlFor="password">
                  <i className="fas fa-lock"></i> Password
                </label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="input-field"
                    disabled={isLocked}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={togglePasswordVisibility}
                    disabled={isLocked}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                <div className="input-animation"></div>
              </div>
             
              <div className="form-options">
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot password?
                </button>
              </div>
             
              <button
                type="submit"
                className="login-button"
                disabled={loading || isLocked}
              >
                {loading ? (
                  <><i className="fas fa-spinner fa-spin"></i> Logging in...</>
                ) : isLocked ? (
                  <><i className="fas fa-lock"></i> Account Locked</>
                ) : (
                  <>Sign In <i className="fas fa-arrow-right"></i></>
                )}
              </button>
            </form>
           
            <div className="login-footer">
              <p>Don't have an account? <a href="#">Contact administrator</a></p>
            </div>
          </>
        )}
      </div>
     
      <div className="login-features">
        <div className="animated-background">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>
       
        <div className="features-content">
          <h3>Professional Work Sync</h3>
         
          <div className="feature-list">
            <div className="feature-item" data-aos="fade-up" data-aos-delay="100">
              <div className="feature-icon">
                <i className="fas fa-tasks"></i>
              </div>
              <div className="feature-text">
                <h4>Streamlined task management</h4>
                <p>Organize and prioritize your tasks efficiently</p>
              </div>
            </div>
           
            <div className="feature-item" data-aos="fade-up" data-aos-delay="200">
              <div className="feature-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="feature-text">
                <h4>Real-time performance analytics</h4>
                <p>Track progress and identify improvement areas</p>
              </div>
            </div>
           
            <div className="feature-item" data-aos="fade-up" data-aos-delay="300">
              <div className="feature-icon">
                <i className="fas fa-bell"></i>
              </div>
              <div className="feature-text">
                <h4>Automated notifications</h4>
                <p>Stay updated with timely alerts and reminders</p>
              </div>
            </div>
           
            <div className="feature-item" data-aos="fade-up" data-aos-delay="400">
              <div className="feature-icon">
                <i className="fas fa-file-alt"></i>
              </div>
              <div className="feature-text">
                <h4>Comprehensive reporting</h4>
                <p>Generate detailed reports for better decision making</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
 
export default Login;