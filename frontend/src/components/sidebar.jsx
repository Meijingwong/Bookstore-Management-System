import React from 'react';
import { FaBook, FaFileInvoiceDollar, FaChartBar, FaUsers, FaSignOutAlt } from 'react-icons/fa';
import logo from '../assets/images/logo1.png'
import { NavLink } from 'react-router-dom';
import { useContext } from 'react'
import { RoleContext } from '../components/RoleContext.jsx'

const Sidebar = () => {
    const { logout } = useContext(RoleContext);
    const linkClass = ({ isActive }) => isActive ? "nav-link active bg-warning text-dark fw-bold fs-6" : "nav-link text-white"
    const barStyle = {
        width: '250px',
        backgroundColor: '#78b04b',
        height: '100vh',
        top: 0,
        left: 0,
        zIndex: 1050,
        position: 'fixed',
        transition: 'transform 0.3s ease',
    };
    return (
        <div className="position-fixed d-flex flex-column flex-shrink-0 p-3 text-white"
            style={barStyle}>
            <div className="text-center mb-4 p-3">
                <img src={logo} alt="Logo" width="100" />
                <h2 className="mt-2 fw-bold">Caterpillar</h2>
                <p className="m-0 fs-5">BOOK STORE</p>
            </div>

            <ul className="nav nav-pills flex-column mb-auto">
                <li className="nav-item">
                    <NavLink to="/manage-book" className={linkClass}>
                        <FaBook className="me-2" /> Manage Book
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/purchase-records" className={linkClass}>
                        <FaFileInvoiceDollar className="me-2" /> Purchase Records
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/sales-report" className={linkClass}>
                        <FaChartBar className="me-2" /> Sales Report
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/manage-member" className={linkClass}>
                        <FaUsers className="me-2" /> Manage Member
                    </NavLink>
                </li>
            </ul>

            <hr />
            <div className="text-center mt-auto">
                <button className="btn btn-light text-danger fw-bold" onClick={logout}>
                    Logout <FaSignOutAlt className="ms-1" />
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
