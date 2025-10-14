import React, { useEffect, useState } from "react";
import { Table, Card, Badge, Button, Modal, Alert, Spinner, Form, Row, Col } from "react-bootstrap";
import { db } from "../firebaseConfig";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const appsRef = collection(db, "applications");
      const appsSnapshot = await getDocs(appsRef);
      
      const appsData = appsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by creation date (newest first)
      appsData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });

      setApplications(appsData);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId, newStatus) => {
    try {
      setActionLoading(true);
      const applicationRef = doc(db, "applications", applicationId);
      
      await updateDoc(applicationRef, {
        status: newStatus,
        updatedAt: new Date(),
        adminAction: {
          action: newStatus,
          timestamp: new Date()
        }
      });

      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === applicationId 
          ? { 
              ...app, 
              status: newStatus, 
              updatedAt: new Date(),
              adminAction: {
                action: newStatus,
                timestamp: new Date()
              }
            }
          : app
      ));

      setShowModal(false);
      setActionLoading(false);
      
    } catch (error) {
      console.error("Error updating status:", error);
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
      case "approved": return "success";
      case "rejected": return "danger";
      case "pending": return "warning";
      case "under_review": return "info";
      default: return "secondary";
    }
  };

  const filteredApplications = statusFilter === "all" 
    ? applications 
    : applications.filter(app => app.status === statusFilter);

  const pendingCount = applications.filter(app => !app.status || app.status === "pending").length;

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading applications...</p>
      </div>
    );
  }

  return (
    <div>
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <div>
            <h4 className="mb-0">
              <i className="fas fa-file-alt me-2"></i>
              Visa Applications Management
            </h4>
            <small>Total: {applications.length} | Pending: {pendingCount}</small>
          </div>
          <div className="d-flex gap-2">
            <Button 
              variant="outline-light" 
              size="sm"
              onClick={fetchApplications}
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
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="under_review">Under Review</option>
            </Form.Select>
          </div>
        </Card.Header>
        <Card.Body>
          {filteredApplications.length === 0 ? (
            <Alert variant="info" className="text-center">
              <i className="fas fa-info-circle me-2"></i>
              No applications found.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table striped hover>
                <thead className="table-dark">
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Passport No</th>
                    <th>Visa Type</th>
                    <th>Migration Type</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((application) => (
                    <tr key={application.id}>
                      <td>
                        <strong>{application.name} {application.surname}</strong>
                      </td>
                      <td>
                        <small>{application.email}</small>
                      </td>
                      <td>
                        <code>{application.passportNo}</code>
                      </td>
                      <td>{application.visaType}</td>
                      <td>{application.migrationType}</td>
                      <td>
                        <Badge bg={getStatusVariant(application.status)}>
                          {application.status || "pending"}
                        </Badge>
                      </td>
                      <td>
                        <small>{formatDate(application.createdAt)}</small>
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
                          {(!application.status || application.status === "pending") && (
                            <>
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleStatusUpdate(application.id, "approved")}
                                title="Approve Application"
                                disabled={actionLoading}
                              >
                                <i className="fas fa-check"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleStatusUpdate(application.id, "rejected")}
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

      {/* Application Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="fas fa-file-alt me-2"></i>
            Application Details - {selectedApplication?.name} {selectedApplication?.surname}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedApplication && (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <h6 className="text-primary border-bottom pb-2">Personal Information</h6>
                  <p><strong>Full Name:</strong> {selectedApplication.name} {selectedApplication.surname}</p>
                  <p><strong>Previous Name:</strong> {selectedApplication.previousName || "N/A"}</p>
                  <p><strong>Gender:</strong> {selectedApplication.sex}</p>
                  <p><strong>Marital Status:</strong> {selectedApplication.maritalStatus}</p>
                  <p><strong>Date of Birth:</strong> {selectedApplication.dob}</p>
                  <p><strong>Religion:</strong> {selectedApplication.religion}</p>
                  <p><strong>Birth City:</strong> {selectedApplication.birthCity}</p>
                  <p><strong>Birth Country:</strong> {selectedApplication.birthCountry}</p>
                  <p><strong>National ID:</strong> {selectedApplication.nationalId}</p>
                </Col>
                <Col md={6}>
                  <h6 className="text-primary border-bottom pb-2">Passport & Contact</h6>
                  <p><strong>Passport No:</strong> {selectedApplication.passportNo}</p>
                  <p><strong>Passport Issue:</strong> {selectedApplication.passportIssueDate}</p>
                  <p><strong>Passport Expiry:</strong> {selectedApplication.passportExpiry}</p>
                  <p><strong>Passport Place:</strong> {selectedApplication.passportPlace}</p>
                  <p><strong>Email:</strong> {selectedApplication.email}</p>
                  <p><strong>Phone:</strong> {selectedApplication.phone}</p>
                  <p><strong>Mobile:</strong> {selectedApplication.mobile}</p>
                  <p><strong>Address:</strong> {selectedApplication.contactAddress}</p>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col md={6}>
                  <h6 className="text-primary border-bottom pb-2">Visa Information</h6>
                  <p><strong>Visa Type:</strong> {selectedApplication.visaType}</p>
                  <p><strong>Entries:</strong> {selectedApplication.entries}</p>
                  <p><strong>Visa Period:</strong> {selectedApplication.visaPeriod}</p>
                  <p><strong>Journey Date:</strong> {selectedApplication.journeyDate}</p>
                  <p><strong>Migration Type:</strong> {selectedApplication.migrationType}</p>
                  <p><strong>Sponsor:</strong> {selectedApplication.sponsor}</p>
                </Col>
                <Col md={6}>
                  <h6 className="text-primary border-bottom pb-2">Family Information</h6>
                  <p><strong>Father's Name:</strong> {selectedApplication.fatherName}</p>
                  <p><strong>Father's Nationality:</strong> {selectedApplication.fatherNationality}</p>
                  <p><strong>Mother's Name:</strong> {selectedApplication.motherName}</p>
                  <p><strong>Mother's Nationality:</strong> {selectedApplication.motherNationality}</p>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <h6 className="text-primary border-bottom pb-2">Application Management</h6>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button
                      variant={(!selectedApplication.status || selectedApplication.status === "pending") ? "warning" : "outline-warning"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedApplication.id, "pending")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-clock me-1"></i>
                      Mark as Pending
                    </Button>
                    <Button
                      variant={selectedApplication.status === "approved" ? "success" : "outline-success"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedApplication.id, "approved")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-check me-1"></i>
                      Approve
                    </Button>
                    <Button
                      variant={selectedApplication.status === "rejected" ? "danger" : "outline-danger"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedApplication.id, "rejected")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-times me-1"></i>
                      Reject
                    </Button>
                    <Button
                      variant={selectedApplication.status === "under_review" ? "info" : "outline-info"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedApplication.id, "under_review")}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-search me-1"></i>
                      Under Review
                    </Button>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-muted mb-1">
                      <strong>Application ID:</strong> <code>{selectedApplication.id}</code>
                    </p>
                    <p className="text-muted mb-1">
                      <strong>Created:</strong> {formatDate(selectedApplication.createdAt)}
                    </p>
                    {selectedApplication.updatedAt && (
                      <p className="text-muted mb-0">
                        <strong>Last Updated:</strong> {formatDate(selectedApplication.updatedAt)}
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

export default AdminApplications;