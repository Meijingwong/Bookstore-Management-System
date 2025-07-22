import React from 'react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../components/CartContext.jsx';
import { FaArrowLeft } from 'react-icons/fa';
import { useMediaQuery } from 'react-responsive';
import Swal from 'sweetalert2';
import useWindowSize from '../components/useWindowsSize.jsx';

const UserCart = () => {
    const { cart, setCart } = useCart();
    // Protect against undefined or null cart
    const safeCart = Array.isArray(cart) ? cart : [];

    const totalUnits = safeCart.reduce((sum, item) => sum + item.units, 0);
    const totalPrice = safeCart.reduce((sum, item) => sum + item.units * item.price, 0);

    const navigate = useNavigate();
    const isMobile = useMediaQuery({ maxWidth: 767 });
    const { width } = useWindowSize();
    const cardwidth = width - 80;
    const longPressTimeout = useRef(null);

    const getImageUrl = (img) => {
        if (!img || typeof img !== 'string') return "/default-cover.jpg";
        return img.startsWith("http") ? img : `http://localhost:5000${img}`;
    };

    const handleLongPressStart = (item) => {
        longPressTimeout.current = setTimeout(() => {
            (async () => {
                const confirmDelete = await Swal.fire({
                    title: 'Delete Item',
                    text: `Do you want to delete "${item.title}" item(s)?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Yes'
                });

                if (confirmDelete.isConfirmed) {
                    setCart((prevCart) => prevCart.filter((cartItem) => cartItem.title !== item.title));
                }
            })();
        }, 800); // 800ms press triggers deletion
    };

    const handleLongPressEnd = () => {
        clearTimeout(longPressTimeout.current);
    };

    return (
        <div className="container-fluid d-flex justify-content-center align-items-start"
            style={{ minHeight: '100vh', marginTop: '60px' }}>
            <div className="row">
                <div className="col-12">
                    <div className="bg-light p-4 rounded-3">
                        <div className="fw-bold fs-3 mb-4">
                            <span style={{ cursor: 'pointer' }} onClick={() => navigate(-1)}>
                                <FaArrowLeft /> Shopping Cart
                            </span>
                        </div>
                        <span className="text-danger p-4">Long Press to Delete An Item.</span>

                        <div className="cart-items" style={{ width: isMobile ? '500px' : cardwidth, margin: '0 auto' }}>
                            {safeCart.length > 0 ? (
                                safeCart.map((item, index) => (
                                    <div key={index} className="d-flex align-items-center mb-3 p-3 gap-5 bg-white border rounded"
                                        onMouseDown={() => handleLongPressStart(item)}
                                        onMouseUp={handleLongPressEnd}
                                        onMouseLeave={handleLongPressEnd}
                                        onTouchStart={() => handleLongPressStart(item)}
                                        onTouchEnd={handleLongPressEnd}>
                                        <img
                                            src={getImageUrl(item.image)}
                                            alt={item.title}
                                            className="me-4"
                                            style={{ width: '80px', height: '100px', objectFit: 'cover' }}
                                        />
                                        <div className="flex-grow-1">
                                            <strong>{item.title}</strong><br />
                                            <span>Price per unit: RM {item.price}</span><br />
                                            <span>Unit selected: {item.units}</span>
                                        </div>
                                        <div className="fw-bold fs-5">
                                            RM {(item.units * item.price).toFixed(2)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center mt-4 fs-5 text-muted">Your cart is empty.</p>
                            )}
                        </div>

                        <div className="border-top pt-3 mt-3 fs-5 fw-bold">
                            <div className="d-flex justify-content-between mb-2">
                                <span>Total items</span>
                                <span>{totalUnits} units</span>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span>Total</span>
                                <span>RM {totalPrice.toFixed(2)}</span>
                            </div>
                        </div>

                        <button
                            className="btn btn-dark w-100 py-3 mt-4 fw-bold fs-5"
                            onClick={() => navigate(-1)}
                            disabled={safeCart.length === 0}
                        >
                            PAY
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserCart;