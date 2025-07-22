import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { FaEdit, FaTrash, FaChevronLeft, FaChevronRight, FaChevronDown, FaChevronUp, } from "react-icons/fa";
import "../CSS/adminsearch.css";
import axios from "axios";
function useQuery() {
    return new URLSearchParams(useLocation().search);
}

const BooksSearchResults = () => {
    const query = useQuery().get("q") || "";


    const [books, setBooks] = useState([]);
    const [filteredBooks, setFilteredBooks] = useState([]);
    const [filters, setFilters] = useState({
        genre: "All",
        category: "All",
        lowStock: false,
        nullValues: false,
    });
    const [sortConfig, setSortConfig] = useState({ key: "title", direction: "asc" });
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedBook, setSelectedBook] = useState(null);
    const [formData, setFormData] = useState({});
    const [showGenreDropdown, setShowGenreDropdown] = useState(false);
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [showFilterGenreDropdown, setShowFilterGenreDropdown] = useState(false);
    const [showFilterCategoryDropdown, setShowFilterCategoryDropdown] = useState(false);
    const [newGenre, setNewGenre] = useState("");
    const [newType, setNewType] = useState("");
    const [genres, setGenres] = useState(["Fiction", "Non-fiction", "Fantasy"]);
    const [types, setTypes] = useState(["Ebook", "Hardcover", "Paperback"]);
    const [imageFile, setImageFile] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [pendingDeleteIsbn, setPendingDeleteIsbn] = useState(null);

    const genreRef = useRef(null);
    const categoryRef = useRef(null);

    //publisher
    const [publishers, setPublishers] = useState([]);
    const [showPublisherDropdown, setShowPublisherDropdown] = useState(false);
    const [newPublisherName, setNewPublisherName] = useState('');

    const itemsPerPage = 4;

    const [previewImage, setPreviewImage] = useState(null);
    // Fetch books on query change

    const fetchBooks = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/books/search`, {
                params: { q: query }
            });
            const data = res.data;

            setBooks(data);
            setFilteredBooks(data);
        } catch (err) {
            console.error("Failed to fetch books:", err);
            setBooks([]);
            setFilteredBooks([]);
        }
    };

    useEffect(() => {
        if (!query.trim()) {
            setBooks([]);
            setFilteredBooks([]);
            return;
        }
        fetchBooks();
    }, [query]);


    // Fetch genres and types
    useEffect(() => {
        fetchGenres();
        fetchTypes();
    }, []);

    const fetchGenres = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/genres");
            const data = res.data;
            setGenres(data);
        } catch (error) {
            console.error("Failed to fetch genres:", error);
        }
    };

    const fetchTypes = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/types");
            const data = res.data;
            setTypes(data);
        } catch (error) {
            console.error("Failed to fetch types:", error);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (genreRef.current && !genreRef.current.contains(event.target)) {
                setShowFilterGenreDropdown(false);
            }
            if (categoryRef.current && !categoryRef.current.contains(event.target)) {
                setShowFilterCategoryDropdown(false);
            }
        };

        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, []);

    // Apply filters
    const applyFilters = React.useCallback(() => {
        let filtered = [...books];

        if (filters.genre && filters.genre !== "All") {
            filtered = filtered.filter((b) => b.genre === filters.genre);
        }

        if (filters.category && filters.category !== "All") {
            filtered = filtered.filter((b) => b.type === filters.category);
        }

        if (filters.lowStock) {
            filtered = filtered.filter((b) => b.stock !== null && Number(b.stock) < 10);
        }

        if (filters.nullValues) {
            filtered = filtered.filter(
                (book) =>
                    !book.genre ||
                    !book.type ||
                    book.genre === "NULL" ||
                    book.type === "NULL"
            );
        }

        setFilteredBooks(filtered);
    }, [books, filters]);

    useEffect(() => {
        applyFilters();
        setCurrentPage(0);
    }, [filters, books, applyFilters]);

    // Sorting
    const handleSort = (key) => {
        setSortConfig((prev) => {
            if (prev.key === key) {
                return {
                    key,
                    direction: prev.direction === "asc" ? "desc" : "asc",
                };
            } else {
                return { key, direction: "asc" };
            }
        });
    };


    //Fetch publishers from backend

    const fetchPublishers = async () => {
        try {
            const response = await axios.get('http://localhost:5000/publisher/names');
            const data = response.data;
            // Extract publisher names from response
            setPublishers(data.data.map(p => p.publisher_name));
        } catch (err) {
            console.error('Error loading publishers:', err);
        }
    };


    useEffect(() => {
        fetchPublishers();
    }, []);

    //Add new publisher
    const handleAddPublisher = async () => {
        const trimmedPublisher = newPublisherName.trim();
        if (!trimmedPublisher) return;

        try {
            const response = await axios.post('http://localhost:5000/api/publisher',
                { name: trimmedPublisher }
            );

            // Update publishers list
            setPublishers(prev => [...prev, response.data.publisher.publisher_name]);
            setFormData(prev => ({
                ...prev,
                publisher: response.data.publisher.publisher_name
            }));

            setNewPublisherName('');
            setShowPublisherDropdown(false);
        } catch (err) {
            console.error('Error adding publisher:', err);
            alert('Failed to add publisher. Please try again.');
        }
    };




    const sortedBooks = [...filteredBooks].sort((a, b) => {
        const { key, direction } = sortConfig;
        const aVal = (a[key] ?? "").toString().toLowerCase();
        const bVal = (b[key] ?? "").toString().toLowerCase();
        if (aVal < bVal) return direction === "asc" ? -1 : 1;
        if (aVal > bVal) return direction === "asc" ? 1 : -1;
        return 0;
    });

    const totalPages = Math.ceil(sortedBooks.length / itemsPerPage);
    const displayedBooks = sortedBooks.slice(
        currentPage * itemsPerPage,
        currentPage * itemsPerPage + itemsPerPage
    );

    // Handlers
    const handleEditBook = (book) => {
        setFormData({
            isbn: book.isbn,
            title: book.title,
            price: book.price,
            stock: book.stock,
            genre: book.genre,
            type: book.type,
            publisher: book.publisher || "",
            author: book.author || "",
            //sales: book.sales?.toString() || "0",
        });
        setSelectedBook(book);
        // Show existing image in preview
        setPreviewImage(book.image || null);
        setImageFile(null); // Reset selected file
    };


    // Show delete modal on trash click
    const handleTrashClick = (isbn) => {
        setPendingDeleteIsbn(isbn);
        setShowDeleteModal(true);
    };

    const handleDeleteBook = async () => {
        try {
            await axios.delete(`http://localhost:5000/api/books/${pendingDeleteIsbn}`);

            setBooks((prev) => prev.filter((b) => b.isbn !== pendingDeleteIsbn));
            setShowDeleteModal(false);
            setPendingDeleteIsbn(null);
        } catch (error) {
            console.error("Error deleting book:", error);
            setShowDeleteModal(false);
            setPendingDeleteIsbn(null);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteModal(false);
        setPendingDeleteIsbn(null);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedBook) return;

        const formDataToSend = new FormData();
        formDataToSend.append("isbn", formData.isbn);
        formDataToSend.append("title", formData.title);
        formDataToSend.append("price", formData.price);
        formDataToSend.append("stock", formData.stock);
        formDataToSend.append("genre", formData.genre);
        formDataToSend.append("type", formData.type);
        formDataToSend.append("publisher", formData.publisher);
        formDataToSend.append("author", formData.author);
        //formDataToSend.append("sales", formData.sales);

        if (imageFile) {
            formDataToSend.append("image", imageFile);
        } else {
            formDataToSend.append("existingImage", selectedBook.image || "");
        }

        try {
            const response = await axios.put(
                `http://localhost:5000/api/books/${selectedBook.isbn}`,
                formDataToSend,
                {
                    headers: {
                        "Content-Type": "multipart/form-data"
                    }
                }
            );

            const updatedBook = response.data;

            setBooks((prevBooks) =>
                prevBooks.map((book) =>
                    book.isbn === selectedBook.isbn ? updatedBook : book
                )
            );
            setFilteredBooks((prevBooks) =>
                prevBooks.map((book) =>
                    book.isbn === selectedBook.isbn ? updatedBook : book
                )
            );

            setFormData({
                isbn: "",
                title: "",
                price: "",
                stock: "",
                genre: "",
                type: "",
                publisher: "",
                author: "",
                //sales: ""
            });

            alert("Book updated successfully!");
            setSelectedBook(null);
            setPreviewImage(null);
            setImageFile(null);
        } catch (error) {
            console.error("Error updating book:", error);
            if (error.message.includes("Only .jpg and .png images are allowed")) {
                alert("Error: Only .jpg and .png images are allowed!");
            } else {
                alert(`Failed to update the book. ${error.message}`);
            }
        }
    };


    const handleImageChange = (e) => setImageFile(e.target.files[0]);

    // Helper functions
    const increaseField = (field, step = 1, decimals = 0) => {
        setFormData(prev => {
            let val = parseFloat(prev[field]) || 0;
            val = +(val + step).toFixed(decimals);
            return { ...prev, [field]: decimals ? val.toFixed(decimals) : String(val) };
        });
    };
    const decreaseField = (field, step = 1, decimals = 0) => {
        setFormData(prev => {
            let val = parseFloat(prev[field]) || 0;
            val = +(val - step).toFixed(decimals);
            // Prevent negative
            if (val < 0) val = 0;
            return { ...prev, [field]: decimals ? val.toFixed(decimals) : String(val) };
        });
    };

    const contentStyle = {
        marginTop: '60px',
        transition: 'margin 0.3s ease',
        padding: '20px'
    };
    return (
        <div className="sr-container-fluid" style={contentStyle}>
            {/* HEADER with title on left and filters on right */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center py-3 mb-3 border-bottom">
                <h2 className="mb-0">{`Search Results for "${query}"`}</h2>
                {/* Filters Section */}
                <div
                    className="d-flex flex-wrap gap-3 align-items-center"
                    style={{ marginLeft: "auto" }}
                >
                    {/* Genre Filter */}
                    <div className="d-flex flex-column position-relative" ref={genreRef}>
                        <label style={{ fontSize: "0.9rem" }}>Genre:</label>
                        <div
                            className="sr-custom-dropdown sr-form-control d-flex align-items-center justify-content-between"
                            style={{
                                cursor: "pointer",
                                minHeight: "34px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                            onClick={() => {
                                setShowFilterGenreDropdown(!showFilterGenreDropdown);
                                setShowFilterCategoryDropdown(false);
                            }}
                        >
                            <span
                                style={{
                                    flex: 1,
                                    textAlign: "center",
                                    width: "100%",
                                    display: "block",
                                }}
                            >
                                {filters.genre || "All"}
                            </span>
                            <span style={{ marginLeft: 8 }}>
                                {showFilterGenreDropdown ? <FaChevronUp /> : <FaChevronDown />}
                            </span>
                        </div>
                        {showFilterGenreDropdown && (
                            <div className="dropdown-menu-custom">

                                <div
                                    className="dropdown-item-custom"
                                    onClick={() => {
                                        setFilters((prev) => ({ ...prev, genre: "All" }));
                                        setShowFilterGenreDropdown(false);
                                    }}
                                    style={{
                                        cursor: "pointer",
                                        textAlign: "center",
                                        width: "100%",
                                        display: "block"
                                    }}
                                >
                                    All
                                </div>
                                {genres.map((g) => (
                                    <div
                                        key={g}
                                        className="dropdown-item-custom d-flex justify-content-between align-items-center"
                                    >
                                        <span
                                            onClick={() => {
                                                setFilters((prev) => ({ ...prev, genre: g }));
                                                setShowFilterGenreDropdown(false);
                                            }}
                                            style={{
                                                flex: 1,
                                                cursor: "pointer",
                                                textAlign: "center",
                                                width: "100%",
                                                display: "block",
                                            }}
                                        >
                                            {g}
                                        </span>
                                        <span
                                            className="delete-btn"
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (
                                                    !window.confirm(
                                                        `Are you sure you want to delete "${g}"?`
                                                    )
                                                )
                                                    return;
                                                await fetch(
                                                    `http://localhost:5000/api/genres/${g}`,
                                                    { method: "DELETE" }
                                                );
                                                setGenres((prev) => prev.filter((genre) => genre !== g));
                                                setBooks((prev) =>
                                                    prev.map((b) =>
                                                        b.genre === g ? { ...b, genre: "" } : b
                                                    )
                                                );
                                                setFilteredBooks((prev) =>
                                                    prev.map((b) =>
                                                        b.genre === g ? { ...b, genre: "" } : b
                                                    )
                                                );
                                                if (filters.genre === g)
                                                    setFilters((prev) => ({ ...prev, genre: "All" }));
                                            }}
                                            title="Delete Genre"
                                        >
                                            ×
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Category Filter */}
                    <div className="d-flex flex-column position-relative" ref={categoryRef}>
                        <label style={{ fontSize: "0.9rem" }}>Book Type:</label>
                        <div
                            className="sr-custom-dropdown sr-form-control d-flex align-items-center justify-content-between"
                            style={{
                                cursor: "pointer",
                                minHeight: "34px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                            onClick={() => {
                                setShowFilterCategoryDropdown(!showFilterCategoryDropdown);
                                setShowFilterGenreDropdown(false);
                            }}
                        >
                            <span
                                style={{
                                    flex: 1,
                                    textAlign: "center",
                                    width: "100%",
                                    display: "block",
                                }}
                            >
                                {filters.category || "All"}
                            </span>
                            <span style={{ marginLeft: 8 }}>
                                {showFilterCategoryDropdown ? <FaChevronUp /> : <FaChevronDown />}
                            </span>
                        </div>
                        {showFilterCategoryDropdown && (
                            <div className="dropdown-menu-custom">

                                <div
                                    className="dropdown-item-custom"
                                    onClick={() => {
                                        setFilters((prev) => ({ ...prev, category: "All" }));
                                        setShowFilterCategoryDropdown(false);
                                    }}
                                    style={{
                                        cursor: "pointer",
                                        textAlign: "center",
                                        width: "100%",
                                        display: "block"
                                    }}
                                >
                                    All
                                </div>
                                {types.map((t) => (
                                    <div
                                        key={t}
                                        className="dropdown-item-custom d-flex justify-content-between align-items-center"
                                    >
                                        <span
                                            onClick={() => {
                                                setFilters((prev) => ({ ...prev, category: t }));
                                                setShowFilterCategoryDropdown(false);
                                            }}
                                            style={{
                                                flex: 1,
                                                cursor: "pointer",
                                                textAlign: "center",
                                                width: "100%",
                                                display: "block",
                                            }}
                                        >
                                            {t}
                                        </span>
                                        <span
                                            className="delete-btn"
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (
                                                    !window.confirm(
                                                        `Are you sure you want to delete "${t}"?`
                                                    )
                                                )
                                                    return;
                                                await fetch(
                                                    `http://localhost:5000/api/types/${t}`,
                                                    { method: "DELETE" }
                                                );
                                                setTypes((prev) => prev.filter((type) => type !== t));
                                                setBooks((prev) =>
                                                    prev.map((b) =>
                                                        b.type === t ? { ...b, type: "" } : b
                                                    )
                                                );
                                                setFilteredBooks((prev) =>
                                                    prev.map((b) =>
                                                        b.type === t ? { ...b, type: "" } : b
                                                    )
                                                );
                                                if (filters.category === t)
                                                    setFilters((prev) => ({ ...prev, category: "All" }));
                                            }}
                                            title="Delete Book Type"
                                        >
                                            ×
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Checkboxes */}
                    <div className="d-flex flex-column gap-2 mt-2">
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                checked={filters.lowStock}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        lowStock: e.target.checked,
                                    }))
                                }
                                id="lowStockCheck"
                            />
                            <label className="form-check-label" htmlFor="lowStockCheck">
                                Low Stock
                            </label>
                        </div>
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                checked={filters.nullValues}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        nullValues: e.target.checked,
                                    }))
                                }
                                id="nullValuesCheck"
                            />
                            <label className="form-check-label" htmlFor="nullValuesCheck">
                                Show NULL Values
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <hr
                style={{
                    margin: "18px 0 32px 0",
                    border: "none",
                    borderTop: "2px solid #e0e0e0",
                    width: "95%",
                }}
            />

            <div className="table-responsive-container">
                <div className="table-wrapper overflow-x-auto" style={{ width: "100%" }} >

                    <table className="sr-custom-table" style={{ minWidth: "100%", tableLayout: "fixed" }}>
                        <thead>
                            <tr className="table-header-black">
                                {[
                                    { key: "isbn", label: "ISBN" },
                                    { key: "title", label: "Name" },
                                    { key: "price", label: "Price (RM)" },
                                    { key: "stock", label: "Stock" },
                                    { key: "author", label: "Author" },
                                    { key: "sales", label: "Sales" },
                                    { key: "publisher", label: "Publisher" },
                                    { key: "genre", label: "Genre" },
                                    { key: "type", label: "Type" }
                                ].map((col) => (
                                    <th
                                        key={col.key}
                                        onClick={() => handleSort(col.key)}
                                        style={{ whiteSpace: "nowrap", cursor: "pointer" }}
                                    >
                                        <span style={{ color: "#fff", display: "flex", alignItems: "center", gap: 2 }}>
                                            {col.label}
                                            <span className="sort-arrow" style={{ marginLeft: 2 }}>
                                                {sortConfig.key === col.key
                                                    ? sortConfig.direction === "asc"
                                                        ? "↑"
                                                        : "↓"
                                                    : "↑"}
                                            </span>
                                        </span>
                                    </th>
                                ))}
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {displayedBooks.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="sr-text-center">
                                        No books found.
                                    </td>
                                </tr>
                            ) : (
                                displayedBooks.map((book) => (
                                    <tr key={book.isbn}>
                                        <td>{book.isbn}</td>
                                        <td>{book.title}</td>
                                        <td>{book.price}</td>
                                        <td>{book.stock}</td>
                                        <td>{book.author}</td>
                                        <td>{book.sales ?? 0}</td>
                                        <td>{book.publisher}</td>
                                        <td>{book.genre || "NULL"}</td>
                                        <td>{book.type || "NULL"}</td>
                                        <td>
                                            <div className="sr-action-icons">
                                                <FaEdit
                                                    className="icon"
                                                    onClick={() => handleEditBook(book)}
                                                    title="Edit"
                                                />
                                                <FaTrash
                                                    className="icon"
                                                    onClick={() => handleTrashClick(book.isbn)}
                                                    title="Delete"
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* sr-pagination */}
            <div
                className="sr-pagination d-flex justify-content-between align-items-center mt-3"
                style={{ maxWidth: "500px", margin: "0 auto" }}
            >
                <button
                    className="btn btn-link"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
                >
                    <FaChevronLeft size={20} />
                </button>
                <span>
                    Page {currentPage + 1} of {totalPages}
                </span>
                <button
                    className="btn btn-link"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))
                    }
                >
                    <FaChevronRight size={20} />
                </button>
            </div>
            {/* Edit Book Modal */}
            {selectedBook && (
                <div className="modal-overlay" onClick={() => setSelectedBook(null)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ minWidth: 360, maxWidth: 500 }}
                    >
                        <h4>Edit Book</h4>
                        <button className="sr-close-btn" onClick={() => setSelectedBook(null)}>&times;</button>
                        <br></br>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleFormChange}
                                    className="form-control"
                                    required
                                />
                            </div>
                            <div className="d-flex" style={{ alignItems: "center" }}>
                                <div className="sr-form-group col-md-5" style={{ marginRight: "20px" }}>
                                    <label>Price</label>
                                    <div className="input-group custom-number-input inside-input">
                                        <div className="input-group-prepend">
                                            <span className="input-group-text">RM</span>
                                        </div>
                                        <input
                                            type="text"
                                            name="price"
                                            value={formData.price}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    price: e.target.value.replace(/[^0-9.]/g, "")
                                                }))
                                            }
                                            className="form-control"
                                        />
                                        <div className="sr-input-arrows ">
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                className="sr-arrow-btn"
                                                onClick={() => increaseField("price", 0.1, 2)}
                                            >
                                                ▲
                                            </button>
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                className="sr-arrow-btn"
                                                onClick={() => decreaseField("price", 0.1, 2)}
                                            >
                                                ▼
                                            </button>
                                        </div>
                                        <span
                                            style={{
                                                position: "absolute",
                                                left: 8,
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                color: "#888",
                                                pointerEvents: "none",
                                                fontSize: "14px"
                                            }}
                                        >

                                        </span>
                                    </div>

                                </div>
                                <div className="sr-form-group col-md-5">
                                    <label>Stock</label>
                                    <div className="input-group custom-number-input inside-input">
                                        <input
                                            type="text"
                                            name="stock"
                                            value={formData.stock}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    stock: e.target.value.replace(/[^0-9]/g, "")
                                                }))
                                            }
                                            className="form-control"
                                        />
                                        <div className="sr-input-arrows ">
                                            <button type="button" tabIndex={-1} className="sr-arrow-btn" onClick={() => increaseField("stock", 1)}>▲</button>
                                            <button type="button" tabIndex={-1} className="sr-arrow-btn" onClick={() => decreaseField("stock", 1)}>▼</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Genre Dropdown */}
                            <div className="sr-form-group position-relative">
                                <label>Genre</label>
                                <div
                                    className="sr-custom-dropdown form-control"
                                    style={{
                                        cursor: "pointer",
                                        minHeight: "34px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                    onClick={() => {
                                        setShowGenreDropdown(!showGenreDropdown);
                                        setShowTypeDropdown(false);
                                    }}
                                >
                                    <span style={{ flex: 1, textAlign: "center" }}>
                                        {formData.genre || "----Select----"}
                                    </span>
                                    <span style={{ marginLeft: 8 }}>
                                        {showGenreDropdown ? <FaChevronUp /> : <FaChevronDown />}
                                    </span>
                                </div>
                                {showGenreDropdown && (
                                    <div className="dropdown-menu-custom">
                                        {genres.map((g) => (
                                            <div
                                                key={g}
                                                className="dropdown-item-custom d-flex align-items-center"
                                                style={{ justifyContent: 'center' }}
                                            >
                                                <span
                                                    onClick={() => {
                                                        setFormData((p) => ({ ...p, genre: g }));
                                                        setShowGenreDropdown(false);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        cursor: "pointer",
                                                        textAlign: "center",
                                                    }}
                                                >
                                                    {g}
                                                </span>
                                            </div>
                                        ))}

                                        <div
                                            className="dropdown-input-row d-flex align-items-center mt-2"
                                            style={{ width: 400, justifyContent: "center" }}
                                        >
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-primary"
                                                disabled={!newGenre.trim()}
                                                onClick={() => {
                                                    if (!newGenre.trim()) return;
                                                    setGenres((prev) => [...prev, newGenre.trim()]);
                                                    setFormData((p) => ({
                                                        ...p,
                                                        genre: newGenre.trim(),
                                                    }));
                                                    setNewGenre("");
                                                    setShowGenreDropdown(false);
                                                }}
                                            >
                                                +
                                            </button>
                                            <input
                                                className="form-control"
                                                style={{ marginLeft: 8, width: 320, textAlign: "center" }}
                                                placeholder="Type new genre..."
                                                value={newGenre}
                                                onChange={(e) => setNewGenre(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && newGenre.trim()) {
                                                        setGenres((prev) => [...prev, newGenre.trim()]);
                                                        setFormData((p) => ({
                                                            ...p,
                                                            genre: newGenre.trim(),
                                                        }));
                                                        setNewGenre("");
                                                        setShowGenreDropdown(false);
                                                    }
                                                }}
                                            />
                                        </div>

                                    </div>
                                )}
                            </div>
                            {/* Type Dropdown */}
                            <div className="sr-form-group position-relative">
                                <label>Type</label>
                                <div
                                    className="sr-custom-dropdown form-control"
                                    style={{
                                        cursor: "pointer",
                                        minHeight: "34px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                    onClick={() => {
                                        setShowTypeDropdown(!showTypeDropdown);
                                        setShowGenreDropdown(false);
                                    }}
                                >
                                    <span style={{ flex: 1, textAlign: "center" }}>
                                        {formData.type || "----Select----"}
                                    </span>
                                    <span style={{ marginLeft: 8 }}>
                                        {showTypeDropdown ? <FaChevronUp /> : <FaChevronDown />}
                                    </span>
                                </div>
                                {showTypeDropdown && (
                                    <div className="dropdown-menu-custom">
                                        {types.map((t) => (
                                            <div
                                                key={t}
                                                className="dropdown-item-custom d-flex align-items-center"
                                                style={{ justifyContent: 'center' }}
                                            >
                                                <span
                                                    onClick={() => {
                                                        setFormData((p) => ({ ...p, type: t }));
                                                        setShowTypeDropdown(false);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        cursor: "pointer",
                                                        textAlign: "center",
                                                    }}
                                                >
                                                    {t}
                                                </span>
                                            </div>
                                        ))}

                                        <div
                                            className="dropdown-input-row d-flex align-items-center mt-2"
                                            style={{ width: 400, justifyContent: "center" }}
                                        >
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-primary"
                                                disabled={!newType.trim()}
                                                onClick={() => {
                                                    if (!newType.trim()) return;
                                                    setTypes((prev) => [...prev, newType.trim()]);
                                                    setFormData((p) => ({
                                                        ...p,
                                                        type: newType.trim(),
                                                    }));
                                                    setNewType("");
                                                    setShowTypeDropdown(false);
                                                }}
                                            >
                                                +
                                            </button>
                                            <input
                                                className="form-control"
                                                style={{ marginLeft: 8, width: 320, textAlign: "center" }}
                                                placeholder="Type new..."
                                                value={newType}
                                                onChange={(e) => setNewType(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && newType.trim()) {
                                                        setTypes((prev) => [...prev, newType.trim()]);
                                                        setFormData((p) => ({
                                                            ...p,
                                                            type: newType.trim(),
                                                        }));
                                                        setNewType("");
                                                        setShowTypeDropdown(false);
                                                    }
                                                }}
                                            />

                                        </div>

                                    </div>
                                )}
                            </div>

                            {/* Publisher Dropdown */}
                            <div className="sr-form-group position-relative">
                                <label>Publisher</label>
                                <div
                                    className="sr-custom-dropdown form-control"
                                    style={{
                                        cursor: "pointer",
                                        minHeight: "34px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                    onClick={() => {
                                        setShowPublisherDropdown(!showPublisherDropdown);
                                        setShowGenreDropdown(false);
                                        setShowTypeDropdown(false);
                                    }}
                                >
                                    <span style={{ flex: 1, textAlign: "center" }}>
                                        {formData.publisher || "----Select----"}
                                    </span>
                                    <span style={{ marginLeft: 8 }}>
                                        {showPublisherDropdown ? <FaChevronUp /> : <FaChevronDown />}
                                    </span>
                                </div>

                                {showPublisherDropdown && (
                                    <div className="dropdown-menu-custom">
                                        {publishers.map((pub) => (
                                            <div
                                                key={pub}
                                                className="dropdown-item-custom d-flex align-items-center"
                                                style={{ justifyContent: 'center' }}
                                            >
                                                <span
                                                    onClick={() => {
                                                        setFormData((p) => ({ ...p, publisher: pub }));
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

                                        <div
                                            className="dropdown-input-row d-flex align-items-center mt-2"
                                            style={{ width: 400, justifyContent: "center" }}
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
                                                className="form-control"
                                                style={{ marginLeft: 8, width: 320, textAlign: "center" }}
                                                placeholder="Type new publisher..."
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



                            <div className="form-group">
                                <label>Author</label>
                                <input
                                    type="text"
                                    name="author"
                                    value={formData.author}
                                    onChange={handleFormChange}
                                    className="form-control"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Book Image</label>
                                {/* Show existing image preview */}
                                {previewImage && (
                                    <div style={{ marginBottom: 10 }}>
                                        <img
                                            src={
                                                previewImage.startsWith("blob:")
                                                    ? previewImage
                                                    : `http://localhost:5000${previewImage}`
                                            }
                                            alt="Book preview"
                                            style={{
                                                width: "120px",
                                                height: "auto",
                                                borderRadius: 4,
                                                border: "1px solid #ccc"
                                            }}
                                        />
                                    </div>
                                )}

                                <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png"
                                    onChange={handleImageChange}
                                />
                            </div>

                            <div className="d-flex justify-content-end mt-3">
                                <button
                                    className="btn btn-warning"
                                    type="submit"
                                    style={{ marginRight: "10px" }}
                                >
                                    Save Changes
                                </button>

                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div className="modal-overlay" onClick={handleCancelDelete}>
                    <div
                        className="modal-content bg-white p-4 rounded"
                        style={{
                            maxWidth: 350,
                            textAlign: "center",
                            border: "2px solid #ff9800",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h5 style={{ color: "#d32f2f", marginBottom: 16 }}>
                            Confirm Deletion
                        </h5>
                        <div style={{ marginBottom: 24, fontWeight: 500 }}>
                            Are you sure you want to <b>DELETE</b> the book?
                        </div>
                        <div className="d-flex justify-content-center gap-3">
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteBook}
                                style={{ minWidth: "90px" }}
                            >
                                Delete
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={handleCancelDelete}
                                style={{ minWidth: "90px" }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default BooksSearchResults;