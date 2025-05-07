import React, { useState, useEffect } from 'react';
import './Profile.css';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
// Add Font Awesome icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faEnvelope, 
  faPhone, 
  faIdCard, 
  faUserTag,
  faEdit,
  faSave,
  faTimes,
  faBirthdayCake,
  faVenusMars,
  faUsers,
  faMobile,
  faKey,
  faLock,
  faArrowLeft,
  faCheck,
  faShieldAlt,
  faEye,
  faEyeSlash,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

const Profile = () => {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    otp: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  
  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Password change flow states
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  // Toggle password visibility functions
  const toggleCurrentPasswordVisibility = () => {
    setShowCurrentPassword(!showCurrentPassword);
  };

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const fetchProfileData = () => {
    const actor_id = localStorage.getItem('actor_id');
    
    api.get(`/api/profile?actor_id=${actor_id}`)
      .then(response => {
        console.log("Profile response:", response.data);
        if (response.data.success) {
          setProfileData(response.data.user);
          setEditedData({
            email_id: response.data.user.email_id,
            mobile1: response.data.user.mobile1
          });
          setError(null);
        } else {
          setError(response.data.message || 'Failed to fetch profile data');
        }
      })
      .catch(error => {
        console.error('Error fetching profile:', error);
        setError('Error fetching profile data. Please try again later.');
      });
  };

  const handleEdit = () => {
    setEditedData({
      email_id: profileData.email_id,
      mobile1: profileData.mobile1
    });
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      const actor_id = localStorage.getItem('actor_id');
      
      const updateData = {
        actor_id: actor_id,
        ...editedData
      };
      
      const response = await api.post('/api/profile/update', updateData);

      if (response.data.success) {
        setProfileData(prev => ({
          ...prev,
          ...editedData
        }));
        
        if (setUser) {
          setUser(prev => ({
            ...prev,
            ...editedData
          }));
        }
        
        setIsEditing(false);
        setError(null);
        setSuccess('Profile updated successfully!');
        
        fetchProfileData();
      } else {
        setError(response.data.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Error updating profile. Please try again later.');
    }
  };

  // Password change handlers
  const openPasswordModal = () => {
    setShowPasswordModal(true);
    setPasswordData({
      currentPassword: '',
      otp: '',
      newPassword: '',
      confirmNewPassword: ''
    });
    setPasswordError(null);
    setPasswordSuccess(null);
    setIsPasswordVerified(false);
    setIsOtpVerified(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordError(null);
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Step 1: Verify current password and request OTP
  const handleVerifyPassword = async () => {
    try {
      setPasswordError(null);
      setIsVerifyingPassword(true);
      
      if (!passwordData.currentPassword) {
        setPasswordError('Please enter your current password');
        setIsVerifyingPassword(false);
        return;
      }

      const actor_id = localStorage.getItem('actor_id');
      
      // First, verify the current password
      const verifyResponse = await api.post('/api/verify-current-password', {
        actor_id: actor_id,
        password: passwordData.currentPassword
      });

      const verifyData = verifyResponse.data;
      
      if (!verifyData.success) {
        setPasswordError(verifyData.message || 'Current password is incorrect');
        setIsVerifyingPassword(false);
        return;
      }

      // Then request OTP
      const otpResponse = await api.post('/api/request-otp', {
        email: profileData.email_id,
        actorId: actor_id
      });

      const otpData = otpResponse.data;
      
      if (otpData.success) {
        setIsPasswordVerified(true);
        
        // Extract OTP from the response message if available
        const otpMatch = otpData.message.match(/successfully: (\d+)/);
        if (otpMatch && otpMatch[1]) {
          // Display the OTP in the success message for testing
          setPasswordSuccess(`OTP sent to your email. For testing purposes, the OTP is: ${otpMatch[1]}`);
          // Auto-fill the OTP field for testing
          setPasswordData(prev => ({
            ...prev,
            otp: otpMatch[1]
          }));
        } else {
          setPasswordSuccess(otpData.message);
        }
      } else {
        setPasswordError(otpData.message || 'Failed to send OTP');
      }
      
      setIsVerifyingPassword(false);
    } catch (err) {
      console.error('Error requesting OTP:', err);
      setPasswordError('An error occurred. Please try again later.');
      setIsVerifyingPassword(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    try {
      setPasswordError(null);
      setIsVerifyingOtp(true);
      
      if (!passwordData.otp) {
        setPasswordError('Please enter the OTP sent to your email');
        setIsVerifyingOtp(false);
        return;
      }

      const response = await api.post('/api/verify-otp', {
        email: profileData.email_id,
        otp: passwordData.otp
      });

      const data = response.data;
      
      if (data.success) {
        setIsOtpVerified(true);
        setPasswordSuccess('OTP verified successfully');
      } else {
        setPasswordError(data.message || 'Invalid OTP');
      }
      
      setIsVerifyingOtp(false);
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setPasswordError('An error occurred. Please try again later.');
      setIsVerifyingOtp(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async () => {
    try {
      setPasswordError(null);
      setIsChangingPassword(true);
      
      if (!passwordData.newPassword || !passwordData.confirmNewPassword) {
        setPasswordError('Please enter both new password and confirmation');
        setIsChangingPassword(false);
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmNewPassword) {
        setPasswordError('Passwords do not match');
        setIsChangingPassword(false);
        return;
      }

      // Check if new password is the same as current password
      if (passwordData.newPassword === passwordData.currentPassword) {
        setPasswordError('New password must be different from your current password');
        setIsChangingPassword(false);
        return;
      }

      // Password strength validation
      if (passwordData.newPassword.length < 8) {
        setPasswordError('Password must be at least 8 characters long');
        setIsChangingPassword(false);
        return;
      }

      // Continue with the API call
      const response = await api.post('/api/reset-password', {
        email: profileData.email_id,
        password: passwordData.newPassword,
        confirmPassword: passwordData.confirmNewPassword
      });

      const data = response.data;
      
      if (data.success) {
        setShowPasswordModal(false);
        setSuccess('Password changed successfully');
      } else {
        setPasswordError(data.message || 'Failed to change password');
      }
      
      setIsChangingPassword(false);
    } catch (err) {
      console.error('Error resetting password:', err);
      
      // Handle specific error for same password
      if (err.response && err.response.data && err.response.data.message === 'New password must be different from your current password') {
        setPasswordError('New password must be different from your current password');
      } else {
        setPasswordError('An error occurred. Please try again later.');
      }
      
      setIsChangingPassword(false);
    }
  };

  if (!profileData) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading profile data...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2><FontAwesomeIcon icon={faUser} className="icon-title" /> Profile Information</h2>
        
        {error && (
          <div className="message error animate-fadeIn">
            <FontAwesomeIcon icon={faTimes} className="icon-error" /> {error}
          </div>
        )}
        
        {success && (
          <div className="message success animate-fadeIn">
            <FontAwesomeIcon icon={faCheck} className="icon-success" /> {success}
          </div>
        )}
        
        <div className="profile-info">
          <div className="info-group">
            <label><FontAwesomeIcon icon={faIdCard} className="icon-field" /> Actor ID</label>
            <span>{profileData.actor_id}</span>
          </div>
          
          <div className="info-group">
            <label><FontAwesomeIcon icon={faUser} className="icon-field" /> Name</label>
            <span>{profileData.actor_name}</span>
          </div>
          
          <div className="info-group">
            <label><FontAwesomeIcon icon={faEnvelope} className="icon-field" /> Email</label>
            {isEditing ? (
              <input
                type="email"
                name="email_id"
                value={editedData.email_id || ''}
                onChange={handleChange}
                className="input-animate"
              />
            ) : (
              <span>{profileData.email_id}</span>
            )}
          </div>
          
          <div className="info-group">
            <label><FontAwesomeIcon icon={faPhone} className="icon-field" /> Mobile 1</label>
            {isEditing ? (
              <input
                type="text"
                name="mobile1"
                value={editedData.mobile1 || ''}
                onChange={handleChange}
                className="input-animate"
              />
            ) : (
              <span>{profileData.mobile1}</span>
            )}
          </div>
          
          <div className="info-group">
            <label><FontAwesomeIcon icon={faMobile} className="icon-field" /> Mobile 2</label>
            <span>{profileData.mobile2 || 'Not provided'}</span>
          </div>
          
          <div className="info-group">
            <label><FontAwesomeIcon icon={faBirthdayCake} className="icon-field" /> Date of Birth</label>
            <span>{profileData.DOB || 'Not provided'}</span>
          </div>
          
          <div className="info-group">
            <label><FontAwesomeIcon icon={faVenusMars} className="icon-field" /> Gender</label>
            <span>{profileData.gender || 'Not specified'}</span>
          </div>

          <div className="info-group">
            <label><FontAwesomeIcon icon={faUsers} className="icon-field" /> Group</label>
            <span>{profileData.group_name || 'Not assigned'}</span>
          </div>

          <div className="info-group">
            <label><FontAwesomeIcon icon={faUserTag} className="icon-field" /> Role</label>
            <span>{profileData.role_name || 'Not assigned'}</span>
          </div>
        </div>
        
        <div className="button-group">
          {!isEditing ? (
            <>
              <button className="btn-edit" onClick={handleEdit}>
                <FontAwesomeIcon icon={faEdit} className="btn-icon" /> Edit Profile
              </button>
              <button className="btn-password" onClick={openPasswordModal}>
                <FontAwesomeIcon icon={faKey} className="btn-icon" /> Change Password
              </button>
            </>
          ) : (
            <>
              <button className="btn-save" onClick={handleSubmit}>
                <FontAwesomeIcon icon={faSave} className="btn-icon" /> Save Changes
              </button>
              <button className="btn-cancel" onClick={handleCancel}>
                <FontAwesomeIcon icon={faTimes} className="btn-icon" /> Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content password-modal">
            <div className="modal-header">
              <h3><FontAwesomeIcon icon={faKey} className="icon-title" /> Change Password</h3>
              <button className="modal-close-btn" onClick={closePasswordModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            {passwordError && (
              <div className="message error animate-fadeIn">
                <FontAwesomeIcon icon={faTimes} className="icon-error" /> {passwordError}
              </div>
            )}
            
            {passwordSuccess && (
              <div className="message success animate-fadeIn">
                <FontAwesomeIcon icon={faCheck} className="icon-success" /> {passwordSuccess}
              </div>
            )}
            
            <div className="password-change-steps">
              {/* Step 1: Current Password Input */}
              <div className={`password-step ${isPasswordVerified ? 'collapsed' : ''}`}>
                <div className="form-group">
                  <label htmlFor="currentPassword">
                    <FontAwesomeIcon icon={faLock} className="icon-field" /> Current Password
                  </label>
                  <div className="password-input-container">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordInputChange}
                      className="input-animate password-input"
                      placeholder="Enter your current password"
                      disabled={isPasswordVerified}
                    />
                    <button 
                      type="button" 
                      className="password-toggle-btn"
                      onClick={toggleCurrentPasswordVisibility}
                      aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                      disabled={isPasswordVerified}
                    >
                      <FontAwesomeIcon icon={showCurrentPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>
                
                <div className="button-group">
                  <button className="btn-primary" onClick={handleVerifyPassword} disabled={isVerifyingPassword || isPasswordVerified}>
                    {isVerifyingPassword ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="btn-icon fa-spin" /> Verifying...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faShieldAlt} className="btn-icon" /> Verify Password
                      </>
                    )}
                  </button>
                  <button className="btn-cancel" onClick={closePasswordModal} disabled={isVerifyingPassword}>
                    <FontAwesomeIcon icon={faTimes} className="btn-icon" /> Cancel
                  </button>
                </div>
              </div>
              
              {/* Step 2: OTP Verification (shows when password is verified) */}
              {isPasswordVerified && (
                <div className={`password-step ${isOtpVerified ? 'collapsed' : ''}`}>
                  <div className="step-header">
                    <h4><FontAwesomeIcon icon={faShieldAlt} className="icon-title" /> Verify OTP</h4>
                    {!isOtpVerified && (
                      <button 
                        className="btn-link" 
                        onClick={() => {
                          setIsPasswordVerified(false);
                          setPasswordSuccess(null);
                        }}
                      >
                        <FontAwesomeIcon icon={faArrowLeft} /> Back
                      </button>
                    )}
                  </div>
                  
                  <p className="otp-instruction">
                    We've sent a verification code to your email address. Please enter it below.
                  </p>
                  
                  <div className="form-group">
                    <label htmlFor="otp">
                      <FontAwesomeIcon icon={faKey} className="icon-field" /> OTP Code
                    </label>
                    <input
                      type="text"
                      id="otp"
                      name="otp"
                      value={passwordData.otp}
                      onChange={handlePasswordInputChange}
                      className="input-animate"
                      placeholder="Enter the 6-digit code"
                      disabled={isOtpVerified}
                    />
                  </div>
                  
                  <div className="button-group">
                    <button className="btn-primary" onClick={handleVerifyOTP} disabled={isVerifyingOtp || isOtpVerified}>
                      {isVerifyingOtp ? (
                        <>
                          <FontAwesomeIcon icon={faSpinner} className="btn-icon fa-spin" /> Verifying...
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faCheck} className="btn-icon" /> Verify OTP
                        </>
                      )}
                    </button>
                    <button className="btn-cancel" onClick={closePasswordModal} disabled={isVerifyingOtp}>
                      <FontAwesomeIcon icon={faTimes} className="btn-icon" /> Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {/* Step 3: New Password Input (shows when OTP is verified) */}
              {isOtpVerified && (
                <div className="password-step">
                  <div className="step-header">
                    <h4><FontAwesomeIcon icon={faKey} className="icon-title" /> Set New Password</h4>
                    <button 
                      className="btn-link" 
                      onClick={() => {
                        setIsOtpVerified(false);
                        setPasswordSuccess(null);
                      }}
                    >
                      <FontAwesomeIcon icon={faArrowLeft} /> Back
                    </button>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="newPassword">
                      <FontAwesomeIcon icon={faLock} className="icon-field" /> New Password
                    </label>
                    <div className="password-input-container">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        id="newPassword"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordInputChange}
                        className="input-animate password-input"
                        placeholder="Enter new password"
                      />
                      <button 
                        type="button" 
                        className="password-toggle-btn"
                        onClick={toggleNewPasswordVisibility}
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        <FontAwesomeIcon icon={showNewPassword ? faEyeSlash : faEye} />
                      </button>
                    </div>
                    <div className="password-requirements">
                      <p>Password requirements:</p>
                      <ul>
                        <li><strong>Must be at least 8 characters long</strong></li>
                        <li>Must include uppercase and lowercase letters</li>
                        <li>Must include at least one number</li>
                        <li>Must include at least one special character (@$!%*?&)</li>
                        <li><strong>Must be different from your current password</strong></li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="confirmNewPassword">
                      <FontAwesomeIcon icon={faLock} className="icon-field" /> Confirm New Password
                    </label>
                    <div className="password-input-container">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmNewPassword"
                        name="confirmNewPassword"
                        value={passwordData.confirmNewPassword}
                        onChange={handlePasswordInputChange}
                        className="input-animate password-input"
                        placeholder="Confirm new password"
                      />
                      <button 
                        type="button" 
                        className="password-toggle-btn"
                        onClick={toggleConfirmPasswordVisibility}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="button-group">
                    <button className="btn-primary" onClick={handleResetPassword} disabled={isChangingPassword}>
                      {isChangingPassword ? (
                        <>
                          <FontAwesomeIcon icon={faSpinner} className="btn-icon fa-spin" /> Updating...
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faSave} className="btn-icon" /> Change Password
                        </>
                      )}
                    </button>
                    <button className="btn-cancel" onClick={closePasswordModal} disabled={isChangingPassword}>
                      <FontAwesomeIcon icon={faTimes} className="btn-icon" /> Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;