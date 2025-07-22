import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';
import "../CSS/display.css";
import {
    FaStar, FaStarHalfAlt, FaRegStar, FaFrown, FaEllipsisH, FaThumbsUp, FaThumbsDown, FaPencilAlt, FaTrash,
    FaMeh, FaHourglassHalf, FaSmile, FaChevronDown, FaArrowLeft
} from "react-icons/fa";
import axios from "axios";

// Returns color for a star rank (1-5)
function getStarColor(star) {
    switch (star) {
        case 5: return "#d82323";
        case 4: return "#8D6F64";
        case 3: return "#ffe066";
        case 2: return "#2ecc71";
        case 1: return "#eee";
        default: return "#eee";
    }
}

function ReviewBars({ reviewCount, starPercents }) {
    return (
        <div className="mb-3">
            <div className="text-muted small fw-medium mb-2">
                {reviewCount} global ratings
            </div>
            <div className="review-bars">
                {[5, 4, 3, 2, 1].map((star) => (
                    <div className="d-flex align-items-center mb-2" style={{ height: "22px" }} key={star}>
                        <span className="text-dark fw-bold me-2" style={{ width: "54px", textAlign: "right" }}>
                            {star} <span className="ms-1">star</span>
                        </span>
                        <div className="bg-white border rounded-pill overflow-hidden mx-2"
                            style={{ width: "110px", height: "14px", borderColor: "#dfdfdf" }}>
                            <div
                                className="h-100 rounded-pill"
                                style={{
                                    width: `${starPercents[5 - star]}%`,
                                    background: getStarColor(star),
                                    transition: "width 0.5s"
                                }}
                            />
                        </div>
                        <span className="text-dark fw-bold ms-2" style={{ minWidth: "28px", textAlign: "right" }}>
                            {starPercents[5 - star]}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StarRating({ value, max = 5, size = 22 }) {
    const fullStars = Math.floor(value);
    const hasHalfStar = value - fullStars >= 0.5;
    const emptyStars = max - fullStars - (hasHalfStar ? 1 : 0);

    return (
        <div className="d-inline-flex align-items-center">
            {Array.from({ length: fullStars }).map((_, i) => (
                <FaStar key={`full-${i}`} color="#f2990b" size={size} className="me-1" />
            ))}
            {hasHalfStar && (
                <FaStarHalfAlt color="#f2990b" size={size} className="me-1" />
            )}
            {Array.from({ length: emptyStars }).map((_, i) => (
                <FaRegStar key={`empty-${i}`} color="#eee" size={size} className="me-1" />
            ))}
        </div>
    );
}

const starTitleWithIcon = (star) => {
    switch (star) {
        case 1: return (
            <span className="d-flex align-items-center justify-content-center fs-5">
                <FaFrown color="#b71c1c" className="me-2" />Very Poor
            </span>
        );
        case 2: return (
            <span className="d-flex align-items-center justify-content-center fs-5">
                <FaMeh color="#d84315" className="me-2" />Poor
            </span>
        );
        case 3: return (
            <span className="d-flex align-items-center justify-content-center fs-5">
                <FaHourglassHalf color="#ffb300" className="me-2" />Average
            </span>
        );
        case 4: return (
            <span className="d-flex align-items-center justify-content-center fs-5">
                <FaSmile color="#43a047" className="me-2" />Good
            </span>
        );
        case 5: return (
            <span className="d-flex align-items-center justify-content-center fs-5">
                <FaStar color="#f2990b" className="me-2" />Excellent
            </span>
        );
        default: return "";
    }
};

// Used in the review section: label only, no icon
const starTitle = (star) => {
    switch (star) {
        case 1: return "Very Poor";
        case 2: return "Poor";
        case 3: return "Average";
        case 4: return "Good";
        case 5: return "Excellent";
        default: return "";
    }
};

function formatDateTime(dateString) {
    let dateObj;
    if (dateString) {
        dateObj = new Date(dateString);
    } else {
        dateObj = new Date();
    }
    return dateObj.toLocaleString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: "2-digit", minute: "2-digit"
    });
}

function BookDetails() {
    const { title } = useParams();
    const navigate = useNavigate();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);

    // Feedback state
    const [feedbacks, setFeedbacks] = useState([]);
    const [refreshFeedback, setRefreshFeedback] = useState(false);

    // Review form modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [newRating, setNewRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [posting, setPosting] = useState(false);

    // Thank you post state
    const [showThanks, setShowThanks] = useState(false);

    // For edit mode
    const [editId, setEditId] = useState(null);

    // Dropdown card state
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Like/dislike state for each feedback (per user, local only)
    //const [votes, setVotes] = useState({}); // { feedbackId: "like" | "dislike" }

    // For dropdown menu in review actions
    const [openDropdown, setOpenDropdown] = useState(null);

    const reviewListRef = useRef(null);

    useEffect(() => {
        const fetchBook = async () => {
            try {
                const { data } = await axios.get("http://localhost:5000/api/books");

                let foundBook;
                if (data.find(
                    (b) => b.title.toLowerCase() === decodeURIComponent(title).toLowerCase()
                )) {
                    foundBook = data.find(
                        (b) => b.title.toLowerCase() === decodeURIComponent(title).toLowerCase()
                    );
                } else {
                    foundBook = null;
                }
                setBook(foundBook);
            } catch {
                console.error("Failed to fetch books");
            } finally {
                setLoading(false);
            }
        };
        fetchBook();
    }, [title]);

    useEffect(() => {
        if (!book) return;
        const fetchFeedbacks = async () => {
            try {
                const { data } = await axios.get(`http://localhost:5000/api/feedback`, {
                    params: { isbn: book.isbn },
                });

                setFeedbacks(data);
            } catch {
                setFeedbacks([]);
            }
        };
        fetchFeedbacks();
    }, [book, refreshFeedback]);


    useEffect(() => {
        const handleClick = () => setOpenDropdown(null);
        if (openDropdown !== null) {
            document.addEventListener("click", handleClick);
            return () => document.removeEventListener("click", handleClick);
        }
    }, [openDropdown]);

    // Review stats
    let reviewCount = feedbacks.length;
    let averageRating;
    if (reviewCount === 0) {
        averageRating = 0;
    } else {
        averageRating = (
            feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / reviewCount
        ).toFixed(1);
    }


    let starCounts = Array(5)
        .fill(0)
        .map((_, idx) =>
            feedbacks.filter((f) => f.rating === 5 - idx).length
        );
    let starPercents = starCounts.map((count) =>
        reviewCount === 0 ? 0 : Math.round((count / reviewCount) * 100)
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newRating || !comment.trim()) return alert("Please provide a rating and comment.");
        setPosting(true);
        try {
            if (editId) {
                await axios.put("http://localhost:5000/api/feedback", {
                    feedbackId: editId,
                    isbn: book.isbn,
                    rating: newRating,
                    comment,

                });
            } else {
                await axios.post("http://localhost:5000/api/feedback", {
                    isbn: book.isbn,
                    rating: newRating,
                    comment,

                });
            }
            setNewRating(0);
            setHoverRating(0);
            setComment("");
            setModalOpen(true);
            setEditId(null);
            setShowThanks(true);
            setRefreshFeedback((p) => !p);
        } catch {
            alert("Failed to submit feedback.");
        }
        setPosting(false);
    };

    // Edit from review card 
    const handleEdit = (f) => {
        setModalOpen(true);
        setEditId(f.Feedback_ID);
        setNewRating(f.rating);
        setComment(f.comment);
        setHoverRating(0);
        setShowThanks(false);
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Review',
            text: "Are you sure you want to delete this review?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`http://localhost:5000/api/feedback/${id}`);
                setFeedbacks((prev) => prev.filter(f => f.Feedback_ID !== id));
                setRefreshFeedback((p) => !p);
            } catch {
                alert("Failed to delete feedback.");
            }
        } else return;
    };


    const handleSeeReviews = () => {
        reviewListRef.current?.scrollIntoView({ behavior: "smooth" });
        setDropdownOpen(false);
    };

    const handleOpenModal = () => {
        setModalOpen(true);
        setNewRating(0);
        setHoverRating(0);
        setComment("");
        setEditId(null);
        setShowThanks(false);
    };

    // Initialize votes from localStorage
    const [votes, setVotes] = useState(() => {
        const savedVotes = localStorage.getItem("votes");
        return savedVotes ? JSON.parse(savedVotes) : {};
    });

    // Like/dislike handler
    const handleVote = (feedbackId, voteType) => {
        setVotes((prevVotes) => {
            const updatedVotes = { ...prevVotes };

            // Toggle vote: if already selected, remove it
            if (updatedVotes[feedbackId] === voteType) {
                delete updatedVotes[feedbackId];
            } else {
                updatedVotes[feedbackId] = voteType;
            }

            // Save to localStorage
            localStorage.setItem("votes", JSON.stringify(updatedVotes));

            return updatedVotes;
        });
    };

    if (loading) return <div>Loading...</div>;
    if (!book) return <div>Book not found.</div>;

    const contentStyle = {
        marginTop: '60px',
        transition: 'margin 0.3s ease',
        padding: '20px',
        fontFamily: "'Montserrat', Arial, sans-serif"
    };

    return (
        <div className="container py-4" style={contentStyle}>
            {/* Main row */}
            <div className="d-flex flex-column flex-md-row align-items-start gap-4 gap-md-5 w-100 position-relative">
                <div className="text-start fw-bold fs-4 mb-3" style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/display-book')}>
                    <FaArrowLeft />
                </div>
                {/* Left column */}
                <div className="d-flex flex-column" style={{ width: "260px", flexShrink: 0 }}>
                    <img
                        className="img-fluid rounded shadow mb-3"
                        src={`http://localhost:5000${book.image}`}
                        alt={book.title}
                        style={{ width: "210px", height: "300px", objectFit: "cover" }}
                    />
                    <div className="fw-bold">Price:</div>
                    <div className="display-4 fw-bold mb-3">RM {parseFloat(book.price).toFixed(2)}</div>

                    {/* Review box */}
                    <div className="bg-white rounded-3 p-4 shadow-sm mb-4">
                        <div className="fw-bold mb-2">Customer reviews</div>
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <StarRating value={averageRating} />
                            <span className="fw-bold text-dark">
                                {averageRating} out of 5
                            </span>
                        </div>
                        <ReviewBars reviewCount={reviewCount} starPercents={starPercents} />
                        <div className="fw-bold mt-3">Review this product</div>
                        <button
                            className="btn btn-outline-secondary w-100 mt-2 fw-bold"
                            onClick={handleOpenModal}
                        >
                            Write a customer review
                        </button>
                    </div>
                </div>

                {/* Right column */}
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    {/* Title and rating dropdown */}
                    <div className="mb-3">
                        <h1 className="display-4 fw-bold mb-2">{book.title}</h1>

                        <div className="position-relative mb-3 w-100">
                            <div
                                className="d-flex align-items-center"
                                style={{ cursor: "pointer" }}
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                            >
                                <StarRating value={averageRating} size={24} />
                                <span className="fw-bold ms-2" style={{ color: "#f2990b" }}>{averageRating}</span>
                                <FaChevronDown className="ms-2" />
                            </div>

                            {dropdownOpen && (
                                <div className="position-absolute top-100 start-0 bg-white border rounded-3 shadow-lg p-4 mt-1 z-3" style={{ width: "340px" }}>
                                    <div className="d-flex align-items-center mb-2">
                                        <StarRating value={averageRating} size={22} />
                                        <span className="fw-bold ms-2 fs-4">
                                            {averageRating} <span className="fw-normal fs-5">out of 5</span>
                                        </span>
                                    </div>
                                    <ReviewBars reviewCount={reviewCount} starPercents={starPercents} />
                                    <hr className="my-3" />
                                    <div
                                        className="text-primary fw-bold text-center fs-5 cursor-pointer"
                                        style={{ cursor: 'pointer' }}
                                        onClick={handleSeeReviews}
                                    >
                                        See customer reviews &gt;
                                    </div>
                                    <button
                                        className="position-absolute top-0 end-0 btn btn-link text-dark p-2"
                                        onClick={() => setDropdownOpen(false)}
                                        aria-label="Close"
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                        </div>

                        <hr className="my-3" />
                    </div>

                    {/* Book meta table */}
                    <div className="d-grid mb-4" style={{
                        gridTemplateColumns: "max-content 1fr max-content 1fr",
                        gap: "18px 38px",
                        fontSize: "1.1rem"
                    }}>
                        <span className="fw-bold">ISBN:</span>
                        <span>{book.isbn}</span>
                        <span className="fw-bold">Genre:</span>
                        <span>{book.genre ?? 'Not specified'}</span>
                        <span className="fw-bold">Publisher:</span>
                        <span>{book.publisher}</span>
                        <span className="fw-bold">Category:</span>
                        <span>{book.type ?? book.category ?? 'Not specified'}</span>
                        <span className="fw-bold">Author:</span>
                        <span>{book.author}</span>
                    </div>

                    {/* Review section */}
                    <div className="mt-4">
                        <h2 className="fw-bold mb-4">Review</h2>
                        <div ref={reviewListRef}>
                            {feedbacks.length === 0 && <div className="text-muted mt-2">No reviews yet.</div>}

                            {feedbacks.map((f, idx) => {
                                const vote = votes[f.Feedback_ID];
                                const likes = vote === "like" ? 1 : 0;
                                const dislikes = vote === "dislike" ? 1 : 0;

                                return (
                                    <div key={f.Feedback_ID || idx} className="mb-4 pb-3 border-bottom">
                                        <div className="d-flex align-items-center position-relative">
                                            <img
                                                className="rounded-circle me-3 border"
                                                src="https://ui-avatars.com/api/?name=User"
                                                alt="User"
                                                style={{ width: "48px", height: "48px" }}
                                            />
                                            <span className="fw-bold fs-5">{f.username ? f.username : "User"}</span>
                                            <div className="flex-grow-1"></div>

                                            <div
                                                className="ms-3 cursor-pointer"
                                                style={{ cursor: 'pointer' }}
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    if (openDropdown === f.Feedback_ID) {
                                                        setOpenDropdown(null);
                                                    } else {
                                                        setOpenDropdown(f.Feedback_ID);
                                                    }
                                                }}
                                                title="More"
                                            >
                                                <FaEllipsisH />
                                            </div>

                                            {openDropdown === f.Feedback_ID && (
                                                <div className="position-absolute end-0 bg-white border rounded-2 shadow-sm mt-1 z-2" style={{ minWidth: "120px" }}>
                                                    <button
                                                        className="btn btn-link text-dark text-decoration-none w-100 text-start"
                                                        onClick={() => { handleEdit(f); setOpenDropdown(null); }}
                                                    >
                                                        <FaPencilAlt className="me-2" /> Edit
                                                    </button>
                                                    <button
                                                        className="btn btn-link text-danger text-decoration-none w-100 text-start"
                                                        onClick={() => { handleDelete(f.Feedback_ID); setOpenDropdown(null); }}
                                                    >
                                                        <FaTrash className="me-2" /> Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="ms-5 mt-2">
                                            <div className="d-flex align-items-center">
                                                <StarRating value={f.rating} size={20} />
                                                <span className="fw-bold ms-2 fs-5">
                                                    {starTitle(f.rating)}
                                                </span>
                                            </div>
                                            <p className="mt-2 mb-2">{f.comment}</p>
                                            <div className="d-flex align-items-center gap-3 text-secondary">
                                                <button
                                                    className="btn btn-link p-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleVote(f.Feedback_ID, "like");
                                                    }}
                                                    title="Like"
                                                    disabled={votes[f.Feedback_ID] && votes[f.Feedback_ID] !== "like"}
                                                >
                                                    <FaThumbsUp color={votes[f.Feedback_ID] === "like" ? "#f2990b" : "#999"} />
                                                </button>
                                                <span className="fw-bold">{likes}</span>

                                                <button
                                                    className="btn btn-link p-0"
                                                    onClick={() => handleVote(f.Feedback_ID, "dislike")}
                                                    title="Dislike"
                                                    disabled={votes[f.Feedback_ID] && votes[f.Feedback_ID] !== "dislike"}
                                                >
                                                    <FaThumbsDown color={votes[f.Feedback_ID] === "dislike" ? "#b00" : "#999"} />
                                                </button>
                                                <span className="fw-bold">{dislikes}</span>

                                                <span className="ms-3">
                                                    {f.updatedAt
                                                        ? formatDateTime(f.updatedAt)
                                                        : (f.createdAt ? formatDateTime(f.createdAt) : "")}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Review Modal */}
            {modalOpen && (
                <div
                    className="review-modal-backdrop"
                    style={{
                        position: "fixed",
                        left: 0,
                        top: 0,
                        width: "100vw",
                        height: "100vh",
                        background: "rgba(0,0,0,0.24)",
                        zIndex: 1000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                    onClick={() => setModalOpen(false)}
                >
                    <div
                        className="review-modal-card"
                        style={{
                            background: "#fff",
                            padding: 36,
                            borderRadius: 16,
                            minWidth: 340,
                            maxWidth: "92vw",
                            boxShadow: "0 12px 44px rgba(0,0,0,0.19)",
                            position: "relative"
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {!showThanks ? (
                            <>
                                <button
                                    aria-label="Close"
                                    onClick={() => setModalOpen(false)}
                                    style={{
                                        position: "absolute",
                                        right: 10,
                                        top: 8,
                                        fontSize: 24,
                                        color: "#888",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer"
                                    }}
                                >×</button>
                                <div style={{ fontWeight: 600, fontSize: 20, marginBottom: 12, color: "#111" }}>
                                    {editId ? "Edit your review" : "Write a customer review"}
                                </div>
                                <form className="review-form" onSubmit={handleSubmit}>

                                    <div style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginBottom: 14
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <span
                                                    key={i}
                                                    style={{
                                                        fontSize: 36,
                                                        color: (hoverRating || newRating) > i ? "#fd4" : "#bbb",
                                                        cursor: "pointer",
                                                        transition: "color 0.15s"
                                                    }}
                                                    onMouseEnter={() => setHoverRating(i + 1)}
                                                    onMouseLeave={() => setHoverRating(0)}
                                                    onClick={() => setNewRating(i + 1)}
                                                >&#9733;</span>
                                            ))}
                                        </div>

                                        {newRating ? (
                                            <div style={{ marginTop: 8 }}>
                                                {starTitleWithIcon(newRating)}
                                            </div>
                                        ) : null}
                                    </div>
                                    <textarea
                                        placeholder="Describe your experience..."
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                        rows={4}
                                        style={{
                                            width: "100%",
                                            padding: 10,
                                            borderRadius: 8,
                                            border: "1px solid #ddd",
                                            outline: "none",
                                            resize: "vertical",
                                            background: "#fafafa",
                                            color: "#111",
                                            fontWeight: 500,
                                            fontSize: 16
                                        }}
                                        maxLength={300}
                                        required
                                    />
                                    <button
                                        className="review-btn"
                                        type="submit"
                                        style={{ margin: "18px 0 0 0", width: "100%", color: "#ffffff", fontWeight: 600 }}
                                        disabled={posting}
                                    >
                                        {posting ? "Posting..." : (editId ? "Update" : "Post")}
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="post" style={{
                                textAlign: "center",
                                minHeight: 180,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                position: "relative"
                            }}>
                                <div className="text-wrapper" style={{
                                    position: "relative",
                                    display: "inline-block",
                                    padding: "12px 24px"
                                }}>
                                    {/* Sparkles closely around text */}
                                    <div className="sparkle star" style={{ top: "-12px", left: "-18px" }}></div>
                                    <div className="sparkle diamond" style={{ top: "-12px", right: "-18px" }}></div>
                                    <div className="sparkle circle" style={{ bottom: "-12px", left: "-18px" }}></div>
                                    <div className="sparkle star" style={{ bottom: "-12px", right: "-18px" }}></div>
                                    <div className="sparkle circle" style={{ top: "-20px", left: "50%", transform: "translateX(-50%)" }}></div>
                                    <div className="sparkle diamond" style={{ bottom: "-20px", left: "50%", transform: "translateX(-50%)" }}></div>

                                    <div className="text" style={{
                                        fontSize: 26,
                                        color: "#111",
                                        fontWeight: 600,
                                        position: "relative",
                                        zIndex: 1
                                    }}>
                                        Thanks for rating us!
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default BookDetails;