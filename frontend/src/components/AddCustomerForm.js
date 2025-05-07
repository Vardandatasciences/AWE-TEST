import React, { useState } from 'react';
import api from '../services/api';
import './FormStyles.css';

const AddCustomerForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    customer_name: '',
    email_id: '',
    mobile1: '',
    mobile2: '',
    city: '',
    status: 'A',
    gender: 'M',
    customer_type: 'Client',
    DOB: '',
    address: '',
    country: '',
    pincode: '',
    group_id: '1'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.customer_name.trim()) {
      errors.customer_name = 'Name is required';
    }
    
    if (!formData.mobile1.trim()) {
      errors.mobile1 = 'Primary phone number is required';
    } else if (!/^\d{10}$/.test(formData.mobile1)) {
      errors.mobile1 = 'Phone number must be 10 digits';
    }
    
    if (formData.email_id && !/\S+@\S+\.\S+/.test(formData.email_id)) {
      errors.email_id = 'Email is invalid';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return; // Stop if validation fails
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log("Submitting new client:", formData);
      
      // Make sure you're using the correct endpoint and service
      const response = await api.post('/add_customer', formData);
      
      if (response.status === 201) {
        onSuccess("Client added successfully");
        onClose();
      }
    } catch (err) {
      console.error("Error adding client:", err);
      setError(`Failed to add client: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="form-container">
      <div className="modal-header">
        <h2><i className="fas fa-building"></i> Add New Client</h2>
        <button className="close-btn" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="customer_name">
              Client Name <span className="required">*</span>
            </label>
            <div className="input-with-icon">
              <i className="fas fa-building"></i>
              <input
                type="text"
                id="customer_name"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                placeholder="Enter client name"
                className={formErrors.customer_name ? 'error' : ''}
              />
            </div>
            {formErrors.customer_name && <div className="error-text">{formErrors.customer_name}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="email_id">
              Email
            </label>
            <div className="input-with-icon">
              <i className="fas fa-envelope"></i>
              <input
                type="email"
                id="email_id"
                name="email_id"
                value={formData.email_id}
                onChange={handleChange}
                placeholder="Enter email address"
                className={formErrors.email_id ? 'error' : ''}
              />
            </div>
            {formErrors.email_id && <div className="error-text">{formErrors.email_id}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="mobile1">
              Primary Phone <span className="required">*</span>
            </label>
            <div className="input-with-icon">
              <i className="fas fa-phone"></i>
              <input
                type="tel"
                id="mobile1"
                name="mobile1"
                value={formData.mobile1}
                onChange={handleChange}
                placeholder="Enter primary phone"
                className={formErrors.mobile1 ? 'error' : ''}
              />
            </div>
            {formErrors.mobile1 && <div className="error-text">{formErrors.mobile1}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="mobile2">Secondary Phone</label>
            <div className="input-with-icon">
              <i className="fas fa-phone-alt"></i>
              <input
                type="tel"
                id="mobile2"
                name="mobile2"
                value={formData.mobile2}
                onChange={handleChange}
                placeholder="Enter secondary phone (optional)"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="city">City</label>
            <div className="input-with-icon">
              <i className="fas fa-map-marker-alt"></i>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter city"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="status">Status</label>
            <div className="input-with-icon">
              <i className="fas fa-toggle-on"></i>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="A">Active</option>
                <option value="O">Inactive</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <div className="input-with-icon">
              <i className="fas fa-venus-mars"></i>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="DOB">Date of Birth</label>
            <div className="input-with-icon">
              <i className="fas fa-calendar"></i>
              <input
                type="date"
                id="DOB"
                name="DOB"
                value={formData.DOB}
                onChange={handleChange}
                placeholder="Enter date of birth"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="address">
              Address <span className="form-hint">(Max 255 characters)</span>
            </label>
            <div className="input-with-icon">
              <i className="fas fa-map-marker"></i>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter address"
                maxLength={255}
              />
            </div>
            {formData.address && 
              <div className="character-count">
                {formData.address.length}/255
              </div>
            }
          </div>
          
          <div className="form-group">
            <label htmlFor="country">Country</label>
            <div className="input-with-icon">
              <i className="fas fa-globe"></i>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="Enter country"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="pincode">Pincode</label>
            <div className="input-with-icon">
              <i className="fas fa-map-pin"></i>
              <input
                type="text"
                id="pincode"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                placeholder="Enter pincode"
              />
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Adding...</span>
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                <span>Add Client</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCustomerForm; 