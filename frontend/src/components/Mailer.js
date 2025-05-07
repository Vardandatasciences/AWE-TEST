import React, { useState, useEffect } from 'react';
import api from '../services/api';
import axiosInstance from '../config/axios';
import './Mailer.css';
import './MessageModal.css';
import RecentMessages from './RecentMessages';
import ErrorBoundary from './ErrorBoundary';

const Mailer = () => {
  const [showForm, setShowForm] = useState(false);
  const [showScheduledForm, setShowScheduledForm] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageDescriptions, setMessageDescriptions] = useState([]);
  const [activeTab, setActiveTab] = useState('scheduled');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    message_description: '',
    group_name: [],
    frequency: '0', // Default to one-time
    date: '',
    email_id: '',
    time: ''
  });
  const [selectedMessageId, setSelectedMessageId] = useState('');

  // Fetch groups and message descriptions on component mount
  useEffect(() => {
    fetchGroups();
    fetchMessageDescriptions();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      console.log('Fetching groups...');
      const response = await axiosInstance.get('/groups');
      
      console.log('Groups API Response:', response);
      console.log('Response type:', typeof response.data);
      console.log('Response data:', response.data);
      
      // Parse the response if it's a string
      let parsedData = response.data;
      if (typeof response.data === 'string') {
        try {
          parsedData = JSON.parse(response.data);
          console.log('Parsed groups data:', parsedData);
        } catch (parseError) {
          console.error('Error parsing groups data:', parseError);
        }
      }
      
      // Now check if the parsed data is an array
      if (Array.isArray(parsedData)) {
        setGroups(parsedData);
      } else {
        console.warn('Expected array response from /groups endpoint, got:', typeof response.data);
        setGroups([]);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      setError("Failed to load groups. Please try again.");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessageDescriptions = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/message_descriptions');
      
      // Parse the response if it's a string
      let parsedData = response.data;
      if (typeof response.data === 'string') {
        try {
          parsedData = JSON.parse(response.data);
          console.log('Parsed message descriptions data:', parsedData);
        } catch (parseError) {
          console.error('Error parsing message descriptions data:', parseError);
        }
      }
      
      // Now check if the parsed data is an array
      if (Array.isArray(parsedData)) {
        setMessageDescriptions(parsedData);
      } else {
        console.warn('Expected array response from /message_descriptions endpoint, got:', typeof response.data);
        setMessageDescriptions([]);
      }
    } catch (error) {
      console.error("Error fetching message descriptions:", error);
      setError("Failed to load message templates. Please try again.");
      setMessageDescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessageById = async (messageId) => {
    if (!messageId) return;
    
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/messages/${messageId}`);
      const messageData = response.data;
      
      // Handle group_name as an array for multiple selection
      let groupNames = [];
      if (messageData.group_name) {
        groupNames = Array.isArray(messageData.group_name) ? messageData.group_name : [messageData.group_name];
      }
      
      setFormData({
        message_description: messageData.message_description || '',
        group_name: groupNames,
        frequency: messageData.frequency?.toString() || '0',
        date: messageData.date || '',
        email_id: messageData.email_id || '',
        time: messageData.time || ''
      });
    } catch (error) {
      console.error("Error fetching message:", error);
      setError("Failed to load message details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleForm = () => {
    setShowForm(!showForm);
    if (!showForm) {
      setShowScheduledForm(false);
      setShowCustomForm(false);
      resetForm();
    }
  };

  const toggleScheduledForm = () => {
    setShowScheduledForm(!showScheduledForm);
    if (!showScheduledForm) {
      setShowForm(false);
      setShowCustomForm(false);
      resetForm();
    }
  };

  const toggleCustomForm = () => {
    setShowCustomForm(!showCustomForm);
    if (!showCustomForm) {
      setShowForm(false);
      setShowScheduledForm(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      message_description: '',
      group_name: [],
      frequency: '0',
      date: '',
      email_id: '',
      time: ''
    });
    setSelectedMessageId('');
    setError(null);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'scheduled') {
      toggleScheduledForm();
    } else if (tab === 'custom') {
      toggleCustomForm();
    } else {
      toggleForm();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for multi-select groups
    if (name === 'group_name' && e.target.multiple) {
      const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
      setFormData({ ...formData, [name]: selectedOptions });
    } else {
    setFormData({ ...formData, [name]: value });
    }
  };

  const handleMessageSelect = (e) => {
    const messageId = e.target.value;
    setSelectedMessageId(messageId);
    
    if (messageId) {
      fetchMessageById(messageId);
    } else {
      resetForm();
    }
  };

  const displaySuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Step 1: New Message - Save to messages table
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      // Prepare data for submission
      const submitData = {
        ...formData,
        // Convert group_name array to string if needed
        group_name: Array.isArray(formData.group_name) ? formData.group_name.join(',') : formData.group_name
      };
      
      const response = await axiosInstance.post('/add_message', submitData);
      displaySuccess(response.data.message || "Message saved successfully!");
      
      setShowForm(false);
      setShowCustomForm(false);
      resetForm();
      fetchMessageDescriptions();
    } catch (error) {
      console.error("Error adding message:", error);
      setError(error.response?.data?.error || "Failed to save message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Schedule Message - Schedule existing message to groups or email
  const handleSchedule = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      if (!selectedMessageId) {
        setError("Please select a message to schedule");
        setLoading(false);
        return;
      }
      
      // Create a regular JSON object instead of FormData
      const scheduleData = {
        message_id: selectedMessageId,
        group_name: formData.group_name,
        date: formData.date,
        time: formData.time,
        email_id: formData.email_id || ''
      };
      
      console.log("Sending schedule data:", scheduleData);
      
      // Use the correct endpoint with api service
      const response = await api.post('/api/schedule_message', scheduleData);
      
      displaySuccess(response.data.message || "Message scheduled successfully!");
      
      setShowScheduledForm(false);
      resetForm();
    } catch (error) {
      console.error("Error scheduling message:", error);
      setError(error.response?.data?.error || "Failed to schedule message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Custom Schedule Message - Create and schedule a new custom message
  const handleCustomSchedule = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      // Create a regular JSON object
      const customData = {
        message_description: formData.message_description,
        group_name: formData.group_name,
        date: formData.date,
        time: formData.time,
        email_id: formData.email_id || '',
        frequency: formData.frequency
      };
      
      console.log("Sending custom message data:", customData);
      
      // Use the correct endpoint with api service
      const response = await api.post('/api/custom_message', customData);
      
      displaySuccess(response.data.message || "Custom message scheduled successfully!");
      
      setShowCustomForm(false);
      resetForm();
    } catch (error) {
      console.error("Error scheduling custom message:", error);
      setError(error.response?.data?.error || "Failed to schedule custom message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="mailer-container">
        {success && (
          <div className="success-message">
            <i className="fas fa-check-circle"></i>
            <span>{success}</span>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="close-error">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
        
        <div className="page-header">
          <h1><i className="fas fa-envelope"></i> Email Manager</h1>
          <p>Create and schedule email communications</p>
        </div>
        
        <div className="tabs-wrapper">
          <div className="tabs-container">
            <button 
              className={`tab-button ${activeTab === 'new' ? 'active' : ''}`}
              onClick={() => handleTabChange('new')}
            >
              <i className="fas fa-plus-circle"></i> New Message
            </button>
            <button 
              className={`tab-button ${activeTab === 'scheduled' ? 'active' : ''}`}
              onClick={() => handleTabChange('scheduled')}
            >
              <i className="fas fa-calendar-alt"></i> Schedule Message
            </button>
            <button 
              className={`tab-button ${activeTab === 'custom' ? 'active' : ''}`}
              onClick={() => handleTabChange('custom')}
            >
              <i className="fas fa-edit"></i> Custom Schedule
            </button>
          </div>
        </div>
        
        {/* New Message Form */}
        {showForm && (
          <div className="message-modal-overlay">
            <div className="message-modal">
              <div className="message-modal-header">
                <h2><i className="fas fa-envelope-open-text"></i> Create New Message</h2>
                <button className="message-modal-close" onClick={toggleForm}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="message-modal-body">
              <form onSubmit={handleSubmit}>
                  <div className="message-form-row">
                    <div className="message-form-group full-width">
                    <label htmlFor="message_description">
                      Message Description <span className="required">*</span>
                    </label>
                      <div className="message-input-wrapper">
                      <i className="fas fa-comment-alt"></i>
                      <textarea 
                        id="message_description" 
                        name="message_description" 
                        value={formData.message_description} 
                        required 
                        onChange={handleChange}
                        placeholder="Enter your message here..."
                        rows="4"
                          className="message-input message-textarea"
                      ></textarea>
                    </div>
                  </div>

                    <div className="message-form-group">
                    <label htmlFor="group_name">
                        Group
                    </label>
                      <div className="message-input-wrapper">
                      <i className="fas fa-users"></i>
                      <select 
                        id="group_name" 
                        name="group_name" 
                        value={formData.group_name} 
                        onChange={handleChange}
                        className="message-input message-select"
                      >
                        <option value="" disabled>-- Select Group --</option>
                        {Array.isArray(groups) && groups.length > 0 ? (
                          groups.map(group => (
                            <option key={group.group_id || Math.random()} value={group.group_name}>
                              {group.group_name}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>No groups available</option>
                        )}
                      </select>
                    </div>
                  </div>

                    <div className="message-form-group">
                    <label htmlFor="frequency">
                      Frequency <span className="required">*</span>
                    </label>
                      <div className="message-input-wrapper">
                      <i className="fas fa-sync-alt"></i>
                      <select 
                        id="frequency" 
                        name="frequency" 
                        value={formData.frequency} 
                        required 
                        onChange={handleChange}
                          className="message-input message-select"
                      >
                        <option value="0">One-time</option>
                        <option value="1">Yearly</option>
                        <option value="12">Monthly</option>
                        <option value="4">Quarterly</option>
                        <option value="26">Fortnightly</option>
                        <option value="52">Weekly</option>
                        <option value="365">Daily</option>
                        <option value="3">Every 4 Months</option>
                        <option value="6">Every 2 Months</option>
                      </select>
                    </div>
                  </div>

                    <div className="message-form-group">
                    <label htmlFor="date">
                        Date
                    </label>
                      <div className="message-input-wrapper">
                      <i className="fas fa-calendar"></i>
                      <input 
                        type="date" 
                        id="date" 
                        name="date" 
                        value={formData.date} 
                        onChange={handleChange} 
                        min={new Date().toISOString().split('T')[0]}
                          className="message-input message-date-input"
                      />
                    </div>
                  </div>

                    <div className="message-form-group">
                      <label htmlFor="time">
                        Time
                      </label>
                      <div className="message-input-wrapper">
                        <i className="fas fa-clock"></i>
                        <input 
                          type="time" 
                          id="time" 
                          name="time" 
                          value={formData.time} 
                          onChange={handleChange} 
                          className="message-input message-time-input"
                        />
                      </div>
                    </div>

                    <div className="message-form-group">
                    <label htmlFor="email_id">
                        Email
                    </label>
                      <div className="message-input-wrapper">
                      <i className="fas fa-at"></i>
                      <input 
                        type="email" 
                        id="email_id" 
                        name="email_id" 
                        value={formData.email_id} 
                        onChange={handleChange}
                        placeholder="recipient@example.com" 
                          className="message-input"
                      />
                      </div>
                    </div>
                  </div>

                  <div className="message-modal-footer">
                    <button type="button" className="message-btn-cancel" onClick={toggleForm}>
                    Cancel
                  </button>
                    <button type="submit" className="message-btn-save" disabled={loading}>
                    {loading ? (
                      <>
                          <div className="message-spinner"></div>
                          <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save"></i>
                        <span>Save Message</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Existing Message Form */}
        {showScheduledForm && (
          <div className="message-modal-overlay">
            <div className="message-modal">
              <div className="message-modal-header">
                <h2><i className="fas fa-calendar-alt"></i> Schedule Message</h2>
                <button className="message-modal-close" onClick={() => setShowScheduledForm(false)}>
                  <i className="fas fa-times"></i>
                </button>
            </div>
            
              <div className="message-modal-body">
            <form onSubmit={handleSchedule}>
                  <div className="message-form-row">
                    <div className="message-form-group full-width">
                      <label htmlFor="message_id">
                    Select Message <span className="required">*</span>
                  </label>
                      <div className="message-input-wrapper">
                        <i className="fas fa-list"></i>
                    <select 
                          id="message_id" 
                          name="message_id" 
                      value={selectedMessageId}
                      required 
                      onChange={handleMessageSelect}
                          className="message-input message-select"
                        >
                          <option value="">-- Select Message --</option>
                          {Array.isArray(messageDescriptions) && messageDescriptions.length > 0 ? (
                            messageDescriptions.map(msg => (
                              <option key={msg.message_id} value={msg.message_id}>
                                {msg.message_description}
                          </option>
                        ))
                          ) : (
                            <option value="" disabled>No messages available</option>
                          )}
                        </select>
                      </div>
                    </div>

                    {selectedMessageId && (
                      <>
                            <div className="message-form-group full-width">
                          <label htmlFor="scheduled_group_name">
                                Groups <span className="required">*</span>
                              </label>
                              <div className="message-input-wrapper">
                                <i className="fas fa-users"></i>
                                <select 
                                  id="scheduled_group_name" 
                                  name="group_name" 
                                  value={formData.group_name}
                                  onChange={handleChange}
                                  className="message-input message-select"
                                  multiple
                                  size={Math.min(5, Array.isArray(groups) ? groups.length : 0)}
                                >
                                  {Array.isArray(groups) && groups.length > 0 ? (
                                    groups.map(group => (
                                      <option key={group.group_id} value={group.group_name}>
                                        {group.group_name}
                                      </option>
                                    ))
                                  ) : (
                                    <option value="" disabled>No groups available</option>
                                  )}
                                </select>
                                <small className="form-text text-muted">Hold Ctrl/Cmd to select multiple groups</small>
                              </div>
                            </div>

                            <div className="message-form-group">
                              <label htmlFor="scheduled_date">
                                Date <span className="required">*</span>
                              </label>
                              <div className="message-input-wrapper">
                                <i className="fas fa-calendar"></i>
                                <input 
                                  type="date" 
                                  id="scheduled_date" 
                                  name="date" 
                                  value={formData.date}
                                  required 
                                  onChange={handleChange}
                                  min={new Date().toISOString().split('T')[0]}
                                  className="message-input message-date-input"
                                />
                              </div>
                            </div>

                            <div className="message-form-group">
                              <label htmlFor="scheduled_time">
                                Time <span className="required">*</span>
                              </label>
                              <div className="message-input-wrapper">
                                <i className="fas fa-clock"></i>
                                <input 
                                  type="time" 
                                  id="scheduled_time" 
                                  name="time" 
                                  value={formData.time}
                                  required 
                                  onChange={handleChange} 
                                  className="message-input message-time-input"
                                />
                              </div>
                            </div>

                            <div className="message-form-group">
                              <label htmlFor="scheduled_email_id">
                                Email (Optional)
                              </label>
                              <div className="message-input-wrapper">
                                <i className="fas fa-at"></i>
                                <input 
                                  type="email" 
                                  id="scheduled_email_id" 
                                  name="email_id" 
                                  value={formData.email_id}
                                  onChange={handleChange}
                                  placeholder="recipient@example.com"
                                  className="message-input"
                                />
                                <small className="form-text text-muted">Leave empty to send to all group members</small>
                              </div>
                            </div>
                          </>
                        )}
                  </div>

                  <div className="message-modal-footer">
                    <button type="button" className="message-btn-cancel" onClick={() => setShowScheduledForm(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="message-btn-save" disabled={!selectedMessageId || loading}>
                      {loading ? (
                        <>
                          <div className="message-spinner"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane"></i>
                          <span>Schedule</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Custom Schedule Message Form */}
        {showCustomForm && (
          <div className="message-modal-overlay">
            <div className="message-modal">
              <div className="message-modal-header">
                <h2><i className="fas fa-edit"></i> Custom Schedule Message</h2>
                <button className="message-modal-close" onClick={() => setShowCustomForm(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="message-modal-body">
                <form onSubmit={handleCustomSchedule}>
                  <div className="message-form-row">
                    <div className="message-form-group full-width">
                      <label htmlFor="custom_message_description">
                        Message Description <span className="required">*</span>
                      </label>
                      <div className="message-input-wrapper">
                        <i className="fas fa-comment-alt"></i>
                        <textarea 
                          id="custom_message_description" 
                          name="message_description" 
                          value={formData.message_description} 
                          required 
                          onChange={handleChange}
                          placeholder="Enter your message here..."
                          rows="4"
                          className="message-input message-textarea"
                        ></textarea>
                      </div>
                    </div>

                    <div className="message-form-group full-width">
                      <label htmlFor="custom_group_name">
                        Groups <span className="required">*</span>
                      </label>
                      <div className="message-input-wrapper">
                        <i className="fas fa-users"></i>
                        <select 
                          id="custom_group_name" 
                          name="group_name" 
                          value={formData.group_name}
                          onChange={handleChange}
                          className="message-input message-select"
                          multiple
                          size={Math.min(5, Array.isArray(groups) ? groups.length : 0)}
                        >
                          {Array.isArray(groups) && groups.length > 0 ? (
                            groups.map(group => (
                              <option key={group.group_id || Math.random()} value={group.group_name}>
                                {group.group_name}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>No groups available</option>
                          )}
                        </select>
                        <small className="form-text text-muted">Hold Ctrl/Cmd to select multiple groups</small>
                      </div>
                    </div>

                    <div className="message-form-group">
                      <label htmlFor="custom_frequency">
                        Frequency <span className="required">*</span>
                      </label>
                      <div className="message-input-wrapper">
                        <i className="fas fa-sync-alt"></i>
                        <select 
                          id="custom_frequency" 
                          name="frequency" 
                          value={formData.frequency} 
                          required 
                          onChange={handleChange}
                          className="message-input message-select"
                        >
                          <option value="0">One-time</option>
                          <option value="1">Yearly</option>
                          <option value="12">Monthly</option>
                          <option value="4">Quarterly</option>
                          <option value="26">Fortnightly</option>
                          <option value="52">Weekly</option>
                          <option value="365">Daily</option>
                          <option value="3">Every 4 Months</option>
                          <option value="6">Every 2 Months</option>
                        </select>
                      </div>
                    </div>

                    <div className="message-form-group">
                      <label htmlFor="custom_date">
                        Date <span className="required">*</span>
                      </label>
                      <div className="message-input-wrapper">
                        <i className="fas fa-calendar"></i>
                        <input 
                          type="date" 
                          id="custom_date" 
                          name="date" 
                          value={formData.date}
                          required 
                          onChange={handleChange}
                          min={new Date().toISOString().split('T')[0]}
                          className="message-input message-date-input"
                        />
                      </div>
                    </div>

                    <div className="message-form-group">
                      <label htmlFor="custom_time">
                        Time <span className="required">*</span>
                      </label>
                      <div className="message-input-wrapper">
                        <i className="fas fa-clock"></i>
                        <input 
                          type="time" 
                          id="custom_time" 
                          name="time" 
                          value={formData.time}
                          required 
                          onChange={handleChange} 
                          className="message-input message-time-input"
                        />
                      </div>
                    </div>

                    <div className="message-form-group">
                      <label htmlFor="custom_email_id">
                        Email (Optional)
                      </label>
                      <div className="message-input-wrapper">
                        <i className="fas fa-at"></i>
                        <input 
                          type="email" 
                          id="custom_email_id" 
                          name="email_id" 
                          value={formData.email_id}
                          onChange={handleChange}
                          placeholder="recipient@example.com"
                          className="message-input"
                        />
                        <small className="form-text text-muted">Leave empty to send to all group members</small>
                      </div>
                    </div>
              </div>

                  <div className="message-modal-footer">
                    <button type="button" className="message-btn-cancel" onClick={() => setShowCustomForm(false)}>
                  Cancel
                </button>
                    <button type="submit" className="message-btn-save" disabled={loading}>
                  {loading ? (
                    <>
                          <div className="message-spinner"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                          <span>Schedule Custom Message</span>
                    </>
                  )}
                </button>
              </div>
            </form>
              </div>
            </div>
          </div>
        )}
        
        {/* Empty state when no tab is active */}
        {!showForm && !showScheduledForm && !showCustomForm && (
          <div className="dashboard-container">
            <ErrorBoundary>
              <React.Suspense fallback={<div>Loading...</div>}>
                <RecentMessages />
              </React.Suspense>
            </ErrorBoundary>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Mailer;