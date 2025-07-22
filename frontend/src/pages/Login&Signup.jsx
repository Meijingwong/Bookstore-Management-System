import React, { useState, useEffect, useRef, useContext } from "react";
import { RoleContext } from '../components/RoleContext.jsx';
import logo1 from "../assets/images/logo1.png";
import { useNavigate } from "react-router-dom";
import axios from "axios"; //For making HTTP requests to backend APIs
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../CSS/Sign&Login.css";
const AdminLogin = () => {
    const [view, setView] = useState("login"); // login | register | forgot | reset | otpConfirmBack
    const [loading, setLoading] = useState(false);
    const { setRole } = useContext(RoleContext);
    const [formData, setFormData] = useState({
        adminId: "",
        password: "",
        name: "",
        email: "",
        contact: "",
        position: "",
        gender: "",
        regPassword: "",
        otp: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [otpSent, setOtpSent] = useState(false);
    const [resetErrors, setResetErrors] = useState({
        confirmPassword: "",
    });
    const [loginErrors, setLoginErrors] = useState({ adminId: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showOtpBackConfirm, setShowOtpBackConfirm] = useState(false);
    const [lastAdminId, setLastAdminId] = useState("");
    const navigate = useNavigate();

    // OTP countdown states
    const [otpTimer, setOtpTimer] = useState(0);
    const [otpExpired, setOtpExpired] = useState(false);
    const otpIntervalRef = useRef(null);

    const getCountdownString = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    //Starts a 2-minute OTP timer when OTP is sent.
    useEffect(() => {
        if (otpSent) {
            setOtpExpired(false);
            setOtpTimer(120);
            if (otpIntervalRef.current) clearInterval(otpIntervalRef.current);
            otpIntervalRef.current = setInterval(() => {
                setOtpTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(otpIntervalRef.current);
                        setOtpExpired(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (otpIntervalRef.current) clearInterval(otpIntervalRef.current);
        };
    }, [otpSent]);

    useEffect(() => {
        if (view !== "forgot") {
            setOtpTimer(0);
            setOtpExpired(false);
            setOtpSent(false);
            if (otpIntervalRef.current) clearInterval(otpIntervalRef.current);
        }
    }, [view]);

    const togglePasswordVisibility = () => {
        setShowPassword((prev) => !prev);
    };

    //Updates formData dynamically as user types.
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (name === "confirmPassword" || name === "newPassword") {
            setResetErrors((prev) => ({ ...prev, confirmPassword: "" }));
        }
        if (name === "adminId" || name === "password") {
            setLoginErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    // Login
    const linkToAdmin = async (e) => {
        e.preventDefault();
        setLoginErrors({ adminId: "", password: "" });

        setLoading(true);
        const MIN_LOADING_MS = 1500;
        const start = Date.now();

        if (formData.adminId === "user123" && formData.password === "userpass") {
            setRole("user");
            navigate("/");
        } else {
            try {
                const response = await axios.post("http://localhost:5000/api/login", {
                    adminId: formData.adminId,
                    password: formData.password,
                });

                if (response.data.token) {
                    localStorage.setItem("authToken", response.data.token);
                    localStorage.setItem("admin_ID", formData.adminId);
                    localStorage.setItem(
                        "admin_profile",
                        JSON.stringify(response.data.profile)
                    );
                    setLoginErrors({ adminId: "", password: "" });
                    setLastAdminId(formData.adminId);
                    const elapsed = Date.now() - start;
                    const remaining = MIN_LOADING_MS - elapsed;
                    if (remaining > 0) {
                        setTimeout(() => {
                            setLoading(false);
                            setRole("admin");
                            navigate("/profile");
                        }, remaining);
                    } else {
                        setLoading(false);
                        setRole("admin");
                        navigate("/profile");
                    }
                    return;
                }
            } catch (error) {
                let adminIdErr = "";
                let passwordErr = "";
                if (error.response?.status === 401) {
                    const message =
                        (error.response.data && error.response.data.message) || "";
                    if (message.toLowerCase().includes("admin id")) {
                        adminIdErr = "Admin ID is incorrect";
                    } else if (message.toLowerCase().includes("password")) {
                        passwordErr = "Invalid password";
                    } else {
                        passwordErr = "Invalid credentials";
                    }
                    setLoginErrors({ adminId: adminIdErr, password: passwordErr });
                }
            };
        }
    }

    // Registration 
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (
            formData.regPassword.length < 8 ||
            formData.regPassword.length > 20
        ) {
            alert("Password must be between 8 and 20 characters.");
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post("http://localhost:5000/api/register", {
                adminId: formData.adminId,
                name: formData.name,
                email: formData.email,
                password: formData.regPassword,
                contact: formData.contact,
                position: formData.position,
                gender: formData.gender,
            });

            if (response.data.token) {
                localStorage.setItem("token", response.data.token);
                alert("Registration successful!");
                setView("login");
            }

            if (response.status !== 201) {
                throw new Error(response.data.message || "Registration failed");
            }
        } catch (error) {
            if (error.response && error.response.status === 400) {
                alert(error.response.data.error); // 🛠️ Show "The account already exists."
            } else {
                alert("An unexpected error occurred: " + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Send OTP 
    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        try {
            await axios.post("http://localhost:5000/api/forgot", {
                email: formData.email.trim(),
                adminId: lastAdminId,
            });
            alert("OTP sent to your email.");
            setOtpExpired(false);
            setOtpSent(true);
            setOtpTimer(120);
            setFormData((prev) => ({ ...prev, otp: "" }));
        } catch (err) {
            alert(err.response?.data || "Failed to send OTP.");

        }
    };


    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otpExpired) {
            alert("Expired OTP");
            return;
        }
        try {
            const res = await axios.post("http://localhost:5000/api/verify-otp", {
                email: formData.email.trim().toLowerCase(),
                otp: formData.otp.trim(),
            });
            if (res.status !== 200) {
                // If your backend returns non-200 for invalid/expired OTP
                if (res.data && /expired/i.test(res.data.message)) {
                    alert("Expired OTP");
                } else {
                    alert("Invalid OTP");
                }
                return;
            }
            alert("OTP verified successfully");
            setView("reset");
        } catch {
            alert("Invalid OTP");
        }
    };

    // Reset password
    const handleResetNavigation = async (e) => {
        e.preventDefault();
        let errors = {};

        if (
            formData.newPassword.length < 8 ||
            formData.newPassword.length > 20
        ) {
            errors.newPassword = "Password must be 8 to 20 characters";
        }
        if (formData.newPassword !== formData.confirmPassword) {
            errors.confirmPassword = "Passwords do not match";
        }
        if (Object.keys(errors).length > 0) {
            setResetErrors(errors);
            return;
        }

        try {
            await axios.put("http://localhost:5000/api/reset", {
                email: formData.email.trim(),
                newPassword: formData.newPassword,
            });
            alert("Password reset successful!");
            setFormData({
                adminId: "",
                password: "",
                name: "",
                email: "",
                contact: "",
                position: "",
                gender: "",
                regPassword: "",
                otp: "",
                newPassword: "",
                confirmPassword: "",
            });
            setLoginErrors({ adminId: "", password: "" });
            setResetErrors({ confirmPassword: "" });
            setShowPassword(false);
            setView("login");
        } catch (err) {
            alert(err.message);
        }
    };

    // Confirm back to sign in from OTP view 
    const handleBackToSignInOtp = (e) => {
        e.preventDefault();
        setShowOtpBackConfirm(true);
    };

    // Confirmed return to login from OTP view
    const handleConfirmBackToSignIn = () => {
        setShowOtpBackConfirm(false);
        setOtpSent(false);
        setView("login");
    };

    // Cancel return to login from OTP view
    const handleCancelBackToSignIn = () => {
        setShowOtpBackConfirm(false);
    };

    return (
        <div className="admin-login-container"
            style={{ zIndex: 1050, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflow: 'auto' }}>
            <div className="admin-login-logo-container">
                <img src={logo1} alt="Logo" className="admin-login-logo" />
                <div>
                    <h3>Caterpillar</h3>
                    <p>BOOK STORE</p>
                </div>
            </div>
            <div className="admin-login-form-container">
                {view === "login" && (
                    <>
                        <h3 className="admin-login-text-center mb-4">Log in</h3>
                        <form onSubmit={linkToAdmin}>
                            <div className="admin-login-form-floating mb-3">
                                <input
                                    type="text"
                                    className={`form-control ${loginErrors.adminId ? "is-invalid" : ""}`}
                                    id="loginAdminId"
                                    name="adminId"
                                    value={formData.adminId}
                                    onChange={handleInputChange}
                                    required
                                />
                                <label htmlFor="loginAdminId">ID</label>
                                {loginErrors.adminId && (
                                    <div className="admin-login-invalid-feedback">{loginErrors.adminId}</div>
                                )}
                            </div>
                            <div className="admin-login-form-floating mb-3 position-relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className={`form-control ${loginErrors.password ? "is-invalid" : ""}`}
                                    id="loginPassword"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    required
                                />
                                <label htmlFor="loginPassword">Password</label>
                                {loginErrors.password && (
                                    <div className="admin-login-invalid-feedback">{loginErrors.password}</div>
                                )}
                                <span
                                    onClick={togglePasswordVisibility}
                                    className="admin-login-toggle-password-icon"
                                    style={{
                                        position: "absolute",
                                        top: "30%",
                                        right: "30px",
                                        transform: "translateY(-50%)",
                                        cursor: "pointer",
                                        fontSize: "1.2rem",
                                        color: "#6c757d",
                                    }}
                                >
                                    {showPassword ? <FaEye /> : <FaEyeSlash />}
                                </span>
                            </div>
                            <div className="d-flex justify-content-between mb-3">
                                <div className="form-check"></div>
                                <a
                                    href="#"
                                    className="admin-login-link"
                                    onClick={() => {
                                        setLastAdminId(formData.adminId);
                                        setView("forgot");
                                    }}
                                >
                                    Forgot Password?
                                </a>
                            </div>
                            <button
                                className="admin-login-btn"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="spinner-border spinner-border-sm"></span>
                                ) : (
                                    "Login"
                                )}
                            </button>
                            <p className="admin-login-text-center mt-3">
                                Don't have an account?{" "}
                                <a href="#" className="admin-login-link" onClick={() => setView("register")}>
                                    Register here
                                </a>
                            </p>
                        </form>
                    </>
                )}
                {view === "register" && (
                    <>
                        <h3 className="admin-login-text-center mb-3">Sign Up</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="row g-2">
                                <div className="col-5">
                                    <label className="form-label me-3">Admin ID: </label>
                                    <input type="text" className="form-control" id="adminId" name="adminId"
                                        value={formData.adminId} onChange={handleInputChange} placeholder="Enter ID" required />
                                </div>
                                <div className="col-6">
                                    <label className="form-label me-3">Name: </label>
                                    <input type="text" className="form-control" id="name" name="name"
                                        value={formData.name} onChange={handleInputChange} placeholder="Enter name" required />
                                </div>

                                <div className="row">
                                    <div className="col-5">
                                        <label className="form-label">Gender:</label>
                                        <div className="d-flex align-items-center">
                                            <div className="form-check me-3">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="gender"
                                                    id="female"
                                                    value="female"
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                                <label className="form-check-label" htmlFor="female">Female</label>
                                            </div>
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="gender"
                                                    id="male"
                                                    value="male"
                                                    onChange={handleInputChange}
                                                />
                                                <label className="form-check-label" htmlFor="male">Male</label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-6">
                                        <label className="form-label">Contact Number:</label>
                                        <div className="input-group">
                                            <input
                                                type="tel"
                                                className="form-control"
                                                name="contact"
                                                value={formData.contact}
                                                onChange={handleInputChange}
                                                placeholder="0162343213"
                                                pattern="^\d{10,11}$"
                                                title="Please enter a valid contact number with digits only (e.g., 0162345678)"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12">
                                    <label className="form-label me-3">Email: </label>
                                    <input type="email" className="form-control" id="email" name="email"
                                        value={formData.email} onChange={handleInputChange} placeholder="ali@gmail.com" required />
                                </div>

                                <div className="col-12 mb-2">
                                    <label className="form-label">Position</label>
                                    <select
                                        className="form-select"
                                        name="position"
                                        value={formData.position}
                                        onChange={handleInputChange}
                                        required
                                        style={{ width: "100%" }}
                                    >
                                        <option value="">Select Position</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Supervisor">Supervisor</option>
                                        <option value="Employee">Employee</option>
                                    </select>
                                </div>

                                <div className="col-12 mb-2 position-relative">
                                    <label className="form-label">Password</label>
                                    <div className="input-group">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="form-control border-danger"
                                            name="regPassword"
                                            id="regPassword"
                                            value={formData.regPassword}
                                            onChange={handleInputChange}
                                            placeholder="Enter password"
                                            required
                                        />
                                        <span
                                            onClick={togglePasswordVisibility}
                                            className="admin-login-toggle-password-icon"
                                            style={{
                                                position: "absolute",
                                                top: "40%",
                                                right: "30px",
                                                transform: "translateY(-50%)",
                                                cursor: "pointer",
                                                fontSize: "1.2rem",
                                                color: "#6c757d",
                                            }}
                                        >
                                            {showPassword ? <FaEye /> : <FaEyeSlash />}
                                        </span>
                                    </div>
                                    <div className="admin-login-password-hint">Password must be 8 to 20 characters</div>
                                </div>

                                <div className="col-12 mb-3">
                                    <button className="admin-login-btn" type="submit">
                                        {loading ? <span className="spinner-border spinner-border-sm"></span> : 'Register'}
                                    </button>
                                </div>
                                <p className="admin-login-text-center mt-2">
                                    Already have an account? <a href="#" className="admin-login-link" onClick={() => setView("login")}>Login here</a>
                                </p>
                            </div>
                        </form>
                    </>
                )}

                {view === "forgot" && (
                    <>
                        <h4 className="admin-login-text-center mb-3">Forgot Password</h4>
                        <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
                            <div className="mb-3">
                                <label className="form-label">Enter your email</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    disabled={otpSent}
                                />
                                {otpSent && (
                                    <div className="admin-login-otp-message">
                                        A One Time Passcode has been sent to *****@gmail.com. Please enter the OTP below to verify your Email Address.
                                    </div>
                                )}
                            </div>
                            {!otpSent ? (
                                <button type="submit" className="admin-login-btn mb-3">
                                    Send
                                </button>
                            ) : (
                                <>
                                    <div className="mb-3">
                                        <label className="form-label">Enter Verification Code</label>
                                        <div className="input-group mb-3 admin-login-otp-input-group">
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="otp"
                                                value={formData.otp}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Enter OTP"
                                                aria-label="Enter OTP"
                                                aria-describedby="button-addon2"
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary admin-login-resend-btn"
                                                id="button-addon2"
                                                onClick={handleSendOtp}
                                                disabled={loading || otpTimer > 110}
                                            >
                                                RESEND
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mb-2 d-flex align-items-center admin-login-otp-timer-container">
                                        {otpTimer > 0 && (
                                            <span className="admin-login-otp-timer">
                                                OTP valid for: {getCountdownString(otpTimer)}
                                            </span>
                                        )}
                                        {otpTimer === 0 && otpExpired && (
                                            <span className="admin-login-otp-expired">
                                                OTP expired. Please resend.
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        className="admin-login-btn mb-3"
                                    >
                                        Reset Password
                                    </button>
                                </>
                            )}
                        </form>
                        <div className="admin-login-text-center">
                            {otpSent ? (
                                <a href="#" className="admin-login-link" onClick={handleBackToSignInOtp}>
                                    &lt; Back To Sign In
                                </a>
                            ) : (
                                <a href="#" className="admin-login-link" onClick={() => setView("login")}>
                                    &lt; Back To Sign In
                                </a>
                            )}
                        </div>

                        {showOtpBackConfirm && (
                            <div className="admin-login-modal-backdrop">
                                <div className="admin-login-modal-box">
                                    <div className="mb-3">
                                        <strong>Are you sure you want to go back to the login page?</strong>
                                    </div>
                                    <div className="d-flex justify-content-center gap-2">
                                        <button
                                            className="btn btn-secondary admin-login-modal-btn"
                                            onClick={handleCancelBackToSignIn}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="btn btn-danger admin-login-modal-btn"
                                            onClick={handleConfirmBackToSignIn}
                                        >
                                            Yes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {view === "reset" && (
                    <>
                        <h3 className="admin-login-text-center mb-4">Reset Password</h3>
                        <form onSubmit={handleResetNavigation}>
                            <div className="admin-login-form-floating mb-3 position-relative">
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    className={`form-control ${resetErrors.newPassword && "is-invalid"}`}
                                    id="newPassword"
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleInputChange}
                                    required
                                />
                                <label htmlFor="newPassword">New Password</label>
                                {resetErrors.newPassword && (
                                    <div className="admin-login-invalid-feedback">
                                        {resetErrors.newPassword}
                                    </div>
                                )}
                                <span
                                    onClick={() => setShowNewPassword((prev) => !prev)}
                                    className="admin-login-toggle-password-icon"
                                    style={{
                                        position: "absolute",
                                        top: "30%",
                                        right: "30px",
                                        transform: "translateY(-50%)",
                                        cursor: "pointer",
                                        fontSize: "1.2rem",
                                        color: "#6c757d",
                                    }}
                                >
                                    {showNewPassword ? <FaEye /> : <FaEyeSlash />}
                                </span>
                            </div>

                            <div className="admin-login-form-floating mb-3 position-relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    className={`form-control ${resetErrors.confirmPassword && "is-invalid"}`}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    required
                                />
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                {resetErrors.confirmPassword && (
                                    <div className="admin-login-invalid-feedback">
                                        {resetErrors.confirmPassword}
                                    </div>
                                )}
                                <span
                                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                                    className="admin-login-toggle-password-icon"
                                    style={{
                                        position: "absolute",
                                        top: "30%",
                                        right: "30px",
                                        transform: "translateY(-50%)",
                                        cursor: "pointer",
                                        fontSize: "1.2rem",
                                        color: "#6c757d",
                                    }}
                                >
                                    {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                                </span>
                            </div>
                            <button className="admin-login-btn" type="submit">
                                {loading ? <span className="spinner-border spinner-border-sm"></span> : "Save"}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminLogin;