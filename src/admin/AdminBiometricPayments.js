import React, { useEffect, useState } from "react";
import { Table, Card, Badge, Button, Modal, Alert, Spinner, Form, Row, Col } from "react-bootstrap";
import { db } from "../firebaseConfig";
import { collection, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";
import emailjs from '@emailjs/browser';

function AdminBiometricPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // EmailJS configuration
  const EMAILJS_CONFIG = {
    serviceId: "service_4l8mwuf",
    templateId: "template_gjfiqui",
    publicKey: "tJ26AXoVZgC8h_htE"
  };

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

  // Function to get user data from users collection
  const getUserData = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  // Function to get status-specific email content
  const getStatusEmailContent = (status, userName, referenceId, applicationType) => {
    const statusConfig = {
      approved: {
        status_title: "Payment Approved",
        status_message: "Your biometric payment has been approved",
        status_color: "#d4edda",
        status_border: "#c3e6cb",
        status_text_color: "#155724",
        custom_message: `We are pleased to inform you that your biometric payment has been successfully approved. Your application is now moving forward in the processing queue.`,
        next_steps_text: `
          <p><strong>What happens next:</strong></p>
          <ul>
            <li>Your payment confirmation has been recorded</li>
            <li>Your application will proceed to the next stage</li>
            <li>You will receive further instructions via email</li>
            <li>Please allow 3-5 business days for processing</li>
          </ul>
        `
      },
      rejected: {
        status_title: "Payment Rejected",
        status_message: "Your biometric payment has been rejected",
        status_color: "#f8d7da",
        status_border: "#f5c6cb",
        status_text_color: "#721c24",
        custom_message: `We regret to inform you that your biometric payment has been rejected. Please review the details and take appropriate action.`,
        next_steps_text: `
          <p><strong>Required actions:</strong></p>
          <ul>
            <li>Review your payment information</li>
            <li>Ensure sufficient funds are available</li>
            <li>Contact your bank if necessary</li>
            <li>Resubmit your payment with correct details</li>
            <li>Contact support if you need assistance</li>
          </ul>
        `
      },
      processing: {
        status_title: "Payment Processing",
        status_message: "Your biometric payment is being processed",
        status_color: "#cce7ff",
        status_border: "#b3d9ff",
        status_text_color: "#004085",
        custom_message: `Your biometric payment is currently being processed by our team. We will notify you once the verification is complete.`,
        next_steps_text: `
          <p><strong>Current status:</strong></p>
          <ul>
            <li>Payment under review by our team</li>
            <li>Verification process in progress</li>
            <li>Typically takes 1-2 business days</li>
            <li>No action required from your side at this time</li>
          </ul>
        `
      },
      completed: {
        status_title: "Payment Completed",
        status_message: "Your biometric payment process is complete",
        status_color: "#d1ecf1",
        status_border: "#bee5eb",
        status_text_color: "#0c5460",
        custom_message: `Your biometric payment process has been completed successfully. Your application will now proceed to the next stage.`,
        next_steps_text: `
          <p><strong>Next steps in your application:</strong></p>
          <ul>
            <li>Await biometric appointment scheduling</li>
            <li>Prepare required documents</li>
            <li>Monitor your email for updates</li>
            <li>Application will be processed in order</li>
          </ul>
        `
      },
      failed: {
        status_title: "Payment Failed",
        status_message: "Your biometric payment has failed",
        status_color: "#e2e3e5",
        status_border: "#d6d8db",
        status_text_color: "#383d41",
        custom_message: `We were unable to process your biometric payment due to technical issues or insufficient funds.`,
        next_steps_text: `
          <p><strong>Required actions:</strong></p>
          <ul>
            <li>Check your payment method details</li>
            <li>Ensure sufficient funds are available</li>
            <li>Try using a different payment method</li>
            <li>Contact your bank for authorization issues</li>
            <li>Resubmit your payment when ready</li>
          </ul>
        `
      },
      pending: {
        status_title: "Payment Pending Review",
        status_message: "Your biometric payment is pending review",
        status_color: "#fff3cd",
        status_border: "#ffeaa7",
        status_text_color: "#856404",
        custom_message: `Your biometric payment has been received and is pending review by our team.`,
        next_steps_text: `
          <p><strong>What to expect:</strong></p>
          <ul>
            <li>Payment under initial review</li>
            <li>Typically processed within 24-48 hours</li>
            <li>You will be notified of any issues</li>
            <li>Check your email for updates</li>
          </ul>
        `
      }
    };

    return statusConfig[status] || statusConfig.pending;
  };

  // Function to send email using EmailJS
  const sendStatusEmail = async (userEmail, userName, status, referenceId, applicationType = "Biometric Payment") => {
    try {
      const emailContent = getStatusEmailContent(status, userName, referenceId, applicationType);
      
      const templateParams = {
        user_name: userName,
        status_type: status.toUpperCase(),
        status_title: emailContent.status_title,
        status_message: emailContent.status_message,
        status_color: emailContent.status_color,
        status_border: emailContent.status_border,
        status_text_color: emailContent.status_text_color,
        custom_message: emailContent.custom_message,
        reference_id: referenceId,
        application_type: applicationType,
        current_date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        next_steps_text: emailContent.next_steps_text,
        to_email: userEmail ,
        subject: `Australia Immigration - Biometric Payment Status Update: ${status.toUpperCase()}`
      };

      const result = await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        templateParams,
        EMAILJS_CONFIG.publicKey
      );

      console.log('Email sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  };

  const handleStatusUpdate = async (paymentId, newStatus) => {
    try {
      setActionLoading(true);
      const paymentRef = doc(db, "biometricPayments", paymentId);
      const payment = payments.find(p => p.id === paymentId);
      
      if (!payment) {
        throw new Error("Payment not found");
      }

      const updateData = {
        status: newStatus,
        verified: newStatus === "approved",
        updatedAt: new Date().toISOString()
      };

      await updateDoc(paymentRef, updateData);

      // Send email notification
      try {
        const userData = await getUserData(payment.userId);
        const userName = userData?.fullName || payment.userEmail?.split('@')[0] || "Applicant";
        
        const emailSent = await sendStatusEmail(
          payment.userEmail,
          userName,
          newStatus,
          payment.paymentId,
          "Biometric Payment"
        );

        if (emailSent) {
          console.log(`Status update email sent to ${payment.userEmail}`);
        } else {
          console.warn(`Failed to send email to ${payment.userEmail}`);
        }
      } catch (emailError) {
        console.error("Error sending email notification:", emailError);
        // Don't throw error here - the status update should still proceed
      }

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
      
      // Show success message
      alert(`Status updated to ${newStatus} and notification email sent to user.`);
      
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