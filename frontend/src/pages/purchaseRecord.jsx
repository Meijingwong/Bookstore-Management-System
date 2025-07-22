import React from 'react'
import { useState, useEffect } from 'react'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import axios from 'axios';

const PurchaseRecord = () => {
    const [records, setRecords] = useState([]);
    const [filteredRecords, setFilteredRecords] = useState([]);
    const [filterType, setFilterType] = useState('');
    const [filterValue, setFilterValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [publisherList, setPublisherList] = useState([]);
    const [showPublisherDropdown, setShowPublisherDropdown] = useState(false);
    const [newPublisherName, setNewPublisherName] = useState('');
    const [isAddingPublisher, setIsAddingPublisher] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [adminName, setAdminName] = useState('');

    const [newRecord, setNewRecord] = useState({
        publisher: '',
        stock: [{
            itemName: '',
            unit: '',
            unitPrice: ''
        }],
        date: new Date().toISOString().split('T')[0]
    });

    const adminId = localStorage.getItem("admin_ID");
    if (!adminId) throw new Error("No admin ID found");

    useEffect(() => {
        const fetchAdminName = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/admin-name/${adminId}`);
                setAdminName(res.data.admin_name);
            } catch (err) {
                console.error("Error fetching name:", err);
            }
        };
        fetchAdminName();
    }, [adminId]);

    useEffect(() => {
        if (adminName) {
            setNewRecord(prev => ({
                ...prev,
                recordedBy: adminName
            }));
        }
    }, [adminName]);

    // Fetch data on component mount
    useEffect(() => {
        fetchPurchaseRecords();
        fetchPublishersName();
    }, []);

    // Filter records when filter values change
    useEffect(() => {
        const filtered = records.filter((r) => {
            if (!filterValue) return true;
            if (!r) return false;

            if (filterType === 'date') return r.date?.includes?.(filterValue);
            if (filterType === 'publisher') {
                return r.publisher?.toLowerCase?.().includes(filterValue.toLowerCase());
            }
            if (filterType === 'recordedBy') {
                return r.recordedBy?.toLowerCase?.().includes(filterValue.toLowerCase());
            }
            return true;
        });
        setFilteredRecords(filtered);
    }, [records, filterType, filterValue]);

    // Fetch purchase records from API
    const fetchPurchaseRecords = async () => {
        try {
            const response = await axios.get('/api/api/purchase-records');
            const result = response.data;

            if (result.success) {
                setRecords(Array.isArray(result.data) ? result.data : []);
            } else {
                console.error('Failed to fetch records:', result.message);
                setRecords([]);
            }
        } catch (error) {
            console.error('Error fetching purchase records:', error);
            setRecords([]);
        }
    };

    // Handle stock input changes
    const handleStockChange = (index, field, value) => {
        const updatedStock = [...newRecord.stock];
        updatedStock[index][field] = value;
        setNewRecord({ ...newRecord, stock: updatedStock });
    };

    // Add new stock item row
    const handleAddColumn = () => {
        setNewRecord({
            ...newRecord,
            stock: [...newRecord.stock, { itemName: '', unit: '', unitPrice: '' }]
        });
    };

    // Save new purchase record
    const handleSave = async () => {
        // Validation
        if (!newRecord.publisher || !newRecord.date || newRecord.stock.some(item => !item.itemName)) {
            alert('Please fill in all required fields');
            return;
        }

        if (isSaving) return;
        setIsSaving(true);

        if (newRecord.stock.some(item => isNaN(item.unit) || isNaN(item.unitPrice))) {
            alert('Unit and Unit Price must be numbers');
            setIsSaving(false);
            return;
        }

        try {
            // Get publisher ID
            const pubResponse = await axios.get(
                `/api/api/publisher/${encodeURIComponent(newRecord.publisher)}`
            );
            const pubData = pubResponse.data;

            if (!pubData.success) throw new Error('Failed to get publisher ID');

            // Prepare request data
            const requestData = {
                admin_ID: adminId,
                publisher_ID: pubData.publisher_ID,
                date: newRecord.date,
                stock: newRecord.stock.map(item => ({
                    book_ISBN: item.itemName,
                    quantity: Number(item.unit),
                    unit_price: Number(item.unitPrice)
                }))
            };

            // Send request
            const response = await axios.post('/api/api/purchase-records', requestData);
            const data = response.data;

            if (data.success) {
                await fetchPurchaseRecords();
                handleCancel();
            } else {
                throw new Error(data.message || 'Failed to save record');
            }
        } catch (err) {
            console.error('Error saving record:', err);
            alert('Please check your input and try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const fetchPublishersName = async () => {
        try {
            const response = await axios.get('/api/api/publisher/names');
            setPublisherList(response.data);
        } catch (err) {
            console.error('Error loading publishers:', err.response?.data?.error || err.message);
            setPublisherList([]);
        }
    };

    useEffect(() => {
        fetchPublishersName();
    }, []);

    const handleAddPublisher = async () => {
        const trimmedName = newPublisherName.trim();

        // Frontend validation to match backend requirements
        if (!trimmedName) {
            alert('Publisher name cannot be empty');
            return;
        }

        setIsAddingPublisher(true);
        try {
            const response = await axios.post('/api/api/publisher',
                { publisher_name: trimmedName },
            );

            const result = response.data;

            if (!result.success) {
                // This shouldn't happen if server follows its own spec, but just in case
                throw new Error(result.message || 'Failed to add publisher');
            }

            // Success case - publisher was added
            await fetchPublishersName(); // Refresh the publisher list

            // Update the form with the newly added publisher
            setNewRecord(prev => ({
                ...prev,
                publisher: trimmedName
            }));

            setNewPublisherName('');
            setShowPublisherDropdown(false);

            // Optional: Show success message
            alert(result.message || 'Publisher added successfully');

        } catch (err) {
            console.error('Add publisher failed:', err);

            // Handle specific error cases from backend
            if (err.response) {
                const { status, data } = err.response;

                if (status === 400) {
                    // Bad request (validation errors)
                    alert(data.message || 'Invalid publisher name');
                }
                else if (status === 409) {
                    // Conflict - publisher exists
                    alert(data.message || 'Publisher already exists');

                    // Optional: If you want to use the existing publisher
                    setNewRecord(prev => ({
                        ...prev,
                        publisher: trimmedName
                    }));
                    setShowPublisherDropdown(false);
                }
                else {
                    // Other server errors (500, etc.)
                    alert(data.message || 'Failed to add publisher');
                }
            } else {
                // Network errors or other issues
                alert(err.message || 'Failed to add publisher');
            }
        } finally {
            setIsAddingPublisher(false);
        }
    };

    // Close modal and reset form
    const handleCancel = () => {
        setIsOpen(false);
        setNewPublisherName('');
        setShowPublisherDropdown(false);
        setNewRecord({
            recordedBy: 'John Doe',
            publisher: '',
            stock: [{ itemName: '', unit: '', unitPrice: '' }],
            date: new Date().toISOString().split('T')[0] // Reset to today's date
        });
    };

    // Open modal
    const handleOpenModal = () => {
        setIsOpen(true);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toISOString().split('T')[0];
    };

    const contentStyle = {
        marginTop: '60px',
        transition: 'margin 0.3s ease',
        padding: '20px'
    };

    return (
        <>
            <div className="container-fluid" style={contentStyle}>
                {isOpen && <div className="modal-backdrop fade show"></div>}

                <div id='changebackground'>
                    <h2 className="fw-bold mb-5">Purchase Records</h2>

                    <div className="row mb-4">
                        <div className="col-md-6 offset-md-6">
                            <div className="d-flex align-items-center justify-content-end">
                                <span className="me-3">Filter by:</span>
                                <select
                                    className="form-select form-select-sm me-3 w-auto"
                                    onChange={(e) => setFilterType(e.target.value)}
                                    value={filterType}
                                >
                                    <option value="">All</option>
                                    <option value="date">Date</option>
                                    <option value="publisher">Publisher</option>
                                    <option value="recordedBy">Recorded By</option>
                                </select>
                                {filterType && (
                                    <input
                                        type="text"
                                        className="form-control form-control-sm w-auto"
                                        placeholder={`Enter ${filterType} here`}
                                        value={filterValue}
                                        onChange={(e) => setFilterValue(e.target.value)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="table table-bordered border-dark rounded-5">
                            <thead className="table-secondary border-dark">
                                <tr>
                                    <th style={{ width: '20%' }}>Publisher</th>
                                    <th style={{ width: '22%' }}>Book Name</th>
                                    <th style={{ width: '8%' }}>Unit</th>
                                    <th style={{ width: '12%' }}>Unit Price (RM)</th>
                                    <th style={{ width: '12%' }}>Total Price (RM)</th>
                                    <th style={{ width: '10%' }}>Date</th>
                                    <th style={{ width: '16%' }}>Record added by</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className='text-center'>No records.</td>
                                    </tr>
                                ) : (filteredRecords.map((r, idx) => {
                                    if (!r || !r.stock) return null;

                                    const total = (r.stock || []).reduce((sum, item) => {
                                        const unit = Number(item.unit) || 0;
                                        const unitPrice = Number(item.unitPrice) || 0;
                                        return sum + unit * unitPrice;
                                    }, 0);

                                    return (r.stock || []).map((item, i) => (
                                        <tr key={`${idx}-${i}`}>
                                            {i === 0 && <td rowSpan={r.stock.length} className="align-top">{r.publisher || 'Unknown Publisher'}</td>}
                                            <td>{item.itemName || 'N/A'}</td>
                                            <td>{item.unit || '0'}</td>
                                            <td>{item.unitPrice || '0.00'}</td>
                                            {i === 0 && (
                                                <>
                                                    <td rowSpan={r.stock.length} className="align-top">{total.toFixed(2)}</td>
                                                    <td rowSpan={r.stock.length} className="align-top">{r.date ? formatDate(r.date) : 'N/A'}</td>
                                                    <td rowSpan={r.stock.length} className="align-top">{r.recordedBy || 'N/A'}</td>
                                                </>
                                            )}
                                        </tr>
                                    ));
                                }))}
                            </tbody>
                        </table>
                    </div>

                    <button
                        className="btn btn-dark float-end mt-4 me-3"
                        onClick={handleOpenModal}
                    >
                        Add New Record
                    </button>
                </div>

                {isOpen && (
                    <>
                        <div
                            className="modal fade show"
                            style={{ zIndex: 1040, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)' }}
                            onClick={handleCancel}
                        />

                        <div
                            className="modal fade show d-flex justify-content-center"
                            style={{ zIndex: 1050, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflow: 'auto' }}
                            onClick={handleCancel} // Clicking anywhere outside the modal content will trigger close
                        >
                            <div
                                className="modal-dialog modal-lg"
                                onClick={(e) => e.stopPropagation()} // Prevent modal content from triggering close
                            >
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title"><strong>Add New Purchase Record</strong></h5>
                                        <button type="button" className="btn-close" onClick={handleCancel}></button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="mb-3">
                                            <label className="form-label">Record added By...</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={newRecord.recordedBy}
                                                disabled
                                            />
                                        </div>

                                        {/* Publisher Dropdown */}
                                        <div className="form-group position-relative manageform-group">
                                            <label>Publisher</label>
                                            <div
                                                className="custom-dropdown form-control manageform-control manage-custom-dropdown"
                                                style={{
                                                    cursor: "pointer",
                                                    minHeight: "34px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center"
                                                }}
                                                onClick={() => {
                                                    setShowPublisherDropdown(!showPublisherDropdown);
                                                }}
                                            >
                                                <span style={{ flex: 1, textAlign: "center" }}>
                                                    {newRecord.publisher || "----Select----"}
                                                </span>
                                                <span style={{ marginLeft: 8 }}>
                                                    {showPublisherDropdown ? <FaChevronUp /> : <FaChevronDown />}
                                                </span>
                                            </div>

                                            {showPublisherDropdown && (
                                                <div className="dropdown-menu-custom publisherdownmenu">
                                                    {publisherList.map((pub) => (
                                                        <div
                                                            key={pub}
                                                            className="dropdown-item-custom d-flex align-items-center dropddropitem"
                                                            style={{ justifyContent: 'center' }}
                                                        >
                                                            <span
                                                                onClick={() => {
                                                                    setNewRecord((p) => ({ ...p, publisher: pub }));
                                                                    setShowPublisherDropdown(false);
                                                                }}
                                                                style={{
                                                                    flex: 1,
                                                                    cursor: "pointer",
                                                                    textAlign: "center",
                                                                }}
                                                            >
                                                                {pub}
                                                            </span>
                                                        </div>
                                                    ))}

                                                    {/* Add New Publisher Row */}
                                                    <div
                                                        className="dropdown-input-row d-flex align-items-center mt-2"
                                                        style={{ width: 400, justifyContent: "center", marginLeft: "auto", marginRight: "auto" }}
                                                    >
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-primary"
                                                            disabled={!newPublisherName.trim()}
                                                            onClick={handleAddPublisher}
                                                        >
                                                            +
                                                        </button>
                                                        <input
                                                            className="form-control manageform-control"
                                                            style={{ marginLeft: 8, width: 320, textAlign: "center" }}
                                                            placeholder={isAddingPublisher ? "Type new..." : "Type new..."}
                                                            value={newPublisherName}
                                                            onChange={(e) => setNewPublisherName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter" && newPublisherName.trim()) {
                                                                    e.preventDefault();
                                                                    handleAddPublisher();
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mb-3">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <label className="form-label">Book Stock Updated:</label>
                                                <button
                                                    onClick={handleAddColumn}
                                                    className="btn btn-outline-dark btn-sm"
                                                >
                                                    <strong>+</strong>
                                                </button>
                                            </div>

                                            <div className="table-responsive" style={{ maxHeight: '300px' }}>
                                                <table className="table table-bordered">
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: '50%' }}>Book ISBN</th>
                                                            <th style={{ width: '20%' }}>Unit</th>
                                                            <th style={{ width: '30%' }}>Unit Price</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {newRecord.stock.map((item, index) => (
                                                            <tr key={index}>
                                                                <td>
                                                                    <input
                                                                        className="form-control form-control-sm"
                                                                        placeholder="Book ISBN"
                                                                        value={item.itemName}
                                                                        onChange={(e) => handleStockChange(index, 'itemName', e.target.value)}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        className="form-control form-control-sm"
                                                                        value={item.unit}
                                                                        onChange={(e) => handleStockChange(index, 'unit', e.target.value)}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        className="form-control form-control-sm"
                                                                        value={item.unitPrice}
                                                                        onChange={(e) => handleStockChange(index, 'unitPrice', e.target.value)}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label">Recorded Date:</label>
                                            <input
                                                type="date"
                                                className="form-control w-50"
                                                value={newRecord.date}
                                                onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            className="btn btn-dark w-100"
                                            onClick={handleSave}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    Saving...
                                                </>
                                            ) : 'Add'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    )
}

export default PurchaseRecord