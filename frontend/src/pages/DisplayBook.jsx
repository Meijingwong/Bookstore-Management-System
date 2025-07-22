import React, { useState, useEffect, useRef } from "react";
import "../CSS/home.css";
import { FaArrowLeft, FaArrowRight, FaChevronDown } from "react-icons/fa";
import { Link } from "react-router-dom";
import axios from "axios";
import { useMediaQuery } from 'react-responsive';

// Utility function to wrap title, max 2 words per line
function RenderTitle2WordsPerRow({ title, rankLabel }) {
    const words = title ? title.split(" ") : [];
    let lines = [];
    for (let i = 0; i < words.length; i += 2) {
        lines.push(words.slice(i, i + 2).join(" "));
    }
    const lastLineRef = useRef(null);

    return (
        <span style={{ position: "relative", display: "inline-block", verticalAlign: "top" }}>
            {lines.map((line, idx) => {
                if (idx === lines.length - 1) {
                    return (
                        <span
                            ref={lastLineRef}
                            key={idx}
                            style={{ display: "block", position: "relative", width: "fit-content" }}
                        >
                            {line}
                            {rankLabel && (
                                <span
                                    style={{
                                        position: "absolute",
                                        top: "50%",
                                        left: "100%",
                                        transform: "translateY(-50%)",
                                        marginLeft: 50,
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {rankLabel}
                                </span>
                            )}
                        </span>
                    );
                }
                return (
                    <span key={idx} style={{ display: "block" }}>
                        {line}
                    </span>
                );
            })}
        </span>
    );
}

function useAutoSwipe(length, interval = 10000) {
    const [index, setIndex] = useState(0);
    const timerRef = useRef(null);
    useEffect(() => {
        if (length < 2) return;
        timerRef.current = setInterval(() => {
            setIndex((prev) => (prev + 1) % length);
        }, interval);
        return () => clearInterval(timerRef.current);
    }, [length, interval]);
    const goLeft = () => setIndex((prev) => (prev - 1 + length) % length);
    const goRight = () => setIndex((prev) => (prev + 1) % length);
    return [index, goLeft, goRight, setIndex];
}

function DisplayBook() {
    const isMobile = useMediaQuery({ maxWidth: 767 });
    const [books, setBooks] = useState([]);
    const [genres, setGenres] = useState([]);
    const [types, setTypes] = useState([]);
    const [selectedGenre, setSelectedGenre] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [loading, setLoading] = useState(true);

    const moreBooksRef = useRef(null);
    const [slideIn, setSlideIn] = useState(false);

    useEffect(() => {
        setSlideIn(false);
        setTimeout(() => setSlideIn(true), 50);
    }, []);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const res = await axios.get("http://localhost:5000/api/books");
                setBooks(res.data);
            } catch (err) {
                console.error("Failed to fetch books:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBooks();
    }, []);
    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const res = await axios.get("http://localhost:5000/api/genres");
                setGenres(res.data);
            } catch (err) {
                console.error("Failed to fetch genres:", err);
            }
        };
        fetchGenres();
    }, []);
    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const res = await axios.get("http://localhost:5000/api/types");
                setTypes(res.data);
            } catch (err) {
                console.error("Failed to fetch types:", err);
            }
        };
        fetchTypes();
    }, []);

    const getImageUrl = (img) => {
        if (!img || typeof img !== 'string') return "/default-cover.jpg";
        return img.startsWith("http") ? img : `http://localhost:5000${img}`;
    };

    const bestsellers = [...books].sort((a, b) => b.sales - a.sales).slice(0, 3);
    const [currentBestIndex, goLeft, goRight] = useAutoSwipe(
        bestsellers.length,
        10000
    );
    const currentBook = bestsellers[currentBestIndex];
    const topLabels = ["top1", "top2", "top3"];
    const topCrownUrl = "https://cdn4.iconfinder.com/data/icons/social-messaging-productivity-4/128/king2-512.png";


    const bestsellerRankLabel = (
        <span
            className="bestseller-rank-label"
            style={{
                background: "#f2db9e",
                color: "#7e5a16",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: "0.65rem",
                padding: "2px 9px",
                letterSpacing: 1,
                display: "inline-flex",
                alignItems: "center"
            }}>
            <img
                src={topCrownUrl}
                alt="top crown"
                style={{
                    width: 10,
                    height: 10,
                    verticalAlign: "middle",
                    marginRight: 5,
                    marginBottom: 3,
                }}
            />
            {topLabels[currentBestIndex]}
        </span>
    );

    // Filter
    const filteredBooks = books.filter((book) => {
        const genreMatch = selectedGenre ? book.genre === selectedGenre : true;
        const typeMatch = selectedType ? book.type === selectedType : true;
        return genreMatch && typeMatch;
    });
    const groupBooksIntoRows = (books, booksPerRow = 4) => {
        const rows = [];
        for (let i = 0; i < books.length; i += booksPerRow) {
            rows.push(books.slice(i, i + booksPerRow));
        }
        return rows;
    };
    const bookRows = groupBooksIntoRows(filteredBooks.slice(0, 12));

    const handleScrollDown = () => {
        if (moreBooksRef.current) {
            moreBooksRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <div className="my-section-bg homemain">
            <div className="container py-3 py-md-5 top-container">
                {/* All-Time Bestsellers - Responsive Design */}
                <section className="bestseller-moveup-section mb-4 mb-md-5">
                    <div className="bestseller-carousel-wrapper bigger-bg">
                        <div className="bestseller-header-row text-center text-md-start">
                            <h2 className="fw-bold bestseller-heading-inside mb-3 mb-md-0 home-h2" style={{ textDecoration: 'underline' }}>
                                All-Time Bestsellers
                            </h2>
                        </div>

                        {loading || !currentBook ? (
                            <div className="text-center">Loading...</div>
                        ) : isMobile ? (
                            // Mobile Bestseller Design
                            <div className={`bestseller-carousel ${slideIn ? "slide-in" : ""}`}>
                                <div className="d-flex justify-content-center mb-3">
                                    <img
                                        src={getImageUrl(currentBook.image)}
                                        alt={currentBook.title}
                                        className="img-fluid"
                                        style={{
                                            maxHeight: '300px',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.17)',
                                            borderRadius: '12px'
                                        }}
                                    />
                                </div>

                                <div className="bestseller-info text-white px-3">
                                    <h3 className="mb-3" style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                                        <RenderTitle2WordsPerRow title={currentBook.title} rankLabel={bestsellerRankLabel} />
                                    </h3>

                                    <div className="bestseller-info-row row mb-3">
                                        <div className="col-6">
                                            <div><b>ISBN:</b> {currentBook.isbn}</div>
                                            <div><b>Genre:</b> {currentBook.genre}</div>
                                        </div>
                                        <div className="col-6">
                                            <div><b>Category:</b> {currentBook.type}</div>
                                            <div><b>Author:</b> {currentBook.author}</div>
                                        </div>
                                    </div>

                                    <div className="bestseller-btn-row d-flex gap-2">
                                        <Link
                                            className="btn btn-outline-light flex-grow-1"
                                            to={`/display/${encodeURIComponent(currentBook.title)}`}
                                        >
                                            View Details
                                        </Link>
                                        <button
                                            className="btn btn-light flex-grow-1"
                                            onClick={handleScrollDown}
                                        >
                                            More Books
                                        </button>
                                    </div>

                                    <div className="d-flex justify-content-center mt-3 gap-4">
                                        <button
                                            className="bestseller-arrow-btn"
                                            onClick={goLeft}
                                            aria-label="Previous Book"
                                        >
                                            <FaArrowLeft style={{ fontSize: '1.5rem', color: "#fff" }} />
                                        </button>
                                        <button
                                            className="bestseller-arrow-btn"
                                            onClick={goRight}
                                            aria-label="Next Book"
                                        >
                                            <FaArrowRight style={{ fontSize: '1.5rem', color: "#fff" }} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Desktop Bestseller Design (your existing code)
                            <div
                                className={`bestseller-carousel d-flex align-items-center ${slideIn ? "slide-in" : ""}`}
                                style={{ minHeight: 410, marginTop: 0 }}
                            >
                                <div className="bestseller-info px-1 d-flex flex-column justify-content-center"
                                    style={{
                                        flexBasis: "41%",
                                        color: "#fff",
                                        fontFamily: "Montserrat, Arial, sans-serif",
                                        minWidth: 0,
                                        marginRight: "10px"
                                    }}
                                >
                                    <div>
                                        <h3
                                            style={{
                                                fontWeight: "bold",
                                                fontSize: "3.0rem",
                                                marginBottom: 50,
                                                whiteSpace: "normal",
                                                overflow: "visible",
                                                textOverflow: "clip",
                                                display: "flex",
                                                alignItems: "flex-start",
                                                gap: 14,
                                            }}
                                        >
                                            <span
                                                className="bestseller-title-main"
                                                style={{
                                                    color: "#fff",
                                                    fontSize: "3.1rem",
                                                    fontWeight: "bold",
                                                    lineHeight: 1.05,
                                                    maxWidth: 420,
                                                    textAlign: "left",
                                                    whiteSpace: "normal",
                                                    display: "inline-block",
                                                    verticalAlign: "top",
                                                    position: "relative"
                                                }}
                                            >
                                                <RenderTitle2WordsPerRow title={currentBook.title} rankLabel={bestsellerRankLabel} />
                                            </span>
                                        </h3>
                                        <div className="bestseller-info-row d-flex" style={{ fontSize: "1.08rem", marginBottom: 12, gap: "70px" }}>
                                            <div style={{ minWidth: 140 }}>
                                                <div><b>ISBN:</b> {currentBook.isbn}</div>
                                                <div><b>Genre:</b> {currentBook.genre}</div>
                                                <div><b>Publisher:</b> {currentBook.publisher}</div>
                                            </div>
                                            <div style={{ minWidth: 120 }}>
                                                <div><b>Category:</b> {currentBook.type}</div>
                                                <div><b>Author :</b> {currentBook.author}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bestseller-btn-row" style={{ marginTop: 24 }}>
                                        <Link
                                            className="btn btn-outline-light me-2"
                                            to={`/display/${encodeURIComponent(currentBook.title)}`}
                                        >
                                            View Details
                                        </Link>
                                        <button className="btn btn-light" onClick={handleScrollDown}>
                                            More Books
                                        </button>
                                    </div>
                                </div>
                                {/* Book Cover & Arrows */}
                                <div
                                    className="bestseller-cover d-flex flex-row align-items-center justify-content-center"
                                    style={{
                                        flexBasis: "59%",
                                        position: "relative",
                                        minWidth: 0,
                                        gap: 0
                                    }}
                                >

                                    <button
                                        className="bestseller-arrow-btn no-round left-arrow"
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            width: 38,
                                            height: 60,
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            position: "static",
                                            marginRight: "48px"
                                        }}
                                        aria-label="Previous Book"
                                        onClick={goLeft}
                                    >
                                        <i className="bi bi-arrow-left-short" style={{ fontSize: 38, color: "#fff" }} />
                                    </button>
                                    <img
                                        src={getImageUrl(currentBook.image)}
                                        alt={currentBook.title}
                                        style={{
                                            boxShadow: "0 8px 32px rgba(0,0,0,0.17)",
                                            borderRadius: "18px",
                                            background: "#fff",
                                            width: "340px",
                                            height: "480px",
                                            objectFit: "cover",
                                            display: "block",
                                        }}
                                    />

                                    <button
                                        className="bestseller-arrow-btn no-round right-arrow"
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            width: 38,
                                            height: 60,
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            position: "static",
                                            marginLeft: "48px"
                                        }}
                                        aria-label="Next Book"
                                        onClick={goRight}
                                    >
                                        <i className="bi bi-arrow-right-short" style={{ fontSize: 38, color: "#fff" }} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Swipe down icon */}
                    <div className="scroll-down-wrapper" style={{ marginTop: isMobile ? -20 : -40 }}>
                        <button className="scroll-down-btn" onClick={handleScrollDown} aria-label="Scroll to more books">
                            <FaChevronDown className="scroll-down-icon" style={{ fontSize: isMobile ? '3rem' : '5rem' }} />
                        </button>
                    </div>
                </section>

                {/* More Books - Responsive Bookshelf */}
                <section className="bookshelf-section bg-white p-3 p-md-4" ref={moreBooksRef}>
                    <h2 className="mb-3 mb-md-4 fw-bold heading-spaced home-h2">More Books</h2>

                    {/* Filters - Stack on mobile */}
                    <div className="row mb-3 mb-md-4 display-row   ">
                        <div className="d-flex flex-column flex-md-row align-items-center gap-2">
                            <select
                                className="form-select filtedropdown"
                                value={selectedGenre}
                                onChange={(e) => setSelectedGenre(e.target.value)}
                            >
                                <option value="">All Genre</option>
                                {genres.map((genre) => (
                                    <option key={genre} value={genre}>{genre}</option>
                                ))}
                            </select>
                            <select
                                className="form-select filtedropdown"
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                            >
                                <option value="">All Category</option>
                                {types.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bookshelf-container">
                        {loading ? (
                            <div className="text-center">Loading...</div>
                        ) : filteredBooks.length === 0 ? (
                            <div className="bookshelf-row">
                                <div className="bookshelf-row-inner">
                                    <div style={{
                                        width: "100%",
                                        height: "80px",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        fontSize: isMobile ? "1.5rem" : "2.5rem",
                                        color: "black"
                                    }}>
                                        No book Exist
                                    </div>
                                </div>
                                <div className="shelf"></div>
                            </div>
                        ) : (
                            isMobile ? (
                                // Mobile books layout - 1 per row
                                <div className="row row-cols-1 g-3   ">
                                    {filteredBooks.map((book) => (
                                        <div className="col" key={book.isbn}>
                                            <div className="book-display-card">
                                                <Link to={`/display/${encodeURIComponent(book.title)}`}>
                                                    <img
                                                        src={getImageUrl(book.image)}
                                                        className="display-card-img-top mx-auto"
                                                        alt={book.title}
                                                        style={{
                                                            height: "200px",
                                                            width: "140px",
                                                            objectFit: "cover"
                                                        }}
                                                    />
                                                </Link>
                                                <div className="book-info">
                                                    <h5 className="book-title">
                                                        {book.title}
                                                    </h5>
                                                    <p className="book-price">RM {parseFloat(book.price).toFixed(2)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                // Desktop books layout (your existing code)
                                bookRows.map((row, rowIndex) => (
                                    <div className="bookshelf-row" key={rowIndex}>
                                        <div className="bookshelf-row-inner">
                                            {row.map((book) => (
                                                <div className="book-shelf-item" key={book.isbn}>
                                                    <div
                                                        className="book-display-card"
                                                        style={{
                                                            background: "rgba(255,255,255,0.18)",
                                                            border: "none",
                                                            boxShadow: "0 4px 24px 0 rgba(31,38,135,0.07)",
                                                            backdropFilter: "blur(10px)",
                                                            WebkitBackdropFilter: "blur(10px)",
                                                            borderRadius: "16px",
                                                            padding: "1rem 0.5rem 0.7rem 0.5rem",
                                                            transition: "box-shadow 0.2s",
                                                            minHeight: 280,
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            alignItems: "center",
                                                        }}
                                                    >
                                                        <Link to={`/display/${encodeURIComponent(book.title)}`}>
                                                            <img
                                                                src={getImageUrl(book.image)}
                                                                className="display-card-img-top mx-auto"
                                                                alt={book.title}
                                                                style={{
                                                                    padding: "0.5rem",
                                                                    height: "190px",
                                                                    width: "140px",
                                                                    objectFit: "cover",
                                                                    margin: "0 auto",
                                                                    background: "#fff",
                                                                    borderRadius: "6px",
                                                                    border: "none",
                                                                    transition: "transform 0.2s",
                                                                    cursor: "pointer",
                                                                    boxShadow: "0 2px 10px rgba(0,0,0,0.07)"
                                                                }}
                                                            />
                                                        </Link>
                                                        <div className="book-info" style={{ width: "100%" }}>
                                                            <h5
                                                                className="book-title"
                                                                style={{
                                                                    color: "black",
                                                                    fontSize: "1.35rem",
                                                                    fontWeight: "bold",
                                                                    margin: "0.65rem 0 0.2rem 0",
                                                                    textAlign: "center",
                                                                    lineHeight: 1.2,
                                                                    minHeight: "2.7em", // for two lines
                                                                    wordBreak: "break-word",
                                                                    textShadow: "0 2px 8px rgba(0,0,0,0.20)"
                                                                }}
                                                            >
                                                                {book.title}
                                                            </h5>
                                                            <p className="book-price" style={{ textAlign: "center", color: "red", margin: 0, fontWeight: "bold" }}>RM {parseFloat(book.price).toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="shelf"></div>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default DisplayBook;