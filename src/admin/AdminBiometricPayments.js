import React, { useEffect, useState } from "react";
import { Table, Card, Badge, Button, Modal, Alert, Spinner, Form, Row, Col } from "react-bootstrap";
import { db } from "../firebaseConfig";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

function AdminBiometricPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const paymentsRef = collection(db, "biometricPayments");
      const paymentsSnapshot = await getDocs(paymentsRef);
      
      const paymentsData = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by submission date (newest first)
      paymentsData.sort((a, b) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt) : new Date(0);
        const dateB = b.submittedAt ? new Date(b.submittedAt) : new Date(0);
        return dateB - dateA;
      });

      setPayments(paymentsData);
    } catch (error) {
      console.error("Error fetching biometric payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (paymentId, newStatus) => {
    try {
      setActionLoading(true);
      const paymentRef = doc(db, "biometricPayments", paymentId);
      
      const updateData = {
        status: newStatus,
        verified: newStatus === "approved",
        updatedAt: new Date().toISOString()
      };

      await updateDoc(paymentRef, updateData);

      // Update local state
      setPayments(prev => prev.map(payment => 
        payment.id === paymentId 
          ? { 
              ...payment, 
              ...updateData
            }
          : payment
      ));

      // Update selected payment if open
      if (selectedPayment && selectedPayment.id === paymentId) {
        setSelectedPayment(prev => ({
          ...prev,
          ...updateData
        }));
      }

      setActionLoading(false);
      
    } catch (error) {
      console.error("Error updating payment status:", error);
      alert("Error updating status: " + error.message);
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "N/A";
    }
  };

  const getStatusVariant = (status) => {
    const statusValue = status || "pending";
    switch (statusValue.toLowerCase()) {
      case "approved": return "success";
      case "rejected": return "danger";
      case "pending": return "warning";
      case "processing": return "info";
      case "completed": return "primary";
      case "failed": return "dark";
      default: return "secondary";
    }
  };

  const getDisplayStatus = (payment) => {
    return payment.status || "pending";
  };

  const getVerificationBadge = (verified) => {
    return verified ? (
      <Badge bg="success">
        <i className="fas fa-check-circle me-1"></i>
        Verified
      </Badge>
    ) : (
      <Badge bg="secondary">
        <i className="fas fa-clock me-1"></i>
        Not Verified
      </Badge>
    );
  };

  // Filter payments based on status and search term
  const filteredPayments = payments.filter(payment => {
    const statusMatch = statusFilter === "all" || getDisplayStatus(payment) === statusFilter;
    const searchMatch = 
      payment.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paymentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && searchMatch;
  });

  const pendingCount = payments.filter(payment => payment.status === "pending").length;
  const totalCount = payments.length;
  const totalRevenue = payments
    .filter(payment => payment.status === "approved")
    .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading biometric payments...</p>
      </div>
    );
  }

  return (
    <div>
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <div>
            <h4 className="mb-0">
              <i className="fas fa-fingerprint me-2"></i>
              Biometric Payments Management
            </h4>
            <small>Total: {totalCount} | Pending: {pendingCount} | Revenue: ${totalRevenue.toFixed(2)}</small>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <Form.Control
              type="text"
              placeholder="Search by email, payment ID, transaction ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '300px' }}
            />
            <Button 
              variant="outline-light" 
              size="sm"
              onClick={fetchPayments}
            >
              <i className="fas fa-sync-alt me-1"></i>
              Refresh
            </Button>
            <Form.Select 
              style={{ width: 'auto' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
            </Form.Select>
          </div>
        </Card.Header>
        <Card.Body>
          {filteredPayments.length === 0 ? (
            <Alert variant="info" className="text-center">
              <i className="fas fa-info-circle me-2"></i>
              No biometric payments found.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table striped hover>
                <thead className="table-dark">
                  <tr>
                    <th>User Email</th>
                    <th>Payment ID</th>
                    <th>Amount</th>
                    <th>Payment Method</th>
                    <th>Transaction ID</th>
                    <th>Status</th>
                    <th>Verified</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <small>{payment.userEmail}</small>
                      </td>
                      <td>
                        <code>{payment.paymentId}</code>
                      </td>
                      <td>
                        <strong className="text-success">${payment.amount}</strong>
                      </td>
                      <td>
                        <Badge bg="secondary" className="text-capitalize">
                          {payment.paymentMethod}
                        </Badge>
                      </td>
                      <td>
                        <code>{payment.transactionId || "N/A"}</code>
                      </td>
                      <td>
                        <Badge bg={getStatusVariant(payment.status)}>
                          {getDisplayStatus(payment)}
                        </Badge>
                      </td>
                      <td>
                        {getVerificationBadge(payment.verified)}
                      </td>
                      <td>
                        <small>{formatDate(payment.submittedAt)}</small>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowModal(true);
                            }}
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          {payment.status === "pending" && (
                            <>
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleStatusUpdate(payment.id, "approved")}
                                title="Approve Payment"
                                disabled={actionLoading}
                              >
                                <i className="fas fa-check"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleStatusUpdate(payment.id, "rejected")}
                                title="Reject Payment"
                                disabled={actionLoading}
                              >
                                <i className="fas fa-times"></i>
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Payment Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="fas fa-fingerprint me-2"></i>
            Biometric Payment Details - {selectedPayment?.paymentId}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPayment && (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <h6 className="text-primary border-bottom pb-2">User Information</h6>
                  <p><strong>User Email:</strong> {selectedPayment.userEmail}</p>
                  <p><strong>User ID:</strong> <code>{selectedPayment.userId}</code></p>
                  <p><strong>Payment ID:</strong> <code>{selectedPayment.paymentId}</code></p>
                </Col>
                <Col md={6}>
                  <h6 className="text-primary border-bottom pb-2">Payment Information</h6>
                  <p><strong>Amount:</strong> 
                    <span className="fw-bold text-success"> ${selectedPayment.amount}</span>
                  </p>
                  <p><strong>Payment Method:</strong> 
                    <Badge bg="secondary" className="ms-2 text-capitalize">
                      {selectedPayment.paymentMethod}
                    </Badge>
                  </p>
                  <p><strong>Transaction ID:</strong> 
                    <code>{selectedPayment.transactionId || "N/A"}</code>
                  </p>
                  {selectedPayment.transactionDate && (
                    <p><strong>Transaction Date:</strong> {formatDate(selectedPayment.transactionDate)}</p>
                  )}
                </Col>
              </Row>

              {/* Additional Notes */}
              {selectedPayment.additionalNotes && (
                <Row className="mb-4">
                  <Col md={12}>
                    <h6 className="text-primary border-bottom pb-2">Additional Notes</h6>
                    <Card className="border">
                      <Card.Body>
                        <p className="mb-0">{selectedPayment.additionalNotes}</p>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}

              <Row className="mb-4">
                <Col md={12}>
                  <h6 className="text-primary border-bottom pb-2">Payment Timeline</h6>
                  <p><strong>Payment Document ID:</strong> <code>{selectedPayment.id}</code></p>
                  <p><strong>Submitted:</strong> {formatDate(selectedPayment.submittedAt)}</p>
                  {selectedPayment.updatedAt && (
                    <p><strong>Last Updated:</strong> {formatDate(selectedPayment.updatedAt)}</p>
                  )}
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <h6 className="text-primary border-bottom pb-2">Payment Management</h6>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button
                      variant={getDisplayStatus(selectedPayment) === "pending" ? "warning" : "outline-warning"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedPayment.id, "pending")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-clock me-1"></i>
                      Mark as Pending
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedPayment) === "processing" ? "info" : "outline-info"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedPayment.id, "processing")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-cog me-1"></i>
                      Processing
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedPayment) === "completed" ? "primary" : "outline-primary"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedPayment.id, "completed")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-check-circle me-1"></i>
                      Completed
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedPayment) === "approved" ? "success" : "outline-success"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedPayment.id, "approved")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-check me-1"></i>
                      Approve
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedPayment) === "rejected" ? "danger" : "outline-danger"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedPayment.id, "rejected")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-times me-1"></i>
                      Reject
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedPayment) === "failed" ? "dark" : "outline-dark"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedPayment.id, "failed")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-exclamation-triangle me-1"></i>
                      Mark as Failed
                    </Button>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-muted mb-1">
                      <strong>Current Status:</strong> 
                      <Badge bg={getStatusVariant(selectedPayment.status)} className="ms-2">
                        {getDisplayStatus(selectedPayment)}
                      </Badge>
                    </p>
                    <p className="text-muted mb-0">
                      <strong>Verification Status:</strong> 
                      {getVerificationBadge(selectedPayment.verified)}
                    </p>
                  </div>
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default AdminBiometricPayments;