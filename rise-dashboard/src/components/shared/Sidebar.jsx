import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaFileInvoiceDollar, FaChartLine, FaCog, FaSignOutAlt, FaBars, FaTimes, FaFileAlt, FaCalendarAlt, FaCalendarPlus, FaCalendarCheck, FaChevronDown } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [schedulingDropdownOpen, setSchedulingDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const toggleSchedulingDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSchedulingDropdownOpen(!schedulingDropdownOpen);
  };

  const closeSchedulingDropdown = () => {
    setSchedulingDropdownOpen(false);
  };

  // Check if user role is student or mentor (singular forms)
  const isStudent = user?.role === 'Student';
  const isMentor = user?.role === 'Mentor' || user?.role === 'Writing Coach';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSchedulingDropdownOpen(false);
      }
    };

    if (schedulingDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [schedulingDropdownOpen]);

  // Debug: Log user info
  console.log('Sidebar Debug - User:', user);
  console.log('Sidebar Debug - User Role:', user?.role);
  console.log('Sidebar Debug - isStudent:', isStudent);
  console.log('Sidebar Debug - isMentor:', isMentor);

  return (
    <>
      <button className="menu-toggle" onClick={toggleSidebar} aria-label="Toggle menu">
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      <aside className={`sidebar glass ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-logo">RISE Research</h2>
          <div className="sidebar-user">
            {user?.picture && (
              <img src={user.picture} alt={user.name} className="user-avatar" />
            )}
            <div className="user-info">
              <p className="user-name">{user?.name}</p>
              <p className="user-email">{user?.email}</p>
              {user?.role && (
                <p className="user-role">
                  <span className="role-badge">{user.role}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className="nav-item" onClick={closeSidebar}>
            <FaHome className="nav-icon" />
            <span>Dashboard</span>
          </NavLink>
          
          {/* Scheduling Menu - Available for Students and Mentors */}
          {(isStudent || isMentor) && (
            <div className="nav-item-dropdown" ref={dropdownRef}>
              <div className="nav-item dropdown-trigger" onClick={toggleSchedulingDropdown}>
                <FaCalendarAlt className="nav-icon" />
                <span>Scheduling</span>
                <FaChevronDown className={`dropdown-arrow ${schedulingDropdownOpen ? 'open' : ''}`} />
              </div>
              
              {schedulingDropdownOpen && (
                <div className="dropdown-menu">
                  {isStudent && (
                    <NavLink 
                      to="/scheduling/add" 
                      className="dropdown-item" 
                      onClick={(e) => {
                        closeSchedulingDropdown();
                        closeSidebar();
                      }}
                    >
                      <FaCalendarPlus className="nav-icon" />
                      <span>Add Schedule</span>
                    </NavLink>
                  )}
                  {isMentor && (
                    <NavLink 
                      to="/scheduling/view" 
                      className="dropdown-item" 
                      onClick={(e) => {
                        closeSchedulingDropdown();
                        closeSidebar();
                      }}
                    >
                      <FaCalendarCheck className="nav-icon" />
                      <span>View Schedule</span>
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          )}
          
          <NavLink to="/invoicing" className="nav-item" onClick={closeSidebar}>
            <FaFileInvoiceDollar className="nav-icon" />
            <span>Invoicing</span>
          </NavLink>
          {user?.role === 'Team' && (
            <NavLink to="/reports" className="nav-item" onClick={closeSidebar}>
              <FaFileAlt className="nav-icon" />
              <span>Reports</span>
            </NavLink>
          )}
          <NavLink to="/analytics" className="nav-item" onClick={closeSidebar}>
            <FaChartLine className="nav-icon" />
            <span>Analytics</span>
          </NavLink>
          <NavLink to="/settings" className="nav-item" onClick={closeSidebar}>
            <FaCog className="nav-icon" />
            <span>Settings</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="nav-item logout-btn">
            <FaSignOutAlt className="nav-icon" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
