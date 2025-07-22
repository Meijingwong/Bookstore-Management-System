import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import '../CSS/UserThankYou.css';

export default function Redeem() {
    const [selectedGift, setSelectedGift] = useState('The Wager');
    const { memberid } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/');
        }, 30000); // 30 seconds

        return () => clearTimeout(timer);
    }, [navigate]);

    const handleRedeemGift = async () => {
        if (!memberid) return;

        try {
            const res = await axios.get(`/api/api/member/${memberid}`);
            const memberData = res.data;

            // Check if user is still eligible before processing
            const currentTotal = memberData.total_spent;
            const shouldBeEligible = currentTotal >= 500;

            if (!shouldBeEligible) {
                alert('You are no longer eligible to redeem a gift.');
                return;
            }

            // Proceed with redemption: deduct RM500 and increment gift count
            await axios.put(`/api/api/edit_member/${memberid}`, {
                member_name: memberData.member_name,
                phone_num: memberData.phone_num,
                total_spent: currentTotal - 500,
                is_eligible_gift: (currentTotal - 500) >= 500, // re-evaluate after deduction
                gift_get: memberData.gift_get + 1
            });

            // Generate PDF proof
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text("🎁 Gift Redemption Receipt", 20, 20);
            doc.setFontSize(12);
            doc.text(`Member Name: ${memberData.member_name}`, 20, 40);
            doc.text(`Phone Number: ${memberData.phone_num}`, 20, 50);
            doc.text(`Gift Redeemed: ${selectedGift}`, 20, 60);
            doc.text(`Redemption Date: ${new Date().toLocaleString()}`, 20, 70);
            doc.text("Please show this proof at the counter to claim your gift.", 20, 90);
            doc.save(`Gift_Redemption_${memberData.member_name}.pdf`);

            //alert('Gift successfully redeemed! Please check your downloaded PDF and claim the gift at the counter.');
            Swal.fire({
                title: 'Gift successfully redeemed!',
                text: 'Please check your downloaded PDF and claim the gift at the counter.',
                icon: 'success',
                confirmButtonText: 'OK'
            });
            navigate('/thankyou');
        } catch (error) {
            console.error('Failed to fetch or update member data:', error);
            alert('Something went wrong while redeeming your gift.');
        }
    };

    return (
        <div className="thank-you-container position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center">
            <div className="message-box bg-white rounded border p-4 p-lg-5 text-center position-relative" style={{ maxWidth: 700, width: '100%' }}>
                <p className="fs-4 fw-bold">
                    Congratulations! You’ve spent more than <span className="text-primary">RM 500.00</span> in our book store,
                    you can choose a free gift from the list below:
                </p>

                <div className="d-flex flex-column flex-md-row justify-content-center align-items-center gap-3 mt-4">
                    <select className="form-select w-auto border border-secondary" value={selectedGift} onChange={(e) => setSelectedGift(e.target.value)}>
                        <option>The Wager</option>
                        <option>Tea Dummies</option>
                        <option>Happy!</option>
                        <option>Never Ending Sky</option>
                        <option>Learning React</option>
                    </select>

                    <button className="btn btn-dark" onClick={handleRedeemGift}>
                        Redeem Gift
                    </button>
                </div>
            </div>
            <div className="bookshelf-background"></div>
        </div>
    );
}