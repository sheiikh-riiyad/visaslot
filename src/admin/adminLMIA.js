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
  deleteDoc,
  query,
  orderBy,
  Timestamp
} from "firebase/firestore";
import AdminLMIAPayments from "./adminLMIAPayments";

function AdminLMIA() {
  const [lmiaSubmissions, setLmiaSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // Status options for filtering and updating
  const statusOptions = [
    "pending",
    "approved",
    "rejected",
    "under_review",
    "expired"
  ];

  useEffect(() => {
    loadLMIAApplications();
  }, []);

  const loadLMIAApplications = async () => {
    try {
      setLoading(true);
      setError("");
      
      const lmiaRef = collection(db, "lmiaSubmissions");
      const q = query(lmiaRef, orderBy("submittedAt", "desc"));
      const snapshot = await getDocs(q);
      
      const submissions = [];
      snapshot.forEach(doc => {
        submissions.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setLmiaSubmissions(submissions);
    } catch (err) {
      console.error("Error loading LMIA applications:", err);
      setError("Failed to load LMIA applications: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (submission) => {
    setSelectedSubmission(submission);
    // Initialize form data with properly formatted dates
    setEditFormData({
      ...submission,
      issueDate: formatDateForInput(submission.issueDate),
      expiryDate: formatDateForInput(submission.expiryDate)
    });
    setEditing(false);
    setShowModal(true);
  };

  const handleEditToggle = () => {
    if (!editing) {
      // When starting to edit, format dates for input
      setEditFormData({
        ...selectedSubmission,
        issueDate: formatDateForInput(selectedSubmission.issueDate),
        expiryDate: formatDateForInput(selectedSubmission.expiryDate)
      });
    }
    setEditing(!editing);
  };

  const handleEditChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper function to convert Firestore timestamp to input date string
  const formatDateForInput = (timestamp) => {
    if (!timestamp) return "";
    
    try {
      let date;
      if (timestamp.toDate) {
        // Firestore timestamp
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        // JavaScript Date object
        date = timestamp;
      } else if (typeof timestamp === 'string') {
        // ISO string
        date = new Date(timestamp);
      } else {
        return "";
      }
      
      if (isNaN(date.getTime())) {
        return "";
      }
      
      return date.toISOString().split('T')[0];
    } catch (err) {
      console.error("Error formatting date for input:", err);
      return "";
    }
  };

  // Helper function to convert input date string to Firestore timestamp
  const parseDateFromInput = (dateString) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return null;
      }
      return Timestamp.fromDate(date);
    } catch (err) {
      console.error("Error parsing date from input:", err);
      return null;
    }
  };

  const handleSaveChanges = async () => {
    try {
      setUpdating(true);
      setError("");
      
      const submissionRef = doc(db, "lmiaSubmissions", selectedSubmission.id);
      
      // Prepare update data - convert dates back to Firestore timestamps
      const updateData = {
        employerName: editFormData.employerName || "",
        employerAddress: editFormData.employerAddress || "",
        province: editFormData.province || "",
        jobTitle: editFormData.jobTitle || "",
        nocCode: editFormData.nocCode || "",
        wage: editFormData.wage || "",
        certificateNumber: editFormData.certificateNumber || "",
        issueDate: parseDateFromInput(editFormData.issueDate),
        expiryDate: parseDateFromInput(editFormData.expiryDate),
        status: editFormData.status || "pending",
        verified: editFormData.verified || false,
        additionalNotes: editFormData.additionalNotes || "",
        updatedAt: new Date()
      };
      
      await updateDoc(submissionRef, updateData);
      
      // Update local state
      setLmiaSubmissions(prev => 
        prev.map(sub => 
          sub.id === selectedSubmission.id 
            ? { 
                ...sub, 
                ...updateData,
                // Keep the original submittedAt and userId
                submittedAt: sub.submittedAt,
                userId: sub.userId,
                submissionId: sub.submissionId
              }
            : sub
        )
      );
      
      // Update selected submission
      setSelectedSubmission(prev => ({
        ...prev,
        ...updateData
      }));
      
      setEditing(false);
      setSuccess("Submission updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating submission:", err);
      setError("Failed to update submission: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (submissionId, newStatus) => {
    try {
      setUpdating(true);
      setError("");
      
      const submissionRef = doc(db, "lmiaSubmissions", submissionId);
      await updateDoc(submissionRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Update local state
      setLmiaSubmissions(prev => 
        prev.map(sub => 
          sub.id === submissionId 
            ? { ...sub, status: newStatus, updatedAt: new Date() }
            : sub
        )
      );
      
      setSuccess(`Status updated to ${newStatus} successfully`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Failed to update status: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    if (window.confirm("Are you sure you want to delete this LMIA submission? This action cannot be undone.")) {
      try {
        setError("");
        await deleteDoc(doc(db, "lmiaSubmissions", submissionId));
        
        // Update local state
        setLmiaSubmissions(prev => 
          prev.filter(sub => sub.id !== submissionId)
        );
        
        setShowModal(false);
        setSuccess("LMIA submission deleted successfully");
        setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
        console.error("Error deleting submission:", err);
        setError("Failed to delete submission: " + err.message);
      }
    }
  };

  const handleVerifyToggle = async (submissionId, currentVerified) => {
    try {
      setUpdating(true);
      setError("");
      
      const submissionRef = doc(db, "lmiaSubmissions", submissionId);
      await updateDoc(submissionRef, {
        verified: !currentVerified,
        updatedAt: new Date()
      });
      
      // Update local state
      setLmiaSubmissions(prev => 
        prev.map(sub => 
          sub.id === submissionId 
            ? { ...sub, verified: !currentVerified, updatedAt: new Date() }
            : sub
        )
      );
      
      setSuccess(`Verification ${!currentVerified ? 'added' : 'removed'} successfully`);
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
      case "approved": return "success";
      case "rejected": return "danger";
      case "under_review": return "warning";
      case "expired": return "secondary";
      default: return "primary";
    }
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
        day: 'numeric'
      });
    } catch (err) {
      console.error("Error formatting date:", err);
      return "Invalid Date";
    }
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    try {
      let expiry;
      if (expiryDate.toDate) {
        expiry = expiryDate.toDate();
      } else if (expiryDate instanceof Date) {
        expiry = expiryDate;
      } else {
        expiry = new Date(expiryDate);
      }
      
      if (isNaN(expiry.getTime())) {
        return false;
      }
      
      return expiry < new Date();
    } catch (err) {
      console.error("Error checking expiry date:", err);
      return false;
    }
  };

  // Filter submissions based on search term and status
  const filteredSubmissions = lmiaSubmissions.filter(submission => {
    const matchesSearch = 
      submission.employerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.submissionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.certificateNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || submission.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading LMIA Applications...</p>
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
                    <i className="fas fa-file-contract me-2 text-primary"></i>
                    LMIA Applications Management
                  </h4>
                  <p className="mb-0 text-muted">
                    Manage and review Labour Market Impact Assessment submissions
                  </p>
                </Col>
                <Col xs="auto">
                  <Badge bg="primary" className="fs-6">
                    Total: {lmiaSubmissions.length}
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
        <Col md={6}>
          <InputGroup>
            <InputGroup.Text>
              <i className="fas fa-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by employer, job title, email, or certificate..."
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
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={3}>
          <div className="d-grid gap-2">
            <Button 
              variant="outline-primary" 
              onClick={loadLMIAApplications}
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
                <i className="fas fa-file-alt text-primary"></i>
              </div>
              <h5 className="text-primary fw-bold">{lmiaSubmissions.length}</h5>
              <small className="text-muted">Total Submissions</small>
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
              <h5 className="text-warning fw-bold">
                {lmiaSubmissions.filter(s => s.status === "pending").length}
              </h5>
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
              <h5 className="text-success fw-bold">
                {lmiaSubmissions.filter(s => s.status === "approved").length}
              </h5>
              <small className="text-muted">Approved</small>
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
              <h5 className="text-danger fw-bold">
                {lmiaSubmissions.filter(s => s.status === "rejected").length}
              </h5>
              <small className="text-muted">Rejected</small>
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
                {lmiaSubmissions.filter(s => s.verified).length}
              </h5>
              <small className="text-muted">Verified</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="bg-secondary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                   style={{ width: '50px', height: '50px' }}>
                <i className="fas fa-calendar-times text-secondary"></i>
              </div>
              <h5 className="text-secondary fw-bold">
                {lmiaSubmissions.filter(s => isExpired(s.expiryDate)).length}
              </h5>
              <small className="text-muted">Expired</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* LMIA Submissions Table */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>
                LMIA Submissions ({filteredSubmissions.length})
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Employer</th>
                      <th>Job Title</th>
                      <th>NOC Code</th>
                      <th>Certificate #</th>
                      <th>Status</th>
                      <th>Verified</th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4 text-muted">
                          <i className="fas fa-inbox fa-2x mb-2"></i>
                          <br />
                          No LMIA submissions found
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((submission) => (
                        <tr key={submission.id}>
                          <td>
                            <div>
                              <strong>{submission.employerName}</strong>
                              <br />
                              <small className="text-muted">{submission.userEmail}</small>
                            </div>
                          </td>
                          <td>
                            <div>
                              {submission.jobTitle}
                              <br />
                              <small className="text-muted">${submission.wage}/hr</small>
                            </div>
                          </td>
                          <td>{submission.nocCode || "N/A"}</td>
                          <td>
                            {submission.certificateNumber ? (
                              <code>{submission.certificateNumber}</code>
                            ) : (
                              "N/A"
                            )}
                          </td>
                          <td>
                            <Badge bg={getStatusVariant(submission.status)}>
                              {submission.status?.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {isExpired(submission.expiryDate) && (
                              <Badge bg="secondary" className="ms-1">EXPIRED</Badge>
                            )}
                          </td>
                          <td>
                            {submission.verified ? (
                              <Badge bg="success">
                                <i className="fas fa-check"></i> Verified
                              </Badge>
                            ) : (
                              <Badge bg="secondary">Not Verified</Badge>
                            )}
                          </td>
                          <td>
                            {formatDate(submission.submittedAt)}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => handleViewDetails(submission)}
                              >
                                <i className="fas fa-eye"></i>
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline-success"
                                onClick={() => handleVerifyToggle(submission.id, submission.verified)}
                                disabled={updating}
                              >
                                <i className={`fas ${submission.verified ? "fa-times" : "fa-check"}`}></i>
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleDeleteSubmission(submission.id)}
                                disabled={updating}
                              >
                                <i className="fas fa-trash"></i>
                              </Button>
                            </div>
                            
                            {/* Status Update Dropdown */}
                            <Form.Select
                              size="sm"
                              className="mt-1"
                              value={submission.status || ""}
                              onChange={(e) => handleUpdateStatus(submission.id, e.target.value)}
                              disabled={updating}
                            >
                              {statusOptions.map(status => (
                                <option key={status} value={status}>
                                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
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

      {/* Enhanced Details Modal with Editing */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editing ? "Edit LMIA Submission" : "LMIA Submission Details"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSubmission && (
            <Row>
              <Col md={6}>
                <h6>Employer Information</h6>
                {editing ? (
                  <>
                    <Form.Group className="mb-2">
                      <Form.Label>Employer Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={editFormData.employerName || ""}
                        onChange={(e) => handleEditChange("employerName", e.target.value)}
                      />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Employer Address</Form.Label>
                      <Form.Control
                        type="text"
                        value={editFormData.employerAddress || ""}
                        onChange={(e) => handleEditChange("employerAddress", e.target.value)}
                      />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Province</Form.Label>
                      <Form.Control
                        type="text"
                        value={editFormData.province || ""}
                        onChange={(e) => handleEditChange("province", e.target.value)}
                      />
                    </Form.Group>
                  </>
                ) : (
                  <>
                    <p><strong>Name:</strong> {selectedSubmission.employerName}</p>
                    <p><strong>Address:</strong> {selectedSubmission.employerAddress}</p>
                    <p><strong>Province:</strong> {selectedSubmission.province}</p>
                  </>
                )}

                <h6 className="mt-3">Job Information</h6>
                {editing ? (
                  <>
                    <Form.Group className="mb-2">
                      <Form.Label>Job Title</Form.Label>
                      <Form.Control
                        type="text"
                        value={editFormData.jobTitle || ""}
                        onChange={(e) => handleEditChange("jobTitle", e.target.value)}
                      />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>NOC Code</Form.Label>
                      <Form.Control
                        type="text"
                        value={editFormData.nocCode || ""}
                        onChange={(e) => handleEditChange("nocCode", e.target.value)}
                      />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Wage ($/hour)</Form.Label>
                      <Form.Control
                        type="number"
                        value={editFormData.wage || ""}
                        onChange={(e) => handleEditChange("wage", parseFloat(e.target.value) || "")}
                      />
                    </Form.Group>
                  </>
                ) : (
                  <>
                    <p><strong>Title:</strong> {selectedSubmission.jobTitle}</p>
                    <p><strong>NOC Code:</strong> {selectedSubmission.nocCode || "N/A"}</p>
                    <p><strong>Wage:</strong> ${selectedSubmission.wage}/hour</p>
                  </>
                )}
              </Col>
              
              <Col md={6}>
                <h6>Certificate Details</h6>
                {editing ? (
                  <>
                    <Form.Group className="mb-2">
                      <Form.Label>Certificate Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={editFormData.certificateNumber || ""}
                        onChange={(e) => handleEditChange("certificateNumber", e.target.value)}
                      />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Issue Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={editFormData.issueDate || ""}
                        onChange={(e) => handleEditChange("issueDate", e.target.value)}
                      />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Expiry Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={editFormData.expiryDate || ""}
                        onChange={(e) => handleEditChange("expiryDate", e.target.value)}
                      />
                    </Form.Group>
                  </>
                ) : (
                  <>
                    <p><strong>Certificate #:</strong> {selectedSubmission.certificateNumber || "N/A"}</p>
                    <p><strong>Issue Date:</strong> {formatDate(selectedSubmission.issueDate)}</p>
                    <p><strong>Expiry Date:</strong> {formatDate(selectedSubmission.expiryDate)}</p>
                  </>
                )}

                <h6 className="mt-3">Submission Info</h6>
                <p><strong>Submission ID:</strong> {selectedSubmission.submissionId}</p>
                <p><strong>User Email:</strong> {selectedSubmission.userEmail}</p>
                <p><strong>User ID:</strong> {selectedSubmission.userId}</p>
                <p><strong>Submitted:</strong> {formatDate(selectedSubmission.submittedAt)}</p>
                
                <h6 className="mt-3">Status</h6>
                {editing ? (
                  <Form.Group className="mb-2">
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      value={editFormData.status || ""}
                      onChange={(e) => handleEditChange("status", e.target.value)}
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                ) : (
                  <p>
                    <Badge bg={getStatusVariant(selectedSubmission.status)}>
                      {selectedSubmission.status?.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {selectedSubmission.verified && (
                      <Badge bg="success" className="ms-2">
                        <i className="fas fa-check"></i> VERIFIED
                      </Badge>
                    )}
                  </p>
                )}

                {editing && (
                  <Form.Group className="mb-2">
                    <Form.Check
                      type="checkbox"
                      label="Verified"
                      checked={editFormData.verified || false}
                      onChange={(e) => handleEditChange("verified", e.target.checked)}
                    />
                  </Form.Group>
                )}
              </Col>
              
              {(selectedSubmission.additionalNotes || editing) && (
                <Col md={12}>
                  <h6 className="mt-3">Additional Notes</h6>
                  {editing ? (
                    <Form.Group className="mb-2">
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={editFormData.additionalNotes || ""}
                        onChange={(e) => handleEditChange("additionalNotes", e.target.value)}
                        placeholder="Enter any additional notes..."
                      />
                    </Form.Group>
                  ) : (
                    <Card className="bg-light">
                      <Card.Body>
                        {selectedSubmission.additionalNotes || "No additional notes"}
                      </Card.Body>
                    </Card>
                  )}
                </Col>
              )}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex justify-content-between w-100">
            <div>
              {!editing && (
                <Button 
                  variant="warning" 
                  onClick={handleEditToggle}
                >
                  <i className="fas fa-edit me-1"></i>
                  Edit Submission
                </Button>
              )}
            </div>
            <div>
              {editing ? (
                <>
                  <Button 
                    variant="secondary" 
                    onClick={handleEditToggle}
                    className="me-2"
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleSaveChanges}
                    disabled={updating}
                  >
                    {updating ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-1"></i>
                        Save Changes
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  Close
                </Button>
              )}
            </div>
          </div>
        </Modal.Footer>
      </Modal>

      <AdminLMIAPayments/>
    </Container>
  );
}

export default AdminLMIA;