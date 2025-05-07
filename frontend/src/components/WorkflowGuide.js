import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './WorkflowGuide.css';
import { useWorkflow } from '../context/WorkflowContext';

const WorkflowGuide = ({ onClose }) => {
  const { workflowSteps, completeStep, allStepsCompleted, resetWorkflow } = useWorkflow();
  const modalRef = useRef(null);
  const successRef = useRef(null);

  useEffect(() => {
    console.log('WorkflowGuide mounted');
    
    // Add event listener for escape key
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        handleClose('canceled');
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    
    // Add animation classes after component mounts
    if (modalRef.current) {
      modalRef.current.classList.add('animate-in');
    }
    
    // Add success animation if all steps are completed
    if (allStepsCompleted && successRef.current) {
      successRef.current.classList.add('animate-success');
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [allStepsCompleted]);

  const handleClose = (reason) => {
    // Remove animation class and add exit animation
    if (modalRef.current) {
      modalRef.current.classList.remove('animate-in');
      modalRef.current.classList.add('animate-out');
      
      // Wait for animation to complete before closing
      setTimeout(() => {
        onClose(reason);
      }, 300);
    } else {
      onClose(reason);
    }
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      handleClose('canceled');
    }
  };

  const handleStepClick = (step) => {
    if (step.status === 'in-progress') {
      // For step 3 (Employee Assignment), redirect to activities page
      if (step.id === 3) {
        handleClose('navigated-to-activities');
      } else {
        handleClose('navigated');
      }
    }
  };

  const handleStartAgain = () => {
    resetWorkflow();
    handleClose('reset-workflow');
  };

  return (
    <div className="workflow-guide-overlay" onClick={handleOverlayClick}>
      <div className="workflow-guide-container" ref={modalRef}>
        <div className="workflow-guide-header">
          <h2>Supervisor Workflow Guide</h2>
          <button className="close-button" onClick={() => handleClose('canceled')}>×</button>
        </div>
        
        <div className="workflow-steps">
          {workflowSteps.map((step, index) => (
            <div key={step.id} className="step-container">
              <div className={`step-indicator ${step.status}`}>
                {step.status === 'completed' ? (
                  <i className="fas fa-check check-icon"></i>
                ) : (
                  step.id
                )}
              </div>
              
              {index < workflowSteps.length - 1 && (
                <div className={`step-connector ${workflowSteps[index + 1].status !== 'pending' ? 'active' : ''}`}></div>
              )}
              
              <div className="step-details">
                <h3>Step {step.id}</h3>
                <h4>{step.title}</h4>
                <p className="step-status">
                  {step.status === 'completed' ? 'Completed' : 
                   step.status === 'in-progress' ? 'In Progress' : 'Pending'}
                </p>
                
                {step.status === 'in-progress' && (
                  <Link 
                    to={step.id === 3 ? "/activities" : step.path} 
                    className="step-action-button"
                    onClick={() => handleStepClick(step)}
                  >
                    Start {step.title}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {allStepsCompleted && (
          <div className="workflow-success" ref={successRef}>
            <div className="success-icon">
              <i className="fas fa-check"></i>
            </div>
            <h3>All steps completed!</h3>
            <p>You have successfully completed all the workflow steps.</p>
            <button className="start-again-button" onClick={handleStartAgain}>
              <i className="fas fa-redo"></i> Start Again
            </button>
            <div className="confetti-container">
              <div className="confetti"></div>
              <div className="confetti"></div>
              <div className="confetti"></div>
              <div className="confetti"></div>
              <div className="confetti"></div>
              <div className="confetti"></div>
              <div className="confetti"></div>
              <div className="confetti"></div>
              <div className="confetti"></div>
              <div className="confetti"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowGuide; 