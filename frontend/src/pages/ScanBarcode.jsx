import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../components/CartContext.jsx';
import Swal from 'sweetalert2';
import axios from 'axios';

const UserBarcodeScan = () => {
    const { cart, setCart, cartCount } = useCart();

    const [books, setBooks] = useState([]);
    const [scanning, setScanning] = useState(true);
    const webcamRef = useRef(null);
    const beepSound = useRef(new Audio('/short-beep-tone-47916.mp3'));
    const codeReaderRef = useRef(null);
    const longPressTimeout = useRef(null);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/books');
                const data = response.data;

                // Convert to object keyed by ISBN for faster lookup
                const db = {};
                data.forEach(book => {
                    db[book.isbn] = book;
                });

                setBooks(db);
            } catch (error) {
                console.error('Failed to fetch book data:', error);
            }
        };

        fetchBooks();
    }, []);

    const getImageUrl = (img) => {
        if (!img || typeof img !== 'string') return "/default-cover.jpg";
        return img.startsWith("http") ? img : `http://localhost:5000${img}`;
    };

    const [step, setStep] = useState(1);
    const [show, setShow] = useState(false);
    const [phone, setPhone] = useState('');
    const [showMore, setShowMore] = useState(false);

    const handleClose = () => {
        setShow(false);
        setStep(0);
    };

    const handleScan = (barcode) => {
        const cleanedBarcode = barcode.trim();
        const scannedBook = books[String(cleanedBarcode)];

        if (!scannedBook) {
            alert('Book not found!');
            return;
        }

        if (beepSound.current) {
            beepSound.current.currentTime = 0;
            beepSound.current.play();
        }

        setCart((prevCart) => {
            const existing = prevCart.find((item) => item.title === scannedBook.title);
            if (existing) {
                return prevCart.map((item) =>
                    item.title === scannedBook.title
                        ? { ...item, units: item.units + 1 }
                        : item
                );
            } else {
                return [...prevCart, { ...scannedBook, units: 1 }];
            }
        });

        console.log('Scanned:', cleanedBarcode, scannedBook.title, '| Current cartCount:', cartCount);
    };

    useEffect(() => {
        codeReaderRef.current = new BrowserMultiFormatReader();
        const codeReader = codeReaderRef.current;
        let selectedDeviceId = null;
        let active = true;

        const setupScanner = async () => {
            try {
                const devices = await BrowserMultiFormatReader.listVideoInputDevices();
                if (devices.length > 0) {
                    selectedDeviceId = devices[0].deviceId;

                    codeReader.decodeFromVideoDevice(
                        selectedDeviceId,
                        webcamRef.current.video,
                        (result, err, control) => {
                            if (!active) return;
                            console.log('Scanning result:', result);

                            if (result) {
                                const scannedText = result.getText();
                                handleScan(scannedText);

                                control.stop();
                                setScanning(false);
                                setTimeout(() => setScanning(true), 1000);
                            }

                            // if (err && err.name !== 'NotFoundException') {
                            //     console.error('Scanning error:', err);
                            // }
                        }
                    );
                }
            } catch (error) {
                console.error('Error setting up barcode scanner:', error);
            }
        };

        if (scanning) {
            setupScanner();
        }

        return () => {
            active = false;

            if (webcamRef.current && webcamRef.current.video?.srcObject) {
                webcamRef.current.video.srcObject.getTracks().forEach((track) => track.stop());
            }
        };
    }, [scanning]);

    const totalUnits = cart.reduce((sum, item) => sum + item.units, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.units * item.price, 0);

    const navigate = useNavigate();

    const handlePayClick = () => {
        setShow(true);
        setStep(1);
    };

    const handlePhoneSubmit = async (phoneNumber) => {
        if (!phoneNumber || phoneNumber.length < 10) {
            alert('Please enter a valid phone number.');
            return;
        }

        try {
            const res = await axios.get(`/api/api/search_member/phone/${phoneNumber}`);
            const { member_ID } = res.data;

            if (member_ID) {
                handleClose();
                navigate(`/payment?memberId=${member_ID}`);
            } else {
                alert('Member not found. Please register as a new member.');
                handleClose();
            }
        } catch (error) {
            console.error('Error searching member by phone:', error);
            alert('An error occurred while searching for the member. Please try again.');
        }
    };

    // Long press handlers
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
        <div className="container-fluid vh-90 p-0">
            <div className="row h-90" style={{ marginTop: '60px', marginLeft: '110px' }}>
                {/* Left Panel */}
                <div className="col-md-6 p-4 bg-white border-end border-2 border-secondary">
                    <div className="text-center">
                        <h2 className="fw-bold fs-4 mb-4">
                            Please place the book in front<br />of the camera.<br /><br />
                            Scanning the book's barcode...
                        </h2>

                        <div className="position-relative mx-auto"
                            style={{ width: '80%', height: '300px', backgroundColor: '#e0e0e0', borderRadius: '15px' }}>
                            <Webcam
                                ref={webcamRef}
                                className="w-100 h-100 object-fit-cover rounded-3"
                                audio={false}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{
                                    facingMode: 'environment',
                                }}
                            />
                            <button className="position-absolute bottom-0 start-50 translate-middle-x bg-dark text-white px-3 py-1 rounded-2 border-0 small">
                                Move closer to the barcode
                            </button>
                        </div>

                        <button
                            className="btn btn-dark mt-4 px-5 py-2 fw-bold"
                            style={{ paddingLeft: '100px', paddingRight: '100px' }}
                            onClick={handlePayClick}
                        >
                            PAY
                        </button>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="col-md-6 p-4 bg-light overflow-auto">
                    <h5>Check your shopping cart!</h5>
                    <p className="mb-4">
                        Once a barcode is successfully scanned, the related book will be added automatically.<br />
                        Kindly check your items before making payments.<br />
                        <span className="text-danger">Long Press to Delete An Item.</span>
                    </p>

                    <div className="cart-items">
                        {cart.map((item, index) => (
                            <div
                                key={index}
                                className="d-flex align-items-center mb-3 p-3 border rounded bg-white"
                                onMouseDown={() => handleLongPressStart(item)}
                                onMouseUp={handleLongPressEnd}
                                onMouseLeave={handleLongPressEnd}
                                onTouchStart={() => handleLongPressStart(item)}
                                onTouchEnd={handleLongPressEnd}
                            >
                                <img src={getImageUrl(item.image)} alt={item.title} className="me-3"
                                    style={{ width: '60px', height: '80px', objectFit: 'cover' }} />
                                <div>
                                    <strong>{item.title}</strong><br />
                                    <span>Price per unit: RM {item.price}</span><br />
                                    <span>Unit selected: {item.units}</span>
                                </div>
                                <div className="ms-auto fw-bold fs-5">RM {(item.units * item.price).toFixed(2)}</div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 fs-5 fw-bold">
                        <div className="d-flex justify-content-between">
                            <span>Total items</span>
                            <span>{totalUnits} units</span>
                        </div>
                        <div className="d-flex justify-content-between">
                            <span>Total</span>
                            <span>RM {totalPrice.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
            {show && step === 1 && (
                <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100 }} onClick={handleClose}>
                    <div className="modal-dialog modal-dialog-centered" role="document" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header border-0">
                                <h5 className="modal-title w-100 text-center">Are you a member?</h5>
                            </div>
                            <div className="modal-body text-center">
                                <div className="d-flex justify-content-center gap-3">
                                    <button className="btn btn-dark px-4" onClick={() => setStep(2)}>Yes</button>
                                    <button className="btn btn-dark px-4" onClick={() => setStep(3)}>No</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {show && step === 2 && (
                <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100 }} onClick={handleClose}>
                    <div className="modal-dialog modal-dialog-centered" role="document" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header border-0">
                                <h5 className="modal-title w-100 text-center">Please enter your phone number:</h5>
                            </div>
                            <div className="modal-body text-center">
                                <input
                                    type="tel"
                                    className="form-control text-center"
                                    value={phone}
                                    placeholder="e.g. 0112345678"
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                                <div className="d-flex justify-content-center gap-2 mt-3">
                                    <button className="btn btn-dark px-4"
                                        onClick={() => {
                                            handlePhoneSubmit(phone);
                                            handleClose();
                                        }}
                                    >
                                        OK
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {show && step === 3 && (
                <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100 }} onClick={handleClose}>
                    <div className="modal-dialog modal-dialog-centered" role="document" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header border-0">
                                <h5 className="modal-title w-100 text-center">
                                    Do you want to join the membership to enjoy more discounts and free gifts?
                                </h5>
                            </div>
                            <div className="modal-body">
                                {showMore ? (
                                    <div className="text-start my-2" style={{ fontSize: 14 }}>
                                        <strong>Member welfare:</strong>
                                        <ol>
                                            <li>Get 20% discount when spent up to RM 100.00 for each purchase.</li>
                                            <li>Get a free gift for every RM 500.00 in the accumulated total spent.</li>
                                        </ol>
                                        <div className="text-end">
                                            <span className="text-primary" role="button" onClick={() => setShowMore(false)}>
                                                Read Less...
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-end">
                                        <span className="text-primary" role="button" onClick={() => setShowMore(true)}>
                                            Read More...
                                        </span>
                                    </div>
                                )}

                                <div className="d-flex justify-content-center gap-3 mt-3">
                                    <button className="btn btn-dark px-4"
                                        onClick={() => {
                                            navigate('/payment');
                                            handleClose();
                                        }}
                                    >
                                        No
                                    </button>
                                    <button className="btn btn-dark px-4"
                                        onClick={() => {
                                            navigate('/member');
                                            handleClose();
                                        }}
                                    >
                                        Yes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserBarcodeScan;