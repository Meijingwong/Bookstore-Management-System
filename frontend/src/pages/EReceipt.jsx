import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { FaArrowLeft } from 'react-icons/fa';
import { useMediaQuery } from 'react-responsive';
import axios from 'axios';

const UserEReceipt = () => {
    const { transactionId } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const memberId = queryParams.get('memberId');
    const isMobile = useMediaQuery({ maxWidth: 767 });
    const [receiptData, setReceiptData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isEligible, setIsEligible] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!transactionId) return;
        const fetchReceiptData = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`/api/api/receipt/${transactionId}`);
                const rawData = response.data;

                let updatedData = { ...rawData }; // Clone to avoid direct mutation

                if (memberId && rawData.total >= 100) {
                    updatedData.discount = '20%';
                    updatedData.total = +(rawData.total * 0.8).toFixed(2);
                }

                setReceiptData(updatedData);
            } catch (err) {
                console.log(err);
                setError('Please try to refresh the page to get the e-receipt.');
            } finally {
                setLoading(false);
            }
        };

        fetchReceiptData();
    }, [transactionId, memberId]);

    useEffect(() => {
        const fetchMemberTotal = async () => {
            if (!memberId) return;

            try {
                const res = await axios.get(`/api/api/member/${memberId}`);
                const memberData = res.data;

                const shouldBeEligible = memberData.total_spent >= 500;
                setIsEligible(shouldBeEligible);

                await axios.put(`/api/api/edit_member/${memberId}`, {
                    member_name: memberData.member_name,
                    phone_num: memberData.phone_num,
                    total_spent: memberData.total_spent,
                    is_eligible_gift: shouldBeEligible,
                    gift_get: memberData.gift_get
                });

            } catch (error) {
                console.error('Failed to fetch or update member data:', error);
            }
        };

        fetchMemberTotal();
    }, [memberId]);

    const handlePrintReceipt = async () => {
        try {
            setLoading(true);

            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([595, 842]); // A4 size

            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            let y = page.getHeight() - 70;

            // Header
            page.drawText('Caterpillar', {
                x: 50,
                y,
                size: 18,
                font: fontBold,
                color: rgb(0, 0, 0)
            });

            page.drawText('BOOK STORE', {
                x: 50,
                y: y - 20,
                size: 14,
                font: font,
                color: rgb(0, 0, 0)
            });

            y -= 40;

            // Thank you message
            page.drawText('Thank you. Please come again.', {
                x: 50,
                y,
                size: 16,
                font: font,
                color: rgb(0, 0, 0)
            });

            y -= 30;

            // Date and Transaction ID
            page.drawText(`Date: ${new Date(receiptData.date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            })}`, {
                x: 50,
                y,
                size: 12,
                font: font,
                color: rgb(0, 0, 0)
            });

            y -= 20;

            if (receiptData.member) {
                page.drawText(`Member: ${receiptData.member.member_name}`, {
                    x: 50,
                    y,
                    size: 12,
                    font: font,
                    color: rgb(0, 0, 0)
                });
                y -= 20;
            }

            page.drawText(`Transaction ID: ${receiptData.transactionId}`, {
                x: 50,
                y,
                size: 12,
                font: font,
                color: rgb(0, 0, 0)
            });

            y -= 30;

            // Table headers
            page.drawText('ITEMS', {
                x: 50,
                y,
                size: 12,
                font: fontBold,
                color: rgb(0, 0, 0)
            });

            page.drawText('QTY', {
                x: 400,
                y,
                size: 12,
                font: fontBold,
                color: rgb(0, 0, 0)
            });

            page.drawText('PRICE', {
                x: 470,
                y,
                size: 12,
                font: fontBold,
                color: rgb(0, 0, 0)
            });

            y -= 20;

            // Items
            receiptData.items.forEach(item => {
                page.drawText(item.name, {
                    x: 50,
                    y,
                    size: 12,
                    font: fontBold,
                    color: rgb(0, 0, 0)
                });

                y -= 15;

                page.drawText(`Price per unit: RM ${item.price.toFixed(2)} Unit selected: ${item.quantity}`, {
                    x: 50,
                    y,
                    size: 10,
                    font: font,
                    color: rgb(0, 0, 0)
                });

                y -= 15;

                page.drawText(item.quantity.toString(), {
                    x: 400,
                    y,
                    size: 12,
                    font: font,
                    color: rgb(0, 0, 0)
                });

                page.drawText(`RM ${(item.price * item.quantity).toFixed(2)}`, {
                    x: 470,
                    y,
                    size: 12,
                    font: font,
                    color: rgb(0, 0, 0)
                });

                y -= 25;
            });

            // Discount
            page.drawText(`Discount Applied: ${receiptData.discount}`, {
                x: 50,
                y,
                size: 12,
                font: font,
                color: rgb(0, 0, 0)
            });

            y -= 30;

            // Total
            page.drawText(`Total: RM ${receiptData.total.toFixed(2)}`, {
                x: 470,
                y,
                size: 14,
                font: fontBold,
                color: rgb(0, 0, 0)
            });

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `receipt-${receiptData.transactionId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setLoading(false);
            if (isEligible) {
                navigate(`/redeem/${memberId}`);
            } else {
                navigate('/thankyou');
            }
        } catch (err) {
            setError('Failed to generate PDF receipt');
            setLoading(false);
            console.error(err);
        }
    };

    if (loading) return <div className="loading-message">Loading receipt...</div>;
    if (error) return <div className="error-message">Error: {error}</div>;
    if (!receiptData) return <div className="loading-message">No receipt data found</div>;

    const contentStyle = {
        marginTop: '60px',
        transition: 'margin 0.3s ease',
        padding: '20px',
    };

    return (
        <div className="d-flex align-items-start justify-content-center" style={contentStyle}>
            <div className="text-start fw-bold fs-4" style={{ cursor: 'pointer' }}
                onClick={() => {
                    if (isEligible) {
                        navigate(`/redeem/${memberId}`);
                    } else {
                        navigate('/thankyou');
                    }
                }}>
                <FaArrowLeft />
            </div>
            <div className="row">
                <div className="container bg-white rounded shadow p-4 border border-secondary"
                    style={{ width: isMobile ? '500px' : '1000px', overflowY: 'auto', marginLeft: isMobile ? '30px' : '110px' }}>
                    <div className="text-center mb-4">
                        <h1 className="fs-3 fw-bold text-dark">Caterpillar</h1>
                        <p className="fs-5 text-secondary">BOOK STORE</p>
                    </div>

                    <h2 className="text-center fs-4 text-gray-800 mb-3">Thank you. Please come again.</h2>

                    <div className="border-top border-bottom border-gray-300 py-3 my-3">
                        <p className="text-center text-secondary">
                            <strong className="me-3">Date:</strong>
                            {new Date(receiptData.date).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            })}
                            <strong className="ms-5 me-3">Transaction ID:</strong>
                            {receiptData.transactionId}
                        </p>
                    </div>

                    <table className="table table-borderless mb-4">
                        <thead>
                            <tr>
                                <th className="text-start text-secondary ps-0">ITEMS</th>
                                <th className="text-end text-secondary pe-4">QTY</th>
                                <th className="text-end text-secondary pe-0">PRICE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receiptData.items.map((item, index) => (
                                <React.Fragment key={index}>
                                    <tr>
                                        <td className="fw-medium text-dark ps-0">{item.name}</td>
                                        <td className="text-end pe-4">{item.quantity}</td>
                                        <td className="text-end pe-0">RM {(item.price * item.quantity).toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan="3" className="text-muted small ps-0">
                                            Price per unit: RM {item.price.toFixed(2)} • Unit selected: {item.quantity}
                                        </td>
                                    </tr>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>

                    <div className="border-top border-bottom border-gray-300 py-3 my-3">
                        <h3 className="fs-5 fw-bold d-flex justify-content-between">
                            <span>Discount Applied</span>
                            <span>{receiptData.discount}</span>
                        </h3>
                    </div>

                    <div className="fs-5 fw-bold text-dark mt-3">
                        <h3 className="d-flex justify-content-between">
                            <span>Total</span>
                            <span>RM {receiptData.total.toFixed(2)}</span>
                        </h3>
                    </div>
                </div>
                <div className="d-flex justify-content-center gap-3 mt-4">
                    <button
                        onClick={handlePrintReceipt}
                        disabled={loading}
                        className="btn btn-warning fw-bold px-4 py-2"
                    >
                        {loading ? 'Generating PDF...' : 'Print E-Receipt'}
                    </button>
                    <button
                        onClick={() => {
                            if (isEligible) {
                                navigate(`/redeem/${memberId}`);
                            } else {
                                navigate('/thankyou');
                            }
                        }}
                        className="btn btn-outline-secondary fw-bold px-4 py-2"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserEReceipt;