import React, { useEffect, useState } from "react";
import { Table, Card, Badge, Button, Modal, Alert, Spinner, Form, Row, Col } from "react-bootstrap";
import { db } from "../firebaseConfig";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

function AdminJobPayments() {
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
      
      // Get all users first
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      
      let allPayments = [];

      // Fetch payments from each user's jobpayment/payments subcollection
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const paymentsRef = collection(db, `jobpayment/${userId}/payments`);
        
        try {
          const paymentsSnapshot = await getDocs(paymentsRef);
          const userPayments = paymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            userId: userId,
            ...doc.data()
          }));
          
          allPayments = [...allPayments, ...userPayments];
        } catch (error) {
          console.log(`No payments for user ${userId} or error:`, error);
        }
      }

      // Sort by creation date (newest first)
      allPayments.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });

      setPayments(allPayments);
    } catch (error) {
      console.error("Error fetching job payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (paymentId, userId, newStatus) => {
    try {
      setActionLoading(true);
      const paymentRef = doc(db, `jobpayment/${userId}/payments`, paymentId);
      
      await updateDoc(paymentRef, {
        paymentStatus: newStatus,
        verified: newStatus === "approved",
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setPayments(prev => prev.map(payment => 
        payment.id === paymentId && payment.userId === userId
          ? { 
              ...payment, 
              paymentStatus: newStatus,
              verified: newStatus === "approved",
              updatedAt: new Date().toISOString()
            }
          : payment
      ));

      // Update selected payment if open
      if (selectedPayment && selectedPayment.id === paymentId) {
        setSelectedPayment(prev => ({
          ...prev,
          paymentStatus: newStatus,
          verified: newStatus === "approved",
          updatedAt: new Date().toISOString()
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
      case "failed": return "dark";
      default: return "secondary";
    }
  };

  const getDisplayStatus = (payment) => {
    return payment.paymentStatus || "pending";
  };

  // Filter payments based on status and search term
  const filteredPayments = payments.filter(payment => {
    const statusMatch = statusFilter === "all" || getDisplayStatus(payment) === statusFilter;
    const searchMatch = 
      payment.userInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.userInfo?.passportNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paymentNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && searchMatch;
  });

  const pendingCount = payments.filter(payment => payment.paymentStatus === "pending").length;
  const totalCount = payments.length;
  const totalRevenue = payments
    .filter(payment => payment.paymentStatus === "approved")
    .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading job verification payments...</p>
      </div>
    );
  }

  return (
    <div>
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <div>
            <h4 className="mb-0">
              <i className="fas fa-money-check me-2"></i>
              Job Verification Payments
            </h4>
            <small>Total: {totalCount} | Pending: {pendingCount} | Revenue: ${totalRevenue.toFixed(2)}</small>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <Form.Control
              type="text"
              placeholder="Search by name, passport, email, transaction ID..."
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
              No job verification payments found.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table striped hover>
                <thead className="table-dark">
                  <tr>
                    <th>Applicant Name</th>
                    <th>Passport No</th>
                    <th>Email</th>
                    <th>Amount</th>
                    <th>Payment Method</th>
                    <th>Transaction ID</th>
                    <th>Payment Category</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={`${payment.userId}-${payment.id}`}>
                      <td>
                        <strong>{payment.userInfo?.name || "N/A"}</strong>
                      </td>
                      <td>
                        <code>{payment.userInfo?.passportNo || "N/A"}</code>
                      </td>
                      <td>
                        <small>{payment.userEmail || payment.userInfo?.email}</small>
                      </td>
                      <td>
                        <strong>${payment.amount}</strong>
                        {payment.amountBDT && (
                          <div>
                            <small className="text-muted">({payment.amountBDT} BDT)</small>
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge bg="secondary" className="text-capitalize">
                          {payment.paymentMethod}
                        </Badge>
                      </td>
                      <td>
                        <code>{payment.transactionId}</code>
                      </td>
                      <td>{payment.paymentCategory}</td>
                      <td>
                        <Badge bg={getStatusVariant(payment.paymentStatus)}>
                          {getDisplayStatus(payment)}
                          {payment.verified && (
                            <i className="fas fa-check ms-1"></i>
                          )}
                        </Badge>
                      </td>
                      <td>
                        <small>{formatDate(payment.createdAt)}</small>
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
                                onClick={() => handleStatusUpdate(payment.id, payment.userId, "approved")}
                                title="Approve Payment"
                                disabled={actionLoading}
                              >
                                <i className="fas fa-check"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleStatusUpdate(payment.id, payment.userId, "rejected")}
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
            <i className="fas fa-money-check me-2"></i>
            Payment Details - {selectedPayment?.userInfo?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPayment && (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <h6 className="text-primary border-bottom pb-2">Applicant Information</h6>
                  <p><strong>Full Name:</strong> {selectedPayment.userInfo?.name || "N/A"}</p>
                  <p><strong>Passport Number:</strong> <code>{selectedPayment.userInfo?.passportNo || "N/A"}</code></p>
                  <p><strong>Email:</strong> {selectedPayment.userEmail || selectedPayment.userInfo?.email}</p>
                  <p><strong>User ID:</strong> <code>{selectedPayment.userId}</code></p>
                </Col>
                <Col md={6}>
                  <h6 className="text-primary border-bottom pb-2">Payment Information</h6>
                  <p><strong>Amount:</strong> 
                    <span className="fw-bold text-success"> ${selectedPayment.amount}</span>
                    {selectedPayment.amountBDT && (
                      <span className="text-muted"> ({selectedPayment.amountBDT} BDT)</span>
                    )}
                  </p>
                  <p><strong>Payment Method:</strong> 
                    <Badge bg="secondary" className="ms-2 text-capitalize">
                      {selectedPayment.paymentMethod}
                    </Badge>
                  </p>
                  <p><strong>Payment Number:</strong> {selectedPayment.paymentNumber}</p>
                  <p><strong>Transaction ID:</strong> <code>{selectedPayment.transactionId}</code></p>
                  <p><strong>Payment Category:</strong> {selectedPayment.paymentCategory}</p>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col md={12}>
                  <h6 className="text-primary border-bottom pb-2">Payment Timeline</h6>
                  <p><strong>Payment ID:</strong> <code>{selectedPayment.id}</code></p>
                  <p><strong>Created:</strong> {formatDate(selectedPayment.createdAt)}</p>
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
                      onClick={() => handleStatusUpdate(selectedPayment.id, selectedPayment.userId, "pending")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-clock me-1"></i>
                      Mark as Pending
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedPayment) === "processing" ? "info" : "outline-info"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedPayment.id, selectedPayment.userId, "processing")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-cog me-1"></i>
                      Processing
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedPayment) === "approved" ? "success" : "outline-success"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedPayment.id, selectedPayment.userId, "approved")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-check me-1"></i>
                      Approve
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedPayment) === "rejected" ? "danger" : "outline-danger"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedPayment.id, selectedPayment.userId, "rejected")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-times me-1"></i>
                      Reject
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedPayment) === "failed" ? "dark" : "outline-dark"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedPayment.id, selectedPayment.userId, "failed")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-exclamation-triangle me-1"></i>
                      Mark as Failed
                    </Button>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-muted mb-1">
                      <strong>Current Status:</strong> 
                      <Badge bg={getStatusVariant(selectedPayment.paymentStatus)} className="ms-2">
                        {getDisplayStatus(selectedPayment)}
                        {selectedPayment.verified && (
                          <i className="fas fa-check ms-1"></i>
                        )}
                      </Badge>
                    </p>
                    <p className="text-muted mb-0">
                      <strong>Verified:</strong> 
                      <Badge bg={selectedPayment.verified ? "success" : "secondary"} className="ms-2">
                        {selectedPayment.verified ? "Yes" : "No"}
                      </Badge>
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

export default AdminJobPayments;