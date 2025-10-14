import React, { useEffect, useState } from "react";
import { Table, Card, Badge, Button, Modal, Alert, Spinner, Form, Row, Col } from "react-bootstrap";
import { db } from "../firebaseConfig";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const paymentsRef = collection(db, "transactions");
      const paymentsSnapshot = await getDocs(paymentsRef);
      
      const paymentsData = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by creation date (newest first)
      paymentsData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });

      setPayments(paymentsData);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentStatusUpdate = async (paymentId, newStatus) => {
    try {
      setActionLoading(true);
      const paymentRef = doc(db, "transactions", paymentId);
      
      await updateDoc(paymentRef, {
        paymentStatus: newStatus,
        verified: newStatus === "approved",
        adminVerified: true,
        verifiedAt: new Date()
      });

      // Update local state
      setPayments(prev => prev.map(pay => 
        pay.id === paymentId 
          ? { 
              ...pay, 
              paymentStatus: newStatus,
              verified: newStatus === "approved",
              adminVerified: true,
              verifiedAt: new Date()
            }
          : pay
      ));

      setShowModal(false);
      setActionLoading(false);
      
    } catch (error) {
      console.error("Error updating payment status:", error);
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
    switch (status?.toLowerCase()) {
      case "approved": 
      case "completed": return "success";
      case "rejected": 
      case "failed": return "danger";
      case "pending": return "warning";
      case "processing": return "info";
      default: return "secondary";
    }
  };

  const filteredPayments = statusFilter === "all" 
    ? payments 
    : payments.filter(pay => pay.paymentStatus === statusFilter);

  const pendingCount = payments.filter(pay => pay.paymentStatus === "pending").length;
  const totalRevenue = payments
    .filter(pay => pay.paymentStatus === "approved" || pay.paymentStatus === "completed")
    .reduce((sum, pay) => sum + (parseInt(pay.amount) || 0), 0);

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading payments...</p>
      </div>
    );
  }

  return (
    <div>
      <Card className="shadow-sm">
        <Card.Header className="bg-success text-white d-flex justify-content-between align-items-center">
          <div>
            <h4 className="mb-0">
              <i className="fas fa-credit-card me-2"></i>
              Payments Management
            </h4>
            <small>Total: {payments.length} | Pending: {pendingCount} | Revenue: ${totalRevenue.toLocaleString()}</small>
          </div>
          <div className="d-flex gap-2">
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
              No payments found.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table striped hover>
                <thead className="table-dark">
                  <tr>
                    <th>Transaction ID</th>
                    <th>User Email</th>
                    <th>Amount</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Verified</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <code>{payment.transactionId}</code>
                      </td>
                      <td>
                        <small>{payment.userEmail}</small>
                      </td>
                      <td>
                        <strong className="text-success">${payment.amount}</strong>
                      </td>
                      <td>
                        <div>
                          <div className="fw-semibold">{payment.paymentMethod}</div>
                          <small className="text-muted">{payment.paymentCategory}</small>
                        </div>
                      </td>
                      <td>
                        <Badge bg={getStatusVariant(payment.paymentStatus)}>
                          {payment.paymentStatus}
                        </Badge>
                      </td>
                      <td>
                        <small>{formatDate(payment.createdAt)}</small>
                      </td>
                      <td>
                        {payment.verified ? (
                          <Badge bg="success">Verified</Badge>
                        ) : (
                          <Badge bg="warning">Not Verified</Badge>
                        )}
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
                          {payment.paymentStatus === "pending" && (
                            <>
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handlePaymentStatusUpdate(payment.id, "approved")}
                                title="Approve Payment"
                                disabled={actionLoading}
                              >
                                <i className="fas fa-check"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handlePaymentStatusUpdate(payment.id, "rejected")}
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
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <i className="fas fa-credit-card me-2"></i>
            Payment Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPayment && (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <h6 className="text-success border-bottom pb-2">Payment Information</h6>
                  <p><strong>Transaction ID:</strong> <code>{selectedPayment.transactionId}</code></p>
                  <p><strong>Amount:</strong> <span className="text-success fw-bold">${selectedPayment.amount}</span></p>
                  <p><strong>Payment Method:</strong> {selectedPayment.paymentMethod}</p>
                  <p><strong>Payment Category:</strong> {selectedPayment.paymentCategory}</p>
                  <p><strong>Payment Number:</strong> {selectedPayment.paymentNumber || "N/A"}</p>
                </Col>
                <Col md={6}>
                  <h6 className="text-success border-bottom pb-2">User Information</h6>
                  <p><strong>User Email:</strong> {selectedPayment.userEmail}</p>
                  <p><strong>User ID:</strong> {selectedPayment.userId}</p>
                  <p><strong>Application ID:</strong> {selectedPayment.applicationId}</p>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <h6 className="text-success border-bottom pb-2">Payment Management</h6>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button
                      variant={selectedPayment.paymentStatus === "pending" ? "warning" : "outline-warning"}
                      size="sm"
                      onClick={() => handlePaymentStatusUpdate(selectedPayment.id, "pending")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-clock me-1"></i>
                      Mark Pending
                    </Button>
                    <Button
                      variant={selectedPayment.paymentStatus === "approved" ? "success" : "outline-success"}
                      size="sm"
                      onClick={() => handlePaymentStatusUpdate(selectedPayment.id, "approved")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-check me-1"></i>
                      Approve Payment
                    </Button>
                    <Button
                      variant={selectedPayment.paymentStatus === "rejected" ? "danger" : "outline-danger"}
                      size="sm"
                      onClick={() => handlePaymentStatusUpdate(selectedPayment.id, "rejected")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-times me-1"></i>
                      Reject Payment
                    </Button>
                    <Button
                      variant={selectedPayment.paymentStatus === "completed" ? "info" : "outline-info"}
                      size="sm"
                      onClick={() => handlePaymentStatusUpdate(selectedPayment.id, "completed")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-check-double me-1"></i>
                      Mark Completed
                    </Button>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-muted mb-1">
                      <strong>Payment ID:</strong> <code>{selectedPayment.id}</code>
                    </p>
                    <p className="text-muted mb-1">
                      <strong>Created:</strong> {formatDate(selectedPayment.createdAt)}
                    </p>
                    {selectedPayment.verifiedAt && (
                      <p className="text-muted mb-0">
                        <strong>Verified At:</strong> {formatDate(selectedPayment.verifiedAt)}
                      </p>
                    )}
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

export default AdminPayments;