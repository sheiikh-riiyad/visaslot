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
  InputGroup,
  Nav
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

import AdminWorkPermitPayments from "./adminWorkPermitPayments";

function AdminWorkPermit() {
  const [activeSection, setActiveSection] = useState("applications");
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [uploadFile, setUploadFile] = useState(null);

  const statusOptions = [
    "pending",
    "under_review",
    "approved",
    "rejected",
    "additional_info_required"
  ];

  const countryOptions = [
    "Australia",
    "Canada",
    "USA",
    "UK",
    "Germany"
  ];

  useEffect(() => {
    loadWorkPermitApplications();
  }, []);

  const loadWorkPermitApplications = async () => {
    try {
      setLoading(true);
      setError("");
      
      const workPermitsRef = collection(db, "australiaWorkPermits");
      const q = query(workPermitsRef, orderBy("submittedAt", "desc"));
      const snapshot = await getDocs(q);
      
      const applicationsData = [];
      snapshot.forEach(doc => {
        applicationsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setApplications(applicationsData);
    } catch (err) {
      console.error("Error loading work permit applications:", err);
      setError("Failed to load work permit applications: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (application) => {
    setSelectedApplication(application);
    setShowModal(true);
  };

  const handleEditApplication = (application) => {
    setSelectedApplication(application);
    setEditForm({
      userEmail: application.userEmail || "",
      passportNumber: application.passportNumber || "",
      visaSubclass: application.visaSubclass || "",
      Country: application.Country || "",
      documentType: application.documentType || "",
      additionalNotes: application.additionalNotes || "",
      status: application.status || "pending"
    });
    setShowEditModal(true);
  };

  const handleUploadConfirmation = (application) => {
    setSelectedApplication(application);
    setShowUploadModal(true);
  };

  const handleViewDocument = (document) => {
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };

  const handleUpdateStatus = async (applicationId, newStatus) => {
    try {
      setUpdating(true);
      setError("");
      
      const applicationRef = doc(db, "australiaWorkPermits", applicationId);
      await updateDoc(applicationRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: newStatus, updatedAt: new Date() }
            : app
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

  const handleVerifyToggle = async (applicationId, currentVerified) => {
    try {
      setUpdating(true);
      setError("");
      
      const applicationRef = doc(db, "australiaWorkPermits", applicationId);
      await updateDoc(applicationRef, {
        verified: !currentVerified,
        updatedAt: new Date()
      });
      
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId 
            ? { ...app, verified: !currentVerified, updatedAt: new Date() }
            : app
        )
      );
      
      setSuccess(`Application ${!currentVerified ? 'verified' : 'unverified'} successfully`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating verification:", err);
      setError("Failed to update verification: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteApplication = async (applicationId) => {
    if (window.confirm("Are you sure you want to delete this work permit application? This action cannot be undone.")) {
      try {
        setError("");
        await deleteDoc(doc(db, "australiaWorkPermits", applicationId));
        
        setApplications(prev => 
          prev.filter(app => app.id !== applicationId)
        );
        
        setSuccess("Work permit application deleted successfully");
        setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
        console.error("Error deleting application:", err);
        setError("Failed to delete application: " + err.message);
      }
    }
  };

  const handleUpdateApplication = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      setError("");

      const applicationRef = doc(db, "australiaWorkPermits", selectedApplication.id);
      await updateDoc(applicationRef, {
        ...editForm,
        updatedAt: new Date(),
        updatedBy: "admin" // You can replace with actual admin ID
      });

      setApplications(prev => 
        prev.map(app => 
          app.id === selectedApplication.id 
            ? { ...app, ...editForm, updatedAt: new Date() }
            : app
        )
      );

      setSuccess("Application updated successfully");
      setShowEditModal(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating application:", err);
      setError("Failed to update application: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setError("Please select a file to upload");
      return;
    }

    try {
      setUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", uploadFile);
      
      // Use your existing upload-manual endpoint
      const uploadUrl = `https://admin.australiaimmigration.site/upload-manual?userId=${selectedApplication.userId}&applicationId=${selectedApplication.id}&fileType=confirmation_document`;

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Update Firestore with confirmation document info
        const applicationRef = doc(db, "australiaWorkPermits", selectedApplication.id);
        await updateDoc(applicationRef, {
          confirmationDocument: {
            fileUrl: result.fileInfo.fileUrl,
            fullUrl: result.fileInfo.fullUrl,
            fileName: result.fileInfo.fileName,
            fileType: result.fileInfo.fileType,
            fileSize: result.fileInfo.fileSize,
            filePath: result.fileInfo.filePath,
            uploadedAt: result.fileInfo.uploadedAt,
            documentType: result.fileInfo.documentType,
            uploadedBy: "admin"
          },
          hasConfirmationDocument: true,
          updatedAt: new Date()
        });

        setApplications(prev => 
          prev.map(app => 
            app.id === selectedApplication.id 
              ? { 
                  ...app, 
                  confirmationDocument: result.fileInfo,
                  hasConfirmationDocument: true,
                  updatedAt: new Date()
                }
              : app
          )
        );

        setSuccess("Confirmation document uploaded successfully");
        setShowUploadModal(false);
        setUploadFile(null);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      setError("Failed to upload confirmation document: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteConfirmationDocument = async (applicationId) => {
    if (!window.confirm("Are you sure you want to delete the confirmation document?")) {
      return;
    }

    try {
      setUpdating(true);
      setError("");

      const application = applications.find(app => app.id === applicationId);
      if (!application?.confirmationDocument?.filePath) {
        setError("No confirmation document found to delete");
        return;
      }

      // Delete from server using your existing delete-file endpoint
      const deleteResponse = await fetch("https://admin.australiaimmigration.site/delete-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filePath: application.confirmationDocument.filePath
        }),
      });

      const deleteResult = await deleteResponse.json();

      if (deleteResult.success) {
        // Update Firestore
        const applicationRef = doc(db, "australiaWorkPermits", applicationId);
        await updateDoc(applicationRef, {
          confirmationDocument: null,
          hasConfirmationDocument: false,
          updatedAt: new Date()
        });

        setApplications(prev => 
          prev.map(app => 
            app.id === applicationId 
              ? { 
                  ...app, 
                  confirmationDocument: null,
                  hasConfirmationDocument: false,
                  updatedAt: new Date()
                }
              : app
          )
        );

        setSuccess("Confirmation document deleted successfully");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        throw new Error(deleteResult.error || "Delete failed");
      }
    } catch (err) {
      console.error("Error deleting confirmation document:", err);
      setError("Failed to delete confirmation document: " + err.message);
    } finally {
      setUpdating(false);
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

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  const downloadDocument = (document) => {
    if (!document?.base64Data && !document?.fileUrl && !document?.fullUrl) {
      alert("No document data available");
      return;
    }

    try {
      // For base64 documents (original application documents)
      if (document.base64Data) {
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
      } 
      // For URL-based documents (confirmation documents from your server)
      else if (document.fileUrl || document.fullUrl) {
        const fileUrl = document.fullUrl || `https://admin.australiaimmigration.site${document.fileUrl}`;
        window.open(fileUrl, '_blank');
      }
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

    // For URL-based documents (confirmation documents from your server)
    if ((document.fileUrl || document.fullUrl) && !document.base64Data) {
      const fileUrl = document.fullUrl || `https://admin.australiaimmigration.site${document.fileUrl}`;
      const fileType = document.fileType?.toLowerCase() || '';
      
      if (fileType.startsWith('image/')) {
        return (
          <div className="text-center">
            <img
              src={fileUrl}
              alt={`Preview of ${document.fileName}`}
              style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
              className="border rounded"
            />
            <p className="mt-2 text-muted">Image Preview</p>
          </div>
        );
      }
      
      else if (fileType === 'application/pdf') {
        return (
          <div>
            <iframe
              src={fileUrl}
              width="100%"
              height="500px"
              title={`PDF: ${document.fileName}`}
              className="border rounded"
            />
            <p className="mt-2 text-muted">PDF Preview</p>
          </div>
        );
      }
      
      return (
        <div className="p-5 border rounded bg-light text-center">
          <i className="fas fa-file fa-3x text-muted mb-3"></i>
          <br />
          <p>This file type cannot be previewed in the browser.</p>
          <p className="text-muted mb-3">
            File: {document.fileName} ({fileType || 'Unknown type'})
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
    }

    // For base64 documents (original application documents)
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

  const filteredApplications = applications.filter(application => {
    const matchesSearch = 
      application.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.passportNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.submissionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.visaSubclass?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || application.status === statusFilter;
    const matchesCountry = countryFilter === "all" || application.Country === countryFilter;

    return matchesSearch && matchesStatus && matchesCountry;
  });

  if (loading && activeSection === "applications") {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading Work Permit Applications...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header with Tabs */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <Row className="align-items-center">
                <Col>
                  <h4 className="mb-1 text-dark">
                    <i className="fas fa-passport me-2 text-primary"></i>
                    Work Permit Management
                  </h4>
                  <p className="mb-0 text-muted">
                    Manage work permit applications and payments
                  </p>
                </Col>
                <Col xs="auto">
                  <Badge bg="primary" className="fs-6">
                    {activeSection === "applications" ? "Applications" : "Payments"}
                  </Badge>
                </Col>
              </Row>
              
              {/* Navigation Tabs */}
              <Nav variant="tabs" className="mt-3">
                <Nav.Item>
                  <Nav.Link 
                    active={activeSection === "applications"}
                    onClick={() => setActiveSection("applications")}
                  >
                    <i className="fas fa-file-alt me-2"></i>
                    Applications
                    {applications.length > 0 && (
                      <Badge bg="primary" className="ms-2">
                        {applications.length}
                      </Badge>
                    )}
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    active={activeSection === "payments"}
                    onClick={() => setActiveSection("payments")}
                  >
                    <i className="fas fa-credit-card me-2"></i>
                    Payments
                  </Nav.Link>
                </Nav.Item>
              </Nav>
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

      {/* Conditional Rendering */}
      {activeSection === "applications" ? (
        <>
          {/* Filters and Search */}
          <Row className="mb-4">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <i className="fas fa-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by email, passport, submission ID..."
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
                    {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
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
              <div className="d-grid gap-2">
                <Button 
                  variant="outline-primary" 
                  onClick={loadWorkPermitApplications}
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
                  <h5 className="text-primary fw-bold">{applications.length}</h5>
                  <small className="text-muted">Total Applications</small>
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
                    {applications.filter(a => a.status === "pending").length}
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
                    {applications.filter(a => a.status === "approved").length}
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
                    {applications.filter(a => a.status === "rejected").length}
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
                    {applications.filter(a => a.verified).length}
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
                    <i className="fas fa-file-upload text-secondary"></i>
                  </div>
                  <h5 className="text-secondary fw-bold">
                    {applications.filter(a => a.hasConfirmationDocument).length}
                  </h5>
                  <small className="text-muted">With Confirmation</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Applications Table */}
          <Row>
            <Col>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white py-3">
                  <h5 className="mb-0">
                    <i className="fas fa-list me-2"></i>
                    Work Permit Applications ({filteredApplications.length})
                  </h5>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="table-responsive">
                    <Table hover className="mb-0">
                      <thead className="bg-light">
                        <tr>
                          <th>User Information</th>
                          <th>Passport & Visa</th>
                          <th>Country</th>
                          <th>Documents</th>
                          <th>Confirmation</th>
                          <th>Status</th>
                          <th>Verified</th>
                          <th>Submitted</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredApplications.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="text-center py-4 text-muted">
                              <i className="fas fa-inbox fa-2x mb-2"></i>
                              <br />
                              No work permit applications found
                            </td>
                          </tr>
                        ) : (
                          filteredApplications.map((application) => (
                            <tr key={application.id}>
                              <td>
                                <div>
                                  <strong>{application.userEmail}</strong>
                                  <br />
                                  <small className="text-muted">
                                    User ID: {application.userId}
                                  </small>
                                </div>
                              </td>
                              <td>
                                <div>
                                  <strong>Passport:</strong> {application.passportNumber}
                                  <br />
                                  <strong>Visa Subclass:</strong> {application.visaSubclass}
                                </div>
                              </td>
                              <td>
                                <Badge bg="outline-primary">
                                  {application.Country || "N/A"}
                                </Badge>
                              </td>
                              <td>
                                {application.document ? (
                                  <div>
                                    <Button
                                      size="sm"
                                      variant="outline-primary"
                                      onClick={() => handleViewDocument(application.document)}
                                    >
                                      <i className="fas fa-file me-1"></i>
                                      View Document
                                    </Button>
                                    <br />
                                    <small className="text-muted">
                                      {application.documentType}
                                    </small>
                                  </div>
                                ) : (
                                  <Badge bg="secondary">No Document</Badge>
                                )}
                              </td>
                              <td>
                                {application.hasConfirmationDocument ? (
                                  <div>
                                    <Button
                                      size="sm"
                                      variant="outline-success"
                                      onClick={() => handleViewDocument(application.confirmationDocument)}
                                    >
                                      <i className="fas fa-file-check me-1"></i>
                                      View Confirmation
                                    </Button>
                                    <br />
                                    <Button
                                      size="sm"
                                      variant="outline-danger"
                                      onClick={() => handleDeleteConfirmationDocument(application.id)}
                                      disabled={updating}
                                    >
                                      <i className="fas fa-trash me-1"></i>
                                      Delete
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline-info"
                                    onClick={() => handleUploadConfirmation(application)}
                                  >
                                    <i className="fas fa-upload me-1"></i>
                                    Upload Confirmation
                                  </Button>
                                )}
                              </td>
                              <td>
                                <Badge bg={getStatusVariant(application.status)}>
                                  {application.status?.replace(/_/g, ' ').toUpperCase()}
                                </Badge>
                              </td>
                              <td>
                                {application.verified ? (
                                  <Badge bg="success">
                                    <i className="fas fa-check"></i> Verified
                                  </Badge>
                                ) : (
                                  <Badge bg="secondary">Not Verified</Badge>
                                )}
                              </td>
                              <td>
                                {formatDate(application.submittedAt)}
                              </td>
                              <td>
                                <div className="d-flex gap-1 mb-2">
                                  <Button
                                    size="sm"
                                    variant="outline-primary"
                                    onClick={() => handleViewDetails(application)}
                                  >
                                    <i className="fas fa-eye"></i>
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="outline-warning"
                                    onClick={() => handleEditApplication(application)}
                                  >
                                    <i className="fas fa-edit">edit</i>
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="outline-success"
                                    onClick={() => handleVerifyToggle(application.id, application.verified)}
                                    disabled={updating}
                                  >
                                    <i className={`fas ${application.verified ? "fa-times" : "fa-check"}`}></i>
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => handleDeleteApplication(application.id)}
                                    disabled={updating}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </Button>
                                </div>
                                
                                <Form.Select
                                  size="sm"
                                  value={application.status || ""}
                                  onChange={(e) => handleUpdateStatus(application.id, e.target.value)}
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

          {/* Application Details Modal */}
          <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Work Permit Application Details</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedApplication && (
                <Row>
                  <Col md={6}>
                    <h6>User Information</h6>
                    <Card className="bg-light mb-3">
                      <Card.Body>
                        <p><strong>Email:</strong> {selectedApplication.userEmail}</p>
                        <p><strong>User ID:</strong> {selectedApplication.userId}</p>
                        <p><strong>Submission ID:</strong> {selectedApplication.submissionId}</p>
                      </Card.Body>
                    </Card>

                    <h6>Application Details</h6>
                    <Card className="bg-light">
                      <Card.Body>
                        <p><strong>Country:</strong> {selectedApplication.Country}</p>
                        <p><strong>Visa Subclass:</strong> {selectedApplication.visaSubclass}</p>
                        <p><strong>Passport Number:</strong> {selectedApplication.passportNumber}</p>
                        <p><strong>Application Date:</strong> {formatDate(selectedApplication.applicationDate)}</p>
                        <p><strong>Document Type:</strong> {selectedApplication.documentType}</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  
                  <Col md={6}>
                    <h6>Status & Verification</h6>
                    <Card className="bg-light mb-3">
                      <Card.Body>
                        <p>
                          <strong>Status:</strong>{" "}
                          <Badge bg={getStatusVariant(selectedApplication.status)}>
                            {selectedApplication.status?.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </p>
                        <p>
                          <strong>Verified:</strong>{" "}
                          {selectedApplication.verified ? (
                            <Badge bg="success">YES</Badge>
                          ) : (
                            <Badge bg="secondary">NO</Badge>
                          )}
                        </p>
                        <p><strong>Submitted:</strong> {formatDate(selectedApplication.submittedAt)}</p>
                        {selectedApplication.updatedAt && (
                          <p><strong>Last Updated:</strong> {formatDate(selectedApplication.updatedAt)}</p>
                        )}
                      </Card.Body>
                    </Card>

                    {selectedApplication.confirmationDocument && (
                      <>
                        <h6>Confirmation Document</h6>
                        <Card className="bg-light mb-3">
                          <Card.Body>
                            <p><strong>File Name:</strong> {selectedApplication.confirmationDocument.fileName}</p>
                            <p><strong>File Type:</strong> {selectedApplication.confirmationDocument.fileType}</p>
                            <p><strong>File Size:</strong> {formatFileSize(selectedApplication.confirmationDocument.fileSize)}</p>
                            <p><strong>Uploaded:</strong> {formatDate(selectedApplication.confirmationDocument.uploadedAt)}</p>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => downloadDocument(selectedApplication.confirmationDocument)}
                            >
                              <i className="fas fa-download me-1"></i>
                              Download Confirmation
                            </Button>
                          </Card.Body>
                        </Card>
                      </>
                    )}

                    {selectedApplication.additionalNotes && (
                      <>
                        <h6>Additional Notes</h6>
                        <Card className="bg-light">
                          <Card.Body>
                            {selectedApplication.additionalNotes}
                          </Card.Body>
                        </Card>
                      </>
                    )}
                  </Col>

                  {selectedApplication.document && (
                    <Col md={12}>
                      <h6 className="mt-3">Document Information</h6>
                      <Card className="bg-light">
                        <Card.Body>
                          <Row>
                            <Col md={6}>
                              <p><strong>File Name:</strong> {selectedApplication.document.fileName}</p>
                              <p><strong>File Type:</strong> {selectedApplication.document.fileType}</p>
                            </Col>
                            <Col md={6}>
                              <p><strong>File Size:</strong> {formatFileSize(selectedApplication.document.fileSize)}</p>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => downloadDocument(selectedApplication.document)}
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

          {/* Edit Application Modal */}
          <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Edit Work Permit Application</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleUpdateApplication}>
              <Modal.Body>
                {selectedApplication && (
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>User Email</Form.Label>
                        <Form.Control
                          type="email"
                          value={editForm.userEmail}
                          onChange={(e) => setEditForm({...editForm, userEmail: e.target.value})}
                          required
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Passport Number</Form.Label>
                        <Form.Control
                          type="text"
                          value={editForm.passportNumber}
                          onChange={(e) => setEditForm({...editForm, passportNumber: e.target.value})}
                          required
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Visa Subclass</Form.Label>
                        <Form.Control
                          type="text"
                          value={editForm.visaSubclass}
                          onChange={(e) => setEditForm({...editForm, visaSubclass: e.target.value})}
                          required
                        />
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Country</Form.Label>
                        <Form.Select
                          value={editForm.Country}
                          onChange={(e) => setEditForm({...editForm, Country: e.target.value})}
                          required
                        >
                          <option value="">Select Country</option>
                          {countryOptions.map(country => (
                            <option key={country} value={country}>
                              {country}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Document Type</Form.Label>
                        <Form.Control
                          type="text"
                          value={editForm.documentType}
                          onChange={(e) => setEditForm({...editForm, documentType: e.target.value})}
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Status</Form.Label>
                        <Form.Select
                          value={editForm.status}
                          onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                        >
                          {statusOptions.map(status => (
                            <option key={status} value={status}>
                              {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Additional Notes</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={editForm.additionalNotes}
                          onChange={(e) => setEditForm({...editForm, additionalNotes: e.target.value})}
                          placeholder="Enter any additional notes or comments..."
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={updating}>
                  {updating ? <Spinner size="sm" /> : "Update Application"}
                </Button>
              </Modal.Footer>
            </Form>
          </Modal>

          {/* Upload Confirmation Document Modal */}
          <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Upload Confirmation Document</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleFileUpload}>
              <Modal.Body>
                {selectedApplication && (
                  <div>
                    <p><strong>Application:</strong> {selectedApplication.userEmail}</p>
                    <p><strong>Passport:</strong> {selectedApplication.passportNumber}</p>
                    <p><strong>Visa Subclass:</strong> {selectedApplication.visaSubclass}</p>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Select Confirmation Document</Form.Label>
                      <Form.Control
                        type="file"
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        required
                      />
                      <Form.Text className="text-muted">
                        Supported formats: PDF, JPG, PNG, DOC, DOCX (Max: 50MB)
                      </Form.Text>
                    </Form.Group>
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={uploading || !uploadFile}>
                  {uploading ? <Spinner size="sm" /> : "Upload Document"}
                </Button>
              </Modal.Footer>
            </Form>
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
                      {selectedDocument.uploadedAt && (
                        <p><strong>Uploaded:</strong> {formatDate(selectedDocument.uploadedAt)}</p>
                      )}
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
        </>
      ) : (
        <AdminWorkPermitPayments />
      )}
    </Container>
  );
}

export default AdminWorkPermit;