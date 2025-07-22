import React, { useState, useEffect } from "react";
import "../CSS/AdminProfile.css";
import profile from '../assets/images/image.png'
import axios from "axios";
import { useMediaQuery } from 'react-responsive';

const Dashboard = () => {
  const defaultProfileImage =profile;

  const [adminProfile, setAdminProfile] = useState(null);
  const [error, setError] = useState(null);
  const isMobile = useMediaQuery({ maxWidth: 767 });

  const fetchAdminProfile = async () => {
    try {
      const adminId = localStorage.getItem("admin_ID"); // Fix: Get adminId here
      if (!adminId) throw new Error("No admin ID found");

      const res = await axios.get(`http://localhost:5000/api/profile/${adminId}`);
      setAdminProfile(res.data);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err.message);
    }
  };

  useEffect(() => {
    const storedProfile = localStorage.getItem("admin_profile");

    if (storedProfile) {
      setAdminProfile(JSON.parse(storedProfile));
    } else {
      fetchAdminProfile();
    }
  }, []);


  if (error) return <div>Error: {error}</div>;
  if (!adminProfile) return <div>Loading profile...</div>;

  return (
    <div className="profile-section">
      <div className="profile-card">
        {/* Left Section */}
        {!isMobile && (
          <div className="profile-left">
            <div className="profile-picture">
              <img src={defaultProfileImage} alt="Profile" />
            </div>
            <h5 className="profile-name">{adminProfile.admin_name}</h5>
            <p className="profile-position">{adminProfile.position}</p>
          </div>
        )}

        {/* Right Section */}
        <div className="profile-right">
          <h4 className="profile-title">Profile</h4>
          <p className="profile-subtitle">
            Some info may be visible to other people
          </p>
          <div className="profile-info">
            <div className="info-row">
              <span className="info-label">Admin ID:</span>
              <span className="info-value">{adminProfile.admin_ID}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Name:</span>
              <span className="info-value">{adminProfile.admin_name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Gender:</span>
              <span className="info-value">{adminProfile.gender}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Contact Number:</span>
              <span className="info-value">{adminProfile.contact_num}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{adminProfile.email}</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;