// src/pages/BiometricPayment.js
import { useState, useEffect } from "react";
import { Form, Button, Card, Container, Row, Col, Alert, Spinner, ProgressBar, Modal, Badge, ListGroup } from "react-bootstrap";
import { getFirestore, collection, addDoc, serverTimestamp, doc, setDoc, getDocs, query, where,  } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebaseConfig";

const db = getFirestore(app);
const auth = getAuth(app);

function BiometricPayment() {
  const [loading, setLoading] = useState(false);
  const [checkingPayments, setCheckingPayments] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("success");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasExistingPayments, setHasExistingPayments] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [remainingAmount, setRemainingAmount] = useState(1000);

  const [formData, setFormData] = useState({
    transactionId: "",
    paymentMethod: "",
    amount: "",
    transactionDate: "",
    additionalNotes: ""
  });

  const paymentMethods = {
    bank: [
      { id: "ific", name: "IFIC PLC", account: "API fetching...", branch: "Gulshan Branch" },
      { id: "ibb", name: "IBB PLC", account: "API fetching...", branch: "Gulshan Branch" }
    ],
    mobile: [
      { id: "bkash", name: "bKash", number: "01978630489", type: "Personal" },
      { id: "nagad", name: "Nagad", number: "01978630489", type: "Personal" }
    ]
  };

  // Check user's payment history on component mount
  useEffect(() => {
    checkPaymentHistory();
  }, []);

  const checkPaymentHistory = async () => {
    const user = auth.currentUser;
    if (!user) {
      setCheckingPayments(false);
      return;
    }

    try {
      const paymentsQuery = query(
        collection(db, "biometricPayments"),
        where("userId", "==", user.uid)
      );
      
      const querySnapshot = await getDocs(paymentsQuery);
      const payments = [];
      
      querySnapshot.forEach(doc => {
        payments.push({ id: doc.id, ...doc.data() });
      });

      setPaymentHistory(payments);
      
      // Calculate remaining amount
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const remaining = 10000 - totalPaid;
      setRemainingAmount(remaining > 0 ? remaining : 0);
      
      // Check if user has reached payment limits
      if (payments.length >= 2 || totalPaid >= 10000) {
        setHasExistingPayments(true);
      }

    } catch (error) {
      console.error("Error checking payment history:", error);
    } finally {
      setCheckingPayments(false);
    }
  };

  const showMessage = (message, variant = "success") => {
    setAlertMessage(message);
    setAlertVariant(variant);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validatePayment = () => {
    const currentAmount = parseInt(formData.amount) || 0;
    const totalPaid = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
    const newTotal = totalPaid + currentAmount;

    // Check if user has reached maximum payments
    if (paymentHistory.length >= 2) {
      showMessage("❌ You have reached the maximum limit of 2 payments", "danger");
      return false;
    }

    // Check if amount is valid
    if (currentAmount <= 0) {
      showMessage("❌ Payment amount must be greater than 0", "danger");
      return false;
    }

    if (currentAmount > 10000) {
      showMessage("❌ Payment amount cannot exceed 1000 BDT", "danger");
      return false;
    }

    // Check if total amount exceeds 1000 BDT limit
    if (newTotal > 10000) {
      showMessage(`❌ Total payment cannot exceed 10000 BDT. You can pay maximum ${10000 - totalPaid} BDT`, "danger");
      return false;
    }

    // Validate transaction ID
    if (!formData.transactionId.trim()) {
      showMessage("❌ Please enter your transaction ID", "danger");
      return false;
    }

    // Validate payment method
    if (!formData.paymentMethod) {
      showMessage("❌ Please select a payment method", "danger");
      return false;
    }

    // Validate transaction date
    if (!formData.transactionDate) {
      showMessage("❌ Please select transaction date", "danger");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!user) {
      showMessage("❌ Please log in to submit payment", "danger");
      return;
    }

    // Validate payment
    if (!validatePayment()) {
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const paymentAmount = parseInt(formData.amount);
      const totalPaid = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0) + paymentAmount;

      // Save payment data to Firestore
      const paymentData = {
        userId: user.uid,
        userEmail: user.email,
        transactionId: formData.transactionId.toUpperCase(),
        paymentMethod: formData.paymentMethod,
        amount: paymentAmount,
        transactionDate: formData.transactionDate,
        additionalNotes: formData.additionalNotes,
        status: "pending",
        submittedAt: serverTimestamp(),
        paymentId: `PAY${Date.now().toString().slice(-8)}`,
        verified: false
      };

      await addDoc(collection(db, "biometricPayments"), paymentData);

      // Update user's profile with payment status
      await setDoc(doc(db, "users", user.uid), {
        hasBiometricPayment: true,
        biometricPaymentCount: paymentHistory.length + 1,
        lastPaymentDate: serverTimestamp(),
        totalPaid: totalPaid
      }, { merge: true });

      clearInterval(progressInterval);
      setUploadProgress(100);

      showMessage("✅ Payment submitted successfully! We'll verify your transaction within 24 hours.");
      
      // Update payment history and remaining amount
      const updatedHistory = [...paymentHistory, paymentData];
      setPaymentHistory(updatedHistory);
      
      const newRemaining = 10000 - totalPaid;
      setRemainingAmount(newRemaining > 0 ? newRemaining : 0);
      
      if (updatedHistory.length >= 2 || totalPaid >= 10000) {
        setHasExistingPayments(true);
      }

      // Reset form
      setFormData({
        transactionId: "",
        paymentMethod: "",
        amount: "",
        transactionDate: "",
        additionalNotes: ""
      });

      setTimeout(() => setUploadProgress(0), 2000);

    } catch (error) {
      console.error("Payment submission error:", error);
      showMessage("❌ Failed to submit payment. Please try again.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: "warning", text: "Pending" },
      approved: { variant: "success", text: "Verified" },
      rejected: { variant: "danger", text: "Rejected" },
      processing: { variant: "info", text: "Processing" }
    };
    
    const config = statusConfig[status] || { variant: "secondary", text: "Unknown" };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const openPaymentMethodModal = (method) => {
    setSelectedMethod(method);
    setShowPaymentModal(true);
  };

  const getProgressPercentage = () => {
    const totalPaid = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
    return (totalPaid / 10000) * 100;
  };

  if (checkingPayments) {
    return (
      <div className="biometric-payment-page">
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col lg={8} className="text-center">
              <Spinner animation="border" variant="primary" className="mb-3" />
              <h4>Checking your payment history...</h4>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <div className="biometric-payment-page">
      <p style={{display: "none"}}> {selectedMethod}  {openPaymentMethodModal}  </p>
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col lg={10} xl={8}>
            {/* Header Section */}
            <div className="text-center mb-5">
              <div className="payment-icon mb-3">
                <i className="fas fa-fingerprint fa-3x text-primary"></i>
              </div>
              <h1 className="fw-bold text-gradient">Biometrics Verification Payment</h1>
              <p className="lead text-muted">
                Complete your biometrics verification payment
              </p>
            </div>

            {/* Payment Progress */}
            <Card className="mb-4 shadow-sm border-0">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h6 className="fw-bold mb-1">Payment Progress</h6>
                    <p className="text-muted mb-0">
                      {paymentHistory.length}/2 payments used • {remainingAmount} BDT remaining
                    </p>
                  </div>
                  <div className="text-end">
                    <h5 className="fw-bold text-primary mb-0">
                      {paymentHistory.reduce((sum, payment) => sum + payment.amount, 0)}/10000 BDT
                    </h5>
                    <small className="text-muted">Total Paid</small>
                  </div>
                </div>
                <ProgressBar 
                  now={getProgressPercentage()} 
                  variant={getProgressPercentage() >= 100 ? "success" : "primary"}
                  style={{ height: '10px', borderRadius: '10px' }}
                />
                <div className="mt-2 text-center">
                  <small className="text-muted">
                    {getProgressPercentage() >= 100 ? 
                      "✅ Payment limit reached" : 
                      `You can pay up to ${remainingAmount} BDT in ${2 - paymentHistory.length} more payments`
                    }
                  </small>
                </div>
              </Card.Body>
            </Card>

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

            {/* Upload Progress */}
            {uploadProgress > 0 && (
              <Card className="mb-4 border-0 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-semibold">Processing Payment...</span>
                    <span className="text-primary">{uploadProgress}%</span>
                  </div>
                  <ProgressBar 
                    now={uploadProgress} 
                    variant="primary" 
                    animated 
                    style={{ height: '8px', borderRadius: '10px' }}
                  />
                </Card.Body>
              </Card>
            )}

            <Row>
              {/* Payment History */}
              <Col lg={4} className="mb-4">
                <Card className="border-0 shadow-sm h-100">
                  <Card.Header className="bg-primary text-white">
                    <h5 className="mb-0">
                      <i className="fas fa-history me-2"></i>
                      Payment History
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    {paymentHistory.length === 0 ? (
                      <div className="text-center py-4">
                        <i className="fas fa-receipt fa-2x text-muted mb-3"></i>
                        <p className="text-muted">No payments made yet</p>
                      </div>
                    ) : (
                      <ListGroup variant="flush">
                        {paymentHistory.map((payment, index) => (
                          <ListGroup.Item key={payment.id} className="px-0">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <strong>Payment #{index + 1}</strong>
                              {getStatusBadge(payment.status)}
                            </div>
                            <small className="text-muted d-block">
                              ID: {payment.transactionId}
                            </small>
                            <small className="text-muted d-block">
                              Amount: {payment.amount} BDT
                            </small>
                            <small className="text-muted d-block">
                              Date: {formatDate(payment.transactionDate)}
                            </small>
                            <small className="text-muted d-block">
                              Method: {payment.paymentMethod}
                            </small>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {/* Main Payment Form */}
              <Col lg={8}>
                <Card className="shadow-lg border-0">
                  <Card.Header className={`py-3 ${hasExistingPayments ? 'bg-secondary' : 'bg-primary text-white'}`}>
                    <h4 className="mb-0">
                      <i className="fas fa-credit-card me-2"></i>
                      Payment Details
                      {hasExistingPayments && (
                        <Badge bg="light" text="dark" className="ms-2">
                          Limit Reached
                        </Badge>
                      )}
                    </h4>
                  </Card.Header>
                  <Card.Body className="p-4">
                    {hasExistingPayments ? (
                      <div className="text-center py-4">
                        <i className="fas fa-check-circle fa-4x text-success mb-3"></i>
                        <h4 className="text-success mb-3">Payment Limit Reached</h4>
                        <p className="text-muted mb-4">
                          {paymentHistory.length >= 2 ? 
                            "You have reached the maximum limit of 2 payments." :
                            "You have reached the maximum payment amount of 1000 BDT."
                          }
                          If you need to make additional payments, please contact support.
                        </p>
                      </div>
                    ) : (
                      <Form onSubmit={handleSubmit}>
                        {/* Transaction Information */}
                        <Row className="mb-4">
                          <Col lg={12}>
                            <h5 className="fw-bold text-primary mb-3">
                              <i className="fas fa-receipt me-2"></i>
                              Transaction Information
                            </h5>
                          </Col>
                          
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-semibold">
                                Transaction ID *
                              </Form.Label>
                              <Form.Control
                                type="text"
                                name="transactionId"
                                value={formData.transactionId}
                                onChange={(e) => {
                                  e.target.value = e.target.value.toUpperCase();
                                  handleInputChange(e);
                                }}
                                placeholder="e.g., TXN123456789"
                                className="py-2"
                                required
                              />
                              <Form.Text className="text-muted">
                                Enter the transaction ID from your payment
                              </Form.Text>
                            </Form.Group>
                          </Col>

                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-semibold">
                                Amount (BDT) *
                              </Form.Label>
                              <Form.Control
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleInputChange}
                                className="py-2"
                                required
                                min="1"
                                max={remainingAmount}
                                placeholder={`Enter amount (max ${remainingAmount})`}
                              />
                              <Form.Text className="text-muted">
                                Available: {remainingAmount} BDT • Payments left: {2 - paymentHistory.length}
                              </Form.Text>
                            </Form.Group>
                          </Col>

                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-semibold">
                                Transaction Date *
                              </Form.Label>
                              <Form.Control
                                type="date"
                                name="transactionDate"
                                value={formData.transactionDate}
                                onChange={handleInputChange}
                                className="py-2"
                                required
                              />
                            </Form.Group>
                          </Col>

                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-semibold">
                                Payment Method *
                              </Form.Label>
                              <Form.Select
                                name="paymentMethod"
                                value={formData.paymentMethod}
                                onChange={handleInputChange}
                                className="py-2"
                                required
                              >
                                <option value="">Select Payment Method</option>
                                <optgroup label="Bank Transfer">
                                  {paymentMethods.bank.map(bank => (
                                    <option key={bank.id} value={bank.name}>{bank.name}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="Mobile Banking">
                                  {paymentMethods.mobile.map(mobile => (
                                    <option key={mobile.id} value={mobile.name}>{mobile.name}</option>
                                  ))}
                                </optgroup>
                              </Form.Select>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="mt-2"
                                onClick={() => setShowPaymentModal(true)}
                              >
                                <i className="fas fa-info-circle me-1"></i>
                                View Payment Details
                              </Button>
                            </Form.Group>
                          </Col>
                        </Row>

                        {/* Additional Notes */}
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-semibold">
                            <i className="fas fa-sticky-note me-2 text-primary"></i>
                            Additional Notes
                          </Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            name="additionalNotes"
                            value={formData.additionalNotes}
                            onChange={handleInputChange}
                            placeholder="Any additional information about your payment..."
                          />
                        </Form.Group>

                        {/* Submit Button */}
                        <div className="d-grid">
                          <Button
                            variant="primary"
                            type="submit"
                            size="lg"
                            disabled={loading || !formData.amount || formData.amount <= 0}
                            className="py-3 fw-semibold submit-btn"
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
                                Processing Payment...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-paper-plane me-2"></i>
                                Submit Payment Details
                              </>
                            )}
                          </Button>
                        </div>
                      </Form>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Information Card */}
            <Card className="mt-4 border-0 bg-light">
              <Card.Body className="p-4">
                <h5 className="mb-3">
                  <i className="fas fa-info-circle me-2 text-primary"></i>
                  Payment Instructions
                </h5>
                <Row>
                  <Col md={6}>
                    <h6>Payment Rules</h6>
                    <ul className="small text-muted">
                      <li className="mb-2">
                        <i className="fas fa-check text-success me-2"></i>
                        Maximum 2 payments allowed per user
                      </li>
                      <li className="mb-2">
                        <i className="fas fa-check text-success me-2"></i>
                        Total payment limit: 1000 BDT
                      </li>
                      <li className="mb-2">
                        <i className="fas fa-check text-success me-2"></i>
                        You can choose any amount per payment
                      </li>
                    </ul>
                  </Col>
                  <Col md={6}>
                    <h6>Verification Process</h6>
                    <ul className="small text-muted">
                      <li className="mb-2">
                        <i className="fas fa-clock text-warning me-2"></i>
                        Verification time: 24-48 hours
                      </li>
                      <li className="mb-2">
                        <i className="fas fa-receipt text-info me-2"></i>
                        Keep your transaction ID safe
                      </li>
                      <li className="mb-2">
                        <i className="fas fa-envelope text-primary me-2"></i>
                        You'll receive email confirmation
                      </li>
                    </ul>
                  </Col>
                </Row>
                <hr />
                <h6 className="fw-semibold">Available Payment Methods:</h6>
                <Row>
                  <Col md={6}>
                    <ul className="small text-muted">
                      <li><strong>Bank Transfer:</strong> IFIC PLC, IBB PLC</li>
                      <li><strong>Mobile Banking:</strong> bKash, Nagad</li>
                    </ul>
                  </Col>
                  <Col md={6}>
                    <ul className="small text-muted">
                      <li>Make payment to the provided accounts</li>
                      <li>Enter the exact transaction ID</li>
                      <li>Submit payment details for verification</li>
                    </ul>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Payment Methods Modal */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Payment Method Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            {/* Bank Payment Methods */}
            <Col lg={6} className="mb-4">
              <h6 className="fw-bold text-primary mb-3">
                <i className="fas fa-building me-2"></i>
                Bank Transfer
              </h6>
              {paymentMethods.bank.map(bank => (
                <Card key={bank.id} className="border-0 bg-light mb-3">
                  <Card.Body>
                    <h6 className="fw-bold">{bank.name}</h6>
                    <div className="small">
                      <p className="mb-1"><strong>Account Number:</strong></p>
                      <p className="text-muted mb-2">{bank.account}</p>
                      <p className="mb-1"><strong>Branch:</strong></p>
                      <p className="text-muted mb-0">{bank.branch}</p>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </Col>

            {/* Mobile Payment Methods */}
            <Col lg={6} className="mb-4">
              <h6 className="fw-bold text-success mb-3">
                <i className="fas fa-mobile-alt me-2"></i>
                Mobile Banking
              </h6>
              {paymentMethods.mobile.map(mobile => (
                <Card key={mobile.id} className="border-0 bg-light mb-3">
                  <Card.Body>
                    <h6 className="fw-bold">{mobile.name}</h6>
                    <div className="small">
                      <p className="mb-1"><strong>Number:</strong></p>
                      <p className="text-muted mb-2">{mobile.number}</p>
                      <p className="mb-1"><strong>Type:</strong></p>
                      <p className="text-muted mb-0">{mobile.type}</p>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </Col>
          </Row>
          <Alert variant="info" className="mt-3">
            <i className="fas fa-info-circle me-2"></i>
            After making payment, please enter the transaction ID and amount in the form above.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .biometric-payment-page {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
        }
        
        .text-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .payment-icon {
          animation: float 3s ease-in-out infinite;
        }
        
        .submit-btn {
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          transition: all 0.3s ease;
        }
        
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .card {
          border-radius: 15px;
        }
        
        .form-control, .form-select {
          border-radius: 10px;
          border: 2px solid #e9ecef;
          transition: all 0.3s ease;
        }
        
        .form-control:focus, .form-select:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
      `}</style>
    </div>
  );
}

export default BiometricPayment;