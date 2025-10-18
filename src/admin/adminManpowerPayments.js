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

function AdminManpowerPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState("all");
  const [updating, setUpdating] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0
  });

  // Payment status options
  const statusOptions = [
    "pending",
    "processing", 
    "approved",
    "completed",
    "rejected"
  ];

  // Service category options
  const serviceCategoryOptions = [
    "recruitment",
    "visa_processing",
    "document_clearance",
    "training",
    "medical_checkup",
    "travel_arrangements",
    "deployment",
    "other_services"
  ];

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError("");
      
      const paymentsRef = collection(db, "manpowerServicePayments");
      const q = query(paymentsRef, orderBy("submittedAt", "desc"));
      const snapshot = await getDocs(q);
      
      const paymentsData = [];
      let totalAmount = 0;
      let pendingCount = 0;
      let processingCount = 0;
      let completedCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;

      snapshot.forEach(doc => {
        const payment = {
          id: doc.id,
          ...doc.data()
        };
        paymentsData.push(payment);

        // Calculate stats
        if (payment.status === "pending") pendingCount++;
        if (payment.status === "processing") processingCount++;
        if (payment.status === "completed") completedCount++;
        if (payment.status === "approved") approvedCount++;
        if (payment.status === "rejected") rejectedCount++;
        if (payment.amount) totalAmount += parseFloat(payment.amount);
      });
      
      setPayments(paymentsData);
      setStats({
        total: paymentsData.length,
        pending: pendingCount,
        processing: processingCount,
        completed: completedCount,
        approved: approvedCount,
        rejected: rejectedCount,
        totalAmount: totalAmount
      });
    } catch (err) {
      console.error("Error loading manpower payments:", err);
      setError("Failed to load manpower payments: " + err.message);
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
      
      const paymentRef = doc(db, "manpowerServicePayments", paymentId);
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
      
      const paymentRef = doc(db, "manpowerServicePayments", paymentId);
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
      case "approved": return "info";
      case "processing": return "warning";
      case "rejected": return "danger";
      default: return "secondary";
    }
  };

  const getServiceCategoryVariant = (serviceCategory) => {
    switch (serviceCategory) {
      case "recruitment": return "primary";
      case "visa_processing": return "info";
      case "document_clearance": return "success";
      case "training": return "warning";
      case "medical_checkup": return "danger";
      case "travel_arrangements": return "dark";
      case "deployment": return "secondary";
      default: return "outline-primary";
    }
  };

  const formatServiceCategory = (serviceCategory) => {
    return serviceCategory
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
      return "Invalid Date";
    }
  };

  const formatCurrency = (amount, currency = 'BDT') => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Filter payments based on search term, status, and service category
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paymentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const matchesServiceCategory = serviceCategoryFilter === "all" || payment.serviceCategory === serviceCategoryFilter;

    return matchesSearch && matchesStatus && matchesServiceCategory;
  });

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading Manpower Payments...</p>
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
                    <i className="fas fa-money-bill-wave me-2 text-primary"></i>
                    Manpower Service Payments
                  </h4>
                  <p className="mb-0 text-muted">
                    Manage manpower service payment transactions
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
        <Col md={3}>
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
        <Col md={3}>
          <Form.Select
            value={serviceCategoryFilter}
            onChange={(e) => setServiceCategoryFilter(e.target.value)}
          >
            <option value="all">All Services</option>
            {serviceCategoryOptions.map(service => (
              <option key={service} value={service}>
                {formatServiceCategory(service)}
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
              <div className="bg-secondary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                   style={{ width: '50px', height: '50px' }}>
                <i className="fas fa-clock text-secondary"></i>
              </div>
              <h5 className="text-secondary fw-bold">{stats.pending}</h5>
              <small className="text-muted">Pending</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                   style={{ width: '50px', height: '50px' }}>
                <i className="fas fa-cog text-warning"></i>
              </div>
              <h5 className="text-warning fw-bold">{stats.processing}</h5>
              <small className="text-muted">Processing</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="bg-info bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                   style={{ width: '50px', height: '50px' }}>
                <i className="fas fa-check-circle text-info"></i>
              </div>
              <h5 className="text-info fw-bold">{stats.approved}</h5>
              <small className="text-muted">Approved</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                   style={{ width: '50px', height: '50px' }}>
                <i className="fas fa-check-double text-success"></i>
              </div>
              <h5 className="text-success fw-bold">{stats.completed}</h5>
              <small className="text-muted">Completed</small>
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
                Manpower Service Payments ({filteredPayments.length})
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>User Information</th>
                      <th>Payment Details</th>
                      <th>Service Category</th>
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
                        <td colSpan="8" className="text-center py-4 text-muted">
                          <i className="fas fa-credit-card fa-2x mb-2"></i>
                          <br />
                          No manpower payments found
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
                            <Badge bg={getServiceCategoryVariant(payment.serviceCategory)}>
                              {formatServiceCategory(payment.serviceCategory)}
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
                <Card className="bg-light ">
                  <Card.Body>
                    <p><strong>Payment ID:</strong> {selectedPayment.paymentId}</p>
                    <p><strong>Payment Method:</strong> {selectedPayment.paymentMethod}</p>
                    <p><strong>Transaction ID:</strong> {selectedPayment.transactionId || "N/A"}</p>
                    <p><strong>Service Category:</strong> 
                      <Badge  bg={getServiceCategoryVariant(selectedPayment.serviceCategory)} className="ms-2">
                        {formatServiceCategory(selectedPayment.serviceCategory)}
                      </Badge>
                    </p>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={6}>
                <h6>Amount & Dates</h6>
                <Card className="bg-light mb-3">
                  <Card.Body>
                    <p><strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}</p>
                    <p><strong>Submitted:</strong> {formatDate(selectedPayment.submittedAt)}</p>
                    <p><strong>Transaction Date:</strong> {formatDate(selectedPayment.transactionDate)}</p>
                  </Card.Body>
                </Card>

                <h6>Status & Verification</h6>
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

export default AdminManpowerPayments;