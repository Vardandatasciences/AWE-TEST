import React, { useState, useEffect } from 'react';
import Chart from 'chart.js/auto';
import './Analysis.css'; // Reuse the same CSS
import SubNav from './SubNav'; // Import the SubNav component

const statusColors = {
  'Completed': '#28a745',
  'Completed with Delay': '#fd7e14',
  'Ongoing': '#007bff',
  'Ongoing with Delay': '#dc3545',
  'Due': '#17a2b8',
  'Due with Delay': '#ffcc00',
  'Total': '#63B3ED',
  'Pending': '#6f42c1'
};

function UserAnalysis() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});
  const [tableData, setTableData] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState({
    type: null,
    value: null,
    activity: 'All'
  });
  const [activityFilter, setActivityFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('All');
  const [userId, setUserId] = useState(null);
  const [initialDataFetched, setInitialDataFetched] = useState(false);

  useEffect(() => {
    // Get user ID from localStorage
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      console.log("Found user ID in localStorage:", storedUserId);
      setUserId(storedUserId);
    } else {
      // Try to get user info from the backend as fallback
      console.warn("User ID not found in localStorage, trying to get from session");
      
      // Fetch current user info from a session endpoint
      fetch('http://localhost:5000/current_user')
        .then(res => res.json())
        .then(data => {
          if (data.user_id) {
            console.log("Got user ID from session:", data.user_id);
            setUserId(data.user_id);
            localStorage.setItem('userId', data.user_id);
            localStorage.setItem('userRole', data.role);
          } else {
            console.error("Could not determine user ID");
          }
        })
        .catch(err => {
          console.error("Error getting current user:", err);
        });
    }
  }, []);

  useEffect(() => {
    if (userId && !initialDataFetched) {
      console.log("Initial data fetch with userId:", userId);
      fetchDashboardData();
      setInitialDataFetched(true);
    }
  }, [userId, initialDataFetched]);

  useEffect(() => {
    if (userId && initialDataFetched) {
      console.log("Filter changed, fetching new data");
      fetchDashboardData();
    }
  }, [activityFilter, periodFilter, userId, initialDataFetched]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true); // Ensure loading state is set while fetching
      console.log(`Fetching data for userId: ${userId}, activity: ${activityFilter}, period: ${periodFilter}`);
      
      // Fix period parameter to match what backend expects
      let backendPeriod = periodFilter;
      if (periodFilter === 'Upcoming 6 Months') {
        backendPeriod = '6 Months';
      }
      
      const url = `http://localhost:5000/analysis/user-task-stats?activity=${activityFilter}&period=${backendPeriod}&userId=${userId}`;
      console.log("Fetching from URL:", url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error("Error response from server:", response.status, response.statusText);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log("Received dashboard data:", data);
      
      setData(data);
      setLoading(false);
      
      // Wait for the next render cycle before attempting to render charts
      setTimeout(() => {
        // Destroy existing charts before creating new ones
        const charts = ['pieChart', 'barChart', 'criticalityChart'].map(
          id => Chart.getChart(id)
        );
        charts.forEach(chart => chart?.destroy());

        // Initialize charts with the new data
        if (data.pie_chart && Object.keys(data.pie_chart).length > 0) {
          renderPieChart(data.pie_chart);
          console.log("Pie chart rendered");
        } else {
          console.log("No pie chart data available");
        }
        
        if (data.bar_chart && data.bar_chart.labels && data.bar_chart.labels.length > 0) {
          renderBarChart(data.bar_chart);
          console.log("Bar chart rendered");
        } else {
          console.log("No bar chart data available");
        }
        
        if (data.criticality_chart && data.criticality_chart.labels && data.criticality_chart.labels.length > 0) {
          renderCriticalityChart(data.criticality_chart);
          console.log("Criticality chart rendered");
        } else {
          console.log("No criticality chart data available");
        }
      }, 50); // Small delay to ensure DOM updates
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  const fetchTaskDetails = async (filterType, filterValue, status) => {
    try {
      // Fix period parameter to match what backend expects
      let backendPeriod = periodFilter;
      if (periodFilter === 'Upcoming 6 Months') {
        backendPeriod = '6 Months';
      }
      
      let url = `http://localhost:5000/analysis/user-task-details?filterType=${filterType}&filterValue=${filterValue}&activity=${activityFilter}&period=${backendPeriod}&userId=${userId}`;
      
      if (status) {
        url += `&activityType=${status}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setTableData(data);
      } else if (data.error) {
        console.error("Error from server:", data.error);
        setTableData([]);
      } else {
        console.error("Invalid data format received:", data);
        setTableData([]);
      }
    } catch (error) {
      console.error("Error fetching task details:", error);
      setTableData([]);
    }
  };

  const handleActivityClick = (activity) => {
    setActivityFilter(activity);
  };

  const handlePeriodClick = (period) => {
    setPeriodFilter(period);
  };

  const updateBarChartByStatus = async (selectedStatus) => {
    try {
      // Fix period parameter to match what backend expects
      let backendPeriod = periodFilter;
      if (periodFilter === 'Upcoming 6 Months') {
        backendPeriod = '6 Months';
      }
      
      const response = await fetch(`http://localhost:5000/analysis/user-filtered-bar-data?status=${selectedStatus}&activity=${activityFilter}&period=${backendPeriod}&userId=${userId}`);
      const data = await response.json();
      
      const barChart = Chart.getChart('barChart');
      if (barChart) {
        barChart.data.labels = data.labels;
        barChart.data.datasets[0] = {
          data: data.data,
          backgroundColor: statusColors[selectedStatus],
          label: selectedStatus
        };
        barChart.options.onClick = (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const taskName = data.labels[index];
            
            setSelectedFilter({
              type: 'taskName',
              value: taskName,
              activity: selectedStatus
            });
            
            fetchTaskDetails('taskName', taskName);
          }
        };
        barChart.update();
      }
    } catch (error) {
      console.error("Error updating bar chart:", error);
    }
  };

  const renderPieChart = (pieData) => {
    try {
      const canvas = document.getElementById('pieChart');
      if (!canvas) {
        console.error("Cannot find pie chart canvas element");
        return;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error("Could not get 2d context from canvas");
        return;
      }
      
      if (!pieData || Object.keys(pieData).length === 0) {
        console.log("No pie chart data to render");
        // Create an empty chart or a placeholder message
        new Chart(ctx, {
          type: 'pie',
          data: {
            labels: ['No Data'],
            datasets: [{
              data: [1],
              backgroundColor: ['#f8f9fa']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right'
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return 'No tasks found for this period';
                  }
                }
              }
            }
          }
        });
        return;
      }
      
      new Chart(ctx, {
        type: 'pie',
        data: {
          labels: Object.keys(pieData),
          datasets: [{
            data: Object.values(pieData),
            backgroundColor: Object.keys(pieData).map(status => statusColors[status])
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right'
            }
          },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const status = Object.keys(pieData)[index];
              
              setSelectedFilter({
                type: 'status',
                value: status,
                activity: activityFilter
              });
              
              fetchTaskDetails('status', status);
              updateBarChartByStatus(status);
            }
          }
        }
      });
    } catch (error) {
      console.error("Error rendering pie chart:", error);
    }
  };

  const renderBarChart = (barData) => {
    try {
      const canvas = document.getElementById('barChart');
      if (!canvas) {
        console.error("Cannot find bar chart canvas element");
        return;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error("Could not get 2d context from bar chart canvas");
        return;
      }

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: barData.labels,
          datasets: [{
            label: 'My Tasks',
            data: barData.data,
            backgroundColor: statusColors['Total']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const taskName = barData.labels[index];
              
              setSelectedFilter({
                type: 'taskName',
                value: taskName,
                activity: activityFilter
              });
              
              fetchTaskDetails('taskName', taskName);
            }
          }
        }
      });
    } catch (error) {
      console.error("Error rendering bar chart:", error);
    }
  };

  const renderCriticalityChart = (criticalityData) => {
    try {
      const canvas = document.getElementById('criticalityChart');
      if (!canvas) {
        console.error("Cannot find criticality chart canvas element");
        return;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error("Could not get 2d context from criticality chart canvas");
        return;
      }

      const datasets = criticalityData.datasets.map(dataset => ({
        ...dataset,
        backgroundColor: statusColors[dataset.label] || statusColors['Total']
      }));

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: criticalityData.labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true
            },
            y: {
              stacked: true,
              beginAtZero: true
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top'
            }
          },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const element = elements[0];
              const datasetIndex = element.datasetIndex;
              const index = element.index;
              const criticality = criticalityData.labels[index];
              const status = criticalityData.datasets[datasetIndex].label;
              
              setSelectedFilter({
                type: 'criticality',
                value: criticality,
                activity: status
              });
              
              fetchTaskDetails('criticality', criticality, status);
            }
          }
        }
      });
    } catch (error) {
      console.error("Error rendering criticality chart:", error);
    }
  };

  const getFullTypeName = (type) => {
    switch (type) {
      case 'R':
        return 'Regulatory';
      case 'I':
        return 'Internal';
      case 'C':
        return 'Customer';
      default:
        return type; // Return the type as is if it doesn't match
    }
  };

  return (
    <>
      <SubNav />
      <div className="analysis-wrapper">
        {loading ? (
          <div className="loading">Loading your dashboard...</div>
        ) : (
          <div className="dashboard">
            <div className="left-section" style={{
              width: '22%',
              padding: '15px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '100%'
            }}>
              <div className="stats-container" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                width: '100%',
                maxWidth: '280px'
              }}>
                <div className="box total" style={{
                  padding: '15px',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}>
                  <span style={{ fontWeight: '500' }}>My Total Tasks</span>
                  <span style={{ 
                    fontWeight: 'bold',
                    fontSize: '1.2em' 
                  }}>{data.total_activities || 0}</span>
                </div>

                <div className="box completed" style={{
                  padding: '15px',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}>
                  <span style={{ fontWeight: '500' }}>Completed</span>
                  <span style={{ 
                    fontWeight: 'bold',
                    fontSize: '1.2em' 
                  }}>{data.completed_activities || 0}</span>
                </div>

                <div className="box completed-delay" style={{
                  padding: '15px',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}>
                  <span style={{ fontWeight: '500' }}>Completed with Delay</span>
                  <span style={{ 
                    fontWeight: 'bold',
                    fontSize: '1.2em' 
                  }}>{data.completed_with_delay || 0}</span>
                </div>

                <div className="box ongoing" style={{
                  padding: '15px',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}>
                  <span style={{ fontWeight: '500' }}>Ongoing</span>
                  <span style={{ 
                    fontWeight: 'bold',
                    fontSize: '1.2em' 
                  }}>{data.ongoing_activities || 0}</span>
                </div>

                <div className="box ongoing-delay" style={{
                  padding: '15px',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}>
                  <span style={{ fontWeight: '500' }}>Ongoing with Delay</span>
                  <span style={{ 
                    fontWeight: 'bold',
                    fontSize: '1.2em' 
                  }}>{data.ongoing_with_delay || 0}</span>
                </div>

                <div className="box due" style={{
                  padding: '15px',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}>
                  <span style={{ fontWeight: '500' }}>Due</span>
                  <span style={{ 
                    fontWeight: 'bold',
                    fontSize: '1.2em' 
                  }}>{data.yet_to_start || 0}</span>
                </div>

                <div className="box due-delay" style={{
                  padding: '15px',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}>
                  <span style={{ fontWeight: '500' }}>Due with Delay</span>
                  <span style={{ 
                    fontWeight: 'bold',
                    fontSize: '1.2em' 
                  }}>{data.yet_to_start_with_delay || 0}</span>
                </div>
                <div className="box pending" style={{
                  padding: '15px',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}>
                  <span style={{ fontWeight: '500' }}>Pending</span>
                  <span style={{ 
                    fontWeight: 'bold',
                    fontSize: '1.2em' 
                  }}>{data.pending_tasks}</span>
                </div>
              </div>
            </div>

            <div className="right-section">
              <div className="filter-buttons">
                <div className="period-filters">
                  {['All', 'Previous Month', 'Current Month', 'Upcoming 6 Months'].map(period => (
                    <button
                      key={period}
                      className={`button ${periodFilter === period ? 'selected' : ''}`}
                      onClick={() => handlePeriodClick(period)}
                    >
                      {period}
                    </button>
                  ))}
                </div>
                <div className="activity-filters">
                  {['All', 'Regulatory', 'Internal', 'Customer'].map(activity => (
                    <button
                      key={activity}
                      className={`button ${activityFilter === activity ? 'selected' : ''}`}
                      onClick={() => handleActivityClick(activity)}
                    >
                      {activity}
                    </button>
                  ))}
                </div>
              </div>

              <div className="charts-container">
                <div className="chart-box">
                  <h4>My Task Status Distribution</h4>
                  <div className="chart-container">
                    {data.total_activities > 0 ? (
                      <canvas id="pieChart"></canvas>
                    ) : (
                      <div className="no-data-message" style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        color: '#666',
                        fontStyle: 'italic'
                      }}>
                        Select a different time period to view your tasks
                      </div>
                    )}
                  </div>
                </div>
                <div className="chart-box">
                  <h4>My Task Distribution</h4>
                  <div className="chart-container">
                    {data.total_activities > 0 ? (
                      <canvas id="barChart"></canvas>
                    ) : (
                      <div className="no-data-message" style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        color: '#666',
                        fontStyle: 'italic'
                      }}>
                        Select a different time period to view your tasks
                      </div>
                    )}
                  </div>
                </div>
                <div className="chart-and-table-container">
                  <div className="chart-section">
                    <div className="chart-box">
                      <h4>My Task Criticality Analysis</h4>
                      <div className="chart-container">
                        {data.total_activities > 0 ? (
                          <canvas id="criticalityChart"></canvas>
                        ) : (
                          <div className="no-data-message" style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '100%',
                            color: '#666',
                            fontStyle: 'italic'
                          }}>
                            Select a different time period to view your tasks
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="table-section" style={{ height: 'auto', overflow: 'visible' }}>
                    <div className="table-container" style={{ 
                      height: 'auto',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <h4>My Task Details {selectedFilter.value ? ` - ${selectedFilter.value}` : ''}</h4>
                      <div className="table-wrapper" style={{ 
                        flexGrow: 1,
                        overflow: 'visible',
                        maxHeight: 'none'
                      }}>
                        {tableData.length > 0 ? (
                          <table>
                            <thead>
                              <tr>
                                <th>Task Name</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th>Criticality</th>
                                <th>Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tableData.map((task, index) => (
                                <tr key={index}>
                                  <td>{task.task_name}</td>
                                  <td>{task.duedate}</td>
                                  <td>{task.task_status || task.status}</td>
                                  <td className={`criticality-${task.criticality.toLowerCase()}`}>{task.criticality}</td>
                                  <td>{getFullTypeName(task.activity_type)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="no-data-message">
                            Click on a chart segment to view task details.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default UserAnalysis; 