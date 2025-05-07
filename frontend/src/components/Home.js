import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';
import { showWorkflowGuide } from '../App';

// Import multiple GIFs for a more dynamic experience
import taskManagementGif from '../assets/task-management.gif'; // Task management animation
import analyticsGif from '../assets/analytics.gif'; // Analytics dashboard animation
import teamworkGif from '../assets/teamwork.gif'; // Team collaboration animation
import automationGif from '../assets/automation.gif'; // Workflow automation animation

const Home = () => {
  // Refs for animation elements
  const featuresRef = useRef(null);
  const benefitsRef = useRef(null);
  const testimonialsRef = useRef(null);
  const navigate = useNavigate();

  // Add scroll animation effect
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    // Observe all sections with animation
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => observer.observe(el));

    return () => {
      animatedElements.forEach(el => observer.unobserve(el));
    };
  }, []);

  // Handle Get Started button click
  const handleGetStartedClick = (e) => {
    e.preventDefault();
    console.log("Home: Get Started button clicked");


    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
      if (user.role != 'admin') {
        navigate('/tasks');  // Redirect Admin to Employee Page
      } else {
        showWorkflowGuide();     // Redirect User to Tasks Page
      }
    } else {
      showWorkflowGuide();      // Redirect to Login if Not Authenticated
    }



  };

  return (
    <div className="home-container">
      {/* Hero Section with Animated Background */}
      <section className="hero">
        <div className="hero-background">
          <div className="animated-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
            <div className="shape shape-4"></div>
          </div>
        </div>
        <div className="hero-content">
          <h1>Professional Work Sync</h1>
          <p className="tagline">Streamline accounting processes. Enhance compliance. Maximize financial insights.</p>
          <div className="hero-buttons">
            <button
              className="btn btn-primary"
              onClick={handleGetStartedClick}
            >
              <i className="fas fa-rocket"></i> Get Started
            </button>
            <a href="#features" className="btn btn-secondary">
              <i className="fas fa-info-circle"></i> Learn More
            </a>
          </div>
        </div>
        <div className="hero-visual">
          <div className="gif-container primary-gif">
            <img src={taskManagementGif} alt="Task Management" className="hero-gif" />
            <div className="gif-overlay">
              <span>Intelligent Professional Work Synchronisation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="value-proposition">
        <div className="container">
          <div className="value-cards">
            <div className="value-card">
              <div className="value-icon">
                <i className="fas fa-bolt"></i>
              </div>
              <h3>Efficiency</h3>
              <p>Reduce accounting workload by 75%</p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <h3>Accuracy</h3>
              <p>Minimize errors in financial reporting</p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3>Compliance</h3>
              <p>Stay updated with tax regulations</p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <i className="fas fa-sync"></i>
              </div>
              <h3>Adaptability</h3>
              <p>Customizable to your firm's needs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with GIFs */}
      <section className="features animate-on-scroll" id="features" ref={featuresRef}>
        <div className="container">
          <div className="section-header">
            <h2>Professional Work Management Solutions</h2>
            <p>Comprehensive tools designed for accounting professionals</p>
          </div>

          <div className="feature-showcase">
            <div className="feature-content">
              <div className="feature-icon">
                <i className="fas fa-tasks"></i>
              </div>
              <h3>Intelligent Tax Management</h3>
              <p>Organize, prioritize, and track client tax filings with ease. Our smart algorithms help distribute workload efficiently across your accounting team.</p>
              <ul className="feature-list">
                <li><i className="fas fa-check-circle"></i> Automated tax deadline tracking</li>
                <li><i className="fas fa-check-circle"></i> Priority-based client scheduling</li>
                <li><i className="fas fa-check-circle"></i> Real-time audit monitoring</li>

                {/* <li><i className="fas fa-check-circle"></i> Document management system</li> */}
              </ul>
            </div>
            <div className="feature-visual">
              <img src={taskManagementGif} alt="Tax Management" className="feature-gif" />
            </div>
          </div>

          <div className="feature-showcase reverse">
            <div className="feature-content">
              <div className="feature-icon">
                <i className="fas fa-chart-bar"></i>
              </div>
              <h3>Advanced Analytics Dashboard</h3>
              <p>Gain valuable insights into your team's performance with comprehensive analytics and customizable reports.</p>
              <ul className="feature-list">
                <li><i className="fas fa-check-circle"></i> Performance metrics</li>
                <li><i className="fas fa-check-circle"></i> Productivity trends</li>
                <li><i className="fas fa-check-circle"></i> Resource utilization</li>
                <li><i className="fas fa-check-circle"></i> Bottleneck identification</li>
              </ul>
            </div>
            <div className="feature-visual">
              <img src={analyticsGif} alt="Analytics Dashboard" className="feature-gif" />
            </div>
          </div>

          <div className="feature-showcase">
            <div className="feature-content">
              <div className="feature-icon">
                <i className="fas fa-users-cog"></i>
              </div>
              <h3>Team Collaboration Hub</h3>
              <p>Foster teamwork and communication with integrated collaboration tools designed for modern workplaces.</p>
              <ul className="feature-list">
                <li><i className="fas fa-check-circle"></i> Task commenting</li>
                {/* <li><i className="fas fa-check-circle"></i> File sharing</li> */}
                <li><i className="fas fa-check-circle"></i> Team notifications</li>
                <li><i className="fas fa-check-circle"></i> Activity feeds</li>
              </ul>
            </div>
            <div className="feature-visual">
              <img src={teamworkGif} alt="Team Collaboration" className="feature-gif" />
            </div>
          </div>

          <div className="feature-showcase reverse">
            <div className="feature-content">
              <div className="feature-icon">
                <i className="fas fa-robot"></i>
              </div>
              <h3>Workflow Automation</h3>
              <p>Eliminate repetitive tasks with powerful automation tools that streamline your business processes.</p>
              <ul className="feature-list">
                <li><i className="fas fa-check-circle"></i> Custom workflow creation</li>
                <li><i className="fas fa-check-circle"></i> Trigger-based actions</li>
                <li><i className="fas fa-check-circle"></i> Scheduled tasks</li>
                <li><i className="fas fa-check-circle"></i> Integration capabilities</li>
              </ul>
            </div>
            <div className="feature-visual">
              <img src={automationGif} alt="Workflow Automation" className="feature-gif" />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section with Animated Stats */}
      <section className="benefits animate-on-scroll" id="benefits" ref={benefitsRef}>
        <div className="container">
          <div className="section-header">
            <h2>Real Business Impact</h2>
            <p>Measurable results that transform your organization</p>
          </div>

          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-stat">
                <span className="stat-number">40%</span>
                <span className="stat-icon"><i className="fas fa-arrow-up"></i></span>
              </div>
              <h3>Productivity Increase</h3>
              <p>Teams report significant productivity gains within the first month</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-stat">
                <span className="stat-number">65%</span>
                <span className="stat-icon"><i className="fas fa-arrow-down"></i></span>
              </div>
              <h3>Reduced Errors</h3>
              <p>Fewer mistakes with automated workflows and validation</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-stat">
                <span className="stat-number">30%</span>
                <span className="stat-icon"><i className="fas fa-arrow-down"></i></span>
              </div>
              <h3>Time Savings</h3>
              <p>Less time spent on administrative and repetitive tasks</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-stat">
                <span className="stat-number">85%</span>
                <span className="stat-icon"><i className="fas fa-users"></i></span>
              </div>
              <h3>Team Satisfaction</h3>
              <p>Higher employee satisfaction through better work distribution</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section
      <section className="testimonials animate-on-scroll" id="testimonials" ref={testimonialsRef}>
        <div className="container">
          <div className="section-header">
            <h2>What Our Clients Say</h2>
            <p>Success stories from organizations like yours</p>
          </div>
          
          <div className="testimonial-carousel">
            <div className="testimonial-card">
              <div className="testimonial-content">
                <i className="fas fa-quote-left"></i>
                <p>"ProSync has transformed how we manage our accounting processes. Tasks that used to take days now happen automatically, and our team can focus on what really matters."</p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">
                  <i className="fas fa-user-circle"></i>
                </div>
                <div className="author-info">
                  <h4>Sarah Johnson</h4>
                  <p>CFO, Global Innovations</p>
                </div>
              </div>
            </div>
            
            <div className="testimonial-card">
              <div className="testimonial-content">
                <i className="fas fa-quote-left"></i>
                <p>"The analytics dashboard gives us unprecedented visibility into our operations. We've identified and resolved bottlenecks we didn't even know existed."</p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">
                  <i className="fas fa-user-circle"></i>
                </div>
                <div className="author-info">
                  <h4>Michael Chen</h4>
                  <p>Operations Director, TechSolutions</p>
                </div>
              </div>
            </div>
            
            <div className="testimonial-card">
              <div className="testimonial-content">
                <i className="fas fa-quote-left"></i>
                <p>"Implementation was seamless, and the ROI was evident within weeks. Our regulatory compliance tasks are now completed on time, every time."</p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">
                  <i className="fas fa-user-circle"></i>
                </div>
                <div className="author-info">
                  <h4>Elena Rodriguez</h4>
                  <p>Compliance Manager, FinSecure</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* Call to Action with Animated Background */}
      <section className="cta">
        <div className="cta-background">
          <div className="animated-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
          </div>
        </div>
        <div className="container">
          <h2>Ready to Transform Your Professional Work Experience?</h2>
          <p>Join hundreds of accounting firms already optimizing their operations with our financial automation platform.</p>
          <div className="cta-buttons">
            <button
              className="btn btn-primary btn-large"
              onClick={handleGetStartedClick}
            >
              <i className="fas fa-rocket"></i> Schedule a Demo
            </button>
            <Link to="/contact" className="btn btn-outline btn-large">
              <i className="fas fa-headset"></i> Speak to an Advisor
            </Link>
          </div>
          <div className="cta-features">
            <div className="cta-feature">
              <i className="fas fa-check-circle"></i>
              <span>No credit card required</span>
            </div>
            <div className="cta-feature">
              <i className="fas fa-check-circle"></i>
              <span>14-day free trial</span>
            </div>
            <div className="cta-feature">
              <i className="fas fa-check-circle"></i>
              <span>Dedicated support</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 