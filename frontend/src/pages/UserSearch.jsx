import React, { useEffect, useState, useMemo } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import axios from "axios";

function StarRating({ value, max = 5, size = 18 }) {
    const fullStars = Math.floor(value);
    const half = value - fullStars >= 0.5;
    const emptyStars = max - fullStars - (half ? 1 : 0);

    return (
        <span className="d-inline-flex align-items-center align-middle">
            {Array.from({ length: fullStars }).map((_, i) => (
                <span key={`full-${i}`} className="text-warning" style={{ fontSize: size }}>&#9733;</span>
            ))}
            {half && (
                <span className="position-relative d-inline-block" style={{ width: size * 0.9 }}>
                    <span className="d-inline-block position-absolute overflow-hidden" style={{ width: '50%', color: '#f2990b' }}>&#9733;</span>
                    <span className="d-inline-block position-absolute overflow-hidden" style={{ width: '50%', left: '50%', color: '#eee' }}>&#9733;</span>
                    <span style={{ opacity: 0 }}>&#9733;</span>
                </span>
            )}
            {Array.from({ length: emptyStars }).map((_, i) => (
                <span key={`empty-${i}`} className="text-secondary" style={{ fontSize: size }}>&#9733;</span>
            ))}
        </span>
    );
}

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

function containsKeyword(field, keyword) {
    return (
        typeof field === "string" &&
        keyword &&
        field.toLowerCase().includes(keyword.toLowerCase())
    );
}

function getTypeField(book) {
    return book.type || book.category || book.book_type || "";
}

const UserSearch = () => {
    const queryParams = useQuery();
    const filterType = queryParams.get("filterType");
    const typeOrGenre = queryParams.get("typeOrGenre");
    const searchQuery = queryParams.get("q") || "";
    console.log(queryParams, searchQuery, "Filter type:", filterType, "Type/Genre:", typeOrGenre);
    const navigate = useNavigate();
    const [books, setBooks] = useState([]);
    const [ratings, setRatings] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // --- fetch books ---
    useEffect(() => {
        let url = `http://localhost:5000/api/api/books/search?q=${encodeURIComponent(searchQuery)}`;
        if (filterType === "genre" && typeOrGenre) url += `&genre=${encodeURIComponent(typeOrGenre)}`;
        if (filterType === "type" && typeOrGenre) url += `&type=${encodeURIComponent(typeOrGenre)}`;
        setLoading(true);
        setError("");
        axios.get(url)
            .then((response) => setBooks(response.data))
            .catch(() => setError("Failed to load books. Please try again later."))
            .finally(() => setLoading(false));

    }, [searchQuery, filterType, typeOrGenre]);

    // --- fetch ratings data for each book on search result ---
    useEffect(() => {
        if (!books.length) {
            setRatings({});
            return;
        }
        let cancelled = false;
        async function fetchAllRatings() {
            const ratingsObj = {};
            await Promise.all(books.map(async (book) => {
                if (!book.isbn) {
                    ratingsObj[book.isbn] = { average: 0, count: 0 };
                    return;
                }
                try {
                    const res = await axios.get(`http://localhost:5000/api/feedback`, {
                        params: { isbn: book.isbn }
                    });
                    const feedbacks = res.data;

                    const count = feedbacks.length;
                    const avg = count
                        ? (feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / count).toFixed(1)
                        : 0;
                    ratingsObj[book.isbn] = { average: avg, count: count };
                } catch {
                    ratingsObj[book.isbn] = { average: 0, count: 0 };
                }
            }));
            if (!cancelled) setRatings(ratingsObj);
        }
        fetchAllRatings();
        return () => { cancelled = true; };
    }, [books]);

    // If filtering, just show all books as a single section
    // Else, classify by title/genre/type keyword match
    const { matchedByTitle, matchedByGenre, matchedByType } = useMemo(() => {
        if (filterType) return { matchedByTitle: [], matchedByGenre: [], matchedByType: [] };
        const matchedByTitle = [];
        const matchedByGenre = [];
        const matchedByType = [];
        books.forEach((book) => {
            const titleMatch = containsKeyword(book.title, searchQuery);
            const genreMatch = containsKeyword(book.genre, searchQuery);
            const typeMatch = containsKeyword(getTypeField(book), searchQuery);

            if (titleMatch) matchedByTitle.push(book);
            else if (genreMatch) matchedByGenre.push(book);
            else if (typeMatch) matchedByType.push(book);
        });
        return { matchedByTitle, matchedByGenre, matchedByType };
    }, [books, searchQuery, filterType]);

    const renderBooks = (arr) =>
        arr.map((book) => {
            const rating = ratings[book.isbn] || { average: 0, count: 0 };
            return (
                <Link
                    to={`/display/${encodeURIComponent(book.title)}`}
                    key={book.isbn || book.title}
                    className="d-flex align-items-start gap-4 bg-dark rounded-3 p-4 mb-4 text-white text-decoration-none position-relative"
                    style={{ minHeight: '170px' }}
                >
                    <img
                        src={
                            book.image
                                ? book.image.startsWith("http")
                                    ? book.image
                                    : `http://localhost:5000${book.image}`
                                : "https://via.placeholder.com/80x110?text=Book"
                        }
                        alt={book.title}
                        className="rounded"
                        style={{
                            width: '140px',
                            height: '180px',
                            objectFit: 'cover',
                            backgroundColor: '#eaeaea',
                            flexShrink: 0
                        }}
                    />
                    <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <h2 className="fw-bold mb-0" style={{ fontSize: '32px' }}>{book.title}</h2>
                            <span className="d-inline-flex align-items-center gap-1 ms-2">
                                <StarRating value={parseFloat(rating.average) || 0} size={15} />
                                <span className="text-warning fw-bold" style={{ fontSize: '15px' }}>
                                    {parseFloat(rating.average) ? rating.average : "0.0"}
                                </span>
                                <span className="text-muted" style={{ fontSize: '13px' }}>
                                    ({rating.count || 0})
                                </span>
                            </span>
                        </div>
                        <div className="text-info fw-medium mb-1">{book.author}</div>
                        <div className="text-light mb-1" style={{ fontSize: '0.97rem' }}>{book.publisher}</div>
                        <div className="text-success mb-1" style={{ fontSize: '0.97rem' }}>
                            {book.genre} {getTypeField(book) ? `| ${getTypeField(book)}` : ""}
                        </div>
                        <div className="d-flex gap-3 text-muted" style={{ fontSize: '15px' }}>
                            <div>RM{parseFloat(book.price).toFixed(2)}</div>
                            <div>Stock: {book.stock}</div>
                            <div>SKU: {book.isbn}</div>
                        </div>
                        {book.stock === 0 && (
                            <span className="position-absolute top-0 end-0 bg-danger text-white fw-bold px-2 py-1 rounded"
                                style={{ fontSize: '0.90rem', letterSpacing: '1px', margin: '10px 22px 0 0' }}>
                                SOLD OUT
                            </span>
                        )}
                    </div>
                </Link>
            );
        });

    return (
        <div className="min-vh-100 d-flex flex-column justify-content-center" style={{ marginTop: '60px' }}>
            <div className="container py-4" style={{ maxWidth: '980px' }}>
                {loading ? (
                    <div className="text-muted text-center" style={{ fontSize: '20px' }}>
                        Loading...
                    </div>
                ) : error ? (
                    <div className="text-danger text-center" style={{ fontSize: '20px' }}>
                        {error}
                    </div>
                ) : books.length ? (
                    <>
                        <div className="text-start fw-bold fs-4 mb-3" style={{ cursor: 'pointer' }}
                            onClick={() => navigate('/display-book')}>
                            <FaArrowLeft />
                        </div>
                        {filterType === "genre" && (
                            <>
                                <h3 className="text-dark fw-bold my-3">
                                    Books with genre "{typeOrGenre}"
                                </h3>
                                {renderBooks(books.filter(book => (book.genre || "").toLowerCase() === (typeOrGenre || "").toLowerCase()))}
                            </>
                        )}
                        {filterType === "type" && (
                            <>
                                <h3 className="text-dark fw-bold my-3">
                                    Books with type "{typeOrGenre}"
                                </h3>
                                {renderBooks(books.filter(book => (getTypeField(book) || "").toLowerCase() === (typeOrGenre || "").toLowerCase()))}
                            </>
                        )}
                        {!filterType && (
                            <>
                                {matchedByTitle.length > 0 && (
                                    <>
                                        <h3 className="text-dark fw-bold my-3">
                                            Book Title contains "{searchQuery}"
                                        </h3>
                                        {renderBooks(matchedByTitle)}
                                    </>
                                )}
                                {matchedByGenre.length > 0 && (
                                    <>
                                        <h3 className="text-dark fw-bold my-3">
                                            Genre contains "{searchQuery}"
                                        </h3>
                                        {renderBooks(matchedByGenre)}
                                    </>
                                )}
                                {matchedByType.length > 0 && (
                                    <>
                                        <h3 className="text-dark fw-bold my-3">
                                            Type contains "{searchQuery}"
                                        </h3>
                                        {renderBooks(matchedByType)}
                                    </>
                                )}
                                {matchedByTitle.length === 0 &&
                                    matchedByGenre.length === 0 &&
                                    matchedByType.length === 0 && (
                                        <div className="text-muted" style={{ fontSize: '20px' }}>No results found.</div>
                                    )}
                            </>
                        )}
                    </>
                ) : (
                    <div className="text-muted" style={{ fontSize: '20px' }}>No results found.</div>
                )}
            </div>
        </div>
    );
};

export default UserSearch;