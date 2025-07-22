import React from 'react';
import { FaBell, FaUser, FaBars, FaSearch } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from "react";
import axios from 'axios';
import Sidebar from './sidebar';
import '../CSS/Scrollbar.css';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  // For profile card
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  // For notification
  const [showNotification, setShowNotification] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(null);
  // For search card
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [cancelTokenSource, setCancelTokenSource] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const adminId = localStorage.getItem("admin_ID");
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    const fetchAdminName = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/admin-name/${adminId}`);
        setAdminName(res.data.admin_name);
      } catch (err) {
        console.error("Error fetching name:", err);
      }
    };
    fetchAdminName();
  }, [adminId]);

  useEffect(() => {
    // Listen for real-time notifications from backend
    socket.on('new-notification', (data) => {
      console.log('Received notification:', data);

      // You can update your notification state here dynamically
      setNotifications((prev) => [data, ...prev]); // prepend new notification
    });

    // Clean up on unmount
    return () => {
      socket.off('new-notification');
    };
  }, []);


  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsDropdownOpen(false);
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsDropdownOpen(true); // open dropdown when typing
  };

  useEffect(() => {
    if (!query.trim()) {
      setFiltered([]);
      setIsDropdownOpen(false);
      return;
    }

    // Cancel previous request if exists
    if (cancelTokenSource) {
      cancelTokenSource.cancel("Operation canceled due to new request.");
    }

    const source = axios.CancelToken.source();
    setCancelTokenSource(source);

    const fetchBooks = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/books/search?q=${encodeURIComponent(query)}`,
          { cancelToken: source.token }
        );

        const data = response.data;

        const sorted = data.sort((a, b) => {
          const aLower = a.title.toLowerCase();
          const bLower = b.title.toLowerCase();
          const q = query.toLowerCase();

          const startsWithA = aLower.startsWith(q);
          const startsWithB = bLower.startsWith(q);

          if (startsWithA && !startsWithB) return -1;
          if (!startsWithA && startsWithB) return 1;
          return aLower.localeCompare(bLower);
        });

        setFiltered(sorted);
        setIsDropdownOpen(true);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error("Axios error:", err);
          setFiltered([]);
          setIsDropdownOpen(true); // open dropdown to show "No books found"
        }
      }
    };

    const debounce = setTimeout(fetchBooks, 300);
    return () => {
      clearTimeout(debounce);
      // Cancel ongoing axios request on cleanup
      source.cancel("Operation canceled due to component unmounting or new query.");
    };
    // eslint-disable-next-line
  }, [query]);

  // Close dropdown on outside click WITHOUT clearing filtered results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close notification on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotification(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navStyle = {
    backgroundColor: '#d6f79a',
    padding: '10px 20px',
    marginLeft: sidebarOpen ? '250px' : '0',
    top: 0,
    position: 'fixed',
    width: sidebarOpen ? 'calc(100% - 250px)' : '100%',
    zIndex: 500,
    transition: 'all 0.3s ease',
  };

  return (
    <>
      {sidebarOpen && <Sidebar />}
      <nav className="navbar navbar-expand-lg"
        style={navStyle}>
        <div className="container-fluid justify-content-between">
          <span type="button" onClick={() => setSidebarOpen((prevState) => !prevState)}>
            <FaBars size={24} />
          </span>

          <div ref={containerRef} className="position-relative w-50 mx-auto">
            <form className="input-group" onSubmit={handleSubmit}>
              <input
                className="form-control border-end-0"
                type="search"
                placeholder="Search for..."
                aria-label="Search"
                value={query}
                onChange={handleChange}
                onFocus={() => setIsDropdownOpen(true)}
                autoComplete="off"
              />
              <button
                type="submit"
                className="input-group-text bg-white border-start-0 text-secondary"
                disabled={!query.trim()}
              >
                <FaSearch className="text-secondary" />
              </button>
            </form>

            {isDropdownOpen && filtered.length > 0 && (
              <ul
                className="list-group position-absolute w-100 shadow"
                style={{
                  top: '100%',
                  left: 0,
                  zIndex: 1050,
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {filtered.map((item, index) => (
                  <li
                    className="list-group-item p-2"
                    key={item.isbn || index}
                    style={{ color: "black" }}
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <Link
                      to={`/search?q=${encodeURIComponent(item.title)}`}
                      className="text-decoration-none"
                      style={{ color: "black" }}
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}

                <li
                  className="list-group-item p-2 text-dark"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                    setIsDropdownOpen(false);
                  }}
                >
                  See all results for "{query}"
                </li>
              </ul>
            )}

            {isDropdownOpen && query && filtered.length === 0 && (
              <div
                className="bg-light border p-2 position-absolute w-100"
                style={{ top: '100%', left: 0, zIndex: 1050 }}
              >
                No books found.
              </div>
            )}
          </div>

          <div className="d-flex align-items-center gap-3">
            <div
              className="position-relative me-3"
              ref={notificationRef}
              onMouseEnter={() => setShowNotification(true)}
              onMouseLeave={() => setShowNotification(false)}
            >
              <div
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => setShowNotification(prev => !prev)}
              >
                <FaBell size={24} />
                <span className="position-absolute top-10 start-100 translate-middle badge rounded-circle bg-danger">
                  {notifications.length}
                </span>
              </div>

              {showNotification && (
                <div
                  className="position-absolute end-0 mt-2 bg-white shadow rounded custom-scrollbar"
                  style={{
                    width: "320px",
                    maxHeight: "250px",
                    overflowY: "auto",
                    zIndex: 999,
                    padding: "0.5rem"
                  }}
                >
                  {/* Example notification card */}
                  {notifications.length === 0 ? (
                    <div className="text-center text-muted py-2">No notifications yet</div>
                  ) : (
                    notifications.map((notif, index) => (
                      <div key={index} className="d-flex justify-content-between border-bottom py-2 px-1 bg-light-subtle">
                        <div>
                          <strong>{notif.title || 'Notification'}</strong>
                          <div>{notif.message}</div>
                        </div>
                        <div className="text-muted" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                          {notif.time || new Date().toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
            <div
              className="position-relative"
              ref={dropdownRef}
              onMouseEnter={() => setShowDropdown(true)}
              onMouseLeave={() => setShowDropdown(false)}
            >
              {/* User Icon */}
              <FaUser
                size={24}
                style={{ cursor: 'pointer' }}
                onClick={() => setShowDropdown(prev => !prev)}
              />

              {/* Dropdown Card */}
              {showDropdown && (
                <div
                  className="position-absolute end-0 mt-2 p-3 bg-white shadow rounded"
                  style={{ width: "250px", zIndex: 999 }}
                >
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <FaUser size={50} className="text-secondary" />
                    <div>
                      <div><strong>Admin ID: {adminId}</strong></div>
                      <div>Name: {adminName}</div>
                    </div>
                  </div>
                  <a href="/profile" className="text-primary fw-bold text-decoration-none">
                    Manage Profile
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;