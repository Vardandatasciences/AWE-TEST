import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useWorkflow } from '../context/WorkflowContext';
import { showWorkflowGuide } from '../App';
import './Activities.css';
import AssignActivity from './AssignActivity';
import { API_ENDPOINTS } from '../config/api';
import AssignActivityForm from './AssignActivityForm';
import api from '../services/api';

const Activities = () => {
    const [activities, setActivities] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingActivity, setEditingActivity] = useState(null);
    const [formData, setFormData] = useState({
        activity_name: "",
        standard_time: "",
        act_des: "",
        criticality: "Low",
        duration: "",
        role_id: "",
        frequency: "0",
        due_by: "",
        activity_type: "R",
        // group_id: "",
        status: "A"
    });
    // const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assignActivity, setAssignActivity] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    
    // Activity mapping state
    const [showActivityMapping, setShowActivityMapping] = useState(false);
    const [activityMappings, setActivityMappings] = useState([]);
    const [mappingLoading, setMappingLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [assigningActivityId, setAssigningActivityId] = useState(null);
    const [assignSuccess, setAssignSuccess] = useState(null);
    const [selectedActivity, setSelectedActivity] = useState(null);

    // Add this to your state
    const [showAssignForm, setShowAssignForm] = useState(false);
    const [assigningCustomer, setAssigningCustomer] = useState(null);
    // Add new states for report modal
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedActivityReport, setSelectedActivityReport] = useState(null);
    const [reportData, setReportData] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [standardTime, setStandardTime] = useState(null);

    const [stats, setStats] = useState({
        total: 0,
        regulatory: 0,
        internal: 0,
        customer: 0,
        active: 0,
        inactive: 0
    });

    const { completeStep, workflowSteps } = useWorkflow();
    
    // Check if we're in the workflow process - now check for step 3 (employee assignment)
    const isInWorkflow = workflowSteps.some(step => 
        (step.status === 'in-progress' && step.id === 2) || 
        (step.status === 'in-progress' && step.id === 3)
    );
    
    // Specifically check if we're in step 3 (employee assignment)
    const isInEmployeeAssignmentStep = workflowSteps.some(step => 
        step.status === 'in-progress' && step.id === 3
    );

    // Add these state variables in your component
    const [currentPage, setCurrentPage] = useState(1);
    const [activitiesPerPage] = useState(12);
    const [totalPages, setTotalPages] = useState(1);

    // Add these new state variables at the beginning of your Activities component
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [showActivities, setShowActivities] = useState(false);

    // Add this new state variable at the beginning of your Activities component
    const [assignedActivities, setAssignedActivities] = useState([]);

    // Add this state variable near your other state declarations
    const [assignmentFilter, setAssignmentFilter] = useState('all'); // 'all', 'assigned', 'unassigned'

    // First, add a state to store the selected client name
    const [selectedClientName, setSelectedClientName] = useState('');

    // Add new state for notifications
    const [notification, setNotification] = useState(null);

    // Add this state for success popup
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);

    // Add this state for success message
    const [successMessage, setSuccessMessage] = useState(null);

    // Add state for delete confirmation modal
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Add state for subtasks
    const [subtasks, setSubtasks] = useState([]);

    // Add this state for viewing subtasks
    const [viewingSubtasks, setViewingSubtasks] = useState(null);
    const [subtaskFlow, setSubtaskFlow] = useState([]);

    useEffect(() => {
        fetchActivities();
        // fetchGroups();
        fetchEmployees();
        fetchClients();
    }, []);

    useEffect(() => {
        if (activities) {
            setTotalPages(Math.ceil(activities.length / activitiesPerPage));
        }
    }, [activities, activitiesPerPage]);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const response = await api.get(API_ENDPOINTS.ACTIVITIES);
            setActivities(response.data);

            // Calculate stats
            const total = response.data.length;
            const regulatory = response.data.filter(activity => activity.activity_type === 'R').length;
            const internal = response.data.filter(activity => activity.activity_type === 'I').length;
            const customer = response.data.filter(activity => activity.activity_type === 'C').length;
            const active = response.data.filter(activity => activity.status === 'A').length;
            const inactive = response.data.filter(activity => activity.status === 'I').length;

            setStats({
                total,
                regulatory,
                internal,
                customer,
                active,
                inactive
            });
        } catch (error) {
            console.error('Error fetching activities:', error);
        } finally {
            setLoading(false);
        }
    };

    // const fetchGroups = async () => {
    //     try {
    //         const response = await axios.get('/groups');
    //         setGroups(response.data);
    //     } catch (error) {
    //         console.error('Error fetching groups:', error);
    //     }
    // };
    
    const fetchEmployees = async () => {
        try {
            const response = await axios.get('/actors');
            setEmployees(response.data);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };
    
    const fetchActivityMappings = async (activityId) => {
        setMappingLoading(true);
        try {
            const response = await axios.get(`/activity_mappings/${activityId}`);
            setActivityMappings(response.data);
        } catch (error) {
            console.error('Error fetching activity mappings:', error);
            setActivityMappings([]);
        } finally {
            setMappingLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubtaskChange = (index, field, value) => {
        const updatedSubtasks = [...subtasks];
        updatedSubtasks[index][field] = value;
        setSubtasks(updatedSubtasks);
        
        // Calculate total time
        calculateTotalTime(updatedSubtasks);
    };

    const calculateTotalTime = (updatedSubtasks) => {
        const totalTime = updatedSubtasks.reduce((sum, subtask) => {
            return sum + (parseFloat(subtask.time) || 0);
        }, 0);
        
        setFormData({
            ...formData,
            standard_time: totalTime.toFixed(1)
        });
    };

    const addSubtask = () => {
        setSubtasks([
            ...subtasks,
            { name: '', description: '', time: 0 }
        ]);
    };

    const removeSubtask = (index) => {
        const updatedSubtasks = [...subtasks];
        updatedSubtasks.splice(index, 1);
        setSubtasks(updatedSubtasks);
        calculateTotalTime(updatedSubtasks);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Include subtasks in the form data
            const dataToSend = {
                ...formData,
                sub_activities: subtasks
            };
            
            let response;
            
            if (editingActivity) {
                // Update existing activity
                response = await api.put('/update_activity', dataToSend);
                
                // Update the activities list with the edited activity
                const updatedActivities = activities.map(act => 
                    act.activity_id === editingActivity.activity_id ? response.data.activity : act
                );
                setActivities(updatedActivities);
                
                setSuccessMessage("Activity updated successfully");
            } else {
                // Add new activity
                response = await api.post('/add_activity', dataToSend);
                
                if (response.data.activity) {
                    setActivities([response.data.activity, ...activities]);
                } else {
                    fetchActivities();
                }
                
                setSuccessMessage("Activity added successfully");
            }
            
            // Reset form and close modal
            setShowForm(false);
            setEditingActivity(null);
            setFormData({
                activity_name: "",
                standard_time: "",
                act_des: "",
                criticality: "Low",
                duration: "",
                role_id: "",
                frequency: "0",
                due_by: "",
                activity_type: "R",
                status: "A"
            });
            setSubtasks([]);
            
            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
            
            // If we're in the workflow process, mark this step as completed
            if (isInWorkflow) {
                completeStep(2);
                setTimeout(() => {
                    showWorkflowGuide();
                }, 500);
            }
        } catch (error) {
            console.error('Error saving activity:', error);
            alert(error.response?.data?.error || 'Error saving activity');
        }
    };

    const handleEdit = async (activity) => {
        setEditingActivity(activity);
        setFormData({
            activity_id: activity.activity_id,
            activity_name: activity.activity_name,
            standard_time: activity.standard_time,
            act_des: activity.act_des || '',
            criticality: activity.criticality || 'Low',
            duration: activity.duration || '',
            role_id: activity.role_id || '',
            frequency: activity.frequency || '0',
            due_by: activity.due_by || '',
            activity_type: activity.activity_type || 'R',
            status: activity.status || 'A'
        });
        
        // Load subtasks if available
        if (activity.sub_activities) {
            try {
                const parsedSubtasks = typeof activity.sub_activities === 'string' 
                    ? JSON.parse(activity.sub_activities) 
                    : activity.sub_activities;
                
                setSubtasks(parsedSubtasks);
            } catch (error) {
                console.error('Error parsing subtasks:', error);
                setSubtasks([]);
            }
        } else {
            setSubtasks([]);
        }
        
        setShowForm(true);
    };

    const handleDelete = async (activity) => {
        try {
            // Get the activity
            const response = await api.delete(`/delete_activity/${activity.activity_id}`);
            
            if (response.status === 200) {
                fetchActivities();
                setSuccessMessage("Activity deleted successfully");
                setTimeout(() => {
                    setSuccessMessage(null);
                }, 3000);
            }
        } catch (error) {
            console.error('Error deleting activity:', error);
            alert(error.response?.data?.message || 'Error deleting activity');
        }
    };

    const handleAssign = (activity) => {
        setAssignActivity(activity);
    };
    
    const handleAssignEmployee = (customerId, customerName) => {
        setAssigningCustomer({
            id: customerId,
            name: customerName
        });
        setShowAssignForm(true);
    };

    const handleAssignSuccess = (response) => {
        setShowAssignForm(false);
        
        // Show success notification
        setNotification({
            type: 'success',
            message: 'Task assigned successfully!'
        });
        
        // Update assigned activities
        const newClientId = response.customer_id || selectedClient;
        fetchAssignedActivities(newClientId);
    };

    const handleAssignError = (error) => {
        setNotification({
            type: 'error',
            message: error.response?.data?.message || 'Error assigning task. Please try again.'
        });
    };

    const closeAssignModal = () => {
        setAssignActivity(null);
    };
    
    const closeActivityMapping = () => {
        setShowActivityMapping(false);
        setActivityMappings([]);
        setAssigningActivityId(null);
        setAssignSuccess(null);
        setSelectedActivity(null);
    };

    const fetchClients = async () => {
        try {
            const response = await api.get('/customers'); // Use the API service here
            setClients(response.data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    const fetchAssignedActivities = async (clientId) => {
        try {
            const response = await api.get(`/tasks/client/${clientId}`);
            console.log("Tasks response:", response.data);
            
            // Ensure we're working with an array
            let assignedIds = [];
            if (Array.isArray(response.data)) {
                assignedIds = response.data.map(id => String(id));
            } else if (response.data) {
                // Handle if the response isn't an array but has data
                assignedIds = [String(response.data)];
            }
                
            console.log("Assigned activity IDs:", assignedIds);
            setAssignedActivities(assignedIds);
        } catch (error) {
            console.error('Error fetching assigned activities:', error);
            setAssignedActivities([]);
        }
    };

    // Update the filteredActivities function to handle "all" client option
    const filteredActivities = activities.filter(activity => {
        // If no client is selected, return empty array
        if (!selectedClient) return false;
        
        // If "all" is selected, show all activities based on search term and assignment filter
        const showAllClients = selectedClient === 'all';

        // First check the search term
        const matchesSearch = !searchTerm || 
            (activity.activity_name && activity.activity_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (activity.act_des && activity.act_des.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (activity.criticality && activity.criticality.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (activity.duration && activity.duration.toString().includes(searchTerm)) ||
            (activity.due_by && activity.due_by.includes(searchTerm));

        // For "all" clients option, only filter by search term
        if (showAllClients) {
            return matchesSearch; 
        }

        // For specific client, check assignment status
        const activityIdStr = String(activity.activity_id);
        const isAssigned = assignedActivities.some(id => String(id) === activityIdStr);
        
        switch (assignmentFilter) {
            case 'assigned':
                return matchesSearch && isAssigned;
            case 'unassigned':
                return matchesSearch && !isAssigned;
            default: // 'all'
                return matchesSearch;
        }
    });

    // const getGroupName = (groupId) => {
    //     const group = groups.find(g => g.id === groupId);
    //     return group ? group.group_name : 'Unknown Group';
    // };
    
    const getEmployeeName = (employeeId) => {
        const employee = employees.find(emp => emp.actor_id === employeeId);
        return employee ? employee.actor_name : `Employee ID: ${employeeId}`;
    };

    // Handle status button click - directly open the mapping screen
    const handleStatusClick = (activity) => {
        if (!activity || !activity.activity_id) {
            handleAssignError({ message: 'Invalid activity data' });
            return;
        }
        
        setSelectedActivity(activity);
        setAssigningActivityId(activity.activity_id);
        setShowAssignForm(true);
    };


const fetchActivityReport = async (activityId) => {
        try {
            const response = await axios.get(`/get_activity_data?activity_id=${activityId}`);
            setReportData(response.data.tasks);
            setStandardTime(response.data.standard_time);
        } catch (error) {
            console.error('Error fetching report data:', error);
        }
    };



    const handleAddActivity = async (activityData) => {
        try {
            const response = await axios.post('/add_activity', activityData);
            
            if (response.status === 201) {
                // Add the new activity to the list
                fetchActivities();
                
                // If we're in the workflow process, mark this step as completed
                if (isInWorkflow) {
                    completeStep(2);
                    
                    // Show the workflow guide again to guide to the next step
                    setTimeout(() => {
                        showWorkflowGuide();
                    }, 500);
                }
                
                setShowForm(false);
                // Show success message
            }
        } catch (err) {
            console.error('Error adding activity:', err);
            // Show error message
        }
    };

    useEffect(() => {
        // Set progress values for activity stats
        const regulatoryProgress = document.querySelector('.regulatory-stat .stat-progress');
        const internalProgress = document.querySelector('.internal-stat .stat-progress');
        const customerProgress = document.querySelector('.customer-stat .stat-progress');

        if (regulatoryProgress && stats.total > 0) {
            const percentage = Math.round((stats.regulatory / stats.total) * 100);
            
            // Set the CSS variable for the animation
            regulatoryProgress.style.setProperty('--progress', percentage);
            // Set the data attribute for the percentage text
            regulatoryProgress.setAttribute('data-percentage', percentage);
            
            // Force a repaint to ensure the transition works
            const circle = regulatoryProgress.querySelector('.regulatory-circle');
            if (circle) {
                setTimeout(() => {
                    circle.style.strokeDasharray = `${percentage}, 100`;
                }, 50);
            }
        }
        
        if (internalProgress && stats.total > 0) {
            const percentage = Math.round((stats.internal / stats.total) * 100);
            
            // Set the CSS variable for the animation
            internalProgress.style.setProperty('--progress', percentage);
            // Set the data attribute for the percentage text
            internalProgress.setAttribute('data-percentage', percentage);
            
            // Force a repaint to ensure the transition works
            const circle = internalProgress.querySelector('.internal-circle');
            if (circle) {
                setTimeout(() => {
                    circle.style.strokeDasharray = `${percentage}, 100`;
                }, 50);
            }
        }
        
        if (customerProgress && stats.total > 0) {
            const percentage = Math.round((stats.customer / stats.total) * 100);
            
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

    // Function to handle report button click
    const handleReportClick = (activity) => {
        setSelectedActivityReport(activity);
        fetchActivityReport(activity.activity_id);
        setShowReportModal(true);
    };

    // Function to handle pie chart segment click
    const handlePieSegmentClick = (status) => {
        setSelectedStatus(status === selectedStatus ? null : status);
    };

    // Function to handle download report
    const handleDownloadReport = async (activityId) => {
        // Show loading indicator or message if needed
        
        // Call the correct endpoint that generates the PDF with table and pie chart
        const response = await axios.get(`/generate_activity_report?activity_id=${activityId}`, {
            responseType: 'blob' // Important: set responseType to 'blob'
        });
        
        // Create a blob URL from the response data
        const url = window.URL.createObjectURL(new Blob([response.data]));
        
        // Create a temporary link element to trigger the download
        const link = document.createElement('a');
        link.href = url;
        
        // Set the filename with current date
        const currentDate = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `${currentDate}_Activity_${activityId}_Report.pdf`);
        
        // Append to body, click to download, then remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL
        window.URL.revokeObjectURL(url);
    };

    // Add this pagination logic function
    const getCurrentPageActivities = () => {
        const indexOfLastActivity = currentPage * activitiesPerPage;
        const indexOfFirstActivity = indexOfLastActivity - activitiesPerPage;
        return filteredActivities.slice(indexOfFirstActivity, indexOfLastActivity);
    };

    // Add these pagination handler functions
    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    };

    const handlePrevPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    const handlePageClick = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    // Make sure the filteredActivities are used for pagination
    useEffect(() => {
        if (filteredActivities) {
            setTotalPages(Math.ceil(filteredActivities.length / activitiesPerPage));
        }
    }, [filteredActivities, activitiesPerPage]);

    // Add this pagination component
    const Pagination = () => {
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(
                <button
                    key={i}
                    className={`pagination-button ${currentPage === i ? 'active' : ''}`}
                    onClick={() => handlePageClick(i)}
                >
                    {i}
                </button>
            );
        }

        return (
            <div className="pagination-container">
                <button
                    className="pagination-button"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                >
                    <i className="fas fa-chevron-left"></i> Previous
                </button>
                
                {totalPages <= 5 ? (
                    pages
                ) : (
                    <>
                        {currentPage > 2 && <button className="pagination-button">1</button>}
                        {currentPage > 3 && <span>...</span>}
                        {pages.slice(Math.max(0, currentPage - 2), Math.min(currentPage + 1, totalPages))}
                        {currentPage < totalPages - 2 && <span>...</span>}
                        {currentPage < totalPages - 1 && (
                            <button className="pagination-button">{totalPages}</button>
                        )}
                    </>
                )}

                <button
                    className="pagination-button"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                >
                    Next <i className="fas fa-chevron-right"></i>
                </button>
                
                <span className="page-info">
                    Page {currentPage} of {totalPages}
                </span>
            </div>
        );
    };

    // Add this new component inside Activities component
    const Notification = ({ type, message }) => {
        useEffect(() => {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 3000);

            return () => clearTimeout(timer);
        }, []);

        return (
            <div className={`notification ${type}`}>
                <i className={`fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                {message}
            </div>
        );
    };

    // Add this function to handle viewing subtasks
    const handleViewSubtasks = async (activity) => {
        try {
            // If the activity already has subtasks loaded
            if (activity.sub_activities) {
                let subtasks = [];
                
                // Parse the subtasks if they're stored as a string
                if (typeof activity.sub_activities === 'string') {
                    try {
                        subtasks = JSON.parse(activity.sub_activities);
                    } catch (error) {
                        console.error('Error parsing subtasks:', error);
                    }
                } else if (Array.isArray(activity.sub_activities)) {
                    subtasks = activity.sub_activities;
                }
                
                setSubtaskFlow(subtasks);
                setViewingSubtasks(activity);
            } else {
                // Fetch subtasks from backend if not already loaded
                const response = await api.get(`/activity_subtasks/${activity.activity_id}`);
                setSubtaskFlow(response.data || []);
                setViewingSubtasks(activity);
            }
        } catch (error) {
            console.error('Error fetching subtasks:', error);
            setSubtaskFlow([]);
            setViewingSubtasks(activity); // Still show the modal, even if empty
        }
    };

    // Add this function near your other handler functions
    const handleViewUserLogin = (userId) => {
        // This function will be called when the eye icon is clicked for a user login
        try {
            // You could fetch user login details here
            console.log("Viewing user login for ID:", userId);
            
            // For now, we'll just show a similar flow diagram with sample login data
            const loginFlow = [
                { name: "Login", description: "User authentication", time: 0.1 },
                { name: "Session Start", description: "Session initialization", time: 0.2 },
                { name: "Access Control", description: "Permission verification", time: 0.1 },
                { name: "Dashboard Load", description: "Load user dashboard", time: 0.5 }
            ];
            
            setSubtaskFlow(loginFlow);
            setViewingSubtasks({activity_name: "User Login Flow"});
        } catch (error) {
            console.error('Error viewing user login:', error);
        }
    };

    return (
        <div className="activities-container">
            {successMessage && (
                <div className="success-message">
                    <i className="fas fa-check-circle"></i>
                    <span>{successMessage}</span>
                </div>
            )}

            {/* <div className="page-header">
                <h1><i className="fas fa-clipboard-list"></i> Activity Management</h1>
                <p>Create, update, and assign activities to your team members</p>
            </div> */}

            {/* Add a note if we're in the workflow process */}
            {isInWorkflow && (
                <div className="workflow-note">
                    {isInEmployeeAssignmentStep ? (
                        <p className="workflow-message">
                            You're in step 3 of the workflow. Please assign an auditor to an activity to continue.
                        </p>
                    ) : (
                        <p className="workflow-message">
                            You're in step 2 of the workflow. Please create an activity to continue.
                        </p>
                    )}
                </div>
            )}

            {/* Quick Stats Section */}
            <div className="quick-stats-section">
                <div className="stat-card regulatory-stat">
                    <div className="stat-icon">
                        <i className="fas fa-balance-scale"></i>
                    </div>
                    <div className="stat-content">
                        <div className="stat-numbers">
                            <span className="stat-count">{stats.regulatory}</span>
                            <div className="stat-details">
                                <div className="stat-detail">
                                    <span className="detail-dot regulatory"></span>
                                    <span>Regulatory Activities</span>
                                </div>
                            </div>
                        </div>
                        <h3 className="stat-title">Regulatory</h3>
                    </div>
                    <div className="stat-progress">
                        <svg viewBox="0 0 36 36" className="circular-chart">
                            <path className="circle-bg"
                                d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path className="circle regulatory-circle"
                                strokeDasharray={`${stats.total > 0 ? (stats.regulatory / stats.total) * 100 : 0}, 100`}
                                d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                        </svg>
                    </div>
                </div>

                <div className="stat-card internal-stat">
                    <div className="stat-icon">
                        <i className="fas fa-building"></i>
                    </div>
                    <div className="stat-content">
                        <div className="stat-numbers">
                            <span className="stat-count">{stats.internal}</span>
                            <div className="stat-details">
                                <div className="stat-detail">
                                    <span className="detail-dot internal"></span>
                                    <span>Internal Activities</span>
                                </div>
                            </div>
                        </div>
                        <h3 className="stat-title">Internal</h3>
                    </div>
                    <div className="stat-progress">
                        <svg viewBox="0 0 36 36" className="circular-chart">
                            <path className="circle-bg"
                                d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path className="circle internal-circle"
                                strokeDasharray={`${stats.total > 0 ? (stats.internal / stats.total) * 100 : 0}, 100`}
                                d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                        </svg>
                    </div>
                </div>

                <div className="stat-card customer-stat">
                    <div className="stat-icon">
                        <i className="fas fa-users"></i>
                    </div>
                    <div className="stat-content">
                        <div className="stat-numbers">
                            <span className="stat-count">{stats.customer}</span>
                            <div className="stat-details">
                                <div className="stat-detail">
                                    <span className="detail-dot customer"></span>
                                    <span>Client Activities</span>
                                </div>
                            </div>
                        </div>
                        <h3 className="stat-title">Customer</h3>
                    </div>
                    <div className="stat-progress">
                        <svg viewBox="0 0 36 36" className="circular-chart">
                            <path className="circle-bg"
                                d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path className="circle customer-circle"
                                strokeDasharray={`${stats.total > 0 ? (stats.customer / stats.total) * 100 : 0}, 100`}
                                d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="controls-container">
                <div className="search-filter-container">
                    <div className="search-box">
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            placeholder="Search activities..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    
                    <div className="client-dropdown">
                        <select
                            value={selectedClient}
                            onChange={(e) => {
                                const clientId = e.target.value;
                                setSelectedClient(clientId);
                                
                                if (clientId === 'all') {
                                    // Handle "ALL" option - show all activities
                                    setSelectedClientName('All Clients');
                                    setAssignedActivities([]); // Reset assigned activities
                                } else if (clientId) {
                                    // Handle specific client selection
                                    const selectedClient = clients.find(c => c.customer_id === parseInt(clientId));
                                    setSelectedClientName(selectedClient ? selectedClient.customer_name : '');
                                    console.log("Selected client ID:", clientId);
                                    console.log("Selected client name:", selectedClient?.customer_name);
                                    fetchAssignedActivities(clientId);
                                } else {
                                    // Handle empty selection
                                    setAssignedActivities([]);
                                    setSelectedClientName('');
                                }
                            }}
                        >
                            <option value="">Select Client</option>
                            <option value="all">ALL CLIENTS</option>
                            {clients.map(client => (
                                <option key={client.customer_id} value={client.customer_id}>
                                    {client.customer_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Update the filter buttons */}
                    <div className="assignment-filter">
                        <button 
                            className={`filter-btn ${assignmentFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setAssignmentFilter('all')}
                            data-filter="all"
                        >
                            <i className="fas fa-list"></i> All
                        </button>
                        <button 
                            className={`filter-btn ${assignmentFilter === 'assigned' ? 'active' : ''}`}
                            onClick={() => setAssignmentFilter('assigned')}
                            data-filter="assigned"
                        >
                            <i className="fas fa-check-circle"></i> Assigned
                        </button>
                        <button 
                            className={`filter-btn ${assignmentFilter === 'unassigned' ? 'active' : ''}`}
                            onClick={() => setAssignmentFilter('unassigned')}
                            data-filter="unassigned"
                        >
                            <i className="fas fa-clock"></i> Unassigned
                        </button>
                    </div>
                    
                    <div className="view-toggle">
                        <button 
                            className={viewMode === 'grid' ? 'active' : ''} 
                            onClick={() => setViewMode('grid')}
                        >
                            <i className="fas fa-th-large"></i>
                        </button>
                        <button 
                            className={viewMode === 'list' ? 'active' : ''} 
                            onClick={() => setViewMode('list')}
                        >
                            <i className="fas fa-list"></i>
                        </button>
                    </div>
                </div>
                
                <button className="add-button" onClick={() => {
                    setEditingActivity(null);
                    setFormData({
                        activity_name: "",
                        standard_time: "",
                        act_des: "",
                        criticality: "Low",
                        duration: "",
                        role_id: "",
                        frequency: "0",
                        due_by: "",
                        activity_type: "R",
                        // group_id: "",
                        status: "A"
                    });
                    setShowForm(true);
                }}>
                    <i className="fas fa-plus"></i> Add Activity
                </button>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading activities...</p>
                </div>
            ) : !selectedClient ? (
                <div className="empty-state">
                    <i className="fas fa-users"></i>
                    <h3>Select a Client</h3>
                    <p>Please select a client to view their activities</p>
                </div>
            ) : filteredActivities.length > 0 ? (
                <div className={viewMode === 'grid' ? 'activity-grid' : 'activity-list'}>
                    {getCurrentPageActivities().map(activity => (
                        <div 
                            key={activity.activity_id} 
                            className="activity-card"
                            data-priority={activity.criticality || "Low"}
                        >
                            <div className="activity-card-header">
                                <div className="activity-icon">
                                    <i className="fas fa-clipboard-check"></i>
                                </div>
                                <button 
                                    className="eye-btn"
                                    onClick={() => handleViewSubtasks(activity)}
                                    title="View Subtasks Flow"
                                >
                                    <i className="fas fa-eye"></i>
                                </button>
                            </div>
                            
                            <div className="activity-card-body">
                                <h3>{activity.activity_name}</h3>
                                <p className="activity-description">{activity.act_des || 'No description provided'}</p>
                                <div className="activity-details">
                                    <div className="detail-item priority">
                                        <i className="fas fa-exclamation-circle"></i>
                                        <span>Priority</span>
                                        <span className={`priority-badge ${activity.criticality?.toLowerCase() || 'low'}`}>
                                            {activity.criticality || 'Low'}
                                        </span>
                                    </div>
                                    <div className="detail-item warning">
                                        <i className="fas fa-clock"></i>
                                        <span>Early Warning</span>
                                        <span className="warning-days">
                                            {activity.duration || '0'} days
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <i className="fas fa-calendar-alt"></i>
                                        <span>Due by: {activity.due_by || 'Not set'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="activity-card-actions">
                                <button 
                                    className="edit-btn"
                                    onClick={() => handleEdit(activity)}
                                    title="Edit Activity"
                                >
                                    <i className="fas fa-edit"></i>
                                </button>
                                
                                {assignedActivities.includes(String(activity.activity_id)) ? (
                                    <button 
                                        className="status-btn assigned"
                                        disabled
                                        title="Already Assigned"
                                    >
                                        <i className="fas fa-check"></i> Assigned
                                    </button>
                                ) : (
                                    <button 
                                        className="status-btn"
                                        onClick={() => handleStatusClick(activity)}
                                        title="Assign Activity"
                                    >
                                        <i className="fas fa-users"></i> Assign
                                    </button>
                                )}
                                
                                <button 
                                    className="download-btn"
                                    onClick={() => handleDownloadReport(activity.activity_id)}
                                    title="Download Activity Performance Report"
                                >
                                    <i className="fas fa-download"></i>
                                </button>
                                <button 
                                    className="delete-btn"
                                    onClick={() => handleDelete(activity)}
                                    title="Delete Activity"
                                >
                                    <i className="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <i className="fas fa-clipboard"></i>
                    <h3>No activities found</h3>
                    <p>
                        {selectedClient === 'all' 
                            ? 'No activities match your search criteria' 
                            : 'No activities available for the selected client'}
                    </p>
                </div>
            )}

            {filteredActivities.length > activitiesPerPage && <Pagination />}

            {showForm && (
                <div className="modal-overlay">
                    <div className="activity-form-modal">
                        <div className="modal-header">
                            <h2>
                                <i className="fas fa-clipboard-check"></i>
                                {editingActivity ? 'Edit Activity' : 'Add New Activity'}
                            </h2>
                            <button className="close-btn" onClick={() => setShowForm(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="activity_name">Activity Name:</label>
                                <input
                                    type="text"
                                    id="activity_name"
                                    name="activity_name"
                                    value={formData.activity_name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter activity name"
                                />
                            </div>
                            <div className="subtasks-section">
                                <div className="subtasks-header">
                                    <h3>Sub Tasks</h3>
                                    <button 
                                        type="button" 
                                        className="add-subtask-btn" 
                                        onClick={addSubtask}
                                    >
                                        <i className="fas fa-plus"></i> Add Sub Task
                                    </button>
                                </div>
                                
                                {subtasks.length === 0 && (
                                    <div className="no-subtasks">
                                        {/* <p>No subtasks added. Click "Add Sub Task" to add one.</p> */}
                                    </div>
                                )}
                                
                                {subtasks.map((subtask, index) => (
                                    <div key={index} className="subtask-item">
                                        <div className="subtask-header">
                                            <h4>Sub Task #{index + 1}</h4>
                                            <button 
                                                type="button" 
                                                className="remove-subtask-btn"
                                                onClick={() => removeSubtask(index)}
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                        <div className="subtask-fields">
                                            <div className="form-group">
                                                <label>Name:</label>
                                                <input
                                                    type="text"
                                                    value={subtask.name || ''}
                                                    onChange={(e) => handleSubtaskChange(index, 'name', e.target.value)}
                                                    placeholder="Enter subtask name"
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Description:</label>
                                                <textarea
                                                    value={subtask.description || ''}
                                                    onChange={(e) => handleSubtaskChange(index, 'description', e.target.value)}
                                                    placeholder="Enter subtask description"
                                                    rows="2"
                                                ></textarea>
                                            </div>
                                            <div className="form-group">
                                                <label>Time (hours):</label>
                                                <input
                                                    type="number"
                                                    value={subtask.time || ''}
                                                    onChange={(e) => handleSubtaskChange(index, 'time', e.target.value)}
                                                    step="0.1"
                                                    min="0"
                                                    placeholder="Estimated time in hours"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="form-group">
                                <label htmlFor="standard_time">
                                    Estimated Time to complete (in hours):
                                    {subtasks.length > 0 && <span className="auto-calculated"> (auto-calculated)</span>}
                                </label>
                                <input
                                    type="number"
                                    id="standard_time"
                                    name="standard_time"
                                    value={formData.standard_time}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter estimated time"
                                    min="0"
                                    step="0.5"
                                    readOnly={subtasks.length > 0}
                                    className={subtasks.length > 0 ? 'readonly-input' : ''}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="act_des">Activity Description:</label>
                                <textarea
                                    id="act_des"
                                    name="act_des"
                                    value={formData.act_des}
                                    onChange={handleInputChange}
                                    rows="4"
                                    placeholder="Enter activity description"
                                ></textarea>
                            </div>
                            <div className="form-group">
                                <label htmlFor="criticality">Criticality:</label>
                                <select
                                    id="criticality"
                                    name="criticality"
                                    value={formData.criticality}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select criticality</option>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="duration">Early Warning (in days):</label>
                                <input
                                    type="number"
                                    id="duration"
                                    name="duration"
                                    value={formData.duration}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter early warning days"
                                    min="0"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="role_id">Role:</label>
                                <select
                                    id="role_id"
                                    name="role_id"
                                    value={formData.role_id}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select role</option>
                                    <option value="11">Admin</option>
                                    <option value="22">User</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="frequency">Frequency:</label>
                                <select
                                    id="frequency"
                                    name="frequency"
                                    value={formData.frequency}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select frequency</option>
                                    <option value="0">Onetime</option>
                                    <option value="1">Yearly</option>
                                    <option value="12">Monthly</option>
                                    <option value="4">Quarterly</option>
                                    <option value="26">Fortnightly</option>
                                    <option value="52">Weekly</option>
                                    <option value="365">Daily</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="due_by">Due By:</label>
                                <input
                                    type="date"
                                    id="due_by"
                                    name="due_by"
                                    value={formData.due_by}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="activity_type">Activity Type:</label>
                                <select
                                    id="activity_type"
                                    name="activity_type"
                                    value={formData.activity_type}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select type</option>
                                    <option value="R">Regulatory</option>
                                    <option value="I">Internal</option>
                                    <option value="C">Customer</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="status">Status:</label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select status</option>
                                    <option value="A">Active</option>
                                    <option value="O">Obsolete</option>
                                </select>
                            </div>
                            
                            <div className="form-actions">
                                <button type="submit" className="btn-save">
                                    <i className="fas fa-save"></i> {editingActivity ? 'Update Details' : 'Save'}
                                </button>
                                <button 
                                    type="button" 
                                    className="btn-cancel" 
                                    onClick={() => setShowForm(false)}
                                >
                                    <i className="fas fa-times"></i> Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {assignActivity && (
                <AssignActivity 
                    activity={assignActivity} 
                    onClose={closeAssignModal} 
                />
            )}
            
            {showAssignForm && (
                <AssignActivityForm
                    customerId={selectedClient}
                    customerName={selectedClientName}
                    activityId={assigningActivityId}
                    activityName={selectedActivity?.activity_name || ''}
                    onClose={() => setShowAssignForm(false)}
                    onSuccess={handleAssignSuccess}
                    onError={handleAssignError}
                />
            )}
            {/* Add Report Modal */}
            {showReportModal && (
                <div className="modal-overlay">
                    <div className="report-modal">
                        <div className="modal-header">
                            <h2>
                                <i className="fas fa-chart-pie"></i>
                                Activity Report
                                {selectedActivityReport && 
                                    <span> - {selectedActivityReport.activity_name}</span>
                                }
                            </h2>
                            <div className="standard-time">
                            Estimated Time to complete: {standardTime} hours
                            </div>
                            <button 
                                className="close-btn" 
                                onClick={() => setShowReportModal(false)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="report-content">
                            <div className="report-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Auditor ID</th>
                                            <th>Auditor Name</th>
                                            <th>Client Name</th>
                                            <th>Task Name</th>
                                            <th>Time Taken</th>
                                            <th>Date of Completion</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.map(task => {
                                            const status = 
                                                task.time_taken === standardTime ? 'ON-TIME' :
                                                task.time_taken < standardTime ? 'EARLY' : 'DELAY';
                                            
                                            return (
                                                <tr 
                                                    key={`${task.employee_id}-${task.customer_name}`}
                                                    className={selectedStatus === status ? 'highlighted' : ''}
                                                >
                                                    <td>{task.employee_id}</td>
                                                    <td>{task.name}</td>
                                                    <td>{task.customer_name}</td>
                                                    <td>{selectedActivityReport?.activity_name}</td>
                                                    <td>{task.time_taken}</td>
                                                    <td>{task.completion_date}</td>
                                                    <td className={`status-${status.toLowerCase()}`}>
                                                        {status}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="report-chart">
                                <PieChart
                                    data={[
                                        {
                                            title: 'ON-TIME',
                                            value: reportData.filter(t => t.time_taken === standardTime).length,
                                            color: '#2ecc71'
                                        },
                                        {
                                            title: 'EARLY',
                                            value: reportData.filter(t => t.time_taken < standardTime).length,
                                            color: '#3498db'
                                        },
                                        {
                                            title: 'DELAY',
                                            value: reportData.filter(t => t.time_taken > standardTime).length,
                                            color: '#e74c3c'
                                        }
                                    ]}
                                    onSegmentClick={handlePieSegmentClick}
                                    selectedSegment={selectedStatus}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add notification component */}
            {notification && (
                <Notification 
                    type={notification.type} 
                    message={notification.message} 
                />
            )}

            {showSuccessPopup && (
                <div className="modal-overlay" style={{ 
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(3px)'
                }}>
                    <div style={{
                        backgroundColor: '#1e1e1e',
                        padding: '20px',
                        borderRadius: '8px',
                        color: 'white',
                        textAlign: 'center',
                        minWidth: '300px',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        <h3 style={{ marginBottom: '20px' }}>Activity added successfully</h3>
                        <button 
                            onClick={() => setShowSuccessPopup(false)}
                            style={{
                                padding: '8px 24px',
                                borderRadius: '20px',
                                border: 'none',
                                backgroundColor: '#deb887',
                                color: 'black',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmModal && (
                <div className="modal-overlay">
                    <div className="modal-content delete-confirm-modal">
                        <div className="modal-header">
                            <h2>
                                <i className="fas fa-exclamation-triangle"></i>
                                Confirm Deletion
                            </h2>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowDeleteConfirmModal(false);
                                    setItemToDelete(null);
                                }}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="confirmation-message">
                            <p>
                                <span className="message-line">
                                    <i className="fas fa-exclamation-circle"></i>
                                    Are you sure you want to delete activity <strong>{itemToDelete?.name}</strong>?
                                </span>
                                <span className="message-line">
                                    <i className="fas fa-info-circle"></i>
                                    This action cannot be undone.
                                </span>
                            </p>
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
                                    <i className="fas fa-trash-alt"></i>
                                    {isDeleting ? 'Deleting...' : 'Delete Activity'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add the subtask flow modal */}
            {viewingSubtasks && (
                <div className="modal-overlay">
                    <div className="subtask-flow-modal">
                        <div className="modal-header">
                            <h2>
                                <i className="fas fa-tasks"></i>
                                Subtask Flow for {viewingSubtasks.activity_name}
                            </h2>
                            <button 
                                className="close-btn" 
                                onClick={() => setViewingSubtasks(null)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="subtask-flow-content">
                            {subtaskFlow.length > 0 ? (
                                <div className="flow-diagram">
                                    <div className="subtask-flow">
                                        {/* Start Point */}
                                        <div className="flow-endpoint start-point">
                                            <div className="endpoint-circle">
                                                <i className="fas fa-play"></i>
                                            </div>
                                            <div className="endpoint-label">Start</div>
                                        </div>
                                        
                                        {/* First connector */}
                                        <div className="flow-connector"></div>
                                        
                                        {/* Subtask Nodes */}
                                        <div className="subtask-nodes">
                                            {subtaskFlow.map((subtask, index) => (
                                                <React.Fragment key={index}>
                                                    {index > 0 && (
                                                        <div className={`flow-connector ${(index % 4 === 0) ? 'turn-connector' : ''}`}></div>
                                                    )}
                                                    <div className="subtask-item">
                                                        <div className="subtask-node">
                                                            <div className="subtask-number">{index + 1}</div>
                                                            <div className="subtask-content">
                                                                <div className="subtask-title">{subtask.name}</div>
                                                                <div className="subtask-description">
                                                                    {subtask.description || "No description provided"}
                                                                </div>
                                                                <div className="subtask-time">
                                                                    <i className="fas fa-clock"></i>
                                                                    {subtask.time || 0} hours
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                        
                                        {/* Final connector */}
                                        <div className="flow-connector"></div>
                                        
                                        {/* End Point */}
                                        <div className="flow-endpoint end-point">
                                            <div className="endpoint-circle">
                                                <i className="fas fa-stop"></i>
                                            </div>
                                            <div className="endpoint-label">End</div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="no-subtasks-message">
                                    <i className="fas fa-info-circle"></i>
                                    <p>No subtasks defined for this activity.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Add PieChart component
const PieChart = ({ data, onSegmentClick, selectedSegment }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;

    return (
        <div className="pie-chart-container">
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
            <div className="pie-chart-legend">
                {data.map(item => (
                    <div 
                        key={item.title} 
                        className={`legend-item ${selectedSegment === item.title ? 'selected' : ''}`}
                        onClick={() => onSegmentClick(item.title)}
                    >
                        <span className="color-box" style={{ backgroundColor: item.color }}></span>
                        <span className="label">{item.title} ({item.value})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Activities;