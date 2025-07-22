import React, { useEffect, useState, useMemo, useRef } from "react";
import { FaEdit, FaTrash, FaPlus, FaChevronLeft, FaChevronRight, FaChevronDown, FaChevronUp } from "react-icons/fa";
import axios from "axios";
import "../CSS/ManageBook.css";
const ManageBook = () => {
  // State for books data
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [newGenre, setNewGenre] = useState("");
  const [newType, setNewType] = useState("");
  const [showFilterGenreDropdown, setShowFilterGenreDropdown] = useState(false);
  const [showFilterCategoryDropdown, setShowFilterCategoryDropdown] = useState(false);

  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [formData, setFormData] = useState({    //Stores form input values for editing/adding a book.
    isbn: "",
    title: "",
    price: "",
    stock: "",
    genre: "",
    type: "",
    publisher: "",
    author: "",
    sales: "0"
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // For filtering
  const [filters, setFilters] = useState({
    genre: "All",
    category: "All",
    lowStock: false,
    nullValues: false
  });

  // For dynamic options
  const [genres, setGenres] = useState(["Fiction", "Non-fiction", "Fantasy"]);
  const [types, setTypes] = useState(["Ebook", "Hardcover", "Paperback"]);

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const itemsPerPage = 4;
  const [currentPage, setCurrentPage] = useState(0);

  const genreRef = useRef(null);
  const categoryRef = useRef(null);

  // For delete confirmation alert
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleteCandidateIsbn, setDeleteCandidateIsbn] = useState(null);

  //publisher
  const [publishers, setPublishers] = useState([]);
  const [showPublisherDropdown, setShowPublisherDropdown] = useState(false);
  const [newPublisherName, setNewPublisherName] = useState('');
  const [isAddingPublisher, setIsAddingPublisher] = useState(false);

  // Fetch books on mount
  const fetchBooks = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/books");
      setBooks(res.data);
      setFilteredBooks(res.data);
    } catch (error) {
      console.error("Failed to fetch books:", error);
    }
  };

  const fetchGenres = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/genres");
      setGenres(res.data);
    } catch (error) {
      console.error("Failed to fetch genres:", error);
    }
  };

  const fetchTypes = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/types");
      setTypes(res.data);
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

  useEffect(() => {
    fetchBooks();
    fetchGenres();
    fetchTypes();
  }, []);

  const fetchPublishers = async () => {
    try {
      const response = await axios.get('/api/api/publisher/names');
      setPublishers(response.data);
    } catch (err) {
      console.error('Error loading publishers:', err.response?.data?.error || err.message);
    }
  };

  useEffect(() => {
    fetchPublishers();
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
      await fetchPublishers(); // Refresh the publisher list

      // Update selected publisher
      setFormData((prev) => ({
        ...prev,
        publisher: result.name,
      }));

      setNewPublisherName('');
      setShowPublisherDropdown(false);

    } catch (err) {
      console.error('Error adding publisher:', err);
    } finally {
      setIsAddingPublisher(false);
    }
  };

  const applyFilters = React.useCallback(() => {
    let updatedBooks = [...books];
    if (filters.genre !== "All") {
      updatedBooks = updatedBooks.filter((book) => book.genre === filters.genre);
    }
    if (filters.category !== "All") {
      updatedBooks = updatedBooks.filter((book) => book.type === filters.category);
    }
    if (filters.lowStock) {
      updatedBooks = updatedBooks.filter((book) => book.stock < 10);
    }
    if (filters.nullValues) {
      updatedBooks = updatedBooks.filter(
        (book) =>
          !book.genre ||
          !book.type ||
          book.genre === "NULL" ||
          book.type === "NULL"
      );
    }
    setFilteredBooks(updatedBooks);
    setCurrentPage(0);
  }, [books, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Sorting
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedBooks = useMemo(() => {
    if (!sortConfig.key) return filteredBooks;
    return [...filteredBooks].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [filteredBooks, sortConfig]);

  // Slice for current page
  const displayedBooks = useMemo(() => {
    const startIdx = currentPage * itemsPerPage;
    return sortedBooks.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedBooks, currentPage]);

  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);

  // Handle delete with confirmation
  const handleDeleteRequest = (isbn) => {
    setDeleteCandidateIsbn(isbn);
    setShowDeleteAlert(true);
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteAlert(false);
    if (!deleteCandidateIsbn) return;
    try {
      await axios.delete(`http://localhost:5000/api/books/${deleteCandidateIsbn}`);
      setBooks(prev => prev.filter((b) => b.isbn !== deleteCandidateIsbn));
      setDeleteCandidateIsbn(null);
    } catch (error) {
      console.error("Error deleting book:", error);
      setDeleteCandidateIsbn(null);
    }
  };


  const handleDeleteCancel = () => {
    setShowDeleteAlert(false);
    setDeleteCandidateIsbn(null);
  };

  // Handle edit
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
      //sales: book.sales?.toString() || "0"
    });
    setSelectedBook(book);
    // Show existing image in preview
    setPreviewImage(book.image || null);
    setImageFile(null); // Reset selected file
  };

  // Handle form change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Preview new image
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    let objectUrl;
    if (previewImage && previewImage.startsWith('blob:')) {
      objectUrl = previewImage;
    }
    return () => {
      //Releases memory when component unmounts or image changes via URL.revokeObjectURL().
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewImage]);

  // Handle Save (Update existing book)
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
    formDataToSend.append('existingImage', selectedBook.image || '');
    if (imageFile) formDataToSend.append('image', imageFile);

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

  // Add Book handler
  const handleAddBook = async (e) => {
    e.preventDefault();

    try {
      const formDataToSend = new FormData();
      const numericFields = ["price", "stock", "sales"];

      for (const key in formData) {
        const value = numericFields.includes(key)
          ? Number(formData[key])
          : formData[key];
        formDataToSend.append(key, value);
      }

      if (imageFile) {
        formDataToSend.append("image", imageFile);
      }

      const response = await axios.post(
        "http://localhost:5000/api/books",
        formDataToSend,
        {
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      const newBook = response.data;
      alert("Add book successful!");
      setBooks((prev) => [...prev, newBook]);
      setFilteredBooks((prev) => [...prev, newBook]);
      setCurrentPage(0);

      setShowAddBookModal(false);
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
      setImageFile(null);
    } catch (error) {
      console.error("Error adding book:", error);
      if (
        error.response &&
        error.response.data &&
        error.response.data.error
      ) {
        alert(`Failed to add the book: ${error.response.data.error}`);
      } else if (
        error.message.includes("Only .jpg and .png images are allowed")
      ) {
        alert("Error: Only .jpg and .png images are allowed!");
      } else {
        alert(`Failed to add the book. ${error.message}`);
      }
    }
  };

  // For up/down controls
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
    <div className="container-fluid" style={contentStyle}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center py-3 mb-3 border-bottom">
        <h2 className="fw-bold mb-5">Manage Book</h2>
        {/* Filters */}
        <div className="d-flex flex-wrap gap-3 mt-2">

          <div className="d-flex flex-column position-relative" ref={genreRef}>
            <label>Genre:</label>
            <div
              className="custom-dropdown form-control d-flex align-items-center justify-content-between manageform-control manage-custom-dropdown "
              style={{ width: "110px", cursor: "pointer" }}
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
              <div className="dropdown-menu-custom genredownmenu">

                <div
                  className="dropdown-item-custom dropdropitem"
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
                  <div key={g} className="dropdown-item-custom d-flex justify-content-between align-items-center dropddropitem">
                    <span
                      onClick={() => {
                        setFilters((prev) => ({ ...prev, genre: g }));
                        setShowFilterGenreDropdown(false);
                      }}
                      style={{ flex: 1, cursor: "pointer" }}
                    >
                      {g}
                    </span>
                    <span
                      className="delete-btn genredelete" 
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          if (
                            !window.confirm(
                              `Are you sure you want to delete "${g}"?`
                            )
                          )
                            return;
                          await fetch(`http://localhost:5000/api/genres/${g}`, {
                            method: "DELETE"
                          });
                          setGenres((prev) => prev.filter((genre) => genre !== g));
                          setBooks((prevBooks) =>
                            prevBooks.map((book) => {
                              if (book.genre === g) return { ...book, genre: "" };
                              return book;
                            })
                          );
                          setFilteredBooks((prevBooks) =>
                            prevBooks.map((book) => {
                              if (book.genre === g) return { ...book, genre: "" };
                              return book;
                            })
                          );
                          if (filters.genre === g) {
                            setFilters((prev) => ({ ...prev, genre: "All" }));
                          }
                        } catch (error) {
                          console.error("Delete error:", error);
                          alert(error.message);
                        }
                      }}
                    >
                      &times;
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="d-flex flex-column position-relative" ref={categoryRef}>
            <label>Book Type:</label>
            <div
              className="custom-dropdown form-control d-flex align-items-center justify-content-between manageform-control manage-custom-dropdown "
              style={{ width: "110px", cursor: "pointer" }}
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
              <div className="dropdown-menu-custom typedownmenu">

                <div
                  className="dropdown-item-custom dropdropitem"
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
                  <div key={t} className="dropdown-item-custom d-flex justify-content-between align-items-center dropddropitem">
                    <span
                      onClick={() => {
                        setFilters((prev) => ({ ...prev, category: t }));
                        setShowFilterCategoryDropdown(false);
                      }}
                      style={{ flex: 1, cursor: "pointer" }}
                    >
                      {t}
                    </span>
                    <span
                      className="delete-btn typedelete"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          if (
                            !window.confirm(
                              `Are you sure you want to delete "${t}"?`
                            )
                          )
                            return;
                          await fetch(`http://localhost:5000/api/types/${t}`, {
                            method: "DELETE"
                          });
                          setTypes((prev) => prev.filter((category) => category !== t));
                          setBooks((prevBooks) =>
                            prevBooks.map((book) => {
                              if (book.type === t) return { ...book, type: "" };
                              return book;
                            })
                          );
                          setFilteredBooks((prevBooks) =>
                            prevBooks.map((book) => {
                              if (book.type === t) return { ...book, type: "" };
                              return book;
                            })
                          );
                          if (filters.category === t) {
                            setFilters((prev) => ({ ...prev, category: "All" }));
                          }
                          // Optionally re-fetch books
                          const res = await fetch("http://localhost:5000/api/books");
                          const updatedBooks = await res.json();
                          setBooks(updatedBooks);
                          setFilteredBooks(updatedBooks);
                        } catch (error) {
                          console.error("Delete error:", error);
                          alert("Error deleting Book Type: " + error.message);
                        }
                      }}
                    >
                      &times;
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="d-flex flex-column gap-2">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="lowStockCheckbox"
                checked={filters.lowStock}
                onChange={(e) =>
                  setFilters({ ...filters, lowStock: e.target.checked })
                }
              />
              <label className="form-check-label" htmlFor="lowStockCheckbox">
                Low Stock
              </label>
            </div>
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="nullValueCheckbox"
                checked={filters.nullValues}
                onChange={(e) =>
                  setFilters({ ...filters, nullValues: e.target.checked })
                }
              />
              <label className="form-check-label" htmlFor="nullValueCheckbox">
                Show NULL Values
              </label>
            </div>
          </div>
        </div>
      </div>
      {/* Table */}
      <div className="table-responsive-container managetable">
        <div className="table-wrapper overflow-x-auto">
          <table className="custom-table w-100  managetable">
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
                  <th key={col.key} onClick={() => handleSort(col.key)} style={{ whiteSpace: "nowrap" }}>
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
                  <td colSpan="10" className="text-center">
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
                      <div className="action-icons">
                        <FaEdit
                          className="icon"
                          onClick={() => handleEditBook(book)}
                          title="Edit"
                        />
                        <FaTrash
                          className="icon"
                          onClick={() => handleDeleteRequest(book.isbn)}
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

      {showDeleteAlert && (
        <div className="modal-overlay editlayer" style={{ zIndex: 11000 }} onClick={handleDeleteCancel}>
          <div
            className="modal-content managemodal-content"
            style={{
              minWidth: 340,
              maxWidth: 400,
              background: "#fff",
              borderRadius: 8,
              padding: 24,
              textAlign: "center",
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h5 style={{ marginBottom: 20 }}>Delete Book</h5>
            <div style={{ marginBottom: 18, fontSize: 16 }}>
              Are you sure you want to <span style={{ color: "#d00", fontWeight: 600 }}>DELETE</span> this book?
            </div>
            <div className="d-flex justify-content-center gap-2 mt-2">
              <button className="btn btn-danger" style={{ minWidth: 90 }} onClick={handleDeleteConfirm}>
                Delete
              </button>
              <button className="btn btn-secondary" style={{ minWidth: 90 }} onClick={handleDeleteCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Pagination */}
      <div className="mt-auto d-flex justify-content-center align-items-center gap-3 py-3">
        <button
          className="btn btn-link managepage"
          disabled={currentPage === 0}
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
        >
          <FaChevronLeft size={20} />
        </button>
        <span>
          Page {currentPage + 1} of {totalPages}
        </span>
        <button
          className="btn btn-link managepage"
          disabled={currentPage >= totalPages - 1}
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))
          }
        >
          <FaChevronRight size={20} />
        </button>
      </div>
      {/* Add Book Button */}
      <div className="d-flex justify-content-end mt-4">
        <button
          className="btn btn-dark"
          onClick={() => setShowAddBookModal(true)}
          style={{
            borderRadius: "0",
            padding: "10px 25px",
            fontWeight: "600",
            textTransform: "uppercase"
          }}
        >
          <FaPlus className="mr-2" /> Add Book
        </button>
      </div>
      {/* Edit Book Modal */}
      {selectedBook && (
        <div className="modal-overlay editlayer" onClick={() => {
          setFormData({
            isbn: "",
            title: "",
            price: "",
            stock: "",
            genre: "",
            type: "",
            publisher: "",
            author: ""
          })
          setSelectedBook(null)
        }}>
          <div
            className="modal-content managemodal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ minWidth: 360, maxWidth: 500 }}
          >
            <h4>Edit Book</h4>
            <button className="formclose-btn" onClick={() => {
              setFormData({
                isbn: "",
                title: "",
                price: "",
                stock: "",
                genre: "",
                type: "",
                publisher: "",
                author: ""
              })
              setSelectedBook(null)
            }}>&times;</button>
            <br></br>
            <form onSubmit={handleSave}>
              <div className="form-group manageform-group">
                <label>Name</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  className="form-control manageform-control"
                  required
                />
              </div>
              <div className="d-flex" style={{ alignItems: "center" }}>
                <div className="form-group col-md-5 manageform-group" style={{ marginRight: "20px" }}>
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
                      className="form-control manageform-control"
                      required
                    />
                    <div className="manage-input-arrows">
                      <button
                        type="button"
                        tabIndex={-1}
                        className="manage-arrow-btn"
                        onClick={() => increaseField("price", 0.1, 2)}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        tabIndex={-1}
                        className="manage-arrow-btn"
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
                <div className="form-group col-md-5 manageform-group">
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
                      className="form-control manageform-control"
                      required
                    />
                    <div className="manage-input-arrows">
                      <button type="button" tabIndex={-1} className="manage-arrow-btn" onClick={() => increaseField("stock", 1)}>▲</button>
                      <button type="button" tabIndex={-1} className="manage-arrow-btn" onClick={() => decreaseField("stock", 1)}>▼</button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Genre Dropdown */}
              <div className="form-group position-relative manageform-group">
                <label>Genre</label>
                <div
                  className="custom-dropdown form-control manageform-control manage-custom-dropdown "
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
                  <div className="dropdown-menu-custom genredownmenu">
                    {genres.map((g) => (
                      <div
                        key={g}
                        className="dropdown-item-custom d-flex align-items-center dropddropitem"
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
                        className="form-control manageform-control"
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
              <div className="form-group position-relative manageform-group">
                <label>Type</label>
                <div
                  className="custom-dropdown form-control manageform-control manage-custom-dropdown "
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
                  <div className="dropdown-menu-custom typedownmenu">
                    {types.map((t) => (
                      <div
                        key={t}
                        className="dropdown-item-custom d-flex align-items-center dropddropitem"
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
                        className="form-control manageform-control"
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
              <div className="form-group position-relative manageform-group">
                <label>Publisher</label>
                <div
                  className="custom-dropdown form-control manageform-control manage-custom-dropdown "
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
                  <div className="dropdown-menu-custom publisherdownmenu">
                    {publishers.map((pub) => (
                      <div
                        key={pub}
                        className="dropdown-item-custom d-flex align-items-center dropddropitem"
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

                    {/* Add New Publisher Inline Input */}
                    <div
                      className="dropdown-input-row d-flex align-items-center mt-2"
                      style={{ width: 400, justifyContent: "center" }}
                    >
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={!newPublisherName.trim()}
                        onClick={() => {
                          setPublishers((prev) => [...prev, newPublisherName.trim()]);
                          setFormData((p) => ({
                            ...p,
                            publisher: newPublisherName.trim(),
                          }));
                          setNewPublisherName("");
                          setShowPublisherDropdown(false);
                        }}
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
                            setPublishers((prev) => [...prev, newPublisherName.trim()]);
                            setFormData((p) => ({
                              ...p,
                              publisher: newPublisherName.trim(),
                            }));
                            setNewPublisherName("");
                            setShowPublisherDropdown(false);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group manageform-group">
                <label>Author</label>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleFormChange}
                  className="form-control manageform-control"
                  required
                />
              </div>

              <div className="form-group manageform-group">
                <label>Book Image</label>
                {/* Show existing image preview = If the image is coming from a temporary upload preview, use it directly. Otherwise, it’s probably a server path, so add the server base URL to it*/}
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
                  className="btn btn-dark"
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
      {/* Add Book Modal */}
      {showAddBookModal && (
        <div className="modal-overlay editlayer" onClick={() => setShowAddBookModal(false)}>
          <div
            className="modal-content managemodal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ minWidth: 360, maxWidth: 500 }}
          >
            <h4>Add New Book</h4>
            <button className="formclose-btn" onClick={() => setShowAddBookModal(false)}>&times;</button>
            <br></br>
            <form onSubmit={handleAddBook}>
              <div className="form-group manageform-group">
                <label>ISBN</label>
                <input
                  type="text"
                  name="isbn"
                  value={formData.isbn}
                  onChange={handleFormChange}
                  className="form-control manageform-control"
                  required
                />
              </div>
              <div className="form-group manageform-group">
                <label>Name</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  className="form-control manageform-control"
                  required
                />
              </div>
              <div className="d-flex" style={{ alignItems: "center" }}>
                <div className="form-group col-md-5 manageform-group" style={{ marginRight: "20px" }}>
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
                        setFormData((prevData) => ({
                          ...prevData,
                          price: e.target.value.replace(/[^0-9.]/g, "")
                        }))
                      }
                      className="form-control manageform-control"
                      required
                    />
                    <div className="manage-input-arrows">
                      <button
                        type="button"
                        tabIndex={-1}
                        className="manage-arrow-btn"
                        onClick={() => increaseField("price", 0.1, 2)}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        tabIndex={-1}
                        className="manage-arrow-btn"
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
                <div className="form-group col-md-5 manageform-group">
                  <label>Stock</label>
                  <div className="input-group custom-number-input inside-input">
                    <input
                      type="text"
                      name="stock"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData((prevData) => ({
                          ...prevData,
                          stock: e.target.value.replace(/[^0-9]/g, "")
                        }))
                      }
                      className="form-control manageform-control"
                      required
                    />
                    <div className="manage-input-arrows">
                      <button type="button" tabIndex={-1} className="manage-arrow-btn" onClick={() => increaseField("stock", 1)}>▲</button>
                      <button type="button" tabIndex={-1} className="manage-arrow-btn" onClick={() => decreaseField("stock", 1)}>▼</button>

                    </div>
                  </div>
                </div>
              </div>
              {/* Genre Dropdown */}
              <div className="form-group position-relative manageform-group">
                <label>Genre</label>
                <div
                  className="custom-dropdown form-control manageform-control manage-custom-dropdown "
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
                  <div className="dropdown-menu-custom genredownmenu">
                    {genres.map((g) => (
                      <div
                        key={g}
                        className="dropdown-item-custom d-flex align-items-center dropddropitem"
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
                        className="form-control manageform-control"
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
              <div className="form-group position-relative manageform-group">
                <label>Type</label>
                <div
                  className="custom-dropdown form-control manageform-control manage-custom-dropdown "
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
                  <div className="dropdown-menu-custom typedownmenu">
                    {types.map((t) => (
                      <div
                        key={t}
                        className="dropdown-item-custom d-flex align-items-center dropddropitem"
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
                        className="form-control manageform-control"
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
              <div className="form-group position-relative manageform-group">
                <label>Publisher</label>
                <div
                  className="custom-dropdown form-control manageform-control manage-custom-dropdown "
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
                  <div className="dropdown-menu-custom publisherdownmenu">
                    {publishers.map((pub) => (
                      <div
                        key={pub}
                        className="dropdown-item-custom d-flex align-items-center dropddropitem"
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

                    {/* Add New Publisher Row */}
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
                        className="form-control manageform-control"
                        style={{ marginLeft: 8, width: 320, textAlign: "center" }}
                        placeholder="Type new..."
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

              <div className="form-group manageform-group">
                <label>Author</label>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleFormChange}
                  className="form-control manageform-control"
                  required
                />
              </div>
              <div className="form-group manageform-group">
                <label>Image</label>
                <input
                  type="file"
                  className="form-control-file manageform-control"
                  onChange={handleImageChange}
                  required
                />
              </div>
              <div className="d-flex justify-content-end mt-2">
                <button className="btn btn-dark" type="submit">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageBook;