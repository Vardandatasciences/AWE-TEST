import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AssignActivityForm.css';
 
const AssignActivityForm = ({ customerId, activityId, activityName, customerName, onClose, onSuccess, onError }) => {
    const [formData, setFormData] = useState({
        assignTo: '',
        reviewer: '',
        status: 'Yet to Start',
        link: '',
        remarks: '',
        frequency: '1', // Default to Yearly
        selectedClient: customerId // Add this new field
    });
    const [employees, setEmployees] = useState([]);
    const [reviewers, setReviewers] = useState([]); // Add state for reviewers
    const [clients, setClients] = useState([]); // Add state for clients
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const actor_id = localStorage.getItem('actor_id');
    const actor_name = localStorage.getItem('actor_name');
    console.log("User User ID:", actor_id);
    console.log("User User Name:", actor_name)
 
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load clients
                const clientsResponse = await axios.get('/customers');
                setClients(clientsResponse.data);
               
                // Load employees first
                const employeesResponse = await axios.get('/actors_assign');
                setEmployees(employeesResponse.data);
               
                // Load reviewers
                const reviewersResponse = await axios.get('http://127.0.0.1:5000/reviewers');
                setReviewers(reviewersResponse.data);
                console.log("Loaded reviewers:", reviewersResponse.data);
               
                // Set default assignee if employees exist
                if (employeesResponse.data.length > 0) {
                    setFormData(prev => ({
                        ...prev,
                        assignTo: employeesResponse.data[0].actor_name
                    }));
                }
               
                // Try to fetch frequency, but don't fail if it doesn't work
                try {
                    console.log(`Trying to fetch frequency for activity ID: ${activityId}`);
                    const frequencyResponse = await axios.get(`http://127.0.0.1:5000/get_frequency/${activityId}`);
                   
                    if (frequencyResponse.data && frequencyResponse.data.frequency !== undefined) {
                        const freqValue = String(frequencyResponse.data.frequency);
                        console.log(`Received frequency value: ${freqValue}`);
                        setFormData(prev => ({
                            ...prev,
                            frequency: freqValue
                        }));
                    } else {
                        console.warn("Frequency data was missing or undefined, using default");
                        setFormData(prev => ({
                            ...prev,
                            frequency: "1" // Default to yearly
                        }));
                    }
                } catch (freqError) {
                    console.warn(`Could not fetch frequency from API: ${freqError}`);
                    // Set default value on error
                    setFormData(prev => ({
                        ...prev,
                        frequency: "1" // Default to yearly
                    }));
                }
               
                setLoading(false);
            } catch (err) {
                console.error('Error loading data:', err);
                setError('Failed to load necessary data');
                setLoading(false);
            }
        };
       
        loadData();
    }, [activityId]);
 
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };
 
    const getFrequencyLabel = (value) => {
        const frequencyMap = {
            "0": "Onetime",
            "1": "Yearly",
            "12": "Monthly",
            "4": "Quarterly",
            "26": "Fortnightly",
            "52": "Weekly",
            "365": "Daily",
            "3": "Every 4 Months",
            "6": "Every 2 Months"
        };
        return frequencyMap[value] || "Unknown";
    };
   
    const handleSubmit = async (e) => {
        e.preventDefault();
       
        try {
            // Get the actor ID and actor name, or use default values
            const current_actor_id = localStorage.getItem('actor_id') || '1';
            const current_actor_name = localStorage.getItem('actor_name') || 'System';
            
            const formDataToSend = new FormData();
            formDataToSend.append('task_name', activityId);
            formDataToSend.append('assigned_to', formData.assignTo);
            formDataToSend.append('reviewer', formData.reviewer);
            formDataToSend.append('customer_id', formData.selectedClient); // Use selected client
            formDataToSend.append('remarks', formData.remarks);
            formDataToSend.append('link', formData.link);
            formDataToSend.append('frequency', formData.frequency);
            formDataToSend.append('status', formData.status);
            formDataToSend.append('actor_id', current_actor_id);
            formDataToSend.append('actor_name', current_actor_name);
           
            console.log("Sending form data:", {
                task_name: activityId,
                assigned_to: formData.assignTo,
                reviewer: formData.reviewer,
                customer_id: formData.selectedClient,
                actor_id: current_actor_id,
                actor_name: current_actor_name
            });
           
            const response = await axios.post('http://127.0.0.1:5000/assign_activity', formDataToSend);
           
            if (response.data.success) {
                onSuccess(response.data);
            } else {
                onError({ response: { data: { message: response.data.message || 'Failed to assign activity' } } });
            }
        } catch (error) {
            console.error('Error assigning activity:', error);
            onError(error);
        }
    };
 
    if (loading) {
        return (
            <div className="assign-form-modal">
                <div className="assign-form-container">
                    <div className="loading-spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }
 
    return (
        <div className="assign-form-modal">
            <div className="assign-form-container">
                <h2>Assign Activity</h2>
               
                <div className="client-info">
                    <span className="label">Client:</span>
                    <span className="value">{customerName}</span>
                </div>
               
                {error && (
                    <div className="error-message">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{error}</span>
                    </div>
                )}
               
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Client:</label>
                        <select
                            name="selectedClient"
                            value={formData.selectedClient}
                            onChange={handleInputChange}
                            required
                            className="client-select"
                        >
                            <option value="">Select Client</option>
                            {clients.map(client => (
                                <option
                                    key={client.customer_id}
                                    value={client.customer_id}
                                    selected={client.customer_id === customerId}
                                >
                                    {client.customer_name}
                                </option>
                            ))}
                        </select>
                    </div>
                   
                    <div className="form-group">
                        <label>Assign To:</label>
                        <select
                            name="assignTo"
                            value={formData.assignTo}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Select Assignee</option>
                            {employees.map(emp => (
                                <option key={emp.actor_id} value={emp.actor_name}>
                                    {emp.actor_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="form-group">
                        <label>Reviewer:</label>
                        <select
                            name="reviewer"
                            value={formData.reviewer}
                            onChange={handleInputChange}
                        >
                            <option value="">Select Reviewer (Optional)</option>
                            {reviewers.map(reviewer => (
                                <option key={reviewer.actor_id} value={reviewer.actor_name}>
                                    {reviewer.actor_name}
                                </option>
                            ))}
                        </select>
                    </div>
                   
                    <div className="form-group">
                        <label>Status:</label>
                        <div className="status-field">
                            Yet to Start
                        </div>
                    </div>
                   
                    <div className="form-group">
                        <label>Link (Optional):</label>
                        <input
                            type="text"
                            name="link"
                            value={formData.link}
                            onChange={handleInputChange}
                            placeholder="Enter link"
                        />
                    </div>
                   
                    <div className="form-group">
                        <label>Remarks (Optional):</label>
                        <textarea
                            name="remarks"
                            value={formData.remarks}
                            onChange={handleInputChange}
                            placeholder="Enter remarks"
                            rows="3"
                        ></textarea>
                    </div>
                   
                    <div className="form-group">
                        <label>Frequency:</label>
                        <input
                            type="text"
                            name="frequency"
                            value={getFrequencyLabel(formData.frequency)}
                            readOnly
                            className="read-only-input"
                        />
                    </div>
                   
                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-assign">
                            Assign
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
 
export default AssignActivityForm;