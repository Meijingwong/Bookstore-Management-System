import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/UserThankYou.css';

export default function ThankYou() {
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/');
        }, 30000); // 30 seconds

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="thank-you-container position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center">
            <div className="message-box position-absolute bg-white p-4 p-lg-5">
                <p className="fs-4 fw-bold">Thank you for your purchase!</p>
                <p className="fs-4 fw-bold">We sincerely appreciate your support.</p>
                <p className="fs-4 fw-bold">Have a wonderful day,</p>
                <p className="fs-4 fw-bold">and we look forward to serving you again! 😊</p>
            </div>
            <div className="bookshelf-background"></div>
        </div>
    );
}