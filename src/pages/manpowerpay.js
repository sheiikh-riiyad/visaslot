// src/pages/ManpowerServicePayment.js
import { useState, useEffect } from "react";
import { Form, Button, Card, Container, Row, Col, Alert, Spinner, ProgressBar, Modal, Badge, ListGroup } from "react-bootstrap";
import { getFirestore, collection, addDoc, serverTimestamp, doc, setDoc, getDocs, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebaseConfig";

const db = getFirestore(app);
const auth = getAuth(app);

function ManpowerServicePayment() {
  const [loading, setLoading] = useState(false);
  const [checkingPayments, setCheckingPayments] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("success");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasExistingPayments, setHasExistingPayments] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [remainingAmount, setRemainingAmount] = useState(43000);

  const [formData, setFormData] = useState({
    transactionId: "",
    paymentMethod: "",
    amount: "",
    transactionDate: "",
    additionalNotes: ""
  });

  const paymentMethods = {
    bank: [
      { 
        id: "ific", 
        name: "IFIC PLC", 
        account: "API fetching...", 
        branch: "Gulshan Branch",
        accountName: "Manpower Service International",
        routing: "API fetching..."
      },
      { 
        id: "ibb", 
        name: "IBB PLC", 
        account: "API fetching...", 
        branch: "Gulshan Branch",
        accountName: "Manpower Recruitment Center",
        routing: "API fetching..."
      }
    ],
    mobile: [
      { 
        id: "bkash", 
        name: "bKash", 
        number: "01337242862", 
        type: "Personal",
        accountType: "Manpower Service"
      },
      { 
        id: "nagad", 
        name: "Nagad", 
        // number: "01978630489", 
        type: "Personal",
        accountType: "Manpower Service"
      }
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
        collection(db, "manpowerServicePayments"),
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
      const remaining = 43000 - totalPaid;
      setRemainingAmount(remaining > 0 ? remaining : 0);
      
      // Check if user has reached payment limits
      if (payments.length >= 5 || totalPaid >= 43000) {
        setHasExistingPayments(true);
      }

    } catch (error) {
      console.error("Error checking manpower service payment history:", error);
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
    if (paymentHistory.length >= 5) {
      showMessage("❌ You have reached the maximum limit of 5 payments", "danger");
      return false;
    }

    // Check if amount is valid
    if (currentAmount <= 0) {
      showMessage("❌ Payment amount must be greater than 0", "danger");
      return false;
    }

    if (currentAmount > 43000) {
      showMessage("❌ Payment amount cannot exceed 43,000 BDT", "danger");
      return false;
    }

    // Check if total amount exceeds 43,000 BDT limit
    if (newTotal > 43000) {
      showMessage(`❌ Total payment cannot exceed 43,000 BDT. You can pay maximum ${43000 - totalPaid} BDT`, "danger");
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
      showMessage("❌ Please log in to submit manpower service payment", "danger");
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
        paymentId: `MAN${Date.now().toString().slice(-8)}`,
        serviceCategory: "Manpower Service",
        verified: false
      };

      await addDoc(collection(db, "manpowerServicePayments"), paymentData);

      // Update user's profile with payment status
      await setDoc(doc(db, "users", user.uid), {
        hasManpowerServicePayment: true,
        manpowerServicePaymentCount: paymentHistory.length + 1,
        lastManpowerServicePayment: serverTimestamp(),
        totalManpowerServicePaid: totalPaid
      }, { merge: true });

      clearInterval(progressInterval);
      setUploadProgress(100);

      showMessage("✅ Manpower service payment submitted successfully! We'll verify your transaction within 24 hours.");
      
      // Update payment history and remaining amount
      const updatedHistory = [...paymentHistory, paymentData];
      setPaymentHistory(updatedHistory);
      
      const newRemaining = 43000 - totalPaid;
      setRemainingAmount(newRemaining > 0 ? newRemaining : 0);
      
      if (updatedHistory.length >= 5 || totalPaid >= 43000) {
        setHasExistingPayments(true);
      }

      // Reset form
      setFormData({
        transactionId: "",
        paymentMethod: "",
        amount: "",
        transactionDate: "",
        serviceType: "",
        destinationCountry: "",
        additionalNotes: ""
      });

      setTimeout(() => setUploadProgress(0), 2000);

    } catch (error) {
      console.error("Manpower service payment submission error:", error);
      showMessage("❌ Failed to submit manpower service payment. Please try again.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: "warning", text: "Pending" },
      approved: { variant: "success", text: "Verified" },
      rejected: { variant: "danger", text: "Rejected" },
      processing: { variant: "info", text: "Processing" },
      completed: { variant: "success", text: "Completed" }
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

  const getProgressPercentage = () => {
    const totalPaid = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
    return (totalPaid / 43000) * 100;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (checkingPayments) {
    return (
      <div className="manpower-service-payment-page">
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col lg={8} className="text-center">
              <Spinner animation="border" variant="primary" className="mb-3" />
              <h4>Checking your manpower service payment history...</h4>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <div className="manpower-service-payment-page">
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col lg={10} xl={8}>
            {/* Header Section */}
            <div className="text-center mb-5">
              <div className="payment-icon mb-3">
                <i className="fas fa-users fa-3x text-primary"></i>
              </div>
              <h1 className="fw-bold text-gradient">Manpower Service Payment</h1>
              <p className="lead text-muted">
                Pay your manpower service verification and processing fees
              </p>
            </div>

            {/* Payment Progress */}
            <Card className="mb-4 shadow-sm border-0">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h6 className="fw-bold mb-1">Manpower Service Fee Progress</h6>
                    <p className="text-muted mb-0">
                      {paymentHistory.length}/5 payments used • {formatCurrency(remainingAmount)} remaining
                    </p>
                  </div>
                  <div className="text-end">
                    <h5 className="fw-bold text-primary mb-0">
                      {formatCurrency(paymentHistory.reduce((sum, payment) => sum + payment.amount, 0))}
                    </h5>
                    <small className="text-muted">Total Paid of {formatCurrency(43000)}</small>
                  </div>
                </div>
                <ProgressBar 
                  now={getProgressPercentage()} 
                  variant={getProgressPercentage() >= 100 ? "success" : "primary"}
                  style={{ height: '12px', borderRadius: '10px' }}
                />
                <div className="mt-2 text-center">
                  <small className="text-muted">
                    {getProgressPercentage() >= 100 ? 
                      "✅ Manpower service fees completed" : 
                      `You can pay up to ${formatCurrency(remainingAmount)} in ${5 - paymentHistory.length} more payments`
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
                    <span className="fw-semibold">Processing Manpower Service Payment...</span>
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
                        <p className="text-muted">No manpower service payments made yet</p>
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
                              Amount: {formatCurrency(payment.amount)}
                            </small>
                            <small className="text-muted d-block">
                              Date: {formatDate(payment.transactionDate)}
                            </small>
                            <small className="text-muted d-block">
                              Method: {payment.paymentMethod}
                            </small>
                            {payment.serviceType && (
                              <small className="text-muted d-block">
                                Service: {payment.serviceType}
                              </small>
                            )}
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
                      <i className="fas fa-briefcase me-2"></i>
                      Manpower Service Payment
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
                        <h4 className="text-success mb-3">Manpower Service Fees Complete</h4>
                        <p className="text-muted mb-4">
                          {paymentHistory.length >= 5 ? 
                            "You have reached the maximum limit of 5 payments." :
                            "You have reached the maximum payment amount of 43,000 BDT."
                          }
                          Your manpower service fees have been fully paid.
                        </p>
                        <div className="bg-light p-3 rounded">
                          <h6 className="fw-bold">Payment Summary</h6>
                          <p className="mb-1">Total Paid: {formatCurrency(paymentHistory.reduce((sum, payment) => sum + payment.amount, 0))}</p>
                          <p className="mb-1">Total Payments: {paymentHistory.length}</p>
                          <p className="mb-0">Status: Ready for Recruitment Processing</p>
                        </div>
                      </div>
                    ) : (
                      <Form onSubmit={handleSubmit}>
                        {/* Service Information */}
                        

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
                                placeholder="e.g., MAN123456789"
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
                                placeholder={`Enter amount (max ${formatCurrency(remainingAmount)})`}
                              />
                              <Form.Text className="text-muted">
                                Available: {formatCurrency(remainingAmount)} • Payments left: {5 - paymentHistory.length}
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
                            placeholder="Any additional information about your manpower service application, skills, experience, or preferences..."
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
                                Processing Manpower Service Payment...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-paper-plane me-2"></i>
                                Submit Manpower Service Payment
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
                  Manpower Service Payment Information
                </h5>
                <Row>
                  <Col md={6}>
                    <h6>Payment Rules</h6>
                    <ul className="small text-muted">
                      <li className="mb-2">
                        <i className="fas fa-check text-success me-2"></i>
                        Maximum 5 payments allowed per user
                      </li>
                      <li className="mb-2">
                        <i className="fas fa-check text-success me-2"></i>
                        Total payment limit: 43,000 BDT
                      </li>
                      <li className="mb-2">
                        <i className="fas fa-check text-success me-2"></i>
                        You can choose any amount per payment
                      </li>
                      <li className="mb-2">
                        <i className="fas fa-check text-success me-2"></i>
                        Full payment required for recruitment processing
                      </li>
                    </ul>
                  </Col>
                  <Col md={6}>
                    <h6>Recruitment Process</h6>
                    <ul className="small text-muted">
                      <li className="mb-2">
                        <i className="fas fa-clock text-warning me-2"></i>
                        Payment verification: 24-48 hours
                      </li>
                      <li className="mb-2">
                        <i className="fas fa-user-check text-info me-2"></i>
                        Recruitment process starts after full payment
                      </li>
                      <li className="mb-2">
                        <i className="fas fa-envelope text-primary me-2"></i>
                        You'll receive job opportunity updates
                      </li>
                      <li className="mb-2">
                        <i className="fas fa-passport text-success me-2"></i>
                        Visa and documentation support included
                      </li>
                    </ul>
                  </Col>
                </Row>
                <hr />
                <h6 className="fw-semibold">Available Job Categories:</h6>
                <Row>
                  <Col md={6}>
                    <ul className="small text-muted">
                      <li><strong>Skilled Workers:</strong> Engineers, IT Professionals, Accountants</li>
                      <li><strong>Semi-Skilled:</strong> Technicians, Machine Operators, Welders</li>
                      <li><strong>Hospitality:</strong> Hotel Staff, Restaurant Workers, Chefs</li>
                      <li><strong>Healthcare:</strong> Nurses, Caregivers, Medical Assistants</li>
                    </ul>
                  </Col>
                  <Col md={6}>
                    <ul className="small text-muted">
                      <li><strong>Construction:</strong> Laborers, Masons, Carpenters, Electricians</li>
                      <li><strong>Domestic:</strong> Housekeepers, Cleaners, Drivers, Gardeners</li>
                      <li><strong>Factory Workers:</strong> Production Staff, Quality Control</li>
                      <li><strong>Security:</strong> Security Guards, Surveillance Staff</li>
                    </ul>
                  </Col>
                </Row>
                <hr />
                <h6 className="fw-semibold">Popular Destination Countries:</h6>
                <Row>
                  <Col md={6}>
                    <ul className="small text-muted">
                      <li><strong>Middle East:</strong> Saudi Arabia, UAE, Qatar, Kuwait, Oman</li>
                      <li><strong>Asia:</strong> Malaysia, Singapore, South Korea, Japan</li>
                    </ul>
                  </Col>
                  <Col md={6}>
                    <ul className="small text-muted">
                      <li><strong>Western:</strong> USA, UK, Canada, Australia</li>
                      <li><strong>Europe:</strong> Germany, France, Italy, Spain</li>
                    </ul>
                  </Col>
                </Row>
                <hr />
                <h6 className="fw-semibold">Fee Coverage:</h6>
                <Row>
                  <Col md={6}>
                    <ul className="small text-muted">
                      <li>Recruitment processing fees</li>
                      <li>Document verification and attestation</li>
                      <li>Interview coordination</li>
                    </ul>
                  </Col>
                  <Col md={6}>
                    <ul className="small text-muted">
                      <li>Visa processing support</li>
                      <li>Pre-departure orientation</li>
                      <li>Employment contract processing</li>
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
          <Modal.Title>Manpower Service Payment Methods</Modal.Title>
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
                    <h6 className="fw-bold text-primary">{bank.name}</h6>
                    <div className="small">
                      <p className="mb-1"><strong>Account Name:</strong></p>
                      <p className="text-muted mb-2">{bank.accountName}</p>
                      <p className="mb-1"><strong>Account Number:</strong></p>
                      <p className="text-muted mb-2">{bank.account}</p>
                      <p className="mb-1"><strong>Branch:</strong></p>
                      <p className="text-muted mb-2">{bank.branch}</p>
                      <p className="mb-1"><strong>Routing Number:</strong></p>
                      <p className="text-muted mb-0">{bank.routing}</p>
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
                    <h6 className="fw-bold text-success">{mobile.name}</h6>
                    <div className="small">
                      <p className="mb-1"><strong>Account Number:</strong></p>
                      <p className="text-muted mb-2">{mobile.number}</p>
                      <p className="mb-1"><strong>Account Type:</strong></p>
                      <p className="text-muted mb-2">{mobile.type}</p>
                      <p className="mb-1"><strong>Service Type:</strong></p>
                      <p className="text-muted mb-0">{mobile.accountType}</p>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </Col>
          </Row>
          <Alert variant="info" className="mt-3">
            <div className="d-flex">
              <i className="fas fa-info-circle me-2 mt-1"></i>
              <div>
                <strong>Important for Manpower Service:</strong> After making payment, please enter the transaction ID and amount in the form above. 
                Include "Manpower Service" in your payment reference when using bank transfer for proper identification.
              </div>
            </div>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .manpower-service-payment-page {
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

export default ManpowerServicePayment;