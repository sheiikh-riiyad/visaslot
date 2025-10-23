import React, { useEffect, useState } from "react";
import { Table, Card, Badge, Button, Modal, Alert, Spinner, Form, Row, Col, Nav } from "react-bootstrap";
import { db } from "../firebaseConfig";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import AdminJobPayments from "./AdminJobPayments";

function AdminJobApplications() {
  const [jobApplications, setJobApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("applications");
  const [editableData, setEditableData] = useState({});
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchJobApplications();
  }, []);

  const fetchJobApplications = async () => {
    try {
      setLoading(true);
      
      // Get all users first
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      
      let allApplications = [];

      // Fetch applications from each user's jobdetails/applications subcollection
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const applicationsRef = collection(db, `jobdetails/${userId}/applications`);
        
        try {
          const applicationsSnapshot = await getDocs(applicationsRef);
          const userApplications = applicationsSnapshot.docs.map(doc => ({
            id: doc.id,
            userId: userId,
            ...doc.data()
          }));
          
          allApplications = [...allApplications, ...userApplications];
        } catch (error) {
          console.log(`No job applications for user ${userId} or error:`, error);
        }
      }

      // Sort by submission date (newest first)
      allApplications.sort((a, b) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt) : new Date(0);
        const dateB = b.submittedAt ? new Date(b.submittedAt) : new Date(0);
        return dateB - dateA;
      });

      setJobApplications(allApplications);
    } catch (error) {
      console.error("Error fetching job applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId, userId, newStatus) => {
    try {
      setActionLoading(true);
      const applicationRef = doc(db, `jobdetails/${userId}/applications`, applicationId);
      
      await updateDoc(applicationRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setJobApplications(prev => prev.map(app => 
        app.id === applicationId && app.userId === userId
          ? { 
              ...app, 
              status: newStatus, 
              updatedAt: new Date().toISOString()
            }
          : app
      ));

      // Update selected application if open
      if (selectedApplication && selectedApplication.id === applicationId) {
        setSelectedApplication(prev => ({
          ...prev,
          status: newStatus,
          updatedAt: new Date().toISOString()
        }));
        setEditableData(prev => ({
          ...prev,
          status: newStatus,
          updatedAt: new Date().toISOString()
        }));
      }

      setActionLoading(false);
      
    } catch (error) {
      console.error("Error updating job application status:", error);
      alert("Error updating status: " + error.message);
      setActionLoading(false);
    }
  };

  const handleFieldUpdate = async (field, value) => {
    if (!selectedApplication) return;

    try {
      setActionLoading(true);
      const applicationRef = doc(db, `jobdetails/${selectedApplication.userId}/applications`, selectedApplication.id);
      
      await updateDoc(applicationRef, {
        [field]: value,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      const updatedApplication = {
        ...selectedApplication,
        [field]: value,
        updatedAt: new Date().toISOString()
      };

      setSelectedApplication(updatedApplication);
      setEditableData(updatedApplication);
      setJobApplications(prev => prev.map(app => 
        app.id === selectedApplication.id && app.userId === selectedApplication.userId 
          ? updatedApplication 
          : app
      ));

    } catch (error) {
      console.error("Error updating field:", error);
      alert("Error updating field: " + error.message);
    } finally {
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
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusVariant = (status) => {
    const statusValue = status || "pending";
    switch (statusValue.toLowerCase()) {
      case "approved": return "success";
      case "rejected": return "danger";
      case "pending": return "warning";
      case "under_review": return "info";
      case "shortlisted": return "primary";
      case "interview": return "info";
      default: return "secondary";
    }
  };

  const getDisplayStatus = (application) => {
    return application.status || "pending";
  };

  // Filter applications based on status and search term
  const filteredApplications = jobApplications.filter(app => {
    const statusMatch = statusFilter === "all" || getDisplayStatus(app) === statusFilter;
    const searchMatch = 
      app.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.passportNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.jobCategory?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && searchMatch;
  });

  const pendingCount = jobApplications.filter(app => !app.status || app.status === "pending").length;
  const totalCount = jobApplications.length;

  const handleEditToggle = () => {
    if (editMode) {
      // Save all changes when exiting edit mode
      Object.keys(editableData).forEach(field => {
        if (editableData[field] !== selectedApplication[field]) {
          handleFieldUpdate(field, editableData[field]);
        }
      });
    } else {
      // Enter edit mode - initialize editable data
      setEditableData(selectedApplication);
    }
    setEditMode(!editMode);
  };

  const handleInputChange = (field, value) => {
    setEditableData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading job applications...</p>
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
              <Nav.Link eventKey="applications">
                <i className="fas fa-briefcase me-2"></i>
                Job Applications
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
                Verification Payments
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Header>
      </Card>

      {/* Applications Tab Content */}
      {activeTab === "applications" && (
        <Card className="shadow-sm">
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-0">
                <i className="fas fa-briefcase me-2"></i>
                Job Applications Management
              </h4>
              <small>Total: {totalCount} | Pending: {pendingCount}</small>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <Form.Control
                type="text"
                placeholder="Search by name, passport, email, company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '300px' }}
              />
              <Button 
                variant="outline-light" 
                size="sm"
                onClick={fetchJobApplications}
                disabled={loading}
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
                <option value="under_review">Under Review</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview">Interview</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Form.Select>
            </div>
          </Card.Header>
          <Card.Body>
            {filteredApplications.length === 0 ? (
              <Alert variant="info" className="text-center">
                <i className="fas fa-info-circle me-2"></i>
                No job applications found.
              </Alert>
            ) : (
              <div className="table-responsive">
                <Table striped hover>
                  <thead className="table-dark">
                    <tr>
                      <th>Applicant Name</th>
                      <th>Passport No</th>
                      <th>Email</th>
                      <th>Company</th>
                      <th>Job Category</th>
                      <th>Employment Type</th>
                      <th>Location</th>
                      <th>Experience</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((application) => (
                      <tr key={`${application.userId}-${application.id}`}>
                        <td>
                          <strong>{application.name}</strong>
                        </td>
                        <td>
                          <code>{application.passportNo}</code>
                        </td>
                        <td>
                          <small>{application.userEmail}</small>
                        </td>
                        <td>{application.company}</td>
                        <td>{application.jobCategory}</td>
                        <td>
                          <Badge bg="secondary" className="text-capitalize">
                            {application.employmentType}
                          </Badge>
                        </td>
                        <td>{application.location}</td>
                        <td>{application.experience}</td>
                        <td>
                          <Badge bg={getStatusVariant(application.status)}>
                            {getDisplayStatus(application)}
                          </Badge>
                        </td>
                        <td>
                          <small>{formatDate(application.submittedAt)}</small>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                setSelectedApplication(application);
                                setEditableData(application);
                                setEditMode(false);
                                setShowModal(true);
                              }}
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
                            </Button>
                            {(getDisplayStatus(application) === "pending" || getDisplayStatus(application) === "under_review") && (
                              <>
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => handleStatusUpdate(application.id, application.userId, "approved")}
                                  title="Approve Application"
                                  disabled={actionLoading}
                                >
                                  <i className="fas fa-check"></i>
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleStatusUpdate(application.id, application.userId, "rejected")}
                                  title="Reject Application"
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

      {/* Payments Tab Content */}
      {activeTab === "payments" && <AdminJobPayments />}

      {/* Application Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" scrollable>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="fas fa-briefcase me-2"></i>
            Job Application Details - {selectedApplication?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedApplication && (
            <>
              {/* Edit Mode Toggle */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Application Information</h5>
                <Button
                  variant={editMode ? "success" : "outline-primary"}
                  size="sm"
                  onClick={handleEditToggle}
                  disabled={actionLoading}
                >
                  <i className={`fas ${editMode ? "fa-save" : "fa-edit"} me-1`}></i>
                  {editMode ? "Save Changes" : "Edit Application"}
                </Button>
              </div>

              <Row className="mb-4">
                <Col md={6}>
                  <h6 className="text-primary border-bottom pb-2">Applicant Information</h6>
                  
                  <Form.Group className="mb-2">
                    <Form.Label><strong>Full Name</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.name || ""}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.name}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Passport Number</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.passportNo || ""}
                        onChange={(e) => handleInputChange("passportNo", e.target.value)}
                      />
                    ) : (
                      <p><code>{selectedApplication.passportNo}</code></p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Email</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="email"
                        value={editableData.userEmail || ""}
                        onChange={(e) => handleInputChange("userEmail", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.userEmail}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>User ID</strong></Form.Label>
                    <p><code>{selectedApplication.userId}</code></p>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <h6 className="text-primary border-bottom pb-2">Job Information</h6>
                  
                  <Form.Group className="mb-2">
                    <Form.Label><strong>Company</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.company || ""}
                        onChange={(e) => handleInputChange("company", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.company}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Job Category</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.jobCategory || ""}
                        onChange={(e) => handleInputChange("jobCategory", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.jobCategory}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Employment Type</strong></Form.Label>
                    {editMode ? (
                      <Form.Select
                        value={editableData.employmentType || ""}
                        onChange={(e) => handleInputChange("employmentType", e.target.value)}
                      >
                        <option value="">Select Type</option>
                        <option value="full-time">Full Time</option>
                        <option value="part-time">Part Time</option>
                        <option value="contract">Contract</option>
                        <option value="temporary">Temporary</option>
                        <option value="internship">Internship</option>
                      </Form.Select>
                    ) : (
                      <p>
                        <Badge bg="secondary" className="text-capitalize">
                          {selectedApplication.employmentType}
                        </Badge>
                      </p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Location</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.location || ""}
                        onChange={(e) => handleInputChange("location", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.location}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Experience Required</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.experience || ""}
                        onChange={(e) => handleInputChange("experience", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.experience}</p>
                    )}
                  </Form.Group>

                  {/* Additional editable fields */}
                  <Form.Group className="mb-2">
                    <Form.Label><strong>Salary</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.salary || ""}
                        onChange={(e) => handleInputChange("salary", e.target.value)}
                        placeholder="Enter salary information"
                      />
                    ) : (
                      <p>{selectedApplication.salary || "Not specified"}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Job Description</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={editableData.jobDescription || ""}
                        onChange={(e) => handleInputChange("jobDescription", e.target.value)}
                        placeholder="Enter job description"
                      />
                    ) : (
                      <p>{selectedApplication.jobDescription || "No description provided"}</p>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col md={12}>
                  <h6 className="text-primary border-bottom pb-2">Application Timeline</h6>
                  <p><strong>Application ID:</strong> <code>{selectedApplication.id}</code></p>
                  <p><strong>Submitted:</strong> {formatDate(selectedApplication.submittedAt)}</p>
                  {selectedApplication.updatedAt && (
                    <p><strong>Last Updated:</strong> {formatDate(selectedApplication.updatedAt)}</p>
                  )}
                </Col>
              </Row>

              {/* Confirmation Letter Upload Section - UPDATED FOR SERVER UPLOAD */}
              <Row className="mb-4">
                <Col md={12}>
                  <h6 className="text-primary border-bottom pb-2">Confirmation Letter</h6>
                  <Form.Group>
                    <Form.Label>
                      <strong>Upload Confirmation Letter (Image/PDF)</strong>
                    </Form.Label>
                    <Form.Control
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          try {
                            setActionLoading(true);
                            
                            // Create FormData for file upload to server
                            const formData = new FormData();
                            formData.append('file', file);
                            
                            // Add parameters as URL search params
                            const uploadUrl = `https://admin.australiaimmigration.site/upload-manual?userId=${encodeURIComponent(selectedApplication.userId)}&applicationId=${encodeURIComponent(selectedApplication.id)}&fileType=job_details`;
                            
                            console.log('Uploading job confirmation letter to:', uploadUrl);

                            const response = await fetch(uploadUrl, {
                              method: 'POST',
                              body: formData,
                              mode: 'cors',
                              credentials: 'include'
                            });

                            console.log('Response status:', response.status);
                            
                            if (!response.ok) {
                              const errorText = await response.text();
                              console.error('Server error response:', errorText);
                              throw new Error(`Upload failed: ${response.status}`);
                            }

                            const result = await response.json();
                            console.log('Server response:', result);

                            if (!result.success) {
                              throw new Error(result.error || 'Upload failed');
                            }

                            // Update Firestore with file info from server
                            const applicationRef = doc(db, `jobdetails/${selectedApplication.userId}/applications`, selectedApplication.id);
                            await updateDoc(applicationRef, {
                              confirmationLetter: result.fileInfo.fullUrl,
                              confirmationLetterName: result.fileInfo.fileName,
                              confirmationLetterType: result.fileInfo.mimetype,
                              confirmationLetterUploadedAt: new Date().toISOString(),
                              confirmationLetterPath: result.fileInfo.fileUrl,
                              confirmationLetterSize: result.fileInfo.fileSize,
                              updatedAt: new Date().toISOString()
                            });

                            // Update local state
                            const updatedApp = {
                              ...selectedApplication,
                              confirmationLetter: result.fileInfo.fullUrl,
                              confirmationLetterName: result.fileInfo.fileName,
                              confirmationLetterType: result.fileInfo.mimetype,
                              confirmationLetterUploadedAt: new Date().toISOString(),
                              confirmationLetterPath: result.fileInfo.fileUrl,
                              confirmationLetterSize: result.fileInfo.fileSize,
                              updatedAt: new Date().toISOString()
                            };

                            setSelectedApplication(updatedApp);
                            setEditableData(updatedApp);
                            setJobApplications(prev => prev.map(app => 
                              app.id === selectedApplication.id && app.userId === selectedApplication.userId
                                ? updatedApp
                                : app
                            ));

                            alert("Confirmation letter uploaded successfully!");
                          } catch (error) {
                            console.error("Error uploading confirmation file:", error);
                            alert("Error uploading file: " + error.message);
                          } finally {
                            setActionLoading(false);
                            e.target.value = '';
                          }
                        }
                      }}
                      disabled={actionLoading}
                    />
                    <Form.Text className="text-muted">
                      Supported formats: JPG, PNG, PDF, DOC, DOCX (Max 10MB)
                    </Form.Text>
                  </Form.Group>

                  {/* Display uploaded confirmation file info */}
                  {selectedApplication.confirmationLetter && (
                    <div className="mt-2 p-3 border rounded bg-light">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>Uploaded Confirmation File:</strong> {selectedApplication.confirmationLetterName}
                          <br />
                          <small className="text-muted">
                            <strong>Size:</strong> {selectedApplication.confirmationLetterSize ? formatFileSize(selectedApplication.confirmationLetterSize) : 'N/A'}
                          </small>
                          <br />
                          <small className="text-muted">
                            <strong>Type:</strong> {selectedApplication.confirmationLetterType || 'Unknown'}
                          </small>
                          <br />
                          <small className="text-muted">
                            <strong>Uploaded:</strong> {formatDate(selectedApplication.confirmationLetterUploadedAt)}
                          </small>
                        </div>
                        <div>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              // Open file in new tab
                              window.open(selectedApplication.confirmationLetter, '_blank');
                            }}
                          >
                            <i className="fas fa-eye me-1"></i>
                            View
                          </Button>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="ms-2"
                            onClick={() => {
                              // Download file
                              const link = document.createElement('a');
                              link.href = selectedApplication.confirmationLetter;
                              link.download = selectedApplication.confirmationLetterName || 'confirmation-letter';
                              link.click();
                            }}
                          >
                            <i className="fas fa-download me-1"></i>
                            Download
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="ms-2"
                            onClick={async () => {
                              if (!window.confirm('Are you sure you want to delete this confirmation letter?')) return;
                              
                              try {
                                setActionLoading(true);
                                
                                // Call server API to delete file
                                const response = await fetch('https://admin.australiaimmigration.site/file', {
                                  method: 'DELETE',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    fileUrl: selectedApplication.confirmationLetterPath
                                  })
                                });
                                
                                const result = await response.json();
                                
                                if (!response.ok || !result.success) {
                                  throw new Error(result.error || `Delete failed: ${response.statusText}`);
                                }
                                
                                // Remove file info from Firestore
                                const applicationRef = doc(db, `jobdetails/${selectedApplication.userId}/applications`, selectedApplication.id);
                                await updateDoc(applicationRef, {
                                  confirmationLetter: null,
                                  confirmationLetterName: null,
                                  confirmationLetterType: null,
                                  confirmationLetterUploadedAt: null,
                                  confirmationLetterPath: null,
                                  confirmationLetterSize: null,
                                  updatedAt: new Date().toISOString()
                                });

                                // Update local state
                                const updatedApp = {
                                  ...selectedApplication,
                                  confirmationLetter: null,
                                  confirmationLetterName: null,
                                  confirmationLetterType: null,
                                  confirmationLetterUploadedAt: null,
                                  confirmationLetterPath: null,
                                  confirmationLetterSize: null,
                                  updatedAt: new Date().toISOString()
                                };

                                setSelectedApplication(updatedApp);
                                setEditableData(updatedApp);
                                setJobApplications(prev => prev.map(app => 
                                  app.id === selectedApplication.id && app.userId === selectedApplication.userId
                                    ? updatedApp
                                    : app
                                ));

                                alert("Confirmation letter removed successfully!");
                              } catch (error) {
                                console.error("Error removing confirmation file:", error);
                                alert("Error removing file: " + error.message);
                              } finally {
                                setActionLoading(false);
                              }
                            }}
                            disabled={actionLoading}
                          >
                            <i className="fas fa-trash me-1"></i>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <h6 className="text-primary border-bottom pb-2">Application Management</h6>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button
                      variant={getDisplayStatus(selectedApplication) === "pending" ? "warning" : "outline-warning"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedApplication.id, selectedApplication.userId, "pending")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-clock me-1"></i>
                      Mark as Pending
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedApplication) === "under_review" ? "info" : "outline-info"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedApplication.id, selectedApplication.userId, "under_review")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-search me-1"></i>
                      Under Review
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedApplication) === "shortlisted" ? "primary" : "outline-primary"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedApplication.id, selectedApplication.userId, "shortlisted")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-list me-1"></i>
                      Shortlist
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedApplication) === "interview" ? "info" : "outline-info"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedApplication.id, selectedApplication.userId, "interview")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-calendar me-1"></i>
                      Schedule Interview
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedApplication) === "approved" ? "success" : "outline-success"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedApplication.id, selectedApplication.userId, "approved")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-check me-1"></i>
                      Approve
                    </Button>
                    <Button
                      variant={getDisplayStatus(selectedApplication) === "rejected" ? "danger" : "outline-danger"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedApplication.id, selectedApplication.userId, "rejected")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-times me-1"></i>
                      Reject
                    </Button>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-muted mb-1">
                      <strong>Current Status:</strong> 
                      <Badge bg={getStatusVariant(selectedApplication.status)} className="ms-2">
                        {getDisplayStatus(selectedApplication)}
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

export default AdminJobApplications;