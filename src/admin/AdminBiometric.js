import React, { useEffect, useState } from "react";
import { Table, Card, Badge, Button, Modal, Alert, Spinner, Form, Row, Col, Nav } from "react-bootstrap";
import { db } from "../firebaseConfig";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

// Import with error boundary fallback
const AdminBiometricPayments = React.lazy(() => 
  import('./AdminBiometricPayments')
    .catch(error => {
      console.error('Error loading AdminBiometricPayments:', error);
      return { default: () => <Alert variant="danger">Failed to load payments component. Please refresh the page.</Alert> };
    })
);

function AdminBiometric() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("submissions");

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const submissionsRef = collection(db, "visaSubmissions");
      const submissionsSnapshot = await getDocs(submissionsRef);
      
      const submissionsData = submissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by submission date (newest first)
      submissionsData.sort((a, b) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt) : new Date(0);
        const dateB = b.submittedAt ? new Date(b.submittedAt) : new Date(0);
        return dateB - dateA;
      });

      setSubmissions(submissionsData);
    } catch (error) {
      console.error("Error fetching biometric submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (submissionId, newStatus) => {
    try {
      setActionLoading(true);
      const submissionRef = doc(db, "visaSubmissions", submissionId);
      
      await updateDoc(submissionRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setSubmissions(prev => prev.map(sub => 
        sub.id === submissionId 
          ? { 
              ...sub, 
              status: newStatus, 
              updatedAt: new Date().toISOString()
            }
          : sub
      ));

      // Update selected submission if open
      if (selectedSubmission && selectedSubmission.id === submissionId) {
        setSelectedSubmission(prev => ({
          ...prev,
          status: newStatus,
          updatedAt: new Date().toISOString()
        }));
      }

      setActionLoading(false);
      
    } catch (error) {
      console.error("Error updating submission status:", error);
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

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusVariant = (status) => {
    const statusValue = status || "pending";
    switch (statusValue.toLowerCase()) {
      case "approved": return "success";
      case "rejected": return "danger";
      case "pending": return "warning";
      case "under_review": return "info";
      case "completed": return "primary";
      case "scheduled": return "secondary";
      default: return "secondary";
    }
  };

  const getDisplayStatus = (submission) => {
    return submission.status || "pending";
  };

  // Filter submissions based on status and search term
  const filteredSubmissions = submissions.filter(sub => {
    const statusMatch = statusFilter === "all" || getDisplayStatus(sub) === statusFilter;
    const searchMatch = 
      sub.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.submissionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.vlnNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.vfsCenter?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && searchMatch;
  });

  const pendingCount = submissions.filter(sub => !sub.status || sub.status === "pending").length;
  const totalCount = submissions.length;

  const downloadFile = (fileData, fileName) => {
    if (fileData?.base64Data) {
      const link = document.createElement('a');
      link.href = fileData.base64Data;
      link.download = fileName || fileData.fileName || 'document';
      link.click();
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading biometric submissions...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Tab Navigation */}
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-light">
          <Nav variant="tabs" activeKey={activeTab} onSelect={setActiveTab}>
            <Nav.Item>
              <Nav.Link eventKey="submissions">
                <i className="fas fa-fingerprint me-2"></i>
                Biometric Submissions
                {pendingCount > 0 && (
                  <Badge bg="danger" className="ms-2">
                    {pendingCount}
                  </Badge>
                )}
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="payments">
                <i className="fas fa-money-check me-2"></i>
                Biometric Payments
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Header>
      </Card>

      {/* Submissions Tab Content */}
      {activeTab === "submissions" && (
        <Card className="shadow-sm">
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-0">
                <i className="fas fa-fingerprint me-2"></i>
                Biometric Submissions Management
              </h4>
              <small>Total: {totalCount} | Pending: {pendingCount}</small>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <Form.Control
                type="text"
                placeholder="Search by email, submission ID, VLN number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '300px' }}
              />
              <Button 
                variant="outline-light" 
                size="sm"
                onClick={fetchSubmissions}
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
                <option value="scheduled">Scheduled</option>
                <option value="under_review">Under Review</option>
                <option value="completed">Completed</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Form.Select>
            </div>
          </Card.Header>
          <Card.Body>
            {filteredSubmissions.length === 0 ? (
              <Alert variant="info" className="text-center">
                <i className="fas fa-info-circle me-2"></i>
                No biometric submissions found.
              </Alert>
            ) : (
              <div className="table-responsive">
                <Table striped hover>
                  <thead className="table-dark">
                    <tr>
                      <th>User Email</th>
                      <th>Submission ID</th>
                      <th>VLN Number</th>
                      <th>VFS Center</th>
                      <th>Appointment Date</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((submission) => (
                      <tr key={submission.id}>
                        <td>
                          <small>{submission.userEmail}</small>
                        </td>
                        <td>
                          <code>{submission.submissionId}</code>
                        </td>
                        <td>
                          <code>{submission.vlnNumber || "N/A"}</code>
                        </td>
                        <td>{submission.vfsCenter || "N/A"}</td>
                        <td>
                          {submission.appointmentDate ? (
                            <>
                              <div>{formatDate(submission.appointmentDate)}</div>
                              {submission.appointmentTime && (
                                <small className="text-muted">{submission.appointmentTime}</small>
                              )}
                            </>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td>
                          <Badge bg={getStatusVariant(submission.status)}>
                            {getDisplayStatus(submission)}
                          </Badge>
                        </td>
                        <td>
                          <small>{formatDate(submission.submittedAt)}</small>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                setSelectedSubmission(submission);
                                setShowModal(true);
                              }}
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
                            </Button>
                            {(!submission.status || submission.status === "pending") && (
                              <>
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => handleStatusUpdate(submission.id, "approved")}
                                  title="Approve Submission"
                                  disabled={actionLoading}
                                >
                                  <i className="fas fa-check"></i>
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleStatusUpdate(submission.id, "rejected")}
                                  title="Reject Submission"
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
      )}

      {/* Payments Tab Content with Suspense */}
      {activeTab === "payments" && (
        <React.Suspense fallback={
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Loading payments component...</p>
          </div>
        }>
          <AdminBiometricPayments />
        </React.Suspense>
      )}

      {/* Submission Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="xl">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="fas fa-fingerprint me-2"></i>
            Biometric Submission Details - {selectedSubmission?.submissionId}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {selectedSubmission && (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <h6 className="text-primary border-bottom pb-2">User Information</h6>
                  <p><strong>User Email:</strong> {selectedSubmission.userEmail}</p>
                  <p><strong>User ID:</strong> <code>{selectedSubmission.userId}</code></p>
                  <p><strong>Submission ID:</strong> <code>{selectedSubmission.submissionId}</code></p>
                </Col>
                <Col md={6}>
                  <h6 className="text-primary border-bottom pb-2">Appointment Details</h6>
                  <p><strong>VFS Center:</strong> {selectedSubmission.vfsCenter || "N/A"}</p>
                  <p><strong>VLN Number:</strong> <code>{selectedSubmission.vlnNumber || "N/A"}</code></p>
                  <p><strong>Appointment Date:</strong> {formatDate(selectedSubmission.appointmentDate)}</p>
                  <p><strong>Appointment Time:</strong> {selectedSubmission.appointmentTime || "N/A"}</p>
                </Col>
              </Row>

              {/* VLN Document Section */}
              <Row className="mb-4">
                <Col md={12}>
                  <h6 className="text-primary border-bottom pb-2">VLN Document</h6>
                  {selectedSubmission.vlnDocument ? (
                    <Card className="border">
                      <Card.Body>
                        <Row className="align-items-center">
                          <Col md={8}>
                            <p><strong>File Name:</strong> {selectedSubmission.vlnDocument.fileName}</p>
                            <p><strong>File Type:</strong> {selectedSubmission.vlnDocument.fileType}</p>
                            <p><strong>File Size:</strong> {formatFileSize(selectedSubmission.vlnDocument.fileSize)}</p>
                          </Col>
                          <Col md={4} className="text-end">
                            <Button
                              variant="primary"
                              onClick={() => downloadFile(selectedSubmission.vlnDocument, selectedSubmission.vlnDocument.fileName)}
                            >
                              <i className="fas fa-download me-1"></i>
                              Download VLN Document
                            </Button>
                          </Col>
                        </Row>
                        {selectedSubmission.vlnDocument.fileType?.includes('image') && (
                          <div className="mt-3 text-center">
                            <img 
                              src={selectedSubmission.vlnDocument.base64Data} 
                              alt="VLN Document Preview" 
                              className="img-fluid rounded border"
                              style={{ maxHeight: '300px' }}
                            />
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  ) : (
                    <Alert variant="warning" className="mb-0">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      No VLN document uploaded.
                    </Alert>
                  )}
                </Col>
              </Row>

              {/* Appointment Document Section */}
              <Row className="mb-4">
                <Col md={12}>
                  <h6 className="text-primary border-bottom pb-2">Appointment Document</h6>
                  {selectedSubmission.appointmentDocument ? (
                    <Card className="border">
                      <Card.Body>
                        <Row className="align-items-center">
                          <Col md={8}>
                            <p><strong>File Name:</strong> {selectedSubmission.appointmentDocument.fileName}</p>
                            <p><strong>File Type:</strong> {selectedSubmission.appointmentDocument.fileType}</p>
                            <p><strong>File Size:</strong> {formatFileSize(selectedSubmission.appointmentDocument.fileSize)}</p>
                          </Col>
                          <Col md={4} className="text-end">
                            <Button
                              variant="primary"
                              onClick={() => downloadFile(selectedSubmission.appointmentDocument, selectedSubmission.appointmentDocument.fileName)}
                            >
                              <i className="fas fa-download me-1"></i>
                              Download Appointment Document
                            </Button>
                          </Col>
                        </Row>
                        {selectedSubmission.appointmentDocument.fileType?.includes('image') && (
                          <div className="mt-3 text-center">
                            <img 
                              src={selectedSubmission.appointmentDocument.base64Data} 
                              alt="Appointment Document Preview" 
                              className="img-fluid rounded border"
                              style={{ maxHeight: '300px' }}
                            />
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  ) : (
                    <Alert variant="warning" className="mb-0">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      No appointment document uploaded.
                    </Alert>
                  )}
                </Col>
              </Row>

              {/* Additional Notes */}
              {selectedSubmission.additionalNotes && (
                <Row className="mb-4">
                  <Col md={12}>
                    <h6 className="text-primary border-bottom pb-2">Additional Notes</h6>
                    <Card className="border">
                      <Card.Body>
                        <p className="mb-0">{selectedSubmission.additionalNotes}</p>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}

              <Row>
                <Col md={12}>
                  <h6 className="text-primary border-bottom pb-2">Submission Management</h6>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button
                      variant={getDisplayStatus(selectedSubmission) === "pending" ? "warning" : "outline-warning"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedSubmission.id, "pending")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-clock me-1"></i>
                      Mark as Pending
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedSubmission) === "scheduled" ? "secondary" : "outline-secondary"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedSubmission.id, "scheduled")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-calendar me-1"></i>
                      Scheduled
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedSubmission) === "under_review" ? "info" : "outline-info"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedSubmission.id, "under_review")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-search me-1"></i>
                      Under Review
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedSubmission) === "completed" ? "primary" : "outline-primary"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedSubmission.id, "completed")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-check-circle me-1"></i>
                      Completed
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedSubmission) === "approved" ? "success" : "outline-success"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedSubmission.id, "approved")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-check me-1"></i>
                      Approve
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedSubmission) === "rejected" ? "danger" : "outline-danger"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedSubmission.id, "rejected")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-times me-1"></i>
                      Reject
                    </Button>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-muted mb-1">
                      <strong>Current Status:</strong> 
                      <Badge bg={getStatusVariant(selectedSubmission.status)} className="ms-2">
                        {getDisplayStatus(selectedSubmission)}
                      </Badge>
                    </p>
                    <p className="text-muted mb-1">
                      <strong>Submitted:</strong> {formatDate(selectedSubmission.submittedAt)}
                    </p>
                    {selectedSubmission.updatedAt && (
                      <p className="text-muted mb-0">
                        <strong>Last Updated:</strong> {formatDate(selectedSubmission.updatedAt)}
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

export default AdminBiometric;