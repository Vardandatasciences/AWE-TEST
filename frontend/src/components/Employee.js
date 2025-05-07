import React, { useState, useEffect } from "react";
import "./Employee.css";
import axios from "axios";
import AddEmployeeForm from './AddEmployeeForm';
import AddCustomerForm from './AddCustomerForm';
import { useWorkflow } from '../context/WorkflowContext';
import { showWorkflowGuide } from '../App';
import { useNavigate } from 'react-router-dom';

// Add some additional CSS for the edit form
const editFormStyles = `
  .card-edit-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
  }
  
  .form-input, .form-select {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }
  
  .form-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
  }
  
  .btn-save, .btn-cancel {
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .btn-save {
    background-color: #4CAF50;
    color: white;
  }
  
  .btn-cancel {
    background-color: #f44336;
    color: white;
  }
`;

// Add the styles to the document
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = editFormStyles;
document.head.appendChild(styleSheet);
 
// Create a configured instance of axios
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

const PieChart = ({ data, onSegmentClick, selectedSegment }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  return (
    <svg viewBox="0 0 100 100">
      {data.map((item, index) => {
        if (item.value === 0) return null;
       
        const angle = (item.value / total) * 360;
        const startAngle = currentAngle;
        currentAngle += angle;
       
        const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
        const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
        const x2 = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180);
        const y2 = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180);
       
        const largeArcFlag = angle > 180 ? 1 : 0;
       
        return (
          <path
            key={item.title}
            d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
            fill={item.color}
            stroke="white"
            strokeWidth="1"
            className={selectedSegment === item.title ? 'selected' : ''}
            onClick={() => onSegmentClick(item.title)}
          />
        );
      })}
    </svg>
  );
};

// Add this near the top of your file after importing axios
axios.interceptors.request.use(request => {
  console.log('Axios Request:', request);
  return request;
});

axios.interceptors.response.use(
  response => {
    console.log('Axios Response:', response);
    return response;
  },
  error => {
    console.log('Axios Response Error:', error);
    return Promise.reject(error);
  }
);

const Employee = () => {
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState("actors");
  const [editIndex, setEditIndex] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [isAddingActor, setIsAddingActor] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [successMessage, setSuccessMessage] = useState(null);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [stats, setStats] = useState({
    actors: { total: 0, active: 0, inactive: 0 },
    customers: { total: 0, active: 0, inactive: 0 }
  });
  const { completeStep, workflowSteps } = useWorkflow();
  const navigate = useNavigate();
  
  // Add state for pending tasks modal
  const [showPendingTasksModal, setShowPendingTasksModal] = useState(false);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [deactivatedActor, setDeactivatedActor] = useState(null);
 
  // Check if we're in the workflow process
  const isInWorkflow = workflowSteps.some(step => step.status === 'in-progress' && step.id === 3);
 
  // Add state for the customer being assigned
  const [assigningCustomer, setAssigningCustomer] = useState(null);
 
  const [showReport, setShowReport] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
 
  // Add state for delete confirmation modal
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
 
  useEffect(() => {
    // Load both data types on component mount
    fetchData("actors");
    fetchData("customers");
    
    // Add debug log
    console.log("Component mounted, initial data fetch started");
  }, []);
 
  // Add a debugging effect to see when data changes
  useEffect(() => {
    console.log("Data updated:", data);
    console.log("Active tab:", activeTab);
    console.log("Current tab data:", data[activeTab]);
  }, [data, activeTab]);
 
  // Add useEffect to handle progress animation
  useEffect(() => {
    // Set progress values for employee and customer stats
    const employeeProgress = document.querySelector('.employee-stat .stat-progress');
    const customerProgress = document.querySelector('.customer-stat .stat-progress');
   
    if (employeeProgress && stats.actors) {
      const percentage = stats.actors.total > 0 ? Math.round((stats.actors.active / stats.actors.total) * 100) : 0;
     
      // Set the CSS variable for the animation
      employeeProgress.style.setProperty('--progress', percentage);
      // Set the data attribute for the percentage text
      employeeProgress.setAttribute('data-percentage', percentage);
     
      // Force a repaint to ensure the transition works
      const circle = employeeProgress.querySelector('.circle');
      if (circle) {
        setTimeout(() => {
          circle.style.strokeDasharray = `${percentage}, 100`;
        }, 50);
      }
    }
   
    if (customerProgress && stats.customers) {
      const percentage = stats.customers.total > 0 ? Math.round((stats.customers.active / stats.customers.total) * 100) : 0;
     
      // Set the CSS variable for the animation
      customerProgress.style.setProperty('--progress', percentage);
      // Set the data attribute for the percentage text
      customerProgress.setAttribute('data-percentage', percentage);
     
      // Force a repaint to ensure the transition works
      const circle = customerProgress.querySelector('.customer-circle');
      if (circle) {
        setTimeout(() => {
          circle.style.strokeDasharray = `${percentage}, 100`;
        }, 50);
      }
    }
  }, [stats]); // Run this effect when stats change
 
  const fetchData = async (cat) => {
    setLoading(true);
    try {
      let response;
      if (cat === "actors") {
        console.log("Fetching actors data...");
        // Use the configured axios instance
        response = await api.get("/actors");
        
        // Log the raw response to debug
        console.log("Raw actors response:", response);
        
        // Parse the response if it's a string
        let responseData = response.data;
        if (typeof responseData === 'string') {
          try {
            responseData = JSON.parse(responseData);
            console.log("Parsed actors data:", responseData);
          } catch (parseError) {
            console.error("Error parsing actors data:", parseError);
            responseData = [];
          }
        }
        
        // Make sure responseData is an array
        responseData = Array.isArray(responseData) ? responseData : [];
        console.log("Final actors data:", responseData);
        
        setData(prevData => ({ ...prevData, actors: responseData }));
        
        // Calculate stats
        const total = responseData.length;
        const active = responseData.filter(item => item.status === "A").length;
        setStats(prev => ({
          ...prev,
          actors: { total, active, inactive: total - active }
        }));
      } else if (cat === "customers") {
        console.log("Fetching customers data...");
        response = await api.get("/customers");
        
        console.log("Raw customers response:", response);
        
        let responseData = response.data;
        if (typeof responseData === 'string') {
          try {
            responseData = JSON.parse(responseData);
            console.log("Parsed customers data:", responseData);
          } catch (parseError) {
            console.error("Error parsing customers data:", parseError);
            responseData = [];
          }
        }
        
        responseData = Array.isArray(responseData) ? responseData : [];
        console.log("Final customers data:", responseData);
        
        setData(prevData => ({ ...prevData, customers: responseData }));
        
        const total = responseData.length;
        const active = responseData.filter(item => item.status === "A").length;
        setStats(prev => ({
          ...prev,
          customers: { total, active, inactive: total - active }
        }));
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      console.log("Error details:", err.response || err.message);
    } finally {
      setLoading(false);
    }
  };
 
  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setEditIndex(null);
    setEditedData({});
    setSearchTerm("");
    setFilterStatus("all");
  };
 
  // Filter and search functionality
  const getFilteredData = () => {
    // Get the current data array safely
    const currentTabData = data[activeTab];
    
    // Return empty array if no data exists for this tab
    if (!currentTabData) {
      console.log(`No data available for tab: ${activeTab}`);
      return [];
    }
    
    // Ensure we're working with an array
    const dataArray = Array.isArray(currentTabData) ? currentTabData : [];
    console.log(`Filtered data for ${activeTab}:`, dataArray.length, "items");
    
    return dataArray.filter(item => {
      const statusMatch = filterStatus === "all" ||
        (filterStatus === "active" && item.status === "A") ||
        (filterStatus === "inactive" && item.status === "O");
     
      const searchMatch = searchTerm === "" ||
        (item.actor_name && item.actor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.customer_name && item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));
     
      return statusMatch && searchMatch;
    });
  };
 
  // Edit handlers
  const handleEdit = (index) => {
    setEditIndex(index);
    setEditedData({ ...data[activeTab][index] });
  };
 
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const isActor = activeTab === "actors";
      const endpoint = isActor ? "/update_actor" : "/update_customer";
      const idField = isActor ? "actor_id" : "customer_id";
      
      // Make sure we have the ID in the edited data
      if (!editedData[idField]) {
        console.error("Missing ID in edited data");
        return;
      }
      
      // Format the data before sending to the backend
      const dataToSend = { ...editedData };
      
      // If we're updating an actor and gender is in full form, convert it to single character
      if (isActor && dataToSend.gender) {
        if (dataToSend.gender.toLowerCase() === 'male') {
          dataToSend.gender = 'M';
        } else if (dataToSend.gender.toLowerCase() === 'female') {
          dataToSend.gender = 'F';
        } else if (dataToSend.gender.length > 1) {
          dataToSend.gender = dataToSend.gender.charAt(0);
        }
      }
      
      const response = await axios.put(endpoint, dataToSend);
      
      if (response.status === 200) {
        // Update the local data
        const updatedData = [...data[activeTab]];
        const index = updatedData.findIndex(item => item[idField] === editedData[idField]);
        if (index !== -1) {
          updatedData[index] = editedData;
          setData({ ...data, [activeTab]: updatedData });
        }
        
        // Show success message
        handleSuccess(`${isActor ? "Auditor" : "Client"} updated successfully`);
        
        // Reset edit state
        setEditIndex(null);
        setEditedData({});
        
        // Refresh data to ensure we have the latest
        fetchData(activeTab);
      }
    } catch (err) {
      console.error("Error updating data:", err);
      alert(`Failed to update ${activeTab === "actors" ? "auditor" : "client"}. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };
 
  const handleDelete = async (id) => {
    const item = data[activeTab].find(item => 
      activeTab === "actors" ? item.actor_id === id : item.customer_id === id
    );
    setItemToDelete(item);
    setShowDeleteConfirmModal(true);
  };
 
  // Add confirmDelete function
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    if (activeTab === "actors") {
      try {
        setIsDeleting(true);
        const response = await axios.put('/deactivate_actor', { actor_id: itemToDelete.actor_id });
        
        if (response.status === 200) {
          const { affected_tasks, task_details, actor_name } = response.data;
          
          setPendingTasks(task_details);
          setDeactivatedActor({
            id: itemToDelete.actor_id,
            name: actor_name
          });
          
          setShowPendingTasksModal(true);
          handleSuccess(`Auditor deactivated successfully. ${affected_tasks} task${affected_tasks !== 1 ? 's' : ''} moved to pending.`);
          fetchData(activeTab);
        }
      } catch (err) {
        console.error("Error deactivating auditor:", err);
        alert("Failed to deactivate auditor. Please try again.");
      } finally {
        setIsDeleting(false);
        setShowDeleteConfirmModal(false);
        setItemToDelete(null);
      }
    } else {
      try {
        setIsDeleting(true);
        const endpoint = `/delete_customer/${itemToDelete.customer_id}`;
        
        const response = await axios.delete(endpoint);
        
        if (response.status === 200) {
          const updatedData = data[activeTab].filter(item => item.customer_id !== itemToDelete.customer_id);
          setData({ ...data, [activeTab]: updatedData });
          handleSuccess(`Client deleted successfully`);
          fetchData(activeTab);
        }
      } catch (err) {
        console.error("Error deleting data:", err);
        alert(`Failed to delete client. Please try again.`);
      } finally {
        setIsDeleting(false);
        setShowDeleteConfirmModal(false);
        setItemToDelete(null);
      }
    }
  };
 
  // Add a new function to handle HTML success messages
  const handleSuccessWithHTML = (htmlContent) => {
    // Create a div for the success message
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message enhanced';
    messageDiv.innerHTML = htmlContent;
    
    // Add to the DOM
    document.body.appendChild(messageDiv);
    
    // Refresh data
    fetchData(activeTab);
    
    // Remove after 5 seconds (longer than regular messages)
    setTimeout(() => {
      if (messageDiv.parentNode) {
        document.body.removeChild(messageDiv);
      }
    }, 5000);
  };
 
  const handleAddEmployee = () => {
    setIsAddingActor(true);
  };
 
  const handleAddCustomer = () => {
    setIsAddingCustomer(true);
  };
 
  const handleSuccess = (message, newId = null) => {
    setSuccessMessage(message);
    // Refresh data to ensure we get the newly created record with auto-generated ID
    fetchData(activeTab);
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };
 
  const handleAssignEmployee = async (customerId, customerName) => {
    setShowAssignForm(true);
   
    // If we're in the workflow process, mark this step as completed
    if (isInWorkflow) {
      completeStep(3);
     
      // Show the workflow guide again to show completion
      setTimeout(() => {
        showWorkflowGuide();
      }, 500);
    }
  };
 
  const handleShowReport = async (employee) => {
    setSelectedEmployee(employee);
    try {
      const response = await axios.get(`/employee-performance/${employee.actor_id}`);
      // Ensure performanceData is always an array
      setPerformanceData(Array.isArray(response.data) ? response.data : []);
      setShowReportModal(true);
    } catch (error) {
      console.error("Error fetching performance data:", error);
      // Initialize with empty array on error
      setPerformanceData([]);
      alert("Failed to load performance data. Please try again.");
    }
  };

  const handleDownloadReport = async (employee) => {
    try {
      // Show loading indicator or message
      alert("Generating report, please wait...");
      
      // Use a direct browser window approach for reliable PDF downloads
      const url = `/download-performance/${employee.actor_id}`;
      
      // Open in a new tab first
      const newTab = window.open(url, '_blank');
      
      // If popup blocked, fallback to the blob approach
      if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
        console.log("Popup blocked, trying alternative download method...");
        
        const response = await axios.get(url, {
          responseType: 'blob'
        });
        
        // Check if we got a valid PDF
        if (response.headers['content-type'] === 'application/pdf') {
          const blob = new Blob([response.data], { type: 'application/pdf' });
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          
          const currentDate = new Date().toISOString().split('T')[0];
          link.setAttribute('download', `${currentDate}_${employee.actor_name}_Performance.pdf`);
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up
          setTimeout(() => {
            window.URL.revokeObjectURL(downloadUrl);
          }, 100);
        } else {
          throw new Error("The server did not return a PDF file");
        }
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  const handlePieSegmentClick = (status) => {
    setSelectedStatus(status === selectedStatus ? null : status);
  };
 
  const filteredData = getFilteredData();
 
  // Calculate recent activity (mock data for visual appeal)
  const recentActivity = [
    { type: 'add', entity: 'employee', name: 'John Smith', time: '2 hours ago' },
    { type: 'edit', entity: 'customer', name: 'Acme Corp', time: '5 hours ago' },
    { type: 'delete', entity: 'employee', name: 'Jane Doe', time: '1 day ago' },
  ];
 
  const testDirectApiCall = async () => {
    try {
      console.log("Testing direct API call to /actors...");
      const response = await fetch('http://localhost:5000/actors');
      const text = await response.text();
      console.log("Raw response:", text);
      
      try {
        const data = JSON.parse(text);
        console.log("Parsed response:", data);
      } catch (e) {
        console.log("Could not parse as JSON");
      }
    } catch (err) {
      console.error("Direct API test failed:", err);
    }
  };
  
  // Add a function to navigate to the Tasks page
  const navigateToTasks = () => {
    navigate('/tasks');
  };
 
  // Add new function to handle client report downloads
  const handleDownloadClientReport = async (customer) => {
    try {
      const response = await axios.get(`/download-customer-report/${customer.customer_id}`, {
        responseType: 'blob'
      });
     
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
     
      const currentDate = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `${currentDate}_${customer.customer_name}_Report.pdf`);
     
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
     
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading client report:', error);
      alert('Failed to download client report. Please try again.');
    }
  };
 
  return (
    <div className="employee-container">
      {successMessage && (
        <div className="success-message">
          <i className="fas fa-check-circle"></i>
          <span>{successMessage}</span>
        </div>
      )}
     
      {/* <div className="page-header">
        <h1><i className="fas fa-users"></i> Employee Management</h1>
        <p>Manage your employees and customers in one place</p>
      </div> */}
 
      {/* Quick Stats Section */}
      <div className="quick-stats-section">
        <div className="stat-card employee-stat">
          <div className="stat-icon">
            <i className="fas fa-user-tie"></i>
          </div>
          <div className="stat-content">
            <div className="stat-numbers">
              <span className="stat-count">{stats.actors.total}</span>
              <div className="stat-details">
                <div className="stat-detail">
                  <span className="detail-dot active"></span>
                  <span>{stats.actors.active} Active</span>
                </div>
                <div className="stat-detail">
                  <span className="detail-dot inactive"></span>
                  <span>{stats.actors.inactive} Inactive</span>
                </div>
              </div>
            </div>
            <h3 className="stat-title">Auditors</h3>
          </div>
          <div className="stat-progress">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path className="circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path className="circle"
                strokeDasharray={`${stats.actors.total > 0 ? (stats.actors.active / stats.actors.total) * 100 : 0}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
          </div>
        </div>
       
        <div className="stat-card customer-stat">
          <div className="stat-icon">
            <i className="fas fa-building"></i>
          </div>
          <div className="stat-content">
            <div className="stat-numbers">
              <span className="stat-count">{stats.customers.total}</span>
              <div className="stat-details">
                <div className="stat-detail">
                  <span className="detail-dot active"></span>
                  <span>{stats.customers.active} Active</span>
                </div>
                <div className="stat-detail">
                  <span className="detail-dot inactive"></span>
                  <span>{stats.customers.inactive} Inactive</span>
                </div>
              </div>
            </div>
            <h3 className="stat-title">Clients</h3>
          </div>
          <div className="stat-progress">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path className="circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path className="circle customer-circle"
                strokeDasharray={`${stats.customers.total > 0 ? (stats.customers.active / stats.customers.total) * 100 : 0}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
          </div>
        </div>
       
        <div className="quick-actions">
          <h3><i className="fas fa-bolt"></i> Quick Actions</h3>
          <div className="action-buttons">
            <button className="quick-action-btn" onClick={handleAddEmployee}>
              <i className="fas fa-user-plus"></i>
              <span>New Auditor</span>
            </button>
            <button className="quick-action-btn" onClick={handleAddCustomer}>
              <i className="fas fa-building"></i>
              <span>New Client</span>
            </button>
 
          </div>
        </div>
      </div>
 
      {/* Main Content Section */}
      <div className="main-content-section">
        <div className="content-header">
          <div className="unified-controls">
            <div className="tabs">
              <button
                className={`tab ${activeTab === "actors" ? "active" : ""}`}
                onClick={() => handleTabChange("actors")}
              >
                <i className="fas fa-user-tie"></i> Auditors
              </button>
              <button
                className={`tab ${activeTab === "customers" ? "active" : ""}`}
                onClick={() => handleTabChange("customers")}
              >
                <i className="fas fa-building"></i> Clients
              </button>
            </div>
 
            <div className="search-filter-container">
              <div className="search-box">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Search..."
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
            <p>Loading data...</p>
          </div>
        ) : filteredData.length > 0 ? (
          <div className="card-grid">
            {filteredData.map((item, index) => {
              const isActor = activeTab === "actors";
              const name = isActor ? item.actor_name : item.customer_name;
              const id = isActor ? item.actor_id : item.customer_id;
             
              return (
                <div className={`card ${item.status === 'A' ? 'active-card' : 'inactive-card'}`} key={id}>
                  <div className="card-header">
                    <div className={`avatar ${isActor ? '' : 'customer-avatar'}`}>
                      <i className={`fas ${isActor ? 'fa-user' : 'fa-building'}`}></i>
                    </div>
                    <div className="status-indicator" title={item.status === 'A' ? 'Active' : 'Inactive'}>
                      <i className={`fas fa-circle ${item.status === 'A' ? 'status-active' : 'status-inactive'}`}></i>
                    </div>
                    {isActor && (
                      <button
                        className="report-btn"
                        onClick={() => handleShowReport(item)}
                        title="View Employee Performance Report"
                      >
                        <i className="fas fa-chart-pie"></i>
                      </button>
                    )}
                  </div>
                 
                  {editIndex === index ? (
                    <div className="card-edit-form">
                      <input
                        type="text"
                        value={editedData[isActor ? 'actor_name' : 'customer_name'] || ''}
                        onChange={(e) => setEditedData({...editedData, [isActor ? 'actor_name' : 'customer_name']: e.target.value})}
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
                      <input
                        type="text"
                        value={editedData.city || ''}
                        onChange={(e) => setEditedData({...editedData, city: e.target.value})}
                        placeholder="City"
                        className="form-input"
                      />
                      {isActor && (
                        <select
                          value={editedData.gender || 'M'}
                          onChange={(e) => setEditedData({...editedData, gender: e.target.value})}
                          className="form-select"
                        >
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                          <option value="O">Other</option>
                        </select>
                      )}
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
                        <h3>{name}</h3>
                        <div className="detail-item">
                          <i className="fas fa-envelope"></i>
                          <span>{item.email_id}</span>
                        </div>
                        <div className="detail-item">
                          <i className="fas fa-phone"></i>
                          <span>{item.mobile1}</span>
                        </div>
                        <div className="detail-item">
                          <i className="fas fa-map-marker-alt"></i>
                          <span>{item.city || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="card-actions">
                        <button className="btn-edit" onClick={() => handleEdit(index)}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className="btn-download"
                          onClick={() => isActor ? handleDownloadReport(item) : handleDownloadClientReport(item)}
                          title={`Download ${isActor ? 'Performance' : 'Client'} Report`}
                        >
                          <i className="fas fa-download"></i>
                        </button>
                        <button 
                          className="btn-delete" 
                          onClick={() => handleDelete(isActor ? item.actor_id : item.customer_id)}
                          title={`Delete ${isActor ? 'Auditor' : 'Client'}`}
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
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <i className="fas fa-folder-open"></i>
            <h3>No data found</h3>
            <p>There are no records to display.</p>
            <button className="add-button" onClick={activeTab === "actors" ? handleAddEmployee : handleAddCustomer}>
              <i className="fas fa-plus"></i> Add New {activeTab === "actors" ? "Employee" : "Customer"}
            </button>
          </div>
        )}
      </div>
 
      {/* Add New Employee Modal */}
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
 
      {/* Add New Customer Modal */}
      {isAddingCustomer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <AddCustomerForm
              onClose={() => setIsAddingCustomer(false)}
              onSuccess={handleSuccess}
            />
          </div>
        </div>
      )}
 
      {/* Add a note if we're in the workflow process */}
      {isInWorkflow && (
        <div className="workflow-note">
          <p>You're in step 3 of the workflow. Please assign an employee to continue.</p>
        </div>
      )}
 
      {/* Add Employee Assignment Form Modal */}
      {showAssignForm && assigningCustomer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="form-container">
              <h2><i className="fas fa-user-plus"></i> Assign Auditor to {assigningCustomer.name}</h2>
             
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const employeeId = formData.get('employee_id');
               
                // Call the handleAssignEmployee function with the form data
                handleAssignEmployee({
                  customer_id: assigningCustomer.id,
                  employee_id: employeeId
                });
               
                // Close the form
                setShowAssignForm(false);
              }}>
                <div className="form-group">
                  <label htmlFor="employee_id">Select Auditor</label>
                  <select
                    id="employee_id"
                    name="employee_id"
                    required
                  >
                    <option value="">-- Select an Auditor --</option>
                    {data.actors && data.actors.map(employee => (
                      <option key={employee.actor_id} value={employee.actor_id}>
                        {employee.actor_name}
                      </option>
                    ))}
                  </select>
                </div>
               
                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowAssignForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit">
                    <i className="fas fa-save"></i>
                    <span>Assign Auditor</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
 
      {/* Add Report Modal */}
      {showReportModal && selectedEmployee && (
        <div className="modal-overlay">
          <div className="report-modal">
            <div className="modal-header">
              <h2>
                <i className="fas fa-chart-pie"></i>
                Performance Report - {selectedEmployee.actor_name}
              </h2>
              <button className="close-btn" onClick={() => setShowReportModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
           
            <div className="report-content">
              <div className="report-table">
                <table>
                  <thead>
                    <tr>
                      <th>Activity ID</th>
                      <th>Activity Name</th>
                      <th>Task ID</th>
                      <th>Date of Completion</th>
                      <th>Time Taken</th>
                      <th>Standard Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(performanceData) && performanceData.map(task => (
                      <tr
                        key={task.task_id}
                        className={selectedStatus === task.status ? 'highlighted' : ''}
                      >
                        <td>{task.activity_id}</td>
                        <td>{task.activity_name}</td>
                        <td>{task.task_id}</td>
                        <td>{task.completion_date}</td>
                        <td>{task.time_taken}</td>
                        <td>{task.standard_time}</td>
                        <td className={`status-${task.status?.toLowerCase()}`}>
                          {task.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
             
              <div className="report-chart">
                <div className="pie-chart-container">
                  <PieChart
                    data={[
                      {
                        title: 'ON-TIME',
                        value: Array.isArray(performanceData) ? performanceData.filter(t => t.status === 'ON-TIME').length : 0,
                        color: '#3498db'
                      },
                      {
                        title: 'EARLY',
                        value: Array.isArray(performanceData) ? performanceData.filter(t => t.status === 'EARLY').length : 0,
                        color: '#1a5e2d'
                      },
                      {
                        title: 'DELAY',
                        value: Array.isArray(performanceData) ? performanceData.filter(t => t.status === 'DELAY').length : 0,
                        color: '#e74c3c'
                      }
                    ]}
                    onSegmentClick={handlePieSegmentClick}
                    selectedSegment={selectedStatus}
                  />
                  <div className="pie-chart-legend">
                    <div className="legend-item delay">Delay</div>
                    <div className="legend-item on-time">On Time</div>
                    <div className="legend-item early">Early</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
 
      <button onClick={testDirectApiCall} style={{marginTop: '20px'}}>
        Test Direct API Call
      </button>
      {/* Add Pending Tasks Modal */}
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
 
      {/* Add Delete Confirmation Modal */}
      {showDeleteConfirmModal && itemToDelete && (
        <div className="modal-overlay">
          <div className="modal-content delete-confirm-modal">
            <div className="modal-header">
              <h2>
                <i className="fas fa-exclamation-triangle"></i>
                Confirm Deactivation
              </h2>
              <button className="close-btn" onClick={() => {
                setShowDeleteConfirmModal(false);
                setItemToDelete(null);
              }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="confirmation-message">
                
              <div className="message-line">
                <i className="fas fa-info-circle"></i>
                <span style={{ display: 'inline' }}>
                  Are you sure you want to deactivate <strong style={{ display: 'inline' }}>{itemToDelete.actor_name}</strong>
                </span>
              </div>

                <div className="message-line">
                  <i className="fas fa-tasks"></i>
                  <span>All their tasks will be moved to pending.</span>
                </div>

               
                
                <div className="modal-actions">
                  <button 
                    className="btn-cancel" 
                    onClick={() => {
                      setShowDeleteConfirmModal(false);
                      setItemToDelete(null);
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
  );
};

export default Employee;