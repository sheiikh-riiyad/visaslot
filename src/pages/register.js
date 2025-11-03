import { Form, Button, Card, Container, Row, Col, Alert, Spinner, ProgressBar } from "react-bootstrap";
import { Formik } from "formik";
import * as Yup from "yup";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { app } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useState } from "react";

const RegisterSchema = Yup.object().shape({
  passport: Yup.string()
    .required("Passport No. is required")
    .min(5, "Passport must be at least 5 characters")
    .matches(/^[A-Z0-9]+$/, "Passport must contain only uppercase letters and numbers"),
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  phone: Yup.string()
    .matches(/^[0-9+]+$/, "Phone must contain only numbers and +")
    .min(10, "Phone must be at least 10 digits")
    .max(15, "Phone must be less than 15 digits")
    .required("Phone is required"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .matches(/[a-z]/, "Password must contain at least one lowercase letter")
    .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
    .matches(/[0-9]/, "Password must contain at least one number")
    .matches(/[!@#$%^&*]/, "Password must contain at least one special character")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password"), null], "Passwords must match")
    .required("Confirm Password is required"),
  docPasskey: Yup.string()
    .required("DocPasskey is required")
    .oneOf(['govt.au.2025'], 'Wrong DocPasskey'),
  terms: Yup.boolean()
    .oneOf([true], "You must accept the terms and conditions")
});

const auth = getAuth(app);
const db = getFirestore(app);

function Register() {
  const navigate = useNavigate();
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("danger");
  const [passwordStrength, setPasswordStrength] = useState(0);

  const showMessage = (message, variant = "danger") => {
    setAlertMessage(message);
    setAlertVariant(variant);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 5000);
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[!@#$%^&*]/.test(password)) strength += 10;
    return Math.min(strength, 100);
  };

  const getPasswordStrengthColor = (strength) => {
    if (strength < 40) return "danger";
    if (strength < 70) return "warning";
    return "success";
  };

  const getPasswordStrengthText = (strength) => {
    if (strength < 40) return "Weak";
    if (strength < 70) return "Medium";
    return "Strong";
  };

  return (
    <div className="register-page">
      <Container fluid className="h-100">
        <Row className="h-100">
          {/* Left Side - Brand/Info Section */}
          <Col lg={6} className="brand-section d-none d-lg-flex">
            <div className="brand-content">
              <div className="brand-logo">
                <i className="fas fa-user-plus"></i>
              </div>
              <h1 className="brand-title">Create Your Account</h1>
              <p className="brand-subtitle">
                Join thousands of applicants using our secure visa application portal. 
                Start your journey to Australia today.
              </p>
              <div className="benefits-list">
                <div className="benefit-item">
                  <i className="fas fa-shield-alt"></i>
                  <div>
                    <h6>Secure & Encrypted</h6>
                    <p>Your data is protected with enterprise-grade security</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <i className="fas fa-clock"></i>
                  <div>
                    <h6>24/7 Access</h6>
                    <p>Manage your application anytime, anywhere</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <i className="fas fa-headset"></i>
                  <div>
                    <h6>Dedicated Support</h6>
                    <p>Get help from our immigration experts</p>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* Right Side - Registration Form */}
          <Col lg={6} className="form-section d-flex align-items-center justify-content-center">
            <div className="form-container">
              {/* Mobile Brand Header */}
              <div className="mobile-brand d-block d-lg-none text-center mb-4">
                <div className="mobile-logo">
                  <i className="fas fa-user-plus"></i>
                </div>
                <h3 className="mobile-title">Create Account</h3>
              </div>

              <Card className="register-card shadow-lg border-0">
                <Card.Body className="p-5">
                  {/* Header */}
                  <div className="text-center mb-4">
                    <h2 className="register-title">Get Started</h2>
                    <p className="register-subtitle text-muted">
                      Create your account to begin your visa application
                    </p>
                  </div>

                  {/* Alert Message */}
                  {showAlert && (
                    <Alert variant={alertVariant} className="mb-4" dismissible onClose={() => setShowAlert(false)}>
                      <div className="d-flex align-items-center">
                        <i className={`fas ${
                          alertVariant === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'
                        } me-2`}></i>
                        {alertMessage}
                      </div>
                    </Alert>
                  )}

                  {/* Registration Form */}
                  <Formik
                    initialValues={{
                      passport: "",
                      email: "",
                      phone: "",
                      password: "",
                      confirmPassword: "",
                      docPasskey: "",
                      terms: false
                    }}
                    validationSchema={RegisterSchema}
                    onSubmit={async (values, { setSubmitting, resetForm }) => {
                      try {
                        // Validate DocPasskey first
                        if (values.docPasskey !== 'govt.au.2025') {
                          showMessage("❌ Wrong DocPasskey. Please enter the correct passkey.");
                          return;
                        }

                        // 1️⃣ Create user in Firebase Auth
                        const userCredential = await createUserWithEmailAndPassword(
                          auth,
                          values.email,
                          values.password
                        );

                        const user = userCredential.user;

                        // 2️⃣ Save passport + phone in Firestore
                        await setDoc(doc(db, "users", user.uid), {
                          passport: values.passport.toUpperCase(),
                          email: values.email,
                          phone: values.phone,
                          createdAt: new Date().toISOString(),
                          status: "active"
                        });

                        showMessage("✅ Registration successful! Redirecting...", "success");
                        
                        setTimeout(() => {
                          navigate("/authorize");
                        }, 2000);
                        
                      } catch (err) {
                        console.error(err);
                        if (err.code === 'auth/email-already-in-use') {
                          showMessage("❌ This email is already registered. Please use a different email or try logging in.");
                        } else if (err.code === 'auth/weak-password') {
                          showMessage("❌ Password is too weak. Please use a stronger password.");
                        } else if (err.code === 'auth/invalid-email') {
                          showMessage("❌ Invalid email address. Please check your email format.");
                        } else {
                          showMessage("❌ Registration failed: " + err.message);
                        }
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    {({ handleSubmit, handleChange, handleBlur, values, errors, touched, isSubmitting }) => (
                      <Form noValidate onSubmit={handleSubmit}>
                        {/* Passport Field */}
                        <Form.Group className="mb-4">
                          <Form.Label className="form-label">
                            <i className="fas fa-passport me-2 text-primary"></i>
                            Passport Number *
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="passport"
                            value={values.passport}
                            onChange={(e) => {
                              e.target.value = e.target.value.toUpperCase();
                              handleChange(e);
                            }}
                            onBlur={handleBlur}
                            isInvalid={touched.passport && !!errors.passport}
                            placeholder="AB123456"
                            className="form-control-custom py-3"
                          />
                          <Form.Control.Feedback type="invalid" className="d-flex align-items-center">
                            <i className="fas fa-exclamation-circle me-2"></i>
                            {errors.passport}
                          </Form.Control.Feedback>
                          <Form.Text className="text-muted">
                            Enter your passport number exactly as it appears on your passport
                          </Form.Text>
                        </Form.Group>

                        {/* Email Field */}
                        <Form.Group className="mb-4">
                          <Form.Label className="form-label">
                            <i className="fas fa-envelope me-2 text-primary"></i>
                            Email Address *
                          </Form.Label>
                          <Form.Control
                            type="email"
                            name="email"
                            value={values.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            isInvalid={touched.email && !!errors.email}
                            placeholder="your.email@example.com"
                            className="form-control-custom py-3"
                          />
                          <Form.Control.Feedback type="invalid" className="d-flex align-items-center">
                            <i className="fas fa-exclamation-circle me-2"></i>
                            {errors.email}
                          </Form.Control.Feedback>
                        </Form.Group>

                        {/* Phone Field */}
                        <Form.Group className="mb-4">
                          <Form.Label className="form-label">
                            <i className="fas fa-phone me-2 text-primary"></i>
                            Phone Number *
                          </Form.Label>
                          <Form.Control
                            type="tel"
                            name="phone"
                            value={values.phone}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            isInvalid={touched.phone && !!errors.phone}
                            placeholder="+1234567890"
                            className="form-control-custom py-3"
                          />
                          <Form.Control.Feedback type="invalid" className="d-flex align-items-center">
                            <i className="fas fa-exclamation-circle me-2"></i>
                            {errors.phone}
                          </Form.Control.Feedback>
                        </Form.Group>

                        {/* DocPasskey Field */}
                        <Form.Group className="mb-4">
                          <Form.Label className="form-label">
                            <i className="fas fa-key me-2 text-primary"></i>
                            DocPasskey *
                          </Form.Label>
                          <Form.Control
                            type="password"
                            name="docPasskey"
                            value={values.docPasskey}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            isInvalid={touched.docPasskey && !!errors.docPasskey}
                            placeholder="Enter your DocPasskey"
                            className="form-control-custom py-3"
                          />
                          <Form.Control.Feedback type="invalid" className="d-flex align-items-center">
                            <i className="fas fa-exclamation-circle me-2"></i>
                            {errors.docPasskey}
                          </Form.Control.Feedback>
                          <Form.Text className="text-muted">
                            Enter the provided DocPasskey to verify your registration
                          </Form.Text>
                        </Form.Group>

                        {/* Password Field */}
                        <Form.Group className="mb-4">
                          <Form.Label className="form-label">
                            <i className="fas fa-lock me-2 text-primary"></i>
                            Password *
                          </Form.Label>
                          <Form.Control
                            type="password"
                            name="password"
                            value={values.password}
                            onChange={(e) => {
                              handleChange(e);
                              setPasswordStrength(calculatePasswordStrength(e.target.value));
                            }}
                            onBlur={handleBlur}
                            isInvalid={touched.password && !!errors.password}
                            placeholder="Create a strong password"
                            className="form-control-custom py-3"
                          />
                          {values.password && (
                            <div className="mt-2">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <small className="text-muted">Password strength:</small>
                                <small className={`text-${getPasswordStrengthColor(passwordStrength)}`}>
                                  {getPasswordStrengthText(passwordStrength)}
                                </small>
                              </div>
                              <ProgressBar 
                                now={passwordStrength} 
                                variant={getPasswordStrengthColor(passwordStrength)}
                                className="password-strength-bar"
                              />
                            </div>
                          )}
                          <Form.Control.Feedback type="invalid" className="d-flex align-items-center">
                            <i className="fas fa-exclamation-circle me-2"></i>
                            {errors.password}
                          </Form.Control.Feedback>
                          <Form.Text className="text-muted">
                            Must contain uppercase, lowercase, number, and special character
                          </Form.Text>
                        </Form.Group>

                        {/* Confirm Password Field */}
                        <Form.Group className="mb-4">
                          <Form.Label className="form-label">
                            <i className="fas fa-lock me-2 text-primary"></i>
                            Confirm Password *
                          </Form.Label>
                          <Form.Control
                            type="password"
                            name="confirmPassword"
                            value={values.confirmPassword}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            isInvalid={touched.confirmPassword && !!errors.confirmPassword}
                            placeholder="Re-enter your password"
                            className="form-control-custom py-3"
                          />
                          <Form.Control.Feedback type="invalid" className="d-flex align-items-center">
                            <i className="fas fa-exclamation-circle me-2"></i>
                            {errors.confirmPassword}
                          </Form.Control.Feedback>
                        </Form.Group>

                        {/* Terms and Conditions */}
                        <Form.Group className="mb-4">
                          <Form.Check
                            type="checkbox"
                            id="terms"
                            name="terms"
                            checked={values.terms}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            isInvalid={touched.terms && !!errors.terms}
                            label={
                              <span>
                                I agree to the{" "}
                                <Link to="/terms" className="text-decoration-none">Terms of Service</Link>{" "}
                                and{" "}
                                <Link to="/privacy" className="text-decoration-none">Privacy Policy</Link>
                              </span>
                            }
                            className="terms-checkbox"
                          />
                          {touched.terms && errors.terms && (
                            <div className="text-danger small mt-1 d-flex align-items-center">
                              <i className="fas fa-exclamation-circle me-2"></i>
                              {errors.terms}
                            </div>
                          )}
                        </Form.Group>

                        {/* Submit Button */}
                        <div className="d-grid mb-3">
                          <Button
                            variant="primary"
                            type="submit"
                            disabled={isSubmitting}
                            className="register-btn py-3 fw-semibold"
                          >
                            {isSubmitting ? (
                              <>
                                <Spinner
                                  as="span"
                                  animation="border"
                                  size="sm"
                                  role="status"
                                  aria-hidden="true"
                                  className="me-2"
                                />
                                Creating Account...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-user-plus me-2"></i>
                                Create Account
                              </>
                            )}
                          </Button>
                        </div>
                      </Form>
                    )}
                  </Formik>

                  {/* Divider */}
                  <div className="divider my-4">
                    <span className="divider-text">Already have an account?</span>
                  </div>

                  {/* Login Link */}
                  <div className="text-center">
                    <Button
                      as={Link}
                      to="/authorize"
                      variant="outline-primary"
                      className="login-link-btn w-100 py-3 fw-semibold"
                    >
                      <i className="fas fa-sign-in-alt me-2"></i>
                      Sign In to Existing Account
                    </Button>
                  </div>
                </Card.Body>
              </Card>

              {/* Footer */}
              <div className="text-center mt-4">
                <small className="text-muted">
                  <i className="fas fa-shield-alt me-1"></i>
                  Your information is protected by 256-bit SSL encryption
                </small>
              </div>
            </div>
          </Col>
        </Row>
      </Container>

      <style jsx>{`
        .register-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .brand-section {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
          color: white;
          padding: 2rem;
        }
        
        .brand-content {
          max-width: 500px;
          margin: auto;
        }
        
        .brand-logo {
          font-size: 4rem;
          margin-bottom: 2rem;
          opacity: 0.9;
        }
        
        .brand-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }
        
        .brand-subtitle {
          font-size: 1.1rem;
          opacity: 0.9;
          margin-bottom: 3rem;
          line-height: 1.6;
        }
        
        .benefits-list {
          margin-top: 3rem;
        }
        
        .benefit-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 2rem;
        }
        
        .benefit-item i {
          font-size: 1.5rem;
          margin-right: 1rem;
          margin-top: 0.25rem;
          opacity: 0.8;
        }
        
        .benefit-item h6 {
          margin-bottom: 0.25rem;
          font-weight: 600;
        }
        
        .benefit-item p {
          margin: 0;
          opacity: 0.8;
          font-size: 0.9rem;
        }
        
        .form-section {
          background: #f8f9fa;
        }
        
        .form-container {
          width: 100%;
          max-width: 500px;
          padding: 1rem;
        }
        
        .mobile-logo {
          font-size: 3rem;
          color: #667eea;
          margin-bottom: 1rem;
        }
        
        .mobile-title {
          color: white;
          font-weight: 600;
        }
        
        .register-card {
          border-radius: 20px;
          overflow: hidden;
        }
        
        .register-title {
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 0.5rem;
        }
        
        .form-label {
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 0.75rem;
        }
        
        .form-control-custom {
          border-radius: 12px;
          border: 2px solid #e9ecef;
          transition: all 0.3s ease;
          font-size: 1rem;
        }
        
        .form-control-custom:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
        
        .password-strength-bar {
          height: 6px;
          border-radius: 3px;
        }
        
        .register-btn {
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          font-size: 1.1rem;
          transition: all 0.3s ease;
        }
        
        .register-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        .login-link-btn {
          border-radius: 12px;
          border-width: 2px;
          font-size: 1rem;
          transition: all 0.3s ease;
        }
        
        .login-link-btn:hover {
          transform: translateY(-2px);
        }
        
        .terms-checkbox .form-check-input:checked {
          background-color: #667eea;
          border-color: #667eea;
        }
        
        .divider {
          position: relative;
          text-align: center;
        }
        
        .divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: #e9ecef;
        }
        
        .divider-text {
          background: white;
          padding: 0 1rem;
          color: #6c757d;
          font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
          .register-page {
            background: #f8f9fa;
          }
          
          .mobile-brand {
            color: #2c3e50;
          }
        }
      `}</style>
    </div>
  );
}

export default Register;