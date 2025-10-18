import React, { useState, useEffect } from "react";
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Table, 
  Button, 
  Badge, 
  Modal, 
  Form, 
  Alert,
  Spinner,
  InputGroup
} from "react-bootstrap";
import { db } from "../firebaseConfig";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc,
  query,
  orderBy
} from "firebase/firestore";

function AdminWorkPermitPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [updating, setUpdating] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    failed: 0,
    totalAmount: 0
  });

  // Payment status options
  const statusOptions = [
    "pending",
    "completed",
    "failed",
    "cancelled",
    "refunded"
  ];

  // Service type options
  const serviceTypeOptions = [
    "work_permit_application",
    "visa_processing",
    "document_verification",
    "consultation",
    "renewal",
    "other"
  ];

  // Country options
  const countryOptions = [
    "Australia",
    "Canada",
    "USA",
    "UK",
    "Germany",
    "Other"
  ];

  // Visa subclass options for Australia
//   const visaSubclassOptions = [
//     "Subclass 482",
//     "Subclass 400",
//     "Subclass 407",
//     "Subclass 408",
//     "Subclass 186",
//     "Subclass 189",
//     "Subclass 190",
//     "Other"
//   ];

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError("");
      
      const paymentsRef = collection(db, "australiaWorkPermitPayments");
      const q = query(paymentsRef, orderBy("submittedAt", "desc"));
      const snapshot = await getDocs(q);
      
      const paymentsData = [];
      let totalAmount = 0;
      let pendingCount = 0;
      let completedCount = 0;
      let failedCount = 0;

      snapshot.forEach(doc => {
        const payment = {
          id: doc.id,
          ...doc.data()
        };
        paymentsData.push(payment);

        // Calculate stats
        if (payment.status === "pending") pendingCount++;
        if (payment.status === "completed") completedCount++;
        if (payment.status === "failed") failedCount++;
        if (payment.amount) totalAmount += parseFloat(payment.amount);
      });
      
      setPayments(paymentsData);
      setStats({
        total: paymentsData.length,
        pending: pendingCount,
        completed: completedCount,
        failed: failedCount,
        totalAmount: totalAmount
      });
    } catch (err) {
      console.error("Error loading work permit payments:", err);
      setError("Failed to load work permit payments: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (payment) => {
    setSelectedPayment(payment);
    setShowModal(true);
  };

  const handleUpdateStatus = async (paymentId, newStatus) => {
    try {
      setUpdating(true);
      setError("");
      
      const paymentRef = doc(db, "australiaWorkPermitPayments", paymentId);
      await updateDoc(paymentRef, {
        status: newStatus,
        verified: newStatus === "completed" ? true : false
      });
      
      // Update local state
      setPayments(prev => 
        prev.map(payment => 
          payment.id === paymentId 
            ? { 
                ...payment, 
                status: newStatus,
                verified: newStatus === "completed" ? true : payment.verified
              }
            : payment
        )
      );

      // Reload stats
      await loadPayments();
      
      setSuccess(`Payment status updated to ${newStatus} successfully`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating payment status:", err);
      setError("Failed to update payment status: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyToggle = async (paymentId, currentVerified) => {
    try {
      setUpdating(true);
      setError("");
      
      const paymentRef = doc(db, "australiaWorkPermitPayments", paymentId);
      await updateDoc(paymentRef, {
        verified: !currentVerified
      });
      
      // Update local state
      setPayments(prev => 
        prev.map(payment => 
          payment.id === paymentId 
            ? { ...payment, verified: !currentVerified }
            : payment
        )
      );
      
      setSuccess(`Payment ${!currentVerified ? 'verified' : 'unverified'} successfully`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating verification:", err);
      setError("Failed to update verification: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "completed": return "success";
      case "failed": return "danger";
      case "cancelled": return "secondary";
      case "processing": return "warning";
      default: return "warning";
    }
  };

  const getServiceTypeVariant = (serviceType) => {
    switch (serviceType) {
      case "work_permit_application": return "primary";
      case "visa_processing": return "info";
      case "document_verification": return "success";
      case "consultation": return "warning";
      case "renewal": return "secondary";
      default: return "dark";
    }
  };

  const formatServiceType = (serviceType) => {
    return serviceType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      let date;
      if (timestamp.toDate) {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
      
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      console.error("Error formatting date:", err);
      return "Invalid Date";
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Filter payments based on search term, status, country, and service type
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paymentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.visaSubclass?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const matchesCountry = countryFilter === "all" || payment.country === countryFilter;
    const matchesServiceType = serviceTypeFilter === "all" || payment.serviceType === serviceTypeFilter;

    return matchesSearch && matchesStatus && matchesCountry && matchesServiceType;
  });

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading Work Permit Payments...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <Row className="align-items-center">
                <Col>
                  <h4 className="mb-1 text-dark">
                    <i className="fas fa-credit-card me-2 text-primary"></i>
                    Work Permit Payment Management
                  </h4>
                  <p className="mb-0 text-muted">
                    Manage work permit payment transactions and verifications
                  </p>
                </Col>
                <Col xs="auto">
                  <Badge bg="primary" className="fs-6">
                    Total: {stats.total}
                  </Badge>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Alerts */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* Filters and Search */}
      <Row className="mb-4">
        <Col md={4}>
          <InputGroup>
            <InputGroup.Text>
              <i className="fas fa-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by email, transaction ID, payment ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={2}>
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
          >
            <option value="all">All Countries</option>
            {countryOptions.map(country => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select
            value={serviceTypeFilter}
            onChange={(e) => setServiceTypeFilter(e.target.value)}
          >
            <option value="all">All Services</option>
            {serviceTypeOptions.map(service => (
              <option key={service} value={service}>
                {formatServiceType(service)}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2}>
          <div className="d-grid gap-2">
            <Button 
              variant="outline-primary" 
              onClick={loadPayments}
              disabled={updating}
            >
              <i className="fas fa-sync-alt me-1"></i>
              Refresh
            </Button>
          </div>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                   style={{ width: '50px', height: '50px' }}>
                <i className="fas fa-credit-card text-primary"></i>
              </div>
              <h5 className="text-primary fw-bold">{stats.total}</h5>
              <small className="text-muted">Total Payments</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                   style={{ width: '50px', height: '50px' }}>
                <i className="fas fa-clock text-warning"></i>
              </div>
              <h5 className="text-warning fw-bold">{stats.pending}</h5>
              <small className="text-muted">Pending</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                   style={{ width: '50px', height: '50px' }}>
                <i className="fas fa-check text-success"></i>
              </div>
              <h5 className="text-success fw-bold">{stats.completed}</h5>
              <small className="text-muted">Completed</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="bg-danger bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                   style={{ width: '50px', height: '50px' }}>
                <i className="fas fa-times text-danger"></i>
              </div>
              <h5 className="text-danger fw-bold">{stats.failed}</h5>
              <small className="text-muted">Failed</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="bg-info bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                   style={{ width: '50px', height: '50px' }}>
                <i className="fas fa-shield-alt text-info"></i>
              </div>
              <h5 className="text-info fw-bold">
                {payments.filter(p => p.verified).length}
              </h5>
              <small className="text-muted">Verified</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                   style={{ width: '50px', height: '50px' }}>
                <i className="fas fa-dollar-sign text-success"></i>
              </div>
              <h5 className="text-success fw-bold">
                {formatCurrency(stats.totalAmount)}
              </h5>
              <small className="text-muted">Total Revenue</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Payments Table */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>
                Work Permit Payments ({filteredPayments.length})
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>User Information</th>
                      <th>Payment Details</th>
                      <th>Service & Visa</th>
                      <th>Country</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Verified</th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-4 text-muted">
                          <i className="fas fa-credit-card fa-2x mb-2"></i>
                          <br />
                          No work permit payments found
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((payment) => (
                        <tr key={payment.id}>
                          <td>
                            <div>
                              <strong>{payment.userEmail}</strong>
                              <br />
                              <small className="text-muted">
                                User ID: {payment.userId}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div>
                              <strong>Method:</strong> {payment.paymentMethod}
                              <br />
                              <strong>Payment ID:</strong> 
                              <code className="ms-1">{payment.paymentId}</code>
                              {payment.transactionId && (
                                <>
                                  <br />
                                  <strong>TX ID:</strong> 
                                  <code className="ms-1">{payment.transactionId}</code>
                                </>
                              )}
                            </div>
                          </td>
                          <td>
                            <div>
                              <Badge bg={getServiceTypeVariant(payment.serviceType)} className="mb-1">
                                {formatServiceType(payment.serviceType)}
                              </Badge>
                              <br />
                              <small className="text-muted">
                                {payment.visaSubclass || "N/A"}
                              </small>
                            </div>
                          </td>
                          <td>
                            <Badge bg="outline-primary">
                              {payment.country || "N/A"}
                            </Badge>
                          </td>
                          <td>
                            <strong>{formatCurrency(payment.amount)}</strong>
                          </td>
                          <td>
                            <Badge bg={getStatusVariant(payment.status)}>
                              {payment.status?.toUpperCase()}
                            </Badge>
                          </td>
                          <td>
                            {payment.verified ? (
                              <Badge bg="success">
                                <i className="fas fa-check"></i> Verified
                              </Badge>
                            ) : (
                              <Badge bg="secondary">Not Verified</Badge>
                            )}
                          </td>
                          <td>
                            {formatDate(payment.submittedAt)}
                          </td>
                          <td>
                            <div className="d-flex gap-1 mb-2">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => handleViewDetails(payment)}
                              >
                                <i className="fas fa-eye"></i>
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline-success"
                                onClick={() => handleVerifyToggle(payment.id, payment.verified)}
                                disabled={updating || payment.status !== 'completed'}
                                title={payment.status !== 'completed' ? 'Complete payment first' : ''}
                              >
                                <i className={`fas ${payment.verified ? "fa-times" : "fa-check"}`}></i>
                              </Button>
                            </div>
                            
                            {/* Status Update Dropdown */}
                            <Form.Select
                              size="sm"
                              value={payment.status || ""}
                              onChange={(e) => handleUpdateStatus(payment.id, e.target.value)}
                              disabled={updating}
                            >
                              {statusOptions.map(status => (
                                <option key={status} value={status}>
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </option>
                              ))}
                            </Form.Select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Payment Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Payment Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPayment && (
            <Row>
              <Col md={6}>
                <h6>User Information</h6>
                <Card className="bg-light mb-3">
                  <Card.Body>
                    <p><strong>Email:</strong> {selectedPayment.userEmail}</p>
                    <p><strong>User ID:</strong> {selectedPayment.userId}</p>
                  </Card.Body>
                </Card>

                <h6>Payment Information</h6>
                <Card className="bg-light">
                  <Card.Body>
                    <p><strong>Payment ID:</strong> {selectedPayment.paymentId}</p>
                    <p><strong>Payment Method:</strong> {selectedPayment.paymentMethod}</p>
                    <p><strong>Transaction ID:</strong> {selectedPayment.transactionId || "N/A"}</p>
                    <p><strong>Service Type:</strong> 
                      <Badge bg={getServiceTypeVariant(selectedPayment.serviceType)} className="ms-2">
                        {formatServiceType(selectedPayment.serviceType)}
                      </Badge>
                    </p>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={6}>
                <h6>Application Details</h6>
                <Card className="bg-light mb-3">
                  <Card.Body>
                    <p><strong>Country:</strong> {selectedPayment.country}</p>
                    <p><strong>Visa Subclass:</strong> {selectedPayment.visaSubclass || "N/A"}</p>
                    <p><strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}</p>
                  </Card.Body>
                </Card>

                <h6>Status & Dates</h6>
                <Card className="bg-light">
                  <Card.Body>
                    <p>
                      <strong>Status:</strong>{" "}
                      <Badge bg={getStatusVariant(selectedPayment.status)}>
                        {selectedPayment.status?.toUpperCase()}
                      </Badge>
                    </p>
                    <p>
                      <strong>Verified:</strong>{" "}
                      {selectedPayment.verified ? (
                        <Badge bg="success">YES</Badge>
                      ) : (
                        <Badge bg="secondary">NO</Badge>
                      )}
                    </p>
                    <p><strong>Submitted:</strong> {formatDate(selectedPayment.submittedAt)}</p>
                    <p><strong>Transaction Date:</strong> {formatDate(selectedPayment.transactionDate)}</p>
                  </Card.Body>
                </Card>
              </Col>
              
              {selectedPayment.additionalNotes && (
                <Col md={12}>
                  <h6 className="mt-3">Additional Notes</h6>
                  <Card className="bg-light">
                    <Card.Body>
                      {selectedPayment.additionalNotes}
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          {selectedPayment && (
            <Button 
              variant={selectedPayment.verified ? "warning" : "success"}
              onClick={() => handleVerifyToggle(selectedPayment.id, selectedPayment.verified)}
              disabled={updating || selectedPayment.status !== 'completed'}
            >
              <i className={`fas ${selectedPayment.verified ? "fa-times" : "fa-check"} me-1`}></i>
              {selectedPayment.verified ? 'Unverify' : 'Verify'} Payment
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default AdminWorkPermitPayments;