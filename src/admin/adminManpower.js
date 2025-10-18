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
  orderBy
} from "firebase/firestore";
import AdminManpowerPayments from "./adminManpowerPayments";


function AdminManpower() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [updating, setUpdating] = useState(false);

  // Status options for filtering and updating
  const statusOptions = [
    "pending",
    "under_review",
    "approved",
    "rejected",
    "additional_info_required"
  ];

  // Service type options
  const serviceTypeOptions = [
    "skilled_worker",
    "semi_skilled",
    "unskilled",
    "domestic_worker",
    "construction",
    "manufacturing",
    "hospitality",
    "other"
  ];

  // Country options
  const countryOptions = [
    "Saudi Arabia",
    "UAE",
    "Qatar",
    "Kuwait",
    "Oman",
    "Bahrain",
    "Malaysia",
    "Singapore",
    "South Korea",
    "Japan",
    "Other"
  ];

  // Nationality options
//   const nationalityOptions = [
//     "Bangladeshi",
//     "Indian",
//     "Pakistani",
//     "Nepalese",
//     "Sri Lankan",
//     "Filipino",
//     "Indonesian",
//     "Other"
//   ];

  useEffect(() => {
    loadManpowerSubmissions();
  }, []);

  const loadManpowerSubmissions = async () => {
    try {
      setLoading(true);
      setError("");
      
      const submissionsRef = collection(db, "manpowerSubmissions");
      const q = query(submissionsRef, orderBy("submittedAt", "desc"));
      const snapshot = await getDocs(q);
      
      const submissionsData = [];
      snapshot.forEach(doc => {
        submissionsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setSubmissions(submissionsData);
    } catch (err) {
      console.error("Error loading manpower submissions:", err);
      setError("Failed to load manpower submissions: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (submission) => {
    setSelectedSubmission(submission);
    setShowModal(true);
  };

  const handleViewDocument = (document) => {
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };

  const handleUpdateStatus = async (submissionId, newStatus) => {
    try {
      setUpdating(true);
      setError("");
      
      const submissionRef = doc(db, "manpowerSubmissions", submissionId);
      await updateDoc(submissionRef, {
        status: newStatus
      });
      
      setSubmissions(prev => 
        prev.map(sub => 
          sub.id === submissionId 
            ? { ...sub, status: newStatus }
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

  const handleVerifyToggle = async (submissionId, currentVerified) => {
    try {
      setUpdating(true);
      setError("");
      
      const submissionRef = doc(db, "manpowerSubmissions", submissionId);
      await updateDoc(submissionRef, {
        verified: !currentVerified
      });
      
      setSubmissions(prev => 
        prev.map(sub => 
          sub.id === submissionId 
            ? { ...sub, verified: !currentVerified }
            : sub
        )
      );
      
      setSuccess(`Submission ${!currentVerified ? 'verified' : 'unverified'} successfully`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating verification:", err);
      setError("Failed to update verification: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    if (window.confirm("Are you sure you want to delete this manpower submission? This action cannot be undone.")) {
      try {
        setError("");
        await deleteDoc(doc(db, "manpowerSubmissions", submissionId));
        
        setSubmissions(prev => 
          prev.filter(sub => sub.id !== submissionId)
        );
        
        setSuccess("Manpower submission deleted successfully");
        setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
        console.error("Error deleting submission:", err);
        setError("Failed to delete submission: " + err.message);
      }
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "approved": return "success";
      case "rejected": return "danger";
      case "under_review": return "warning";
      case "additional_info_required": return "info";
      default: return "primary";
    }
  };

  const getServiceTypeVariant = (serviceType) => {
    switch (serviceType) {
      case "skilled_worker": return "primary";
      case "semi_skilled": return "info";
      case "unskilled": return "secondary";
      case "domestic_worker": return "success";
      case "construction": return "warning";
      case "manufacturing": return "dark";
      case "hospitality": return "light";
      default: return "outline-primary";
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
        day: 'numeric'
      });
    } catch (err) {
      return "Invalid Date";
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return "N/A";
    try {
      let dob;
      if (dateOfBirth.toDate) {
        dob = dateOfBirth.toDate();
      } else if (dateOfBirth instanceof Date) {
        dob = dateOfBirth;
      } else {
        dob = new Date(dateOfBirth);
      }
      
      if (isNaN(dob.getTime())) {
        return "Invalid Date";
      }
      
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      
      return age;
    } catch (err) {
      return "N/A";
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  const downloadDocument = (document) => {
    if (!document?.base64Data) {
      alert("No document data available");
      return;
    }

    try {
      const byteCharacters = atob(document.base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: document.fileType });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.fileName || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error downloading document: " + err.message);
    }
  };

  const renderDocumentPreview = (document) => {
    if (!document) {
      return (
        <div className="p-5 border rounded bg-light text-center">
          <i className="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
          <br />
          <p>No document data provided</p>
        </div>
      );
    }

    if (!document.base64Data) {
      return (
        <div className="p-5 border rounded bg-light text-center">
          <i className="fas fa-file-slash fa-3x text-danger mb-3"></i>
          <br />
          <p>No document content available</p>
        </div>
      );
    }

    const fileType = document.fileType?.toLowerCase() || '';
    const fileName = document.fileName || 'Unknown file';

    try {
      if (fileType.startsWith('image/')) {
        return (
          <div className="text-center">
            <img
              src={`data:${fileType};base64,${document.base64Data}`}
              alt={`Preview of ${fileName}`}
              style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
              className="border rounded"
            />
            <p className="mt-2 text-muted">Image Preview</p>
          </div>
        );
      }
      
      else if (fileType === 'application/pdf') {
        const pdfUrl = `data:application/pdf;base64,${document.base64Data}`;
        return (
          <div>
            <iframe
              src={pdfUrl}
              width="100%"
              height="500px"
              title={`PDF: ${fileName}`}
              className="border rounded"
            />
            <p className="mt-2 text-muted">PDF Preview</p>
          </div>
        );
      }
      
      else if (fileType.startsWith('text/') || 
               fileName.endsWith('.txt') || 
               fileName.endsWith('.csv')) {
        try {
          const textContent = atob(document.base64Data);
          return (
            <div>
              <pre className="p-3 border rounded bg-light" style={{ 
                maxHeight: '500px', 
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                {textContent}
              </pre>
              <p className="mt-2 text-muted">Text Content Preview</p>
            </div>
          );
        } catch (textError) {
          // Continue to unsupported file type
        }
      }
      
      return (
        <div className="p-5 border rounded bg-light text-center">
          <i className="fas fa-file fa-3x text-muted mb-3"></i>
          <br />
          <p>This file type cannot be previewed in the browser.</p>
          <p className="text-muted mb-3">
            File: {fileName} ({fileType || 'Unknown type'})
          </p>
          <p className="text-muted small mb-3">
            File size: {formatFileSize(document.fileSize)}
          </p>
          <Button
            variant="primary"
            onClick={() => downloadDocument(document)}
          >
            <i className="fas fa-download me-1"></i>
            Download File
          </Button>
        </div>
      );
      
    } catch (error) {
      return (
        <div className="p-5 border rounded bg-light text-center">
          <i className="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
          <br />
          <p>Error loading document preview</p>
          <Button
            variant="primary"
            onClick={() => downloadDocument(document)}
            className="mt-2"
          >
            <i className="fas fa-download me-1"></i>
            Try Downloading Instead
          </Button>
        </div>
      );
    }
  };

  // Filter submissions based on search term, status, country, and service type
  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = 
      submission.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.passportNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.submissionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.contactNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || submission.status === statusFilter;
    const matchesCountry = countryFilter === "all" || submission.destinationCountry === countryFilter;
    const matchesServiceType = serviceTypeFilter === "all" || submission.serviceType === serviceTypeFilter;

    return matchesSearch && matchesStatus && matchesCountry && matchesServiceType;
  });

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading Manpower Submissions...</p>
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
                    <i className="fas fa-users me-2 text-primary"></i>
                    Manpower Submissions Management
                  </h4>
                  <p className="mb-0 text-muted">
                    Manage and review manpower recruitment submissions
                  </p>
                </Col>
                <Col xs="auto">
                  <Badge bg="primary" className="fs-6">
                    Total: {submissions.length}
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
        <Col md={3}>
          <InputGroup>
            <InputGroup.Text>
              <i className="fas fa-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by name, email, passport, phone..."
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
                {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
        <Col md={3}>
          <div className="d-grid gap-2">
            <Button 
              variant="outline-primary" 
              onClick={loadManpowerSubmissions}
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
                <i className="fas fa-users text-primary"></i>
              </div>
              <h5 className="text-primary fw-bold">{submissions.length}</h5>
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
                {submissions.filter(s => s.status === "pending").length}
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
                {submissions.filter(s => s.status === "approved").length}
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
                {submissions.filter(s => s.status === "rejected").length}
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
                {submissions.filter(s => s.verified).length}
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
                <i className="fas fa-globe text-secondary"></i>
              </div>
              <h5 className="text-secondary fw-bold">
                {[...new Set(submissions.map(s => s.destinationCountry))].length}
              </h5>
              <small className="text-muted">Countries</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Submissions Table */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>
                Manpower Submissions ({filteredSubmissions.length})
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Candidate Information</th>
                      <th>Contact Details</th>
                      <th>Destination & Service</th>
                      <th>Documents</th>
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
                          No manpower submissions found
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((submission) => (
                        <tr key={submission.id}>
                          <td>
                            <div>
                              <strong>{submission.fullName}</strong>
                              <br />
                              <small className="text-muted">
                                Passport: {submission.passportNumber}
                                <br />
                                Nationality: {submission.nationality}
                                <br />
                                Age: {calculateAge(submission.dateOfBirth)}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div>
                              <strong>Email:</strong> {submission.email}
                              <br />
                              <strong>Phone:</strong> {submission.contactNumber}
                              <br />
                              <small className="text-muted">
                                User: {submission.userEmail}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div>
                              <Badge bg="outline-primary" className="mb-1">
                                {submission.destinationCountry}
                              </Badge>
                              <br />
                              <Badge bg={getServiceTypeVariant(submission.serviceType)}>
                                {formatServiceType(submission.serviceType)}
                              </Badge>
                            </div>
                          </td>
                          <td>
                            {submission.document ? (
                              <div>
                                <Button
                                  size="sm"
                                  variant="outline-primary"
                                  onClick={() => handleViewDocument(submission.document)}
                                >
                                  <i className="fas fa-file me-1"></i>
                                  View Document
                                </Button>
                                <br />
                                <small className="text-muted">
                                  {submission.document.fileName}
                                </small>
                              </div>
                            ) : (
                              <Badge bg="secondary">No Document</Badge>
                            )}
                          </td>
                          <td>
                            <Badge bg={getStatusVariant(submission.status)}>
                              {submission.status?.replace(/_/g, ' ').toUpperCase()}
                            </Badge>
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
                            <div className="d-flex gap-1 mb-2">
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
                            
                            <Form.Select
                              size="sm"
                              value={submission.status || ""}
                              onChange={(e) => handleUpdateStatus(submission.id, e.target.value)}
                              disabled={updating}
                            >
                              {statusOptions.map(status => (
                                <option key={status} value={status}>
                                  {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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

      {/* Submission Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Manpower Submission Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSubmission && (
            <Row>
              <Col md={6}>
                <h6>Personal Information</h6>
                <Card className="bg-light mb-3">
                  <Card.Body>
                    <p><strong>Full Name:</strong> {selectedSubmission.fullName}</p>
                    <p><strong>Date of Birth:</strong> {formatDate(selectedSubmission.dateOfBirth)}</p>
                    <p><strong>Age:</strong> {calculateAge(selectedSubmission.dateOfBirth)}</p>
                    <p><strong>Nationality:</strong> {selectedSubmission.nationality}</p>
                    <p><strong>Passport Number:</strong> {selectedSubmission.passportNumber}</p>
                  </Card.Body>
                </Card>

                <h6>Contact Information</h6>
                <Card className="bg-light">
                  <Card.Body>
                    <p><strong>Email:</strong> {selectedSubmission.email}</p>
                    <p><strong>Contact Number:</strong> {selectedSubmission.contactNumber}</p>
                    <p><strong>User Email:</strong> {selectedSubmission.userEmail}</p>
                    <p><strong>User ID:</strong> {selectedSubmission.userId}</p>
                    <p><strong>Submission ID:</strong> {selectedSubmission.submissionId}</p>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={6}>
                <h6>Employment Details</h6>
                <Card className="bg-light mb-3">
                  <Card.Body>
                    <p><strong>Destination Country:</strong> {selectedSubmission.destinationCountry}</p>
                    <p><strong>Service Type:</strong> 
                      <Badge bg={getServiceTypeVariant(selectedSubmission.serviceType)} className="ms-2">
                        {formatServiceType(selectedSubmission.serviceType)}
                      </Badge>
                    </p>
                  </Card.Body>
                </Card>

                <h6>Status & Verification</h6>
                <Card className="bg-light mb-3">
                  <Card.Body>
                    <p>
                      <strong>Status:</strong>{" "}
                      <Badge bg={getStatusVariant(selectedSubmission.status)}>
                        {selectedSubmission.status?.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </p>
                    <p>
                      <strong>Verified:</strong>{" "}
                      {selectedSubmission.verified ? (
                        <Badge bg="success">YES</Badge>
                      ) : (
                        <Badge bg="secondary">NO</Badge>
                      )}
                    </p>
                    <p><strong>Submitted:</strong> {formatDate(selectedSubmission.submittedAt)}</p>
                  </Card.Body>
                </Card>

                {selectedSubmission.additionalNotes && (
                  <>
                    <h6>Additional Notes</h6>
                    <Card className="bg-light">
                      <Card.Body>
                        {selectedSubmission.additionalNotes}
                      </Card.Body>
                    </Card>
                  </>
                )}
              </Col>

              {selectedSubmission.document && (
                <Col md={12}>
                  <h6 className="mt-3">Document Information</h6>
                  <Card className="bg-light">
                    <Card.Body>
                      <Row>
                        <Col md={6}>
                          <p><strong>File Name:</strong> {selectedSubmission.document.fileName}</p>
                          <p><strong>File Type:</strong> {selectedSubmission.document.fileType}</p>
                          <p><strong>Uploaded:</strong> {formatDate(selectedSubmission.document.uploadedAt)}</p>
                        </Col>
                        <Col md={6}>
                          <p><strong>File Size:</strong> {formatFileSize(selectedSubmission.document.fileSize)}</p>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => downloadDocument(selectedSubmission.document)}
                          >
                            <i className="fas fa-download me-1"></i>
                            Download Document
                          </Button>
                        </Col>
                      </Row>
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
        </Modal.Footer>
      </Modal>

      {/* Document View Modal */}
      <Modal show={showDocumentModal} onHide={() => setShowDocumentModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Document Preview - {selectedDocument?.fileName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDocument && (
            <div>
              <Row className="mb-3">
                <Col>
                  <h6>Document Information</h6>
                  <p><strong>Name:</strong> {selectedDocument.fileName}</p>
                  <p><strong>Type:</strong> {selectedDocument.fileType}</p>
                  <p><strong>Size:</strong> {formatFileSize(selectedDocument.fileSize)}</p>
                  <p><strong>Uploaded:</strong> {formatDate(selectedDocument.uploadedAt)}</p>
                </Col>
              </Row>
              
              <Row>
                <Col className="text-center">
                  {renderDocumentPreview(selectedDocument)}
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDocumentModal(false)}>
            Close
          </Button>
          {selectedDocument && (
            <Button
              variant="primary"
              onClick={() => downloadDocument(selectedDocument)}
            >
              <i className="fas fa-download me-1"></i>
              Download
            </Button>
          )}
        </Modal.Footer>
      </Modal>
      <AdminManpowerPayments/>
    </Container>
  );
}

export default AdminManpower;