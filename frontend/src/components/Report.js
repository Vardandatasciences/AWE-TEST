import React, { useState, useEffect } from "react";
import axios from "axios";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import './Report.css';

// Register required chart components
Chart.register(ArcElement, Tooltip, Legend);

const Report = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reportType, setReportType] = useState('all');
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [currentReport, setCurrentReport] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);

    // State for Activity Report
    const [activities, setActivities] = useState([]);
    const [selectedActivity, setSelectedActivity] = useState("");
    const [tasks, setTasks] = useState([]);
    const [standardTime, setStandardTime] = useState(0);

    // State for Employee Report
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [employeeTasks, setEmployeeTasks] = useState([]);

    const [chartData, setChartData] = useState(null);

    useEffect(() => {
        fetchReports();
    }, [reportType]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            // Replace with your actual API endpoint
            const response = await axios.get(`/reports?type=${reportType}`);
            setReports(response.data);
            setError(null);
        } catch (err) {
            console.error("Error fetching reports:", err);
            setError('Failed to load reports. Please try again later.');
            // Use sample data for demonstration
            setReports(getSampleReports());
        } finally {
            setLoading(false);
        }
    };

    // Sample data for demonstration
    const getSampleReports = () => {
        return [
            {
                id: 1,
                title: 'Monthly Task Completion Report',
                description: 'Summary of all completed tasks for the current month',
                type: 'task',
                createdAt: '2023-07-01',
                status: 'completed',
                charts: 3,
                format: 'PDF'
            },
            {
                id: 2,
                title: 'Q2 Employee Performance Analysis',
                description: 'Detailed analysis of employee performance metrics for Q2',
                type: 'employee',
                createdAt: '2023-06-30',
                status: 'completed',
                charts: 5,
                format: 'PDF'
            },
            {
                id: 3,
                title: 'Weekly Activity Summary',
                description: 'Overview of all activities for the past week',
                type: 'activity',
                createdAt: '2023-07-07',
                status: 'completed',
                charts: 2,
                format: 'PDF'
            },
            {
                id: 4,
                title: 'Client Engagement Metrics',
                description: 'Analysis of client engagement with assigned tasks',
                type: 'customer',
                createdAt: '2023-06-15',
                status: 'completed',
                charts: 4,
                format: 'PDF'
            },
            {
                id: 5,
                title: 'Overdue Tasks Report',
                description: 'List of all overdue tasks and responsible auditors',
                type: 'task',
                createdAt: '2023-07-05',
                status: 'completed',
                charts: 1,
                format: 'PDF'
            }
        ];
    };

    const handleDateRangeChange = (e) => {
        setDateRange({
            ...dateRange,
            [e.target.name]: e.target.value
        });
    };

    const applyFilters = () => {
        // Implement filtering logic here
        fetchReports();
    };

    const resetFilters = () => {
        setReportType('all');
        setDateRange({
            startDate: '',
            endDate: ''
        });
        setSearchTerm('');
    };

    const handleViewReport = (report) => {
        setCurrentReport(report);
        setShowReportModal(true);
    };

    const handleDownloadReport = (report) => {
        try {
            // For demonstration purposes, we'll use fixed IDs
            // In a real application, you would use the actual IDs from your report object
            if (report.type === 'activity') {
                const activityId = report.activityId || 1144; // Use a valid activity ID
                
                // Create a link element and trigger the download
                const link = document.createElement('a');
                link.href = `/generate_activity_report?activity_id=${activityId}`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
            } else if (report.type === 'employee') {
                const actorId = report.actorId || 1; // Use a valid actor ID
                
                console.log("Fetching performance for actor_id:", actorId);
                
                // Create a link element and trigger the download
                const link = document.createElement('a');
                link.href = `/download-performance/${actorId}`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
            } else {
                // For other report types or fallback
                alert(`Downloading ${report.title} in PDF format`);
            }
        } catch (error) {
            console.error("Error downloading report:", error);
            alert("Failed to download report. Please try again.");
        }
    };

    const renderReportTypeIcon = (type) => {
        switch (type) {
            case 'task':
                return <i className="fas fa-tasks"></i>;
            case 'employee':
                return <i className="fas fa-user-tie"></i>;
            case 'activity':
                return <i className="fas fa-clipboard-list"></i>;
            case 'customer':
                return <i className="fas fa-user-friends"></i>;
            default:
                return <i className="fas fa-file-alt"></i>;
        }
    };

    const renderFormatIcon = (format) => {
        switch (format) {
            case 'PDF':
                return <i className="fas fa-file-pdf"></i>;
            case 'Excel':
                return <i className="fas fa-file-excel"></i>;
            default:
                return <i className="fas fa-file"></i>;
        }
    };

    const renderReportCards = () => {
        let filteredReports = reports;
        
        // Search filter
        if (searchTerm) {
            filteredReports = filteredReports.filter(report => 
                report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Date range filter
        if (dateRange.startDate && dateRange.endDate) {
            filteredReports = filteredReports.filter(report => {
                const reportDate = new Date(report.createdAt);
                const start = new Date(dateRange.startDate);
                const end = new Date(dateRange.endDate);
                return reportDate >= start && reportDate <= end;
            });
        }
        
        if (filteredReports.length === 0) {
            return (
                <div className="no-reports">
                    <i className="fas fa-search"></i>
                    <p>No reports match your criteria</p>
                    <button onClick={resetFilters} className="btn-reset">Clear Filters</button>
                </div>
            );
        }
        
        return (
            <div className="report-grid">
                {filteredReports.map(report => (
                    <div className="report-card" key={report.id}>
                        <div className="report-card-header">
                            <div className="report-type">
                                {renderReportTypeIcon(report.type)}
                                <span>{report.type.charAt(0).toUpperCase() + report.type.slice(1)}</span>
                            </div>
                            <div className="report-date">
                                <i className="far fa-calendar-alt"></i>
                                <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div className="report-card-content">
                            <h3>{report.title}</h3>
                            <p className="report-description">{report.description}</p>
                            <div className="report-meta">
                                <span className="report-format">
                                    {renderFormatIcon(report.format)} {report.format}
                                </span>
                                <span className="report-charts">
                                    <i className="fas fa-chart-pie"></i> {report.charts} {report.charts === 1 ? 'chart' : 'charts'}
                                </span>
                            </div>
                        </div>
                        <div className="report-card-actions">
                            <button onClick={() => handleViewReport(report)} className="btn-view">
                                <i className="fas fa-eye"></i> View
                            </button>
                            <button onClick={() => handleDownloadReport(report)} className="btn-download">
                                <i className="fas fa-download"></i> Download
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="report-container">
            <div className="page-header">
                <h1>
                    <i className="fas fa-file-alt"></i> Reports
                </h1>
                <p>Access and download reports for tasks, activities, and auditor performance</p>
            </div>

            <div className="report-filters">
                <div className="filter-group search-filter">
                    <i className="fas fa-search"></i>
                    <input
                        type="text"
                        placeholder="Search reports..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="filter-group">
                    <label>Report Type</label>
                    <select 
                        value={reportType} 
                        onChange={(e) => setReportType(e.target.value)}
                    >
                        <option value="all">All Reports</option>
                        <option value="task">Task Reports</option>
                        <option value="employee">Audit Reports</option>
                        <option value="activity">Activity Reports</option>
                        <option value="customer">Client Reports</option>
                    </select>
                </div>
                
                <div className="filter-group date-filter">
                    <label>Date From</label>
                    <input 
                        type="date" 
                        name="startDate"
                        value={dateRange.startDate}
                        onChange={handleDateRangeChange}
                    />
                </div>
                
                <div className="filter-group date-filter">
                    <label>Date To</label>
                    <input 
                        type="date" 
                        name="endDate"
                        value={dateRange.endDate}
                        onChange={handleDateRangeChange}
                    />
                </div>
                
                <div className="filter-actions">
                    <button onClick={applyFilters} className="btn-apply">
                        <i className="fas fa-filter"></i> Apply Filters
                    </button>
                    <button onClick={resetFilters} className="btn-reset">
                        <i className="fas fa-undo"></i> Reset
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading reports...</p>
                </div>
            ) : error ? (
                <div className="error-container">
                    <i className="fas fa-exclamation-triangle"></i>
                    <p>{error}</p>
                    <button onClick={fetchReports} className="retry-button">
                        <i className="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            ) : (
                renderReportCards()
            )}

            {showReportModal && currentReport && (
                <div className="modal-overlay">
                    <div className="report-modal">
                        <div className="modal-header">
                            <h2>
                                {renderReportTypeIcon(currentReport.type)} {currentReport.title}
                            </h2>
                            <button 
                                className="close-btn" 
                                onClick={() => setShowReportModal(false)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="report-preview">
                                <div className="report-preview-header">
                                    <h3>{currentReport.title}</h3>
                                    <p>Generated on: {new Date(currentReport.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="report-preview-content">
                                    <p className="report-description">{currentReport.description}</p>
                                    <div className="report-placeholder">
                                        <i className="fas fa-chart-bar"></i>
                                        <p>Report preview would be displayed here</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => handleDownloadReport(currentReport)} className="btn-primary">
                                <i className="fas fa-download"></i> Download {currentReport.format}
                            </button>
                            <button onClick={() => setShowReportModal(false)} className="btn-secondary">
                                <i className="fas fa-times"></i> Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Report;
