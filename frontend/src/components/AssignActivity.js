import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AssignActivity.css";

const AssignActivity = ({ activityId, onClose }) => {
  const [assignees, setAssignees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [frequency, setFrequency] = useState(""); 
  const actor_id = localStorage.getItem('actor_id');
  const actor_name= localStorage.getItem('actor_name');
  console.log("User User ID:", actor_id);
  console.log("User User Name:", actor_name)


  useEffect(() => {
    const actorId = localStorage.getItem("actor_id");
    const actorName = localStorage.getItem("actor_name");

    if (!actorId || !actorName) {
        console.warn("⚠️ Local Storage values are missing! Ensure they are set properly.");
    } else {
        console.log("✅ Retrieved from Local Storage: ", { actorId, actorName });
    }
  }, []);


  useEffect(() => {
    // Fetch assignees from the actors table with full URL
    axios.get("http://127.0.0.1:5000/actors_assign")
    .then(response => {
      console.log("🔹 Raw API Response:", response);
      
      if (Array.isArray(response.data)) {
        const filteredAssignees = response.data.filter(actor => {
          console.log(`Checking actor: ${actor.actor_name}, role_id: ${actor.role_id}`);
          return actor.role_id !== 11;
        });

        console.log("✅ Filtered Assignees:", filteredAssignees);
        setAssignees(filteredAssignees); // Set the filtered data
      } else {
        console.error("❌ API response is not an array:", response.data);
        setAssignees([]); // Set empty array if response is not an array
      }
    })
    .catch(error => {
      console.error("❌ Error fetching assignees:", error);
      setAssignees([]); // Set empty array on error
    });

    // Fetch customers from the customers table with full URL
    axios.get("http://127.0.0.1:5000/customers_assign")
      .then(response => {
        console.log("Customer response:", response);
        if (Array.isArray(response.data)) {
          setCustomers(response.data);
        } else {
          console.error("Customer data not an array:", response.data);
          setCustomers([]);
        }
      })
      .catch(error => {
        console.error("Error fetching customers:", error);
        setCustomers([]);
      });
  }, []);

  useEffect(() => {
    if (activityId) {
      axios.get(`http://127.0.0.1:5000/get_frequency/${activityId}`)
        .then(response => {
          if (response.data && response.data.frequency) {
            setFrequency(response.data.frequency);
          } else {
            console.warn("Frequency not found, using default value.");
            setFrequency("Unknown");
          }
        })
        .catch(error => {
          console.error("Error fetching frequency:", error);
          setFrequency("Unknown");  // Set default if API fails
        });
    }
  }, [activityId]);
  

  const handleAssign = () => {
    if (!selectedAssignee || !selectedCustomer) {
      alert("Please select both an assignee and a customer.");
      return;
    }
  
    // Retrieve assigning user's info from local storage
    const actor_id = localStorage.getItem("actor_id");
    const actor_name = localStorage.getItem("actor_name");
  
    console.log("Assigning activity...");
    console.log("Assigned by (Local Storage):", actor_id, actor_name);
  
    const assignmentData = {
      activity_id: activityId,
      assignee_id: selectedAssignee,
      customer_id: selectedCustomer,
      actor_id: actor_id,
      actor_name: actor_name
    };
  
    axios.post("http://127.0.0.1:5000/assign_activity", assignmentData)
      .then(response => {
        alert(`Activity assigned successfully by ${actor_name}`);
        onClose();
      })
      .catch(error => {
        console.error("Error assigning activity:", error);
        alert("Failed to assign activity.");
      });
  };
  

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2 className="modal-title">Assign Activity</h2>
        
        <div className="modal-body">
          <div className="form-group">
            <label>Assign To:</label>
            <div className="custom-select">
              <select value={selectedAssignee} onChange={e => setSelectedAssignee(e.target.value)}>
                <option value="">Select Assignee</option>
                {assignees.map((actor) => {
                  console.log("Rendering in dropdown:", actor);
                  return (
                    <option key={actor.actor_id} value={actor.actor_id}>
                      {actor.actor_name}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Select Customer:</label>
            <div className="custom-select">
              <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.customer_id} value={customer.customer_id}>
                    {customer.customer_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn btn-assign" onClick={handleAssign}>Assign</button>
        </div>
      </div>
    </div>
  );
};

export default AssignActivity;