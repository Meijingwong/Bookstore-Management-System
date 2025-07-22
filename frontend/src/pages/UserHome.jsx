import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaSearch, FaShoppingCart, FaTimes, FaGift } from 'react-icons/fa';

const Home = () => {
    const [showPopup, setShowPopup] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const interval = setInterval(() => {
            window.location.reload();
        }, 30000); // 30000 ms = 30 seconds

        return () => clearInterval(interval);
    }, []);

    const contentStyle = {
        marginTop: '20px',
        transition: 'margin 0.3s ease',
        padding: '20px',
    };

    return (
        <div className="container-fluid vh-80 bg-light" style={contentStyle}>
            <div className="row justify-content-center align-items-center vh-90">
                <div className="position-fixed top-0 start-0 justify-content-center align-items-start d-flex" style={{ marginTop: '30px', zIndex: 1000 }}>
                    {/* Popup */}
                    {showPopup && (
                        <>
                            <div className="card shadow-sm p-4 mb-4" style={{ width: '450px', height: '150px', zIndex: 1000 }}>
                                <button
                                    className="btn btn-sm position-absolute top-0 end-0 mt-2 me-2 text-secondary"
                                    onClick={() => setShowPopup(false)}
                                >
                                    <FaTimes />
                                </button>
                                <h5 className="card-title"><FaGift /> <b>Exclusive Perks Await!</b></h5>
                                <p className="card-text text-muted small">
                                    Enjoy special discounts, unlock secret gifts, and discover exclusive benefits just for you!
                                </p>
                                <button className="btn btn-dark btn-sm position-absolute bottom-0 end-0 mb-3 me-3" onClick={() => navigate('/member')}>
                                    Proceed to member portal →
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Main Content */}
                <div className={`position-fixed start-0 w-100 h-100 col-12 d-flex justify-content-center gap-5 ${showPopup ? 'align-items-end' : 'align-items-center'}`}
                    style={{ height: '60vh', marginBottom: showPopup ? '100px' : '0' }}>
                    <div className="card shadow-sm text-center p-5" style={{ width: '400px', height: '400px' }}>
                        <img
                            src="src/assets/images/search.jpg"
                            alt="Search"
                            className="img-fluid mx-auto mb-4"
                            style={{ width: '280px', height: '250px', objectFit: 'contain' }}
                        />
                        <button
                            className="btn btn-dark text-uppercase px-4 py-2"
                            onClick={() => navigate('/display-book')}
                        >
                            <FaSearch className="me-2" /> SEARCH
                        </button>
                    </div>

                    <div className="card shadow-sm text-center p-5" style={{ width: '400px', height: '400px' }}>
                        <img
                            src="src/assets/images/pay.png"
                            alt="Pay"
                            className="img-fluid mx-auto mb-4"
                            style={{ width: '280px', height: '250px', objectFit: 'contain' }}
                        />
                        <button
                            className="btn btn-dark text-uppercase px-4 py-2"
                            onClick={() => navigate('/scan-barcode')}
                        >
                            <FaShoppingCart className="me-2" /> PAY
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Home;