import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import poster from '../assets/images/poster.png';
import '../CSS/UserMember.css';
import { FaArrowLeft, FaPlus, FaEdit, FaTrashAlt } from 'react-icons/fa';
import axios from 'axios';
import Swal from 'sweetalert2';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const phonePattern = /^\d{10,11}$/;

function isValidPhoneNumber(phone) {
    return phonePattern.test(phone);
}

const UserMember = () => {
    const [flippedCard, setFlippedCard] = useState(null);
    const [phoneInput, setPhoneInput] = useState('');
    const [searchPhone, setSearchPhone] = useState(null);
    const [memberData, setMemberData] = useState(null);
    // This state will trigger the useEffect when searching
    const [searchTrigger, setSearchTrigger] = useState(null);

    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        if (!searchTrigger) return;

        const fetchMember = async () => {
            try {
                // Step 1: Search member by phone
                const res1 = await axios.get(`/api/api/search_member/phone/${searchTrigger}`);
                const { member_ID } = res1.data;

                // Step 2: Get full member details by member_ID
                const res2 = await axios.get(`/api/api/member/${member_ID}`);
                const member = res2.data;

                // Update states
                setSearchPhone(searchTrigger);
                setMemberData(member);
            } catch (err) {
                if (err.response?.status === 404) {
                    toast.error('Phone number not found');
                    setPhoneInput('');
                    setSearchPhone(null);
                    setMemberData(null);
                    setEditName('');
                    setEditPhone('');
                    setSearchTrigger(null);
                } else {
                    toast.error('Failed to fetch member data');
                }

                setPhoneInput('');
                setSearchPhone(null);
                setMemberData(null);
                console.error('Fetch member error:', err);
            }
        };
        fetchMember();
    }, [searchTrigger]);

    const handleSearchClick = (e) => {
        e.preventDefault();            // Prevent form submit reload
        setSearchTrigger(phoneInput);  // Trigger useEffect to fetch member
    };

    const addMember = async (e) => {
        e.preventDefault();

        if (!isValidPhoneNumber(phoneInput)) {
            toast.error('Invalid phone format (must be 10–11 digits)');
            return;
        }

        if (!editName.trim()) {
            toast.error('Please enter the member name');
            return;
        }
        if (!phoneInput.trim()) {
            toast.error('Please enter a phone number');
            return;
        }

        try {
            await axios.post('/api/api/add_member', {
                member_name: editName,
                phone_num: phoneInput,
                total_spent: 0,
                is_eligible_gift: false,
                gift_get: 0,
            });

            toast.success('Member added successfully');

            // Clear fields after successful add
            setPhoneInput('');
            setEditName('');
            setSearchPhone(null);
            setMemberData(null);
            setEditPhone('');
            setSearchTrigger(null);

        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add member');
            console.error('Error:', err);
        }
    };

    const editMember = async (e) => {
        e.preventDefault();

        if (!isValidPhoneNumber(editPhone)) {
            alert('Invalid phone format (must be 10–11 digits)');
            return;
        }

        const updatedName = editName.trim() !== '' ? editName : memberData.member_name;
        const updatedPhone = editPhone.trim() !== '' ? editPhone : memberData.phone_num;

        try {
            await axios.put(`/api/api/edit_member/${memberData.member_ID}`, {
                member_name: updatedName,
                phone_num: updatedPhone,
                total_spent: memberData.total_spent,
                is_eligible_gift: memberData.is_eligible_gift,
                gift_get: memberData.gift_get,
            });

            toast.success('Member updated successfully');

            // Clear fields
            setPhoneInput('');
            setEditName('');
            setEditPhone('');
            setSearchPhone('');
            setMemberData(null);
        } catch (err) {
            toast.error('Failed to update member');
            console.error('Error:', err);
        }
    };

    const deleteMember = async (e) => {
        e.preventDefault();

        if (!phoneInput.trim()) {
            toast.error('Please enter a phone number');
            return;
        }

        try {
            // Step 1: Search member by phone number
            const res = await axios.get(`/api/api/search_member/phone/${phoneInput}`);
            const { member_ID } = res.data;

            // Step 2: Confirm deletion
            // const confirmed = window.confirm('Are you sure you want to delete this member?');
            // if (!confirmed) return;
            const result = await Swal.fire({
                title: 'Delete Member',
                text: "Are you sure you want to delete this member?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes'
            });

            if (result.isConfirmed) {
                await axios.delete(`/api/api/delete_member/${member_ID}`);
                toast.success('Member deleted successfully');
            }

            // Step 4: Reset all fields
            setPhoneInput('');
            setSearchPhone(null);
            setMemberData(null);
            setEditName('');
            setEditPhone('');
            setSearchTrigger(null);
        } catch (err) {
            if (err.response?.status === 404) {
                toast.error('Member not found');
                setPhoneInput('');
                setSearchPhone(null);
                setMemberData(null);
                setEditName('');
                setEditPhone('');
                setSearchTrigger(null);
            } else {
                toast.error('Failed to delete member');
            }
            console.error('Delete Error:', err);
        }
    };


    const handleFlip = (card) => {
        setFlippedCard(flippedCard === card ? null : card);
    };

    const contentStyle = {
        marginTop: '60px',
        transition: 'margin 0.3s ease',
        padding: '20px',
    };

    return (
        <>
            <div className="justify-content-center align-items-center" style={contentStyle}>
                <div className="text-start fw-bold fs-4 mb-3" style={{ cursor: 'pointer' }} onClick={() => navigate(-1)}>
                    <FaArrowLeft /> Member Portal
                </div>

                <div className="card mb-3">
                    <img src={poster} alt="Poster" className="card-img-top" />
                </div>

                <div className="mb-3">
                    <strong>Member welfare:</strong>
                    <ol>
                        <li>Get 20% discount when spent up to RM 100.00 for each purchase.</li>
                        <li>Get a free gift for every RM 500.00 in the accumulated total spent.</li>
                    </ol>
                </div>

                <div className="row text-center">
                    {['add', 'edit', 'delete'].map((action) => (
                        <div className="col-md-4 mb-3" key={action}>
                            <div className="card flip-card" onClick={() => handleFlip(action)}>
                                <div className={`flip-card-inner ${flippedCard === action ? 'flipped' : ''}`}>
                                    <div className="flip-card-front d-flex flex-column justify-content-center align-items-center text-white" style={{ backgroundColor: action === 'add' ? '#dc3545' : action === 'edit' ? '#0d6efd' : '#28a745' }}>
                                        {action === 'add' ? (
                                            <FaPlus size={48} className="mb-2" />
                                        ) : action === 'edit' ? (
                                            <FaEdit size={48} className="mb-2" />
                                        ) : (
                                            <FaTrashAlt size={48} className="mb-2" />
                                        )}
                                        <h4>
                                            {{
                                                add: 'Join Membership',
                                                edit: 'Update Info',
                                                delete: 'Quit Membership'
                                            }[action]}
                                        </h4>
                                    </div>

                                    <div className="flip-card-back p-3">
                                        {action === 'add' && (
                                            <form onClick={(e) => e.stopPropagation()} onSubmit={addMember}>
                                                <h2 className="fw-bold fs-4 mb-3">Join Membership</h2>

                                                <input
                                                    className="form-control mb-2"
                                                    placeholder="Name"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    required
                                                />

                                                <input
                                                    className="form-control mb-2"
                                                    placeholder="Phone Number"
                                                    value={phoneInput}
                                                    onChange={e => setPhoneInput(e.target.value)}
                                                    required
                                                />

                                                <button className="btn btn-danger w-100" type="submit">ADD</button>
                                            </form>
                                        )}
                                        {action === 'edit' && (
                                            <form onClick={(e) => e.stopPropagation()} onSubmit={editMember}>
                                                <h2 className="fw-bold fs-4 mb-3">Update Info</h2>

                                                <input
                                                    className="form-control mb-2"
                                                    placeholder="Phone Number"
                                                    value={phoneInput}
                                                    onChange={e => setPhoneInput(e.target.value)}
                                                />

                                                <button className="btn btn-secondary w-100 mb-2" onClick={handleSearchClick}>
                                                    SEARCH
                                                </button>

                                                {searchPhone && (
                                                    <>
                                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                                            <label className="me-1 mb-0 fw-bold" style={{ minWidth: "120px" }}>Member Name:</label>
                                                            <input
                                                                className="form-control"
                                                                placeholder="*New Name"
                                                                defaultValue={memberData?.member_name || ''}
                                                                onChange={(e) => setEditName(e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                                            <label className="me-1 mb-0 fw-bold" style={{ minWidth: "120px" }}>Phone Number:</label>
                                                            <input
                                                                className="form-control"
                                                                placeholder="*New Phone Number"
                                                                defaultValue={memberData?.phone_num || ''}
                                                                onChange={(e) => setEditPhone(e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        <button className="btn btn-primary w-100" type="submit">UPDATE</button>
                                                    </>
                                                )}
                                            </form>
                                        )}
                                        {action === 'delete' && (
                                            <form onClick={(e) => e.stopPropagation()} onSubmit={deleteMember}>
                                                <h2 className='fw-bold fs-4 mb-3'>Quit Membership</h2>
                                                <input className="form-control mb-2" placeholder="Phone Number" value={phoneInput}
                                                    onChange={e => setPhoneInput(e.target.value)} />
                                                <button className="btn btn-success w-100" type='submit'>DELETE</button>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <ToastContainer position="top-right" autoClose={3000} />
        </>
    );
};

export default UserMember;