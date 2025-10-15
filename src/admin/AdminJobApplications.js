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
  const [activeTab, setActiveTab] = useState("applications"); // New state for tabs

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
      // Correct path: jobdetails/[userID]/applications/[applicationID]
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
      }

      setActionLoading(false);
      
    } catch (error) {
      console.error("Error updating job application status:", error);
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

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading job applications...</p>
      </div>
    );
  }



  // Add this function inside your AdminJobApplications component
const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

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
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
  <Modal.Header closeButton className="bg-primary text-white">
    <Modal.Title>
      <i className="fas fa-briefcase me-2"></i>
      Job Application Details - {selectedApplication?.name}
    </Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {selectedApplication && (
      <>
        <Row className="mb-4">
          <Col md={6}>
            <h6 className="text-primary border-bottom pb-2">Applicant Information</h6>
            <p><strong>Full Name:</strong> {selectedApplication.name}</p>
            <p><strong>Passport Number:</strong> <code>{selectedApplication.passportNo}</code></p>
            <p><strong>Email:</strong> {selectedApplication.userEmail}</p>
            <p><strong>User ID:</strong> <code>{selectedApplication.userId}</code></p>
          </Col>
          <Col md={6}>
            <h6 className="text-primary border-bottom pb-2">Job Information</h6>
            <p><strong>Company:</strong> {selectedApplication.company}</p>
            <p><strong>Job Category:</strong> {selectedApplication.jobCategory}</p>
            <p><strong>Employment Type:</strong> 
              <Badge bg="secondary" className="ms-2 text-capitalize">
                {selectedApplication.employmentType}
              </Badge>
            </p>
            <p><strong>Location:</strong> {selectedApplication.location}</p>
            <p><strong>Experience Required:</strong> {selectedApplication.experience}</p>
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

        {/* Confirmation Letter Upload Section */}
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
                      // Convert file to base64
                      const base64 = await convertToBase64(file);
                      
                      // Update Firestore with the base64 file
                      const applicationRef = doc(db, `jobdetails/${selectedApplication.userId}/applications`, selectedApplication.id);
                      await updateDoc(applicationRef, {
                        confirmation: base64,
                        confirmationFileName: file.name,
                        confirmationFileType: file.type,
                        confirmationUploadedAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      });

                      // Update local state
                      setSelectedApplication(prev => ({
                        ...prev,
                        confirmation: base64,
                        confirmationFileName: file.name,
                        confirmationFileType: file.type,
                        confirmationUploadedAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      }));

                      setJobApplications(prev => prev.map(app => 
                        app.id === selectedApplication.id && app.userId === selectedApplication.userId
                          ? { 
                              ...app, 
                              confirmation: base64,
                              confirmationFileName: file.name,
                              confirmationFileType: file.type,
                              confirmationUploadedAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString()
                            }
                          : app
                      ));

                      alert("Confirmation letter uploaded successfully!");
                    } catch (error) {
                      console.error("Error uploading confirmation file:", error);
                      alert("Error uploading file: " + error.message);
                    } finally {
                      setActionLoading(false);
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
            {selectedApplication.confirmation && (
              <div className="mt-2 p-3 border rounded bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Uploaded Confirmation File:</strong> {selectedApplication.confirmationFileName}
                    <br />
                    <small className="text-muted">
                      Uploaded: {formatDate(selectedApplication.confirmationUploadedAt)}
                    </small>
                  </div>
                  <div>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => {
                        // Create a download link for the file
                        const link = document.createElement('a');
                        link.href = selectedApplication.confirmation;
                        link.download = selectedApplication.confirmationFileName;
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
                        try {
                          setActionLoading(true);
                          // Remove file from Firestore
                          const applicationRef = doc(db, `jobdetails/${selectedApplication.userId}/applications`, selectedApplication.id);
                          await updateDoc(applicationRef, {
                            confirmation: null,
                            confirmationFileName: null,
                            confirmationFileType: null,
                            confirmationUploadedAt: null,
                            updatedAt: new Date().toISOString()
                          });

                          // Update local state
                          setSelectedApplication(prev => ({
                            ...prev,
                            confirmation: null,
                            confirmationFileName: null,
                            confirmationFileType: null,
                            confirmationUploadedAt: null,
                            updatedAt: new Date().toISOString()
                          }));

                          setJobApplications(prev => prev.map(app => 
                            app.id === selectedApplication.id && app.userId === selectedApplication.userId
                              ? { 
                                  ...app, 
                                  confirmation: null,
                                  confirmationFileName: null,
                                  confirmationFileType: null,
                                  confirmationUploadedAt: null,
                                  updatedAt: new Date().toISOString()
                                }
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
                      Remove
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