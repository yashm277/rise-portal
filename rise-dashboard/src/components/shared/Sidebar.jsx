import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaFileInvoiceDollar, FaChartLine, FaCog, FaSignOutAlt, FaBars, FaTimes, FaFileAlt } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

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
