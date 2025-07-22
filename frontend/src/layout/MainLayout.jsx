import React from 'react'
import { Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Navbar from '../components/navbar.jsx'

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const contentStyle = {
    marginLeft: !isMobile && sidebarOpen ? '250px' : '0',
    transition: 'margin-left 0.3s ease',
    padding: '20px'
  };

  return (
    <>
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 1040,
          }}
        />
      )}
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div style={contentStyle}>
        <Outlet />
      </div>
    </>
  )
}

export default MainLayout