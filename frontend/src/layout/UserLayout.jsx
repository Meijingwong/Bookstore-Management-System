import React, { useContext, useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom'
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { RoleContext } from '../components/RoleContext.jsx';
import { useCart } from '../components/CartContext.jsx';
import axios from 'axios';
import { FaShoppingCart, FaSignOutAlt, FaHome, FaSearch } from 'react-icons/fa';
import logo from '../assets/images/logo1.png';
import "../CSS/Usersearchdrop.css";

const UserLayout = () => {
    const { logout } = useContext(RoleContext);
    const { cart, clearCart } = useCart();
    const location = useLocation();
    const currentPath = location.pathname;
    const navigate = useNavigate();

    const [query, setQuery] = useState("");
    const [filtered, setFiltered] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const containerRef = useRef(null);
    // Always dynamic: fetch all genres/types/books from backend (not just from filtered results)
    const [allGenres, setAllGenres] = useState([]);
    const [allTypes, setAllTypes] = useState([]);
    const [allBooks, setAllBooks] = useState([]);

    // Calculate cart totals
    const safeCart = Array.isArray(cart) ? cart : [];
    const cartCount = safeCart.reduce((sum, item) => sum + (item.units || 0), 0);

    // conditionally rendered button
    const showLogout = currentPath === '/';
    const isCartPage = currentPath.includes('/cart') || currentPath.includes('/payment');
    const isSearchPage = currentPath.includes('/search-book') || currentPath.includes('/display-book');
    const NotHomePage = currentPath != '/';

    const hasClearedRef = useRef(false);

    useEffect(() => {
        if (showLogout && !hasClearedRef.current) {
            clearCart();
            hasClearedRef.current = true;
        }
        if (!showLogout) {
            hasClearedRef.current = false; // reset if not on homepage
        }
    }, [showLogout, clearCart]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/search-book?q=${encodeURIComponent(query.trim())}`);
            setIsDropdownOpen(false);
        }
    };

    const getImageUrl = (img) => {
        if (!img || typeof img !== 'string') return "/default-cover.jpg";
        return img.startsWith("http") ? img : `http://localhost:5000${img}`;
    };

    useEffect(() => {
        if (document.getElementById("usersearch-css")) return;
        const style = document.createElement("style");
        style.id = "usersearch-css";

        document.head.appendChild(style);
        return () => {
            if (document.getElementById("usersearch-css")) {
                document.getElementById("usersearch-css").remove();
            }
        };
    }, []);

    // Fetch all genres and types and all books at load time 
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [genresRes, typesRes, booksRes] = await Promise.all([
                    axios.get("http://localhost:5000/api/genres"),
                    axios.get("http://localhost:5000/api/types"),
                    axios.get("http://localhost:5000/api/books"),
                ]);

                setAllGenres(genresRes.data || []);
                setAllTypes(typesRes.data || []);
                setAllBooks(booksRes.data || []);
            } catch (error) {
                // In case of error, reset states to empty arrays
                setAllGenres([]);
                setAllTypes([]);
                setAllBooks([]);
                console.error("Failed to fetch data:", error);
            }
        };

        fetchData();
    }, []);

    // Filtered books dynamically based on query (for left and right side)
    useEffect(() => {
        if (!query.trim()) {
            setFiltered([]);
            setIsDropdownOpen(false);
            return;
        }
        setFiltered(
            allBooks.filter(b => {
                if (b.title && b.title.toLowerCase().includes(query.toLowerCase())) return true;
                if (b.author && b.author.toLowerCase().includes(query.toLowerCase())) return true;
                if (b.genre && b.genre.toLowerCase().includes(query.toLowerCase())) return true;
                const bookType = b.type || b.category || b.book_type;
                if (bookType && bookType.toLowerCase().includes(query.toLowerCase())) return true;
                return false;
            })
        );
        setIsDropdownOpen(true);
    }, [query, allBooks]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        setIsDropdownOpen(true);
    };

    // Show genres/types that match the search input
    const genreMatches = allGenres.filter((g) => {
        if (!g) return false;
        return g.toLowerCase().includes(query.trim().toLowerCase());
    });

    const typeMatches = allTypes.filter((t) => {
        if (!t) return false;
        return t.toLowerCase().includes(query.trim().toLowerCase());
    });


    // "Popular search" = books whose title/author matches input, top 6
    const popularSuggestions = filtered
        .filter(
            (item) =>
                (item.title && item.title.toLowerCase().includes(query.toLowerCase())) ||
                (item.author && item.author.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 6);

    // Most relevant books for PRODUCTS (right side): rank by position of query in title/author/genre/type, then alphabetically
    const getBookMatchScore = (book) => {
        const q = query.trim().toLowerCase();
        if (!q) return 9999;
        let score = 9999;
        if (book.title && book.title.toLowerCase().includes(q))
            score = Math.min(score, book.title.toLowerCase().indexOf(q));
        if (book.author && book.author.toLowerCase().includes(q))
            score = Math.min(score, (book.author.toLowerCase().indexOf(q)) + 100);
        if (book.genre && book.genre.toLowerCase().includes(q))
            score = Math.min(score, (book.genre.toLowerCase().indexOf(q)) + 200);
        if ((book.type || book.category || book.book_type) &&
            (book.type || book.category || book.book_type).toLowerCase().includes(q))
            score = Math.min(score, ((book.type || book.category || book.book_type).toLowerCase().indexOf(q)) + 300);
        return score;
    };
    // Sort filtered by score, then title
    const mostMatchedBooks = [...filtered].sort((a, b) => {
        const sa = getBookMatchScore(a), sb = getBookMatchScore(b);
        if (sa !== sb) return sa - sb;
        return (a.title || "").localeCompare(b.title || "");
    });

    const handleLogout = () => {
        const safekey = prompt("Please enter the key to logout:");
        if (safekey !== 'caterpillar') {
            alert("Incorrect key. Logout cancelled.");
            return;
        }
        logout();
    }

    const style = {
        backgroundColor: '#78b04b',
        padding: '10px 20px',
        top: 0,
        position: 'fixed',
        width: '100%',
        zIndex: 500,
        transition: 'all 0.3s ease',
    };

    return (
        <>
            <nav
                style={style}
                className="navbar navbar-expand-lg text-white px-4 py-2 d-flex justify-content-between align-items-center shadow"
            >
                {/* Left: Logo and Store Name */}
                <div className="d-flex align-items-center">
                    <img
                        src={logo}
                        alt="Logo"
                        className="rounded-circle me-2"
                        style={{ width: '50px', height: '50px' }}
                    />
                    <div>
                        <h5 className="mb-0 fw-bold text-white">Caterpillar</h5>
                        <small className="text-white">BOOK STORE</small>
                    </div>
                </div>

                {/* Right: Logout Button (conditionally shown) */}
                {showLogout && (
                    <button
                        className="btn btn-link text-white d-flex align-items-center text-decoration-none fw-semibold"
                        onClick={handleLogout}
                    >
                        <span className="me-1 fs-5">Logout</span>
                        <FaSignOutAlt className="ms-1 fs-4" />
                    </button>
                )}
                {NotHomePage && (
                    <>
                        {/* Search Bar (conditionally shown) */}
                        {isSearchPage && (
                            <div ref={containerRef} className="position-relative w-50 mx-auto">
                                <form className="input-group" onSubmit={handleSubmit}>
                                    <input
                                        className="form-control border-end-0"
                                        type="search"
                                        placeholder="Search for books..."
                                        aria-label="Search"
                                        value={query}
                                        onChange={handleChange}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        autoComplete="off"
                                    />
                                    <button
                                        className="input-group-text bg-white border-start-0 text-secondary"
                                        type="submit"
                                        disabled={false}
                                    >
                                        <FaSearch className="text-secondary" />
                                    </button>
                                </form>
                                {isDropdownOpen && (filtered.length > 0 || query) && (
                                    <div className="usersearch-dropdown">
                                        <div className="usersearch-dropdown-scroll">

                                            <div className="usersearch-dropdown-left">
                                                <div>
                                                    <div className="usersearch-dropdown-label">GENRES</div>
                                                    <div className="usersearch-section-list">
                                                        {genreMatches.length ? genreMatches.map((g, i) => (
                                                            <span
                                                                className="usersearch-section-list-item"
                                                                key={g + i}
                                                                style={{ cursor: "pointer" }}
                                                                onClick={() => {
                                                                    navigate(
                                                                        `/search-book?filterType=genre&typeOrGenre=${encodeURIComponent(
                                                                            g
                                                                        )}&query=${encodeURIComponent(query)}`
                                                                    );
                                                                    setIsDropdownOpen(false);
                                                                }}
                                                            >
                                                                {g}
                                                            </span>
                                                        )) : <span className="usersearch-section-list-item" style={{ color: "#bbb" }}>No genre</span>}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="usersearch-dropdown-label">TYPES</div>
                                                    <div className="usersearch-section-list">
                                                        {typeMatches.length ? typeMatches.map((t, i) => (
                                                            <span
                                                                className="usersearch-section-list-item"
                                                                key={t + i}
                                                                style={{ cursor: "pointer" }}
                                                                onClick={() => {
                                                                    navigate(
                                                                        `/search-book?filterType=type&typeOrGenre=${encodeURIComponent(
                                                                            t
                                                                        )}&query=${encodeURIComponent(query)}`
                                                                    );
                                                                    setIsDropdownOpen(false);
                                                                }}
                                                            >
                                                                {t}
                                                            </span>
                                                        )) : <span className="usersearch-section-list-item" style={{ color: "#bbb" }}>No type</span>}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="usersearch-dropdown-label">POPULAR SEARCH</div>
                                                    <div className="usersearch-section-list">
                                                        {popularSuggestions.length > 0
                                                            ? popularSuggestions.map((item, idx) => (
                                                                <span
                                                                    className="usersearch-section-list-item"
                                                                    key={item.isbn || idx}
                                                                    style={{ display: "block", color: "#000", cursor: "pointer" }}
                                                                    onClick={() => {
                                                                        navigate(`/search-book?query=${encodeURIComponent(item.title)}`);
                                                                        setIsDropdownOpen(false);
                                                                    }}
                                                                >
                                                                    {item.title} <span style={{ color: "#888", fontWeight: 400 }}>by {item.author}</span>
                                                                </span>
                                                            ))
                                                            : <span className="usersearch-section-list-item" style={{ color: "#bbb" }}>No matches</span>
                                                        }
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="usersearch-dropdown-right">
                                                <div className="usersearch-dropdown-label">PRODUCTS</div>
                                                <div className="usersearch-product-list">
                                                    {mostMatchedBooks.map((item, idx) => (
                                                        <Link
                                                            to={`/display/${encodeURIComponent(item.title)}`}
                                                            className="usersearch-dropdown-product-link"
                                                            key={item.isbn || idx}
                                                            onClick={() => setIsDropdownOpen(false)}
                                                        >
                                                            <div className="usersearch-dropdown-product">
                                                                <div className="usersearch-product-cover">
                                                                    <img src={getImageUrl(item.image)} alt={item.title} className="usersearch-product-img" />
                                                                    {item.stock === 0 && (
                                                                        <span className="usersearch-sold-out">SOLD OUT</span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="usersearch-product-title">{item.title}</div>
                                                                    <div className="usersearch-product-meta">
                                                                        <span className="usersearch-product-isbn">SKU: {item.isbn}</span>
                                                                        <span className="usersearch-product-price">RM{parseFloat(item.price).toFixed(2)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Cart and Home Icons (conditionally shown) */}
                        <div className="ms-auto d-flex align-items-center gap-3">
                            {isCartPage && (
                                <>
                                    {/* Cart Icon */}
                                    < div className="position-relative" style={{ cursor: 'pointer' }} onClick={() => navigate('/cart')}>
                                        <FaShoppingCart size={24} className="text-white" />
                                        <span className="position-absolute top-10 start-100 translate-middle badge rounded-circle bg-danger">
                                            {cartCount}
                                        </span>
                                    </div>
                                </>
                            )}
                            {/* Home Icon */}
                            <FaHome size={24} className="text-white" style={{ cursor: 'pointer' }} onClick={() => navigate('/')} />

                            {/* Logout Icon */}
                            <FaSignOutAlt size={24} className="text-white" style={{ cursor: 'pointer' }} onClick={handleLogout} />
                        </div>
                    </>
                )}
            </nav >
            <Outlet />
        </>
    );
};

export default UserLayout;