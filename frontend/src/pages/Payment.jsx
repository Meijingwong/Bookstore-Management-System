import React, { useState } from 'react';
import { useCart } from '../components/CartContext.jsx';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import { FaQrcode, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import onlineBankingIcon from '../assets/images/onlinebanking-removebg-preview.png';
import creditDebitIcon from '../assets/images/mastercard-removebg-preview.png';

import cimbBankLogo from '../assets/images/Cimb_bank.png';
import publicBankLogo from '../assets/images/publicbank.png';
import maybankLogo from '../assets/images/maybank.png';
import rhbBankLogo from '../assets/images/rhb.png';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

const PaymentForm = () => {
    const { cart, clearCart } = useCart();
    const stripe = useStripe();
    const elements = useElements();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const memberId = queryParams.get('memberId');
    const [paymentMethod, setPaymentMethod] = useState('onlinebanking');
    const [selectedBank, setSelectedBank] = useState('');
    const [cardDetails, setCardDetails] = useState({
        cardHolderName: ''
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    // Calculate cart totals
    const safeCart = Array.isArray(cart) ? cart : [];
    const totalItems = safeCart.reduce((sum, item) => sum + (item.units || 0), 0);
    let totalPrice = safeCart.reduce((sum, item) => sum + (item.units || 0) * (item.price || 0), 0);
    let discountApplied = false;

    if (memberId && totalPrice >= 100) {
        totalPrice *= 0.8; // Apply 20% discount
        discountApplied = true;
    }

    const banks = [
        { id: 'cimb', name: 'CIMB Bank', logo: cimbBankLogo },
        { id: 'public', name: 'Public Bank', logo: publicBankLogo },
        { id: 'maybank', name: 'Maybank', logo: maybankLogo },
        { id: 'rhb', name: 'RHB Bank', logo: rhbBankLogo },
    ];

    const paymentMethods = [
        {
            id: 'onlinebanking',
            name: 'Online Banking',
            icon: onlineBankingIcon,
            alt: 'Online Banking'
        },
        {
            id: 'card',
            name: 'Credit/Debit Card',
            icon: creditDebitIcon,
            alt: 'Credit/Debit Card'
        }
    ];

    const handleBankSelection = (bankId) => {
        setSelectedBank(bankId);
    };

    const createPaymentIntent = async (paymentData) => {
        try {
            const response = await axios.post('/api/api/payment/create-payment-intent', paymentData);

            return response.data; // contains success, message, clientSecret, etc.
        } catch (error) {
            const message =
                error.response?.data?.message || error.message || 'Payment failed';
            throw new Error(message);
        }
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        setError('');

        try {
            if (safeCart.length === 0) {
                throw new Error('Your cart is empty');
            }

            const paymentData = {
                paymentMethod,
                items: safeCart.map(item => ({
                    book_ISBN: item.isbn,
                    quantity: item.units,
                    price: item.price
                })),
                amount: totalPrice,
                memberid: memberId || '',
                currency: 'myr'
            };
            if (paymentMethod === 'onlinebanking') {
                if (!selectedBank) {
                    throw new Error('Please select a bank');
                }
                paymentData.bank = selectedBank;
                const { clientSecret } = await createPaymentIntent(paymentData);
                const paymentIntentId = clientSecret.split('_secret')[0]; // Extract ID
                const { error } = await stripe.confirmFpxPayment(clientSecret, {
                    payment_method: {
                        fpx: { bank: selectedBank }
                    },
                    return_url: `${window.location.origin}/e-receipt/${paymentIntentId}?memberId=${memberId}`
                });
                toast.success('Payment successful!');

                if (error) {
                    throw new Error(error.message);
                }
            } else if (paymentMethod === 'card') {
                if (!cardDetails.cardHolderName) {
                    throw new Error('Please enter card holder name');
                }

                if (!stripe || !elements) {
                    throw new Error('Stripe not initialized');
                }

                const { clientSecret } = await createPaymentIntent(paymentData);

                const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                    payment_method: {
                        card: elements.getElement(CardElement),
                        billing_details: {
                            name: cardDetails.cardHolderName
                        }
                    }
                });

                if (error) {
                    throw new Error(error.message);
                }

                if (paymentIntent.status === 'succeeded') {
                    toast.success('Payment successful!');
                    navigate(`/e-receipt/${paymentIntent.id}?memberId=${memberId}`);
                    clearCart();
                }
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const contentStyle = {
        marginTop: '60px',
        transition: 'margin 0.3s ease',
        padding: '20px',
    };

    return (
        <div className="container-fluid" style={contentStyle}>
            {/* Header section */}
            <div className="text-start fw-bold fs-4 mb-4 ps-4">
                <span style={{ cursor: 'pointer' }} onClick={() => navigate('/scan-barcode')}>
                    <FaArrowLeft /> Payment
                </span>
            </div>

            {/* Main content area using flexbox */}
            <div className="row justify-content-center px-4">
                <div className="col-12 col-md-5 mb-4 mb-md-0">
                    <div className="card p-4 bg-light">
                        <h2>Order Summary</h2>
                        <div className="card mt-3 p-3 d-flex flex-column gap-3">
                            <div className="d-flex justify-content-between mb-2">
                                <span>Total items:</span>
                                <span>{totalItems} units</span>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span>Total Amount:</span>
                                {discountApplied ? (
                                    <span className="text-danger">
                                        RM {totalPrice.toFixed(2)} <small className="text-muted">(20% discount applied)</small>
                                    </span>
                                ) : (
                                    <span>RM {totalPrice.toFixed(2)}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Method Selection */}
                <div className="col-12 col-md-7">
                    <div className="card p-4 d-flex flex-column">
                        <h2>Select Payment Method</h2>

                        <div style={{ flexGrow: 1, paddingBottom: '1rem' }}>
                            <div className="d-flex flex-wrap gap-3 my-4">
                                {paymentMethods.map((method) => (
                                    <div
                                        key={method.id}
                                        className={`p-3 border rounded d-flex flex-column align-items-center justify-content-center ${paymentMethod === method.id ? 'border-primary bg-light' : ''
                                            }`}
                                        style={{ width: '100px', height: '80px', cursor: 'pointer' }}
                                        onClick={() => setPaymentMethod(method.id)}
                                        title={method.name}
                                    >
                                        <img
                                            src={method.icon}
                                            alt={method.alt}
                                            style={{ width: '50px', height: '30px', objectFit: 'contain' }}
                                        />
                                        <small className="mt-2">{method.name}</small>
                                    </div>
                                ))}
                            </div>

                            {paymentMethod === 'onlinebanking' && (
                                <div className="mb-4">
                                    <h3>Select Your Bank</h3>
                                    <div className="row row-cols-2 row-cols-md-3 g-3 mt-2">
                                        {banks.map(bank => (
                                            <div
                                                key={bank.id}
                                                className="col"
                                                onClick={() => handleBankSelection(bank.id)}
                                            >
                                                <div className={`card p-3 text-center ${selectedBank === bank.id ? 'border-primary bg-light' : ''
                                                    }`} style={{ cursor: 'pointer' }}>
                                                    <img
                                                        src={bank.logo}
                                                        alt={bank.name}
                                                        style={{ width: '100%', height: '40px', objectFit: 'contain' }}
                                                        className="mb-2"
                                                    />
                                                    <small>{bank.name}</small>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(paymentMethod === 'card') && (
                                <form onSubmit={handlePayment} className="mb-4">
                                    <div className="mb-3">
                                        <label className="form-label">Card Details</label>
                                        <CardElement
                                            options={{
                                                style: {
                                                    base: {
                                                        fontSize: '16px',
                                                        color: '#424770',
                                                        '::placeholder': {
                                                            color: '#aab7c4',
                                                        },
                                                    },
                                                    invalid: {
                                                        color: '#9e2146',
                                                    },
                                                },
                                            }}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Cardholder Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="cardHolderName"
                                            value={cardDetails.cardHolderName}
                                            onChange={(e) => setCardDetails({ ...cardDetails, cardHolderName: e.target.value })}
                                            placeholder="John Doe"
                                            required
                                        />
                                    </div>
                                </form>
                            )}

                            {error && <div className="alert alert-danger">{error}</div>}
                        </div> {/* End of scrollable content area */}

                        <button
                            type="submit"
                            onClick={handlePayment}
                            disabled={isProcessing || totalItems === 0 ||
                                (paymentMethod === 'onlinebanking' && !selectedBank) ||
                                (paymentMethod === 'card' && (!cardDetails.cardHolderName || !stripe || !elements))}
                            className="btn btn-primary w-100 py-2 mt-auto"
                        >
                            {isProcessing ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Processing...
                                </>
                            ) : (
                                'Proceed to payment'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
const UserPaymentPage = () => {
    return (
        <Elements stripe={stripePromise}>
            <PaymentForm />
            <ToastContainer position="top-right" autoClose={3000} />
        </Elements>
    );
};

export default UserPaymentPage;