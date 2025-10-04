// src/pages/ForgotPassword.js
import { useState } from "react";
import { Form, Button, Card, Container, Row, Col, Alert, Spinner } from "react-bootstrap";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { app } from "../firebaseConfig";
import { Link } from "react-router-dom";

const auth = getAuth(app);

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("✅ Password reset email sent! Check your inbox.");
      setEmailSent(true);
    } catch (error) {
      console.error("Password reset error:", error);
      switch (error.code) {
        case "auth/user-not-found":
          setError("❌ No account found with this email address.");
          break;
        case "auth/invalid-email":
          setError("❌ Please enter a valid email address.");
          break;
        case "auth/too-many-requests":
          setError("❌ Too many attempts. Please try again later.");
          break;
        default:
          setError("❌ Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <Container fluid className="h-100">
        <Row className="h-100 justify-content-center align-items-center">
          <Col lg={5} md={7} sm={9}>
            <Card className="forgot-password-card shadow-lg border-0">
              <Card.Body className="p-5">
                {/* Header */}
                <div className="text-center mb-4">
                  <div className="password-icon mb-3">
                    <i className="fas fa-key fa-3x text-primary"></i>
                  </div>
                  <h2 className="forgot-password-title">Reset Your Password</h2>
                  <p className="text-muted">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>

                {/* Success Message */}
                {message && (
                  <Alert variant="success" className="mb-4">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-check-circle me-2"></i>
                      {message}
                    </div>
                    {emailSent && (
                      <div className="mt-2">
                        <small>
                          <strong>Didn't receive the email?</strong> Check your spam folder or 
                          <Button 
                            variant="link" 
                            className="p-0 ms-1" 
                            onClick={handleSubmit}
                            disabled={loading}
                          >
                            try sending again
                          </Button>.
                        </small>
                      </div>
                    )}
                  </Alert>
                )}

                {/* Error Message */}
                {error && (
                  <Alert variant="danger" className="mb-4">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      {error}
                    </div>
                  </Alert>
                )}

                {/* Reset Form */}
                {!emailSent ? (
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-4">
                      <Form.Label className="form-label">
                        <i className="fas fa-envelope me-2 text-primary"></i>
                        Email Address
                      </Form.Label>
                      <Form.Control
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="py-3"
                        required
                        disabled={loading}
                      />
                      <Form.Text className="text-muted">
                        We'll send a password reset link to this email.
                      </Form.Text>
                    </Form.Group>

                    <div className="d-grid mb-3">
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={loading || !email}
                        className="py-3 fw-semibold"
                      >
                        {loading ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            Sending Reset Link...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-paper-plane me-2"></i>
                            Send Reset Link
                          </>
                        )}
                      </Button>
                    </div>
                  </Form>
                ) : (
                  <div className="text-center">
                    <div className="success-animation mb-4">
                      <i className="fas fa-check-circle fa-4x text-success"></i>
                    </div>
                    <p className="text-muted mb-4">
                      We've sent password reset instructions to your email address.
                    </p>
                  </div>
                )}

                {/* Back to Login */}
                <div className="text-center">
                  <hr className="my-4" />
                  <p className="text-muted mb-0">
                    Remember your password?{" "}
                    <Link to="/authorize" className="text-decoration-none fw-semibold">
                      Back to Login
                    </Link>
                  </p>
                </div>
              </Card.Body>
            </Card>

            {/* Security Note */}
            <div className="text-center mt-4">
              <small className="text-muted">
                <i className="fas fa-shield-alt me-1"></i>
                Secure password reset process
              </small>
            </div>
          </Col>
        </Row>
      </Container>

      <style jsx>{`
        .forgot-password-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem 0;
        }
        
        .forgot-password-card {
          border-radius: 20px;
          background: white;
        }
        
        .password-icon {
          animation: bounce 2s infinite;
        }
        
        .forgot-password-title {
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 0.5rem;
        }
        
        .success-animation {
          animation: scaleIn 0.5s ease-out;
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }
        
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .form-control {
          border-radius: 12px;
          border: 2px solid #e9ecef;
          transition: all 0.3s ease;
        }
        
        .form-control:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
        
        .btn-primary {
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          transition: all 0.3s ease;
        }
        
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
      `}</style>
    </div>
  );
}

export default ForgotPassword;