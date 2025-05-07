import React, { createContext, useContext, useState, useEffect } from 'react';

// Default workflow steps
const defaultWorkflowSteps = [
  {
    id: 1,
    title: 'Create Client',
    description: 'Add a new client to the system',
    status: 'in-progress',
    path: '/employee'
  },
  {
    id: 2,
    title: 'Create Activity',
    description: 'Create a new activity',
    status: 'pending',
    path: '/activities'
  },
  {
    id: 3,
    title: 'Assign Auditor',
    description: 'Assign an auditor to an activity',
    status: 'pending',
    path: '/activities'  // Changed from /employee to /activities
  }
];

// Create the context
const WorkflowContext = createContext();

// Custom hook to use the workflow context
export const useWorkflow = () => useContext(WorkflowContext);

// Provider component
export const WorkflowProvider = ({ children }) => {
  // Initialize state from localStorage or use default
  const [workflowSteps, setWorkflowSteps] = useState(() => {
    const savedSteps = localStorage.getItem('workflowSteps');
    return savedSteps ? JSON.parse(savedSteps) : defaultWorkflowSteps;
  });

  // Save to localStorage whenever workflowSteps changes
  useEffect(() => {
    localStorage.setItem('workflowSteps', JSON.stringify(workflowSteps));
  }, [workflowSteps]);

  // Mark a step as completed and update the next step
  const completeStep = (stepId) => {
    setWorkflowSteps(prevSteps => {
      const updatedSteps = prevSteps.map(step => {
        if (step.id === stepId) {
          return { ...step, status: 'completed' };
        } else if (step.id === stepId + 1) {
          return { ...step, status: 'in-progress' };
        }
        return step;
      });
      return updatedSteps;
    });
  };

  // Reset the workflow to its initial state
  const resetWorkflow = () => {
    console.log('Resetting workflow to initial state');
    // Create a fresh copy of the default steps to ensure we don't modify the original
    const freshSteps = JSON.parse(JSON.stringify(defaultWorkflowSteps));
    setWorkflowSteps(freshSteps);
    localStorage.setItem('workflowSteps', JSON.stringify(freshSteps));
  };

  // Check if all steps are completed
  const allStepsCompleted = workflowSteps.every(step => step.status === 'completed');

  // Get the current active step
  const getCurrentStep = () => {
    return workflowSteps.find(step => step.status === 'in-progress') || null;
  };

  // Value object to be provided to consumers
  const value = {
    workflowSteps,
    completeStep,
    resetWorkflow,
    allStepsCompleted,
    getCurrentStep
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
};

export default WorkflowContext; 