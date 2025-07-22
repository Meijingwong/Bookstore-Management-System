import React, { useEffect, useState } from 'react';
import { FaTrashAlt, FaEdit, FaSearch, FaChevronLeft, FaChevronRight, FaArrowDown, FaArrowUp } from 'react-icons/fa';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useDebounce } from '../components/useDebounce';

const phonePattern = /^\d{10,11}$/;

function isValidPhoneNumber(phone) {
  return phonePattern.test(phone);
}

const ManageMember = () => {
  const [members, setMembers] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [tempSearch, setTempSearch] = useState('');
  const debouncedSearchTerm = useDebounce(tempSearch, 100);
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('member_ID');
  const [order, setOrder] = useState('asc');

  const [showModal, setShowModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSpent, setEditSpent] = useState('');
  const [editGift, setEditGift] = useState('');

  // Fetch all members
  const fetchAllMembers = async () => {
    try {
      const res = await axios.get('/api/api/all_members', {
        params: {
          page,
          limit,
          sort_by: sortBy,
          order
        }
      });
      setMembers(res.data.results);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err.response?.data?.error || err.message);
    }
  };

  useEffect(() => {
    setSearchName(debouncedSearchTerm);
    setPage(1);
  }, [debouncedSearchTerm]);

  // Fetch members by name
  const fetchSearchedMembers = async () => {
    try {
      const res = await axios.get(`/api/api/search_member/name/${searchName}`, {
        params: {
          page,
          limit,
          sort_by: sortBy,
          order
        }
      });
      setMembers(res.data.results);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err.response?.data?.error || err.message);
    }
  };

  useEffect(() => {
    if (searchName.trim() === '') {
      fetchAllMembers();
    } else {
      fetchSearchedMembers();
    }
  }, [searchName, page, sortBy, order]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setOrder('asc');
    }
  };

  const editMember = async (e) => {
    e.preventDefault();

    if (!isValidPhoneNumber(editPhone)) {
      alert('Invalid phone format (must be 10–11 digits)');
      return;
    }

    const updatedName = editName.trim() !== '' ? editName : selectedMember.member_name;
    const updatedPhone = editPhone.trim() !== '' ? editPhone : selectedMember.phone_num;
    const updatedSpent = editSpent.trim() !== '' ? parseFloat(editSpent) : selectedMember.total_spent;
    const updatedGiftGet = editGift !== '' && editGift != null ? parseInt(editGift) : selectedMember.gift_get;

    const isEligibleGift = updatedSpent >= 500 ? 1 : 0;

    try {
      await axios.put(`/api/api/edit_member/${selectedMember.member_ID}`, {
        member_name: updatedName,
        phone_num: updatedPhone,
        total_spent: updatedSpent,
        is_eligible_gift: isEligibleGift,
        gift_get: updatedGiftGet,
      });

      await fetchAllMembers();   // Refresh table data
      setShowModal(false);           // Close modal
      toast.success('Member updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update member');
      console.error('Error:', err);
    }
  };

  const deleteMember = async (id) => {
    if (!window.confirm('Are you sure you want to delete this member?')) return;
    try {
      await axios.delete(`/api/api/delete_member/${id}`);
      setMembers(members.filter((m) => m.member_ID !== id));
      toast.success('Member deleted successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete member');
      console.error('Error:', err);
    }
  };

  const contentStyle = {
    marginTop: '60px',
    transition: 'margin 0.3s ease',
    padding: '20px'
  };

  return (
    <>
      <div className="container-fluid" style={contentStyle}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold mb-5">Manage Member</h2>

          {/* Search */}
          <div className="input-group input-group-sm mt-5" style={{ maxWidth: '300px' }}>
            <input
              type="text"
              className="form-control border-secondary rounded-start"
              placeholder="Search Name..."
              value={tempSearch}
              onChange={(e) => setTempSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearchName(tempSearch);
                  setPage(1);
                }
              }}
            />
            <button
              className="btn btn-outline-secondary rounded-end"
              type="button"
              onClick={() => {
                setSearchName(tempSearch);
                setPage(1);
              }}
            >
              <FaSearch />
            </button>
          </div>
        </div>
        <div className="flex-grow-1 overflow-auto">
          {/* Table */}
          <div className="table-responsive flex-grow-1">
            <table className="table table-bordered border-dark table-hover align-middle text-center w-100 h-100">
              <thead className="table-secondary border-dark">
                <tr>
                  <th onClick={() => handleSort('member_ID')} role="button">
                    Id{' '}
                    {sortBy === 'member_ID' ? (
                      order === 'asc' ? <FaArrowUp /> : <FaArrowDown />
                    ) : (
                      <>
                        <FaArrowUp className="text-muted" />
                        <FaArrowDown className="text-muted" />
                      </>
                    )}
                  </th>
                  <th onClick={() => handleSort('member_name')} role="button">
                    Name {' '}
                    {sortBy === 'member_name' ? (
                      order === 'asc' ? <FaArrowUp /> : <FaArrowDown />
                    ) : (
                      <>
                        <FaArrowUp className="text-muted" />
                        <FaArrowDown className="text-muted" />
                      </>
                    )}
                  </th>
                  <th>Phone Number</th>
                  <th onClick={() => handleSort('total_spent')} role="button">
                    Total Spent{' '}
                    {sortBy === 'total_spent' ? (
                      order === 'asc' ? <FaArrowUp /> : <FaArrowDown />
                    ) : (
                      <>
                        <FaArrowUp className="text-muted" />
                        <FaArrowDown className="text-muted" />
                      </>
                    )}
                  </th>
                  <th onClick={() => handleSort('gift_get')} role="button">
                    Gift Get {' '}
                    {sortBy === 'gift_get' ? (
                      order === 'asc' ? <FaArrowUp /> : <FaArrowDown />
                    ) : (
                      <>
                        <FaArrowUp className="text-muted" />
                        <FaArrowDown className="text-muted" />
                      </>
                    )}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan="6">No members found.</td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.member_ID}>
                      <td>{m.member_ID}</td>
                      <td>{m.member_name}</td>
                      <td>{m.phone_num}</td>
                      <td>RM {parseFloat(m.total_spent).toFixed(2)}</td>
                      <td>{m.gift_get}</td>
                      <td>
                        <button
                          className="btn btn-sm me-2"
                          onClick={() => {
                            setSelectedMember(m);
                            setEditName(m.member_name);
                            setEditPhone(m.phone_num);
                            setEditSpent(m.total_spent);
                            setEditGift(m.gift_get);
                            setShowModal(true);
                          }}
                        >
                          <FaEdit />
                        </button>
                        <button className="btn btn-sm" onClick={() => deleteMember(m.member_ID)}>
                          <FaTrashAlt />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-auto d-flex justify-content-center align-items-center gap-3 py-3">
            <button
              className="btn btn-link"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
            >
              <FaChevronLeft />
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              className="btn btn-link"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
        {showModal && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex justify-content-center align-items-center"
            style={{ zIndex: 1050 }}
          >
            <div className="bg-white p-4 rounded position-relative" style={{ minWidth: "400px" }}>
              <button
                className="btn-close position-absolute top-0 end-0 m-3"
                aria-label="Close"
                onClick={() => setShowModal(false)}
              />

              <h3 className="fw-bold mb-3">Edit</h3>
              <form onSubmit={editMember}>
                <div className="mb-2">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-2 d-flex gap-3">
                  <div>
                    <label className="form-label">Total Spent (RM)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editSpent}
                      onChange={(e) => setEditSpent(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Gifts Get</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editGift}
                      onChange={(e) => setEditGift(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-dark w-100 mt-3">
                  Save
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
};

export default ManageMember;