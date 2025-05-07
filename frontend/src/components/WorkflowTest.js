import React, { useState } from 'react';
import WorkflowGuide from './WorkflowGuide';

const WorkflowTest = () => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>Workflow Guide Test Page</h1>
      <p>Click the button below to test the workflow guide</p>
      
      <button 
        onClick={() => setShowGuide(true)}
        style={{
          padding: '12px 24px',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        Show Workflow Guide
      </button>
      
      {showGuide && <WorkflowGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
};

export default WorkflowTest; 