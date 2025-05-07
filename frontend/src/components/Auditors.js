import React, { useState, useEffect } from 'react';
import "./Employee.css";
import axios from "axios";
import AddEmployeeForm from './AddEmployeeForm';
import { useNavigate } from 'react-router-dom';
import SubNav from './SubNav';

const Auditors = () => {
  const [data, setData] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [isAddingActor, setIsAddingActor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [successMessage, setSuccessMessage] = useState(null);
  const [showPendingTasksModal, setShowPendingTasksModal] = useState(false);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [deactivatedActor, setDeactivatedActor] = useState(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [actorToDelete, setActorToDelete] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/actors");
      setData(response.data);
      
      // Calculate stats
      const total = response.data.length;
      const active = response.data.filter(item => item.status === "A").length;
      setStats({
        total,
        active,
        inactive: total - active
      });
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search functionality
  const getFilteredData = () => {
    return data.filter(item => {
      const statusMatch = filterStatus === "all" ||
        (filterStatus === "active" && item.status === "A") ||
        (filterStatus === "inactive" && item.status === "O");
      
      const searchMatch = searchTerm === "" ||
        (item.actor_name && item.actor_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return statusMatch && searchMatch;
    });
  };

  const handleEdit = (index) => {
    setEditIndex(index);
    setEditedData({ ...data[index] });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Log the data being sent
      console.log("Sending data to update auditor:", editedData);
      
      // Use the correct endpoint from your backend route
      const response = await axios.put("/actors/update", editedData);
      
      if (response.status === 200) {
        const updatedData = [...data];
        const index = updatedData.findIndex(item => item.actor_id === editedData.actor_id);
        if (index !== -1) {
          updatedData[index] = editedData;
          setData(updatedData);
        }
        
        handleSuccess("Auditor updated successfully");
        setEditIndex(null);
        setEditedData({});
        fetchData();
      }
    } catch (err) {
      console.error("Error updating auditor:", err);
      alert(`Failed to update auditor: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const actor = data.find(item => item.actor_id === id);
    setActorToDelete(actor);
    setShowDeleteConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!actorToDelete) return;
    
    try {
      setIsDeleting(true);
      // Use the correct endpoint for deactivation
      const response = await axios.post('/actors/deactivate', { actor_id: actorToDelete.actor_id });
      
      if (response.status === 200) {
        const { affected_tasks, task_details, actor_name } = response.data;
        
        setPendingTasks(task_details || []);
        setDeactivatedActor({
          id: actorToDelete.actor_id,
          name: actor_name || actorToDelete.actor_name
        });
        
        // Only show pending tasks modal if there are tasks
        if (task_details && task_details.length > 0) {
          setShowPendingTasksModal(true);
        }
        
        handleSuccess(`Auditor deactivated successfully. ${affected_tasks || 0} task${affected_tasks !== 1 ? 's' : ''} moved to pending.`);
        fetchData();
      }
    } catch (err) {
      console.error("Error deactivating auditor:", err);
      alert(`Failed to deactivate auditor: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmModal(false);
      setActorToDelete(null);
    }
  };

  const handleSuccess = (message, newAuditorData = null) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
    
    if (newAuditorData) {
      // Add the new auditor directly to the data without refetching
      setData(prevData => [...prevData, newAuditorData]);
      
      // Update stats
      setStats(prev => ({
        total: prev.total + 1,
        active: newAuditorData.status === 'A' ? prev.active + 1 : prev.active,
        inactive: newAuditorData.status !== 'A' ? prev.inactive + 1 : prev.inactive
      }));
    } else {
      // If no new data is provided, fetch all data
      fetchData();
    }
  };

  const handleAddAuditor = () => {
    setIsAddingActor(true);
  };

  const handleDownloadReport = async (auditor) => {
    try {
      // Show loading indicator
      setIsSaving(true);
      
      // Use the correct endpoint with proper parameters
      const response = await axios.get(`/actors/performance-report/${auditor.actor_id}`, {
        responseType: 'blob'  // Important: This tells axios to handle the response as binary data
      });
      
      // Create a blob URL from the PDF data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger the download
      const link = document.createElement('a');
      link.href = url;
      
      const currentDate = new Date().toISOString().split('T')[0];
      const fileName = `${currentDate}_${auditor.actor_name.replace(/\s+/g, '_')}_Performance.pdf`;
      
      link.setAttribute('download', fileName);
      link.style.display = 'none';
      document.body.appendChild(link);
      
      // Simulate click and then clean up
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      handleSuccess(`Performance report for ${auditor.actor_name} downloaded successfully`);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert(`Failed to download report: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const navigateToTasks = () => {
    navigate('/tasks');
  };

  return (
    <>
      <SubNav />
      <div className="employee-container">
        {successMessage && (
          <div className="success-message">
            <i className="fas fa-check-circle"></i>
            <span>{successMessage}</span>
          </div>
        )}

        <div className="quick-stats-section">
          <div className="stat-card employee-stat">
            <div className="stat-icon">
              <i className="fas fa-user-tie"></i>
            </div>
            <div className="stat-content">
              <div className="stat-numbers">
                <span className="stat-count">{stats.total}</span>
                <div className="stat-details">
                  <div className="stat-detail">
                    <span className="detail-dot active"></span>
                    <span>{stats.active} Active</span>
                  </div>
                  <div className="stat-detail">
                    <span className="detail-dot inactive"></span>
                    <span>{stats.inactive} Inactive</span>
                  </div>
                </div>
              </div>
              <h3 className="stat-title">Auditors</h3>
            </div>
          </div>

          <div className="quick-actions">
            <h3><i className="fas fa-bolt"></i> Quick Actions</h3>
            <div className="action-buttons">
              <button className="quick-action-btn" onClick={handleAddAuditor}>
                <i className="fas fa-user-plus"></i>
                <span>New Auditor</span>
              </button>
            </div>
          </div>
        </div>

        <div className="main-content-section">
          <div className="content-header">
            <div className="unified-controls">
              <div className="search-filter-container">
                <div className="search-box">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder="Search auditors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="filter-options">
                  <span>Status:</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading auditors...</p>
            </div>
          ) : getFilteredData().length > 0 ? (
            <div className="card-grid">
              {getFilteredData().map((item, index) => (
                <div className={`card ${item.status === 'A' ? 'active-card' : 'inactive-card'}`} key={item.actor_id}>
                  <div className="card-header">
                    <div className="avatar">
                      <i className="fas fa-user-tie"></i>
                    </div>
                    <div className="status-indicator" title={item.status === 'A' ? 'Active' : 'Inactive'}>
                      <i className={`fas fa-circle ${item.status === 'A' ? 'status-active' : 'status-inactive'}`}></i>
                    </div>
                  </div>
                  
                  {editIndex === index ? (
                    <div className="card-edit-form">
                      <input
                        type="text"
                        value={editedData.actor_name || ''}
                        onChange={(e) => setEditedData({...editedData, actor_name: e.target.value})}
                        placeholder="Name"
                        className="form-input"
                      />
                      <input
                        type="email"
                        value={editedData.email_id || ''}
                        onChange={(e) => setEditedData({...editedData, email_id: e.target.value})}
                        placeholder="Email"
                        className="form-input"
                      />
                      <input
                        type="text"
                        value={editedData.mobile1 || ''}
                        onChange={(e) => setEditedData({...editedData, mobile1: e.target.value})}
                        placeholder="Phone"
                        className="form-input"
                      />
                      <select
                        value={editedData.gender || 'M'}
                        onChange={(e) => setEditedData({...editedData, gender: e.target.value})}
                        className="form-select"
                      >
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                      </select>
                      <select
                        value={editedData.status || 'A'}
                        onChange={(e) => setEditedData({...editedData, status: e.target.value})}
                        className="form-select"
                      >
                        <option value="A">Active</option>
                        <option value="O">Inactive</option>
                      </select>
                      <div className="form-actions">
                        <button 
                          className="btn-save" 
                          onClick={handleSave}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <i className="fas fa-spinner fa-spin"></i> Saving...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-check"></i> Save
                            </>
                          )}
                        </button>
                        <button 
                          className="btn-cancel" 
                          onClick={() => setEditIndex(null)}
                          disabled={isSaving}
                        >
                          <i className="fas fa-times"></i> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="card-body">
                        <h3>{item.actor_name}</h3>
                        <div className="detail-item">
                          <i className="fas fa-envelope"></i>
                          <span>{item.email_id}</span>
                        </div>
                        <div className="detail-item">
                          <i className="fas fa-phone"></i>
                          <span>{item.mobile1}</span>
                        </div>
                        {item.city && (
                          <div className="detail-item">
                            <i className="fas fa-map-marker-alt"></i>
                            <span>{item.city}</span>
                          </div>
                        )}
                      </div>
                      <div className="card-actions">
                        <button className="btn-edit" onClick={() => handleEdit(index)}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className="btn-download"
                          onClick={() => handleDownloadReport(item)}
                          title="Download Performance Report"
                        >
                          <i className="fas fa-download"></i>
                        </button>
                        <button 
                          className="btn-delete" 
                          onClick={() => handleDelete(item.actor_id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : (
                            <i className="fas fa-trash-alt"></i>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <i className="fas fa-folder-open"></i>
              <h3>No auditors found</h3>
              <p>There are no auditors to display.</p>
              <button className="add-button" onClick={handleAddAuditor}>
                <i className="fas fa-plus"></i> Add New Auditor
              </button>
            </div>
          )}
        </div>

        {/* Add New Auditor Modal */}
        {isAddingActor && (
          <div className="modal-overlay">
            <div className="modal-content">
              <AddEmployeeForm
                onClose={() => setIsAddingActor(false)}
                onSuccess={handleSuccess}
              />
            </div>
          </div>
        )}

        {/* Pending Tasks Modal */}
        {showPendingTasksModal && deactivatedActor && (
          <div className="modal-overlay">
            <div className="modal-content pending-tasks-modal">
              <div className="modal-header">
                <h2>
                  <i className="fas fa-tasks"></i>
                  Tasks Moved to Pending
                </h2>
                <button className="close-btn" onClick={() => setShowPendingTasksModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="modal-body">
                <div className="pending-tasks-info">
                  <p>
                    <i className="fas fa-info-circle"></i>
                    The following tasks from <strong>{deactivatedActor.name}</strong> have been moved to pending status:
                  </p>
                  
                  {pendingTasks.length > 0 ? (
                    <div className="pending-tasks-list">
                      <table className="tasks-table">
                        <thead>
                          <tr>
                            <th>Task ID</th>
                            <th>Task Name</th>
                            <th>Activity ID</th>
                            <th>Due Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingTasks.map(task => (
                            <tr key={task.task_id}>
                              <td>{task.task_id}</td>
                              <td>{task.task_name || `Task #${task.task_id}`}</td>
                              <td>{task.activity_id || 'N/A'}</td>
                              <td>{task.due_date || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="no-tasks-message">No active tasks were found for this auditor.</p>
                  )}
                  
                  <div className="modal-actions">
                    <button className="btn-view-tasks" onClick={navigateToTasks}>
                      <i className="fas fa-external-link-alt"></i>
                      View in Tasks Section
                    </button>
                    <button className="btn-close" onClick={() => setShowPendingTasksModal(false)}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmModal && actorToDelete && (
          <div className="modal-overlay">
            <div className="modal-content delete-confirm-modal">
              <div className="modal-header">
                <h2>
                  <i className="fas fa-exclamation-triangle"></i>
                  Confirm Deactivation
                </h2>
                <button className="close-btn" onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setActorToDelete(null);
                }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="modal-body">
                <div className="confirmation-message">
                  <p>
                    <i className="fas fa-info-circle"></i>
                    Are you sure you want to deactivate <strong>{actorToDelete.actor_name}</strong>? All their tasks will be moved to pending.
                  </p>
                  
                  <div className="modal-actions">
                    <button 
                      className="btn-cancel" 
                      onClick={() => {
                        setShowDeleteConfirmModal(false);
                        setActorToDelete(null);
                      }}
                    >
                      <i className="fas fa-times"></i>
                      Cancel
                    </button>
                    <button 
                      className="btn-delete" 
                      onClick={confirmDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Deactivating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-trash-alt"></i>
                          Confirm Deactivation
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Auditors; 