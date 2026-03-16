import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaFileInvoiceDollar, FaSignOutAlt, FaBars, FaTimes, FaCalendarAlt, FaCalendarPlus, FaCalendarCheck, FaChevronDown, FaKey, FaFileContract, FaEllipsisH, FaUser, FaEdit, FaUsers, FaFileAlt, FaUniversity } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [schedulingDropdownOpen, setSchedulingDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const schedulingDropdownRef = useRef(null);
  const moreDropdownRef = useRef(null);
  const accountDropdownRef = useRef(null);

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

  const toggleMoreDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMoreDropdownOpen(!moreDropdownOpen);
  };

  const closeMoreDropdown = () => {
    setMoreDropdownOpen(false);
  };

  const toggleAccountDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAccountDropdownOpen(!accountDropdownOpen);
  };

  const closeAccountDropdown = () => {
    setAccountDropdownOpen(false);
  };

  const isStudent = user?.role === 'Student';
  const isMentor = user?.role === 'Mentor' || user?.role === 'Writing Coach';
  const isTeam = user?.role === 'Team';
  const isPML2 = isTeam && Array.isArray(user?.employeeTypes) && user.employeeTypes.includes('Program Manager L2');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (schedulingDropdownRef.current && !schedulingDropdownRef.current.contains(event.target)) {
        setSchedulingDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) {
        setMoreDropdownOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target)) {
        setAccountDropdownOpen(false);
      }
    };

    if (schedulingDropdownOpen || moreDropdownOpen || accountDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [schedulingDropdownOpen, moreDropdownOpen, accountDropdownOpen]);

  return (
    <>
      <button className="menu-toggle" onClick={toggleSidebar} aria-label="Toggle menu">
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      <aside className={`sidebar glass ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-user">
            {user?.picture && (
              <img src={user.picture} alt={user.name} className="user-avatar" />
            )}
            <div className="user-info">
              <h2 className="sidebar-logo-small">RISE Research</h2>
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

          {(isStudent || isMentor || isTeam) && (
            <div className="nav-item-dropdown" ref={schedulingDropdownRef}>
              <div className="nav-item dropdown-trigger" onClick={toggleSchedulingDropdown}>
                <FaCalendarAlt className="nav-icon" />
                <span>Scheduling</span>
                <FaChevronDown className={`dropdown-arrow ${schedulingDropdownOpen ? 'open' : ''}`} />
              </div>

              {schedulingDropdownOpen && (
                <div className="dropdown-menu">
                  {(isMentor || isTeam) && (
                    <>
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
                      <NavLink
                        to="/reschedule"
                        className="dropdown-item"
                        onClick={(e) => {
                          closeSchedulingDropdown();
                          closeSidebar();
                        }}
                      >
                        <FaEdit className="nav-icon" />
                        <span>Reschedule Meetings</span>
                      </NavLink>
                    </>
                  )}
                  {isStudent && (
                    <>
                      <NavLink
                        to="/scheduling/book"
                        className="dropdown-item"
                        onClick={(e) => {
                          closeSchedulingDropdown();
                          closeSidebar();
                        }}
                      >
                        <FaCalendarCheck className="nav-icon" />
                        <span>Book Schedule with Mentor</span>
                      </NavLink>
                      <NavLink
                        to="/scheduling/book-writing-coach"
                        className="dropdown-item"
                        onClick={(e) => {
                          closeSchedulingDropdown();
                          closeSidebar();
                        }}
                      >
                        <FaCalendarCheck className="nav-icon" />
                        <span>Book Schedule with Writing Coach</span>
                      </NavLink>
                      <NavLink
                        to="/scheduling/book-program-manager"
                        className="dropdown-item"
                        onClick={(e) => {
                          closeSchedulingDropdown();
                          closeSidebar();
                        }}
                      >
                        <FaCalendarCheck className="nav-icon" />
                        <span>Book Review Meet</span>
                      </NavLink>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {(isStudent || isMentor || isTeam) && (
            <NavLink to="/my-meetings" className="nav-item" onClick={closeSidebar}>
              <FaCalendarCheck className="nav-icon" />
              <span>My Meetings</span>
            </NavLink>
          )}

          {isStudent && (
            <NavLink to="/leave-application" className="nav-item" onClick={closeSidebar}>
              <FaFileAlt className="nav-icon" />
              <span>Leave Application</span>
            </NavLink>
          )}

          {(isMentor || isTeam) && (
            <NavLink to="/my-students" className="nav-item" onClick={closeSidebar}>
              <FaUsers className="nav-icon" />
              <span>My Students</span>
            </NavLink>
          )}

          {isPML2 && (
            <NavLink to="/leave-management" className="nav-item" onClick={closeSidebar}>
              <FaFileAlt className="nav-icon" />
              <span>Leave Applications</span>
            </NavLink>
          )}

          {!isStudent && user?.role !== 'Team' && (
            <NavLink to="/invoicing" className="nav-item" onClick={closeSidebar}>
              <FaFileInvoiceDollar className="nav-icon" />
              <span>Invoicing</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item-dropdown" ref={moreDropdownRef}>
            <div className="nav-item dropdown-trigger" onClick={toggleMoreDropdown}>
              <FaEllipsisH className="nav-icon" />
              <span>More</span>
              <FaChevronDown className={`dropdown-arrow ${moreDropdownOpen ? 'open' : ''}`} />
            </div>

            {moreDropdownOpen && (
              <div className="dropdown-menu">
                {isMentor && (
                  <NavLink
                    to="/bank-details"
                    className="dropdown-item"
                    onClick={() => { closeMoreDropdown(); closeSidebar(); }}
                  >
                    <FaUniversity className="nav-icon" />
                    <span>Bank Details</span>
                  </NavLink>
                )}
                <NavLink
                  to="/policies-dashboard"
                  className="dropdown-item"
                  onClick={(e) => {
                    closeMoreDropdown();
                    closeSidebar();
                  }}
                >
                  <FaFileContract className="nav-icon" />
                  <span>Policies</span>
                </NavLink>
              </div>
            )}
          </div>

          <div className="nav-item-dropdown" ref={accountDropdownRef}>
            <div className="nav-item dropdown-trigger" onClick={toggleAccountDropdown}>
              <FaUser className="nav-icon" />
              <span>Account</span>
              <FaChevronDown className={`dropdown-arrow ${accountDropdownOpen ? 'open' : ''}`} />
            </div>

            {accountDropdownOpen && (
              <div className="dropdown-menu">
                <NavLink
                  to="/change-password"
                  className="dropdown-item"
                  onClick={(e) => {
                    closeAccountDropdown();
                    closeSidebar();
                  }}
                >
                  <FaKey className="nav-icon" />
                  <span>Change Password</span>
                </NavLink>
                <button
                  onClick={() => {
                    handleLogout();
                    closeAccountDropdown();
                    closeSidebar();
                  }}
                  className="dropdown-item logout-btn"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <FaSignOutAlt className="nav-icon" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
