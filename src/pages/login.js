import { Form, Button, Card, Container, Row, Col, Alert, Spinner } from "react-bootstrap";
import { Formik } from "formik";
import * as Yup from "yup";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { app } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Link } from "react-router-dom";


const LoginSchema = Yup.object().shape({
  passport: Yup.string().required("Passport No. is required").min(5),
  password: Yup.string().required("Password is required").min(6),
});

const auth = getAuth(app);
const db = getFirestore(app);

function Login() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  console.log(currentUser)
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("danger");

  const showMessage = (message, variant = "danger") => {
    setAlertMessage(message);
    setAlertVariant(variant);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 5000);
  };

  return (
    <div className="login-page">
      <Container fluid className="h-100">
        <Row className="h-100">
          {/* Left Side - Brand/Info Section */}
          <Col lg={6} className="brand-section d-none d-lg-flex">
            <div className="brand-content">
              <div className="brand-logo">
                <i className="fas fa-passport"></i>
              </div>
              <h1 className="brand-title">Australian Visa Portal</h1>
              <p className="brand-subtitle">
                Secure access to your visa application dashboard. 
                Track your application status and manage your documents.
              </p>
              <div className="features-list">
                <div className="feature-item">
                  <i className="fas fa-shield-alt"></i>
                  <span>Secure & Encrypted</span>
                </div>
                <div className="feature-item">
                  <i className="fas fa-clock"></i>
                  <span>24/7 Access</span>
                </div>
                <div className="feature-item">
                  <i className="fas fa-file-alt"></i>
                  <span>Real-time Updates</span>
                </div>
              </div>
            </div>
          </Col>

          {/* Right Side - Login Form */}
          <Col lg={6} className="form-section d-flex align-items-center justify-content-center">
            <div className="form-container">
              {/* Mobile Brand Header */}
              <div className="mobile-brand d-block d-lg-none text-center mb-4">
                <div className="mobile-logo">
                  <i className="fas fa-passport"></i>
                </div>
                <h3 className="mobile-title">Australian Visa Portal</h3>
              </div>

              <Card className="login-card shadow-lg border-0">
                <Card.Body className="p-5">
                  {/* Header */}
                  <div className="text-center mb-4">
                    <h2 className="login-title">Welcome Back</h2>
                    <p className="login-subtitle text-muted">
                      Sign in to your account to continue
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

                  {/* Login Form */}
                  <Formik
                    initialValues={{ passport: "", password: "" }}
                    validationSchema={LoginSchema}
                    onSubmit={async (values, { setSubmitting }) => {
                      try {
                        // 1️⃣ Find user by passport in Firestore
                        const q = query(collection(db, "users"), where("passport", "==", values.passport));
                        const querySnapshot = await getDocs(q);

                        if (querySnapshot.empty) {
                          showMessage("❌ Passport number not found in our system");
                          return;
                        }

                        const userData = querySnapshot.docs[0].data();
                        const email = userData.email;

                        // 2️⃣ Sign in with email/password
                        const userCredential = await signInWithEmailAndPassword(auth, email, values.password);
                        setCurrentUser(userCredential.user);

                        showMessage("✅ Login successful! Redirecting...", "success");
                        
                        setTimeout(() => {
                          navigate("/application");
                        }, 1500);
                        
                      } catch (err) {
                        console.error(err);
                        if (err.code === 'auth/wrong-password') {
                          showMessage("❌ Incorrect password. Please try again.");
                        } else if (err.code === 'auth/too-many-requests') {
                          showMessage("❌ Too many failed attempts. Please try again later.");
                        } else {
                          showMessage("❌ Login failed: " + err.message);
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
                            Passport Number
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="passport"
                            value={values.passport}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            isInvalid={touched.passport && !!errors.passport}
                            placeholder="Enter your passport number"
                            className="form-control-custom py-3"
                          />
                          <Form.Control.Feedback type="invalid" className="d-flex align-items-center">
                            <i className="fas fa-exclamation-circle me-2"></i>
                            {errors.passport}
                          </Form.Control.Feedback>
                        </Form.Group>

                        {/* Password Field */}
                        <Form.Group className="mb-4">
                          <Form.Label className="form-label">
                            <i className="fas fa-lock me-2 text-primary"></i>
                            Password
                          </Form.Label>
                          <Form.Control
                            type="password"
                            name="password"
                            value={values.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            isInvalid={touched.password && !!errors.password}
                            placeholder="Enter your password"
                            className="form-control-custom py-3"
                          />
                          <Form.Control.Feedback type="invalid" className="d-flex align-items-center">
                            <i className="fas fa-exclamation-circle me-2"></i>
                            {errors.password}
                          </Form.Control.Feedback>
                        </Form.Group>

                        {/* Remember Me & Forgot Password */}
                        <div className="d-flex justify-content-between align-items-center mb-4">
                          <Form.Check 
                            type="checkbox" 
                            id="remember-me"
                            label="Remember me"
                            className="text-muted"
                          />
                          <Link to="/forgotenpassword" className="text-decoration-none forgot-password">
                            Forgot Password?
                          </Link>
                        </div>

                        {/* Submit Button */}
                        <div className="d-grid">
                          <Button
                            variant="primary"
                            type="submit"
                            disabled={isSubmitting}
                            className="login-btn py-3 fw-semibold"
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
                                Signing In...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-sign-in-alt me-2"></i>
                                Sign In
                              </>
                            )}
                          </Button>
                        </div>
                      </Form>
                    )}
                  </Formik>

                  {/* Divider */}
                  <div className="divider my-4">
                    <span className="divider-text">New to our portal?</span>
                  </div>

                  {/* Register Link */}
                  <div className="text-center">
                    <p className="text-muted mb-3">
                      Don't have an account? Create one to start your visa application.
                    </p>
                    <Button
                      as={Link}
                      to="/register"
                      variant="outline-primary"
                      className="register-btn w-100 py-3 fw-semibold"
                    >
                      <i className="fas fa-user-plus me-2"></i>
                      Create New Account
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

      {/* Optional: Add custom CSS */}
      <style jsx>{`
        .login-page {
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
        
        .features-list {
          margin-top: 3rem;
        }
        
        .feature-item {
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }
        
        .feature-item i {
          margin-right: 1rem;
          font-size: 1.2rem;
          opacity: 0.8;
        }
        
        .form-section {
          background: #f8f9fa;
        }
        
        .form-container {
          width: 100%;
          max-width: 450px;
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
        
        .login-card {
          border-radius: 20px;
          overflow: hidden;
        }
        
        .login-title {
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
        
        .login-btn {
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          font-size: 1.1rem;
          transition: all 0.3s ease;
        }
        
        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        .register-btn {
          border-radius: 12px;
          border-width: 2px;
          font-size: 1rem;
          transition: all 0.3s ease;
        }
        
        .register-btn:hover {
          transform: translateY(-2px);
        }
        
        .forgot-password {
          color: #667eea;
          font-weight: 500;
          transition: color 0.3s ease;
        }
        
        .forgot-password:hover {
          color: #764ba2;
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
          .login-page {
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

export default Login;