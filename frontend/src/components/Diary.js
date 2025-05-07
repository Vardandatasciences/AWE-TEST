import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { format, parse } from 'date-fns';
import { useNavigate } from 'react-router-dom';

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
 
const Diary = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();
  const role_id = localStorage.getItem('role_id');
  const actor_id = localStorage.getItem('actor_id')
  console.log("User Role ID:", role_id);
  console.log("User User ID:", actor_id)
  const [taskNames, setTaskNames] = useState({});
  const [subtasks, setSubtasks] = useState({});

  const emptyEntry = {
    date: new Date(),
    start_time: null,
    end_time: null,
    task: '',
    subtask: '',
    remarks: ''
  };
  useEffect(() => {
    let actorId = localStorage.getItem('actor_id');

    if (!actorId) {
        console.warn("⚠️ No actor ID found in localStorage, setting default...");
        localStorage.setItem('actor_id', '1020'); // Set a default for testing
        actorId = '1020';
    }

    console.log("🚀 Actor ID found:", actorId);
    fetchWIPTasks();
    fetchEntries(actorId);
}, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await fetchWIPTasks(); // Use the existing function
        
        // Then fetch entries
        const actorId = localStorage.getItem('actor_id');
        const token = localStorage.getItem('token');
        const entriesResponse = await axios.get('http://localhost:5000/diary/entries', {
          params: { actor_id: actorId },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        console.log(entriesResponse)
        
        const formattedEntries = entriesResponse.data.map(entry => ({
          ...entry,
          date: entry.date ? new Date(entry.date) : null,
          start_time: entry.start_time ? parse(entry.start_time, 'HH:mm', new Date()) : null,
          end_time: entry.end_time ? parse(entry.end_time, 'HH:mm', new Date()) : null
        }));
        
        setEntries(formattedEntries);
        
        // Fetch task details for all task IDs in entries
        const taskDetailsMap = {};
        for (const entry of formattedEntries) {
          if (entry.task && !taskDetailsMap[entry.task]) {
            const taskDetails = await fetchTaskDetails(entry.task);
            if (taskDetails) {
              taskDetailsMap[entry.task] = taskDetails.task_name;
            }
          }
        }
        setTaskNames(taskDetailsMap);
        
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, []);

  useEffect(() => {
    const loadMissingTaskDetails = async () => {
      const missingTaskIds = entries
        .filter(entry => entry.task && !taskNames[entry.task])
        .map(entry => entry.task);
        
      if (missingTaskIds.length === 0) return;
      
      // Create a unique list of missing task IDs
      const uniqueMissingIds = [...new Set(missingTaskIds)];
      
      // Fetch each missing task detail
      const taskDetailsMap = { ...taskNames };
      for (const taskId of uniqueMissingIds) {
        const taskDetails = await fetchTaskDetails(taskId);
        if (taskDetails) {
          taskDetailsMap[taskId] = taskDetails.task_name;
        }
      }
      
      setTaskNames(taskDetailsMap);
    };
    
    loadMissingTaskDetails();
  }, [entries]);

  useEffect(() => {
    const loadMissingTaskDetails = async () => {
      const tasksNeedingDetails = entries
        .filter(entry => entry.task && !taskNames[entry.task])
        .map(entry => entry.task);
        
      if (tasksNeedingDetails.length === 0) return;
      
      const uniqueTaskIds = [...new Set(tasksNeedingDetails)];
      
      console.log(`Loading details for ${uniqueTaskIds.length} missing tasks`);
      
      const newTaskNames = { ...taskNames };
      for (const taskId of uniqueTaskIds) {
        try {
          const taskDetails = await fetchTaskDetails(taskId);
          if (taskDetails) {
            newTaskNames[taskId] = taskDetails.task_name;
          }
        } catch (error) {
          console.error(`Failed to load details for task ${taskId}`, error);
        }
      }
      
      setTaskNames(newTaskNames);
    };
    
    loadMissingTaskDetails();
  }, [entries, taskNames]);

  useEffect(() => {
    // Load subtasks when task selection changes
    const loadSubtasks = async () => {
      const tasksNeedingSubtasks = entries
        .filter(entry => entry.task && !subtasks[entry.task])
        .map(entry => entry.task);
        
      if (tasksNeedingSubtasks.length === 0) return;
      
      const uniqueTaskIds = [...new Set(tasksNeedingSubtasks)];
      
      const newSubtasks = { ...subtasks };
      for (const taskId of uniqueTaskIds) {
        try {
          const response = await axios.get(`http://localhost:5000/diary/activity-subtasks`, {
            params: { task_id: taskId },
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          });
          
          if (response.data.subtasks) {
            newSubtasks[taskId] = response.data.subtasks;
          }
        } catch (error) {
          console.error(`Failed to load subtasks for task ${taskId}`, error);
        }
      }
      
      setSubtasks(newSubtasks);
    };
    
    loadSubtasks();
  }, [entries]);

  const handleTaskChange = async (index, taskId) => {
    const updatedEntries = [...entries];
    updatedEntries[index].task = taskId;
    updatedEntries[index].subtask = ''; // Reset subtask when task changes
    setEntries(updatedEntries);
    
    // Fetch subtasks if not already loaded
    if (!subtasks[taskId]) {
      try {
        const response = await axios.get(`http://localhost:5000/diary/activity-subtasks`, {
          params: { task_id: taskId },
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        if (response.data.subtasks) {
          setSubtasks({
            ...subtasks,
            [taskId]: response.data.subtasks
          });
        }
      } catch (error) {
        console.error(`Failed to load subtasks for task ${taskId}`, error);
      }
    }
  };

  const handleAddEntry = async () => {
    const token = localStorage.getItem('token');
    const actorId = localStorage.getItem('actor_id');

    if (!token || !actorId) {
        console.error("🔴 No authentication token or actor_id found in localStorage");
        alert("Session expired. Please log in again.");
        navigate('/login');
        return;
    }

    console.log('Fetching WIP tasks before adding new entry...');
    
    try {
        // Call fetchWIPTasks first to ensure tasks are loaded
        await fetchWIPTasks();
        
        // Now create the new entry
        const newEntry = {
            id: Date.now(), // Temporary ID for frontend tracking
            actor_id: actorId, // Ensure actor_id is set
            date: new Date(),
            start_time: null,
            end_time: null,
            task: tasks.length > 0 ? tasks[0].task_id : '',
            subtask: '', // Add this line to initialize subtask field
            remarks: ''
        };

        console.log("Adding new entry:", newEntry);
        setEntries(prev => [...prev, newEntry]);
    } catch (error) {
        console.error('🔴 Error adding entry:', error);
        alert("Failed to add entry. Please try again.");
    }
};

  const handleSaveEntries = async () => {
    try {
      const token = localStorage.getItem('token');
      const actorId = localStorage.getItem('actor_id');
      
      if (!actorId) {
        console.error("No actor ID found when trying to save entries");
        alert("Unable to save entries: No user ID found");
        return;
      }
      
      console.log("Saving entries for actor ID:", actorId);
      
      // Format entries for saving
      const formattedEntries = entries.map(entry => {
        console.log("Processing entry:", entry);
        return {
          ...entry,
          actor_id: actorId, // Ensure actor_id is set for each entry
          date: entry.date ? format(entry.date, 'yyyy-MM-dd') : null,
          start_time: entry.start_time ? format(entry.start_time, 'HH:mm') : null,
          end_time: entry.end_time ? format(entry.end_time, 'HH:mm') : null,
          subtask: entry.subtask || '' // Include subtask field
        };
      });
      
      console.log("Formatted entries to save:", formattedEntries);
      
      const saveResponse = await axios.post('http://localhost:5000/diary/save',
        {
          entries: formattedEntries,
          actor_id: actorId
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );
      
      console.log("Save response:", saveResponse);
      
      if (saveResponse.status === 200) {
        // Show success message
        setSuccessMessage("All diary entries saved successfully!");
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
        
        // Refresh entries after save
        const response = await axios.get('http://localhost:5000/diary/entries', {
          params: { actor_id: actorId },
          headers: { 'Authorization': `Bearer ${token}` },
          withCredentials: true
        });
        
        const updatedEntries = response.data.map(entry => ({
          ...entry,
          date: entry.date ? new Date(entry.date) : null,
          start_time: entry.start_time ? parse(entry.start_time, 'HH:mm', new Date()) : null,
          end_time: entry.end_time ? parse(entry.end_time, 'HH:mm', new Date()) : null
        }));
        
        setEntries(updatedEntries);
        
        // Also refresh task details
        const taskDetailsMap = { ...taskNames };
        for (const entry of updatedEntries) {
          if (entry.task && !taskDetailsMap[entry.task]) {
            const taskDetails = await fetchTaskDetails(entry.task);
            if (taskDetails) {
              taskDetailsMap[entry.task] = taskDetails.task_name;
            }
          }
        }
        setTaskNames(taskDetailsMap);
      } else {
        console.error("Unexpected response when saving entries:", saveResponse);
        alert("Error saving entries. Please try again.");
      }
    } catch (error) {
      console.error('Error saving entries:', error);
      alert("Failed to save entries: " + (error.response?.data?.message || error.message));
    }
  };
 
  const handleDeleteConfirmation = (entry) => {
    setSelectedEntry(entry);
    setDeleteDialogOpen(true);
  };
 
  const handleDelete = async () => {
    if (selectedEntry) {
      try {
        if (selectedEntry.id > 0) {
          const actorId = localStorage.getItem('actor_id');
          const token = localStorage.getItem('token');
          await axios.delete(`http://localhost:5000/diary/entries/${selectedEntry.id}?actor_id=${actorId}`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          });
        }
        setEntries(entries.filter(entry => entry.id !== selectedEntry.id));
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
    setDeleteDialogOpen(false);
  };
 
  const fetchWIPTasks = async () => {
    try {
        const token = localStorage.getItem('token');
        const actorId = localStorage.getItem('actor_id');

        if (!actorId) {
            console.error("🔴 No actor_id found in localStorage");
            return;
        }

        console.log("📌 Fetching WIP tasks for actor_id:", actorId);

        const response = await axios.get(`http://localhost:5000/diary/wip-tasks`, {
            params: { actor_id: actorId },
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            withCredentials: true  // Important for CORS credentials
        });

        if (response.status === 200) {
            setTasks(response.data);
            console.log("🟢 WIP Tasks fetched:", response.data);
        } else {
            console.error("⚠️ Unexpected response:", response);
        }
    } catch (error) {
        console.error("🔴 Error fetching WIP tasks:", error);
    }
};

const fetchTaskDetails = async (taskId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`http://localhost:5000/diary/task-details`, {
      params: { task_id: taskId },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true
    });
    
    if (response.status === 200) {
      return response.data;
    }
  } catch (error) {
    console.error(`Error fetching details for task ${taskId}:`, error);
  }
  return null;
};

const fetchEntries = async (actorId) => {
  try {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    console.log("Fetching entries for actor ID:", actorId);
    
    const response = await axios.get('http://localhost:5000/diary/entries', {
      params: { actor_id: actorId },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    if (response.status === 200) {
      console.log("Entries fetched successfully:", response.data);
      
      // Format dates and times for each entry
      const formattedEntries = response.data.map(entry => ({
        ...entry,
        date: entry.date ? new Date(entry.date) : null,
        start_time: entry.start_time ? parse(entry.start_time, 'HH:mm', new Date()) : null,
        end_time: entry.end_time ? parse(entry.end_time, 'HH:mm', new Date()) : null,
        subtask: entry.subtask || '' // Ensure subtask is always defined
      }));
      
      setEntries(formattedEntries);
      
      // Also trigger loading task details and subtasks for these entries
      const taskIds = [...new Set(formattedEntries.filter(e => e.task).map(e => e.task))];
      console.log("Need to load details for task IDs:", taskIds);
      
      // Load task names
      const newTaskNames = { ...taskNames };
      for (const taskId of taskIds) {
        if (!newTaskNames[taskId]) {
          try {
            const taskDetails = await fetchTaskDetails(taskId);
            if (taskDetails) {
              newTaskNames[taskId] = taskDetails.task_name;
            }
          } catch (error) {
            console.error(`Failed to load details for task ${taskId}`, error);
          }
        }
      }
      setTaskNames(newTaskNames);
      
      // Load subtasks for these tasks
      const newSubtasks = { ...subtasks };
      for (const taskId of taskIds) {
        if (!newSubtasks[taskId]) {
          try {
            const subtaskResponse = await axios.get(`http://localhost:5000/diary/activity-subtasks`, {
              params: { task_id: taskId },
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              withCredentials: true
            });
            
            if (subtaskResponse.data.subtasks) {
              newSubtasks[taskId] = subtaskResponse.data.subtasks;
            }
          } catch (error) {
            console.error(`Failed to load subtasks for task ${taskId}`, error);
          }
        }
      }
      setSubtasks(newSubtasks);
    }
  } catch (error) {
    console.error("Error fetching entries:", error);
    // Still show UI without existing entries
    setEntries([]);
  } finally {
    setLoading(false);
  }
};

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div style={{ padding: '20px' }}>
        <style>
          {`
            @keyframes slideInRight {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
          `}
        </style>
        
        {/* Success Message Popup */}
        {successMessage && (
          <div 
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              backgroundColor: '#4caf50',
              color: 'white',
              padding: '15px 20px',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'slideInRight 0.5s ease-out'
            }}
          >
            <i className="fas fa-check-circle" style={{ fontSize: '1.2rem' }}></i>
            {successMessage}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <Button variant="contained" color="primary" onClick={handleAddEntry}>
            Add Diary Entry
          </Button>
          <Button variant="contained" color="success" onClick={handleSaveEntries}>
            Save Entries
          </Button>
        </div>
 
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ width: '3%' }}>Serial No.</TableCell>
                <TableCell style={{ width: '12%' }}>Date</TableCell>
                <TableCell style={{ width: '10%' }}>Start Time</TableCell>
                <TableCell style={{ width: '10%' }}>End Time</TableCell>
                <TableCell style={{ width: '20%' }}>Task</TableCell>
                <TableCell style={{ width: '20%' }}>Sub Task</TableCell>
                <TableCell style={{ width: '25%' }}>Remarks</TableCell>
                <TableCell style={{ width: '5%' }}>Remove</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
  {entries.map((entry, index) => (
    <TableRow key={entry.id}>
      <TableCell style={{ width: '3%' }}>{index + 1}</TableCell>
      <TableCell style={{ width: '12%' }}>
        <DatePicker
          value={entry.date}
          onChange={(newDate) => {
            const updatedEntries = [...entries];
            updatedEntries[index].date = newDate;
            setEntries(updatedEntries);
          }}
          slotProps={{
            textField: { size: "small", style: { width: '100%' } }
          }}
        />
      </TableCell>
      <TableCell style={{ width: '10%' }}>
        <TimePicker
          value={entry.start_time}
          onChange={(newTime) => {
            const updatedEntries = [...entries];
            updatedEntries[index].start_time = newTime;
            setEntries(updatedEntries);
          }}
          slotProps={{
            textField: { size: "small", style: { width: '100%' } }
          }}
        />
      </TableCell>
      <TableCell style={{ width: '10%' }}>
        <TimePicker
          value={entry.end_time}
          onChange={(newTime) => {
            const updatedEntries = [...entries];
            updatedEntries[index].end_time = newTime;
            setEntries(updatedEntries);
          }}
          slotProps={{
            textField: { size: "small", style: { width: '100%' } }
          }}
        />
      </TableCell>
      <TableCell style={{ width: '20%' }}>
        {entry.task ? (
          <Select
            value={entry.task}
            onChange={(e) => handleTaskChange(index, e.target.value)}
            fullWidth
            size="small"
            displayEmpty
            renderValue={() => {
              if (taskNames[entry.task]) {
                return taskNames[entry.task];
              }
              return "Loading task details...";
            }}
          >
            {!tasks.some(task => task.task_id === entry.task) && taskNames[entry.task] && (
              <MenuItem key={`current-${entry.task}`} value={entry.task}>
                {taskNames[entry.task]} (current)
              </MenuItem>
            )}
            
            {tasks && tasks.length > 0 ? (
              tasks.map((task) => (
                <MenuItem key={task.task_id} value={task.task_id}>
                  {task.task_name}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>No other WIP tasks available</MenuItem>
            )}
          </Select>
        ) : (
          <Select
            value={entry.task || ''}
            onChange={(e) => handleTaskChange(index, e.target.value)}
            fullWidth
            size="small"
            displayEmpty
          >
            <MenuItem value="" disabled>Select a task</MenuItem>
            {tasks && tasks.length > 0 ? (
              tasks.map((task) => (
                <MenuItem key={task.task_id} value={task.task_id}>
                  {task.task_name}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>No WIP tasks available</MenuItem>
            )}
          </Select>
        )}
      </TableCell>
      <TableCell style={{ width: '20%' }}>
        {entry.task && subtasks[entry.task] ? (
          <Select
            value={entry.subtask || ''}
            onChange={(e) => {
              const updatedEntries = [...entries];
              updatedEntries[index].subtask = e.target.value;
              setEntries(updatedEntries);
            }}
            fullWidth
            size="small"
            displayEmpty
          >
            <MenuItem value="" disabled>Select a sub task</MenuItem>
            {Array.isArray(subtasks[entry.task]) ? 
              subtasks[entry.task].map((subtask, i) => (
                <MenuItem key={i} value={typeof subtask === 'object' ? JSON.stringify(subtask) : subtask}>
                  {typeof subtask === 'object' ? 
                    (subtask.name || subtask.description || JSON.stringify(subtask)) : 
                    subtask}
                </MenuItem>
              )) : 
              <MenuItem disabled>Invalid subtask format</MenuItem>
            }
          </Select>
        ) : (
          <TextField
            disabled
            value={entry.task ? "No subtasks available" : "Select a task first"}
            fullWidth
            size="small"
          />
        )}
      </TableCell>
      <TableCell style={{ width: '25%' }}>
        <TextField
          value={entry.remarks || ''}
          onChange={(e) => {
            const updatedEntries = [...entries];
            updatedEntries[index].remarks = e.target.value;
            setEntries(updatedEntries);
          }}
          fullWidth
          size="small"
        />
      </TableCell>
      <TableCell style={{ width: '5%' }}>
        <IconButton onClick={() => handleDeleteConfirmation(entry)} color="error" size="small">
          <DeleteIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  ))}
</TableBody>

          </Table>
        </TableContainer>
 
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this diary entry?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} color="error" autoFocus>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </LocalizationProvider>
  );
};
 
export default Diary;
 
 