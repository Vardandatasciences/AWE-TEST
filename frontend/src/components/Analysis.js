import React, { useState, useEffect } from 'react';
import Chart from 'chart.js/auto';
import './Analysis.css';
import SubNav from './SubNav';

const statusColors = {
  'Completed': '#28a745',
  'Completed with Delay': '#fd7e14',
  'Ongoing': '#007bff',
  'Ongoing with Delay': '#dc3545',
  'Due': '#17a2b8',
  'Due with Delay': '#ffcc00',
  'Total': '#63B3ED',
  'Pending': '#6f42c1',  // Changed from #6c757d to light blue (#63B3ED)
};

function Analysis() {
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

  useEffect(() => {
    fetchDashboardData();
  }, [activityFilter, periodFilter]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/analysis/task-stats?activity=${activityFilter}&period=${periodFilter}`);
      const data = await response.json();
      setData(data);
      
      // Destroy existing charts before creating new ones
      const charts = ['pieChart', 'barChart', 'criticalityChart'].map(
        id => Chart.getChart(id)
      );
      charts.forEach(chart => chart?.destroy());

      // Initialize charts with the new data
      if (data.pie_chart) renderPieChart(data.pie_chart);
      if (data.bar_chart) renderBarChart(data.bar_chart);
      if (data.criticality_chart) renderCriticalityChart(data.criticality_chart);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  const fetchTaskDetails = async (filterType, filterValue, status) => {
    try {
      let url = `http://localhost:5000/analysis/task-details?filterType=${filterType}&filterValue=${filterValue}&activity=${activityFilter}&period=${periodFilter}`;
      
      if (status) {
        url += `&activityType=${status}`;
      }

      console.log('Fetching from URL:', url);

      const response = await fetch(url);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setTableData(data);
        console.log('Received table data:', data);
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
      const response = await fetch(`http://localhost:5000/analysis/filtered-bar-data?status=${selectedStatus}&activity=${activityFilter}&period=${periodFilter}`);
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
    const ctx = document.getElementById('pieChart')?.getContext('2d');
    if (!ctx) return;

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
  };

  const renderBarChart = (barData) => {
    const ctx = document.getElementById('barChart')?.getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: barData.labels,
        datasets: [{
          label: 'All Tasks',
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
  };

  const renderCriticalityChart = (criticalityData) => {
    const ctx = document.getElementById('criticalityChart')?.getContext('2d');
    if (!ctx) return;

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
          <div className="loading">Loading...</div>
        ) : (
          <div className="dashboard">
            <div className="left-section" style={{
              width: '22%',
              padding: '15px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',  // Center vertically
              alignItems: 'center',      // Center horizontally
              minHeight: '100%'         // Take full height
            }}>
              <div className="stats-container" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',            // Add consistent spacing between boxes
                width: '100%',
                maxWidth: '280px'       // Limit maximum width for better appearance
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
                  <span style={{ fontWeight: '500' }}>Total Tasks</span>
                  <span style={{ 
                    fontWeight: 'bold',
                    fontSize: '1.2em' 
                  }}>{data.total_activities}</span>
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
                  }}>{data.completed_activities}</span>
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
                  }}>{data.completed_with_delay}</span>
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
                  }}>{data.ongoing_activities}</span>
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
                  }}>{data.ongoing_with_delay}</span>
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
                  }}>{data.yet_to_start}</span>
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
                  }}>{data.yet_to_start_with_delay}</span>
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
                  <h4>Task Status Distribution</h4>
                  <div className="chart-container">
                    <canvas id="pieChart"></canvas>
                  </div>
                </div>
                <div className="chart-box">
                  <h4>Task Distribution</h4>
                  <div className="chart-container">
                    <canvas id="barChart"></canvas>
                  </div>
                </div>
                <div className="chart-and-table-container">
                  <div className="chart-section">
                    <div className="chart-box">
                      <h4>Task Criticality Analysis</h4>
                      <div className="chart-container">
                        <canvas id="criticalityChart"></canvas>
                      </div>
                    </div>
                  </div>
                  <div className="table-section" style={{ height: '300px', overflow: 'hidden' }}>
                    <div className="table-container" style={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <h4>Task Details {selectedFilter.value ? ` - ${selectedFilter.value}` : ''}</h4>
                      <div className="table-wrapper" style={{ 
                        flexGrow: 1,
                        overflow: 'auto',
                        maxHeight: 'calc(100% - 40px)'  // Subtract header height
                      }}>
                        {tableData.length > 0 ? (
                          <table>
                            <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
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

export default Analysis; 