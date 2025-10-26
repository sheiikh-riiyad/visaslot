import React, { useEffect, useState } from "react";
import { Table, Card, Badge, Button, Modal, Alert, Spinner, Form, Row, Col } from "react-bootstrap";
import { db } from "../firebaseConfig";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import emailjs from '@emailjs/browser';

function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(false);
  const [editableData, setEditableData] = useState({});
  const [editMode, setEditMode] = useState(false);



  // Initialize EmailJS
    emailjs.init("tJ26AXoVZgC8h_htE"); // with public key


  const sendStatusEmail = async (userEmail, userName, applicationId, status, applicationType = "Visa Application") => {
  try {
    console.log(`Sending ${status} email to:`, userEmail);

    // Define all variables
    let subject, statusTitle, statusMessage, customMessage, nextStepsText;
    let statusColor, statusBorder, statusTextColor;

    switch (status) {
      case "approved":
        subject = "🎉 Visa Application Approved - Australia Immigration";
        statusTitle = "APPLICATION APPROVED";
        statusMessage = "Your Australian Visa Application Has Been Approved";
        customMessage = "We are pleased to inform you that your Australian visa application has been successfully approved and is now ready for the next processing stages.";
        statusColor = "#d4edda";
        statusBorder = "#c3e6cb";
        statusTextColor = "#155724";
        nextStepsText = `
          <ol>
            <li><strong>Login to your account</strong> to view the approval letter</li>
            <li><strong>Complete the remaining process steps</strong> in your dashboard</li>
            <li><strong>Follow the instructions</strong> for each required step</li>
            <li><strong>Contact us</strong> if you have any questions</li>
          </ol>
        `;
        break;

      case "rejected":
        subject = "❌ Visa Application Update - Australia Immigration";
        statusTitle = "APPLICATION REVIEWED";
        statusMessage = "Your Application Requires Additional Attention";
        customMessage = "After careful review of your visa application, we require additional information or documentation to proceed. Please login to your account for detailed instructions.";
        statusColor = "#f8d7da";
        statusBorder = "#f5c6cb";
        statusTextColor = "#721c24";
        nextStepsText = `
          <ol>
            <li><strong>Login to your account</strong> to view the specific requirements</li>
            <li><strong>Review the feedback</strong> provided by our immigration team</li>
            <li><strong>Submit the requested documents</strong> or information</li>
            <li><strong>Contact us</strong> if you need clarification</li>
          </ol>
        `;
        break;

      case "under_review":
        subject = "⏳ Application Under Review - Australia Immigration";
        statusTitle = "UNDER REVIEW";
        statusMessage = "Your Application is Currently Being Reviewed";
        customMessage = "Your application has been received and is currently under review by our immigration team. This process typically takes 3-5 business days.";
        statusColor = "#fff3cd";
        statusBorder = "#ffeaa7";
        statusTextColor = "#856404";
        nextStepsText = `
          <ol>
            <li><strong>Wait for review completion</strong> (typically 3-5 business days)</li>
            <li><strong>Ensure all your documents</strong> are uploaded</li>
            <li><strong>Check your email regularly</strong> for updates</li>
            <li><strong>Contact us</strong> if you need to provide additional information</li>
          </ol>
        `;
        break;

      case "pending":
        subject = "📋 Application Status Update - Australia Immigration";
        statusTitle = "APPLICATION PENDING";
        statusMessage = "Your Application is Currently Pending Review";
        customMessage = "Your application has been received and is currently in the queue for review. We will notify you once the review process begins.";
        statusColor = "#e2e3e5";
        statusBorder = "#d6d8db";
        statusTextColor = "#383d41";
        nextStepsText = `
          <ol>
            <li><strong>Wait for your application</strong> to be assigned for review</li>
            <li><strong>Ensure all required documents</strong> are submitted</li>
            <li><strong>Check your email regularly</strong> for status updates</li>
          </ol>
        `;
        break;

      default:
        subject = "📋 Application Status Update - Australia Immigration";
        statusTitle = "STATUS UPDATED";
        statusMessage = "Your Application Status Has Been Updated";
        customMessage = "Your application status has been updated. Please login to your account for the latest information.";
        statusColor = "#e2e3e5";
        statusBorder = "#d6d8db";
        statusTextColor = "#383d41";
        nextStepsText = `
          <ol>
            <li><strong>Login to your account</strong> to check the current status</li>
            <li><strong>Follow any instructions</strong> provided</li>
            <li><strong>Contact us</strong> if you have questions</li>
          </ol>
        `;
    }

    // Prepare template parameters - ALL SIMPLE STRINGS, NO ARRAYS
    const templateParams = {
      to_email: userEmail || "user@example.com",
      user_name: userName || "Applicant",
      subject: subject || "Application Status Update",
      status_title: statusTitle || "STATUS UPDATE",
      status_message: statusMessage || "Your application status has been updated",
      status_color: statusColor || "#e2e3e5",
      status_border: statusBorder || "#d6d8db",
      status_text_color: statusTextColor || "#383d41",
      custom_message: customMessage || "Your application status has been updated.",
      reference_id: applicationId || "N/A",
      application_type: applicationType || "Visa Application",
      current_date: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      status_type: status.toUpperCase() || "UPDATED",
      next_steps_text: nextStepsText || "<p>Please check your account for next steps.</p>"
    };

    console.log('📧 Sending email with these parameters:');
    console.log('- User:', templateParams.user_name);
    console.log('- Status:', templateParams.status_type);
    console.log('- Application ID:', templateParams.reference_id);

    const result = await emailjs.send(
      'service_4l8mwuf',    // Your service ID
      'template_gjfiqui',   // Your template ID
      templateParams
    );

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', result.messageId);
    
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    console.error('Error details:', error);
    return { success: false, error: error.message };
  }
};













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
    
    // Find the application to get user details
    const application = applications.find(app => app.id === applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    // Update Firestore status first
    const applicationRef = doc(db, "applications", applicationId);
    
    await updateDoc(applicationRef, {
      applicationStatus: newStatus,
      updatedAt: new Date().toISOString()
    });

    // Update local state
    setApplications(prev => prev.map(app => 
      app.id === applicationId 
        ? { 
            ...app, 
            applicationStatus: newStatus, 
            updatedAt: new Date().toISOString()
          }
        : app
    ));

    // Update selected application if it's the same one
    if (selectedApplication && selectedApplication.id === applicationId) {
      setSelectedApplication(prev => ({
        ...prev,
        applicationStatus: newStatus,
        updatedAt: new Date().toISOString()
      }));
    }

    // Send email notification to user
    console.log('Sending status email...');
    const emailResult = await sendStatusEmail(
      application.email,
      `${application.name} ${application.surname}`,
      applicationId,
      newStatus,
      application.visaType || "Visa Application"
    );

    if (emailResult.success) {
      console.log('✅ Status email sent successfully');
      alert(`✅ Status updated to ${newStatus} and email sent to user!`);
    } else {
      console.warn('⚠️ Status updated but email failed to send');
      alert(`✅ Status updated to ${newStatus} (Email failed to send: ${emailResult.error})`);
    }
    
  } catch (error) {
    console.error("Error updating status:", error);
    alert("Error updating status: " + error.message);
  } finally {
    setActionLoading(false);
  }
};





  const handleFieldUpdate = async (field, value) => {
    if (!selectedApplication) return;

    try {
      setActionLoading(true);
      const applicationRef = doc(db, "applications", selectedApplication.id);
      
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
      setApplications(prev => prev.map(app => 
        app.id === selectedApplication.id ? updatedApplication : app
      ));

    } catch (error) {
      console.error("Error updating field:", error);
      alert("Error updating field: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    : applications.filter(app => app.applicationStatus === statusFilter);

  const pendingCount = applications.filter(app => !app.applicationStatus || app.applicationStatus === "pending").length;

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
  <Badge bg={getStatusVariant(application.applicationStatus)}>
    {application.applicationStatus || "pending"}
  </Badge>
  {application.applicationStatus && (
    <small className="text-muted d-block">
      <i className="fas fa-envelope me-1"></i>
      Email sent
    </small>
  )}
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
                              setEditableData(application);
                              setEditMode(false);
                              setShowModal(true);
                            }}
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          {(!application.applicationStatus || application.applicationStatus === "pending") && (
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
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" scrollable>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="fas fa-file-alt me-2"></i>
            Application Details - {selectedApplication?.name} {selectedApplication?.surname}
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
                  <h6 className="text-primary border-bottom pb-2">Personal Information</h6>
                  
                  <Form.Group className="mb-2">
                    <Form.Label><strong>Full Name</strong></Form.Label>
                    {editMode ? (
                      <div className="d-flex gap-2">
                        <Form.Control
                          type="text"
                          value={editableData.name || ""}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          placeholder="First Name"
                        />
                        <Form.Control
                          type="text"
                          value={editableData.surname || ""}
                          onChange={(e) => handleInputChange("surname", e.target.value)}
                          placeholder="Last Name"
                        />
                      </div>
                    ) : (
                      <p>{selectedApplication.name} {selectedApplication.surname}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Previous Name</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.previousName || ""}
                        onChange={(e) => handleInputChange("previousName", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.previousName || "N/A"}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Gender</strong></Form.Label>
                    {editMode ? (
                      <Form.Select
                        value={editableData.sex || ""}
                        onChange={(e) => handleInputChange("sex", e.target.value)}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </Form.Select>
                    ) : (
                      <p>{selectedApplication.sex}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Marital Status</strong></Form.Label>
                    {editMode ? (
                      <Form.Select
                        value={editableData.maritalStatus || ""}
                        onChange={(e) => handleInputChange("maritalStatus", e.target.value)}
                      >
                        <option value="">Select Status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </Form.Select>
                    ) : (
                      <p>{selectedApplication.maritalStatus}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Date of Birth</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="date"
                        value={editableData.dob || ""}
                        onChange={(e) => handleInputChange("dob", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.dob}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Religion</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.religion || ""}
                        onChange={(e) => handleInputChange("religion", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.religion}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Birth City</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.birthCity || ""}
                        onChange={(e) => handleInputChange("birthCity", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.birthCity}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Birth Country</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.birthCountry || ""}
                        onChange={(e) => handleInputChange("birthCountry", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.birthCountry}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>National ID</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.nationalId || ""}
                        onChange={(e) => handleInputChange("nationalId", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.nationalId}</p>
                    )}
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <h6 className="text-primary border-bottom pb-2">Passport & Contact</h6>
                  
                  <Form.Group className="mb-2">
                    <Form.Label><strong>Passport No</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.passportNo || ""}
                        onChange={(e) => handleInputChange("passportNo", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.passportNo}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Passport Issue Date</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="date"
                        value={editableData.passportIssueDate || ""}
                        onChange={(e) => handleInputChange("passportIssueDate", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.passportIssueDate}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Passport Expiry</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="date"
                        value={editableData.passportExpiry || ""}
                        onChange={(e) => handleInputChange("passportExpiry", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.passportExpiry}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Passport Place</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.passportPlace || ""}
                        onChange={(e) => handleInputChange("passportPlace", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.passportPlace}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Email</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="email"
                        value={editableData.email || ""}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.email}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Phone</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="tel"
                        value={editableData.phone || ""}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.phone}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Mobile</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="tel"
                        value={editableData.mobile || ""}
                        onChange={(e) => handleInputChange("mobile", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.mobile}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Address</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={editableData.contactAddress || ""}
                        onChange={(e) => handleInputChange("contactAddress", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.contactAddress}</p>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col md={6}>
                  <h6 className="text-primary border-bottom pb-2">Visa Information</h6>
                  
                  <Form.Group className="mb-2">
                    <Form.Label><strong>Visa Type</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.visaType || ""}
                        onChange={(e) => handleInputChange("visaType", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.visaType}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Entries</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.entries || ""}
                        onChange={(e) => handleInputChange("entries", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.entries}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Visa Period</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.visaPeriod || ""}
                        onChange={(e) => handleInputChange("visaPeriod", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.visaPeriod}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Journey Date</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="date"
                        value={editableData.journeyDate || ""}
                        onChange={(e) => handleInputChange("journeyDate", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.journeyDate}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Migration Type</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.migrationType || ""}
                        onChange={(e) => handleInputChange("migrationType", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.migrationType}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Sponsor</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.sponsor || ""}
                        onChange={(e) => handleInputChange("sponsor", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.sponsor}</p>
                    )}
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <h6 className="text-primary border-bottom pb-2">Family Information</h6>
                  
                  <Form.Group className="mb-2">
                    <Form.Label><strong>Father's Name</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.fatherName || ""}
                        onChange={(e) => handleInputChange("fatherName", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.fatherName}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Father's Nationality</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.fatherNationality || ""}
                        onChange={(e) => handleInputChange("fatherNationality", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.fatherNationality}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Mother's Name</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.motherName || ""}
                        onChange={(e) => handleInputChange("motherName", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.motherName}</p>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label><strong>Mother's Nationality</strong></Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={editableData.motherNationality || ""}
                        onChange={(e) => handleInputChange("motherNationality", e.target.value)}
                      />
                    ) : (
                      <p>{selectedApplication.motherNationality}</p>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              {/* Application Letter Upload Section */}
              <Row className="mb-4">
                <Col md={12}>
                  <h6 className="text-primary border-bottom pb-2">Application Letter</h6>
                  <Form.Group>
                    <Form.Label>
                      <strong>Upload Application Letter (Image/PDF)</strong>
                    </Form.Label>
                    <Form.Control
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          try {
                            setActionLoading(true);
                            
                            console.log('📤 Starting upload...');
                            console.log('User ID:', selectedApplication.uid);
                            console.log('Application ID:', selectedApplication.id);

                            // Use FormData with URL parameters
                            const formData = new FormData();
                            formData.append('file', file);
                            
                            // Add parameters as URL search params
                            const uploadUrl = `https://admin.australiaimmigration.site/upload-manual?userId=${encodeURIComponent(selectedApplication.uid)}&applicationId=${encodeURIComponent(selectedApplication.id)}&fileType=application`;
                            
                            console.log('Upload URL:', uploadUrl);

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

                            // Prepare Firestore update data - ensure no undefined values
                            const updateData = {
                              applicationLetter: result.fileInfo.fullUrl || '',
                              applicationLetterName: result.fileInfo.fileName || file.name,
                              applicationLetterUploadedAt: new Date().toISOString(),
                              applicationLetterPath: result.fileInfo.fileUrl || '',
                              applicationLetterSize: result.fileInfo.fileSize || file.size,
                              updatedAt: new Date().toISOString()
                            };

                            // Only add mimetype if it exists and is not undefined
                            if (result.fileInfo.mimetype) {
                              updateData.applicationLetterType = result.fileInfo.mimetype;
                            } else if (file.type) {
                              updateData.applicationLetterType = file.type;
                            } else {
                              // Fallback: determine mimetype from file extension
                              const fileExtension = file.name.split('.').pop()?.toLowerCase();
                              const mimeTypes = {
                                'pdf': 'application/pdf',
                                'jpg': 'image/jpeg',
                                'jpeg': 'image/jpeg',
                                'png': 'image/png',
                                'doc': 'application/msword',
                                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                              };
                              updateData.applicationLetterType = mimeTypes[fileExtension] || 'application/octet-stream';
                            }

                            console.log('Firestore update data:', updateData);

                            // Update Firestore with file info from server
                            const applicationRef = doc(db, "applications", selectedApplication.id);
                            await updateDoc(applicationRef, updateData);

                            // Update local state
                            const updatedApp = {
                              ...selectedApplication,
                              ...updateData
                            };

                            setSelectedApplication(updatedApp);
                            setEditableData(updatedApp);
                            setApplications(prev => prev.map(app => 
                              app.id === selectedApplication.id ? updatedApp : app
                            ));

                            alert("✅ Application letter uploaded successfully!");

                          } catch (error) {
                            console.error("❌ Upload error:", error);
                            alert("❌ Upload failed: " + error.message);
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

                  {/* Display uploaded file info */}
                  {selectedApplication.applicationLetter && (
                    <div className="mt-2 p-3 border rounded bg-light">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>Uploaded File:</strong> {selectedApplication.applicationLetterName}
                          <br />
                          <small className="text-muted">
                            <strong>Size:</strong> {selectedApplication.applicationLetterSize ? formatFileSize(selectedApplication.applicationLetterSize) : 'N/A'}
                          </small>
                          <br />
                          <small className="text-muted">
                            <strong>Type:</strong> {selectedApplication.applicationLetterType || 'Unknown'}
                          </small>
                          <br />
                          <small className="text-muted">
                            <strong>Uploaded:</strong> {formatDate(selectedApplication.applicationLetterUploadedAt)}
                          </small>
                          <br />
                          <small className="text-muted">
                            <strong>User ID:</strong> {selectedApplication.uid}
                          </small>
                        </div>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => window.open(selectedApplication.applicationLetter, '_blank')}
                          >
                            <i className="fas fa-eye me-1"></i> View
                          </Button>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = selectedApplication.applicationLetter;
                              link.download = selectedApplication.applicationLetterName || 'application-letter';
                              link.click();
                            }}
                          >
                            <i className="fas fa-download me-1"></i> Download
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={async () => {
                              if (!window.confirm('Are you sure you want to delete this application letter?')) return;
                              
                              try {
                                setActionLoading(true);
                                
                                // Try DELETE method first, fallback to POST if it fails
                                const deleteUrl = 'https://admin.australiaimmigration.site/file';
                                
                                console.log('Deleting file:', selectedApplication.applicationLetterPath);
                                
                                const response = await fetch(deleteUrl, {
                                  method: 'DELETE',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    fileUrl: selectedApplication.applicationLetterPath
                                  })
                                });
                                
                                // If DELETE fails, try POST method
                                if (!response.ok) {
                                  console.log('DELETE failed, trying POST method...');
                                  const postResponse = await fetch('https://admin.australiaimmigration.site/file-delete', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      fileUrl: selectedApplication.applicationLetterPath
                                    })
                                  });
                                  
                                  if (!postResponse.ok) {
                                    const errorResult = await postResponse.json();
                                    throw new Error(errorResult.error || `Delete failed: ${postResponse.statusText}`);
                                  }
                                  
                                  // POST delete successful
                                  console.log('File deleted via POST method');
                                } else {
                                  // DELETE successful
                                  const result = await response.json();
                                  console.log('File deleted via DELETE method:', result);
                                }
                                
                                // Remove file info from Firestore
                                const applicationRef = doc(db, "applications", selectedApplication.id);
                                await updateDoc(applicationRef, {
                                  applicationLetter: null,
                                  applicationLetterName: null,
                                  applicationLetterType: null,
                                  applicationLetterUploadedAt: null,
                                  applicationLetterPath: null,
                                  applicationLetterSize: null,
                                  applicationLetterStoredName: null
                                });

                                // Update local state
                                const updatedApp = {
                                  ...selectedApplication,
                                  applicationLetter: null,
                                  applicationLetterName: null,
                                  applicationLetterType: null,
                                  applicationLetterUploadedAt: null,
                                  applicationLetterPath: null,
                                  applicationLetterSize: null,
                                  applicationLetterStoredName: null
                                };

                                setSelectedApplication(updatedApp);
                                setEditableData(updatedApp);
                                setApplications(prev => prev.map(app => 
                                  app.id === selectedApplication.id ? updatedApp : app
                                ));

                                alert("Application letter deleted successfully!");
                                
                              } catch (error) {
                                console.error("Delete error:", error);
                                alert("Delete failed: " + error.message);
                              } finally {
                                setActionLoading(false);
                              }
                            }}
                            disabled={actionLoading}
                          >
                            <i className="fas fa-trash me-1"></i> Delete
                          </Button>
                        </div>
                      </div>
                      
                      {/* Show file path info */}
                      {selectedApplication.applicationLetterPath && (
                        <div className="mt-2 p-2 bg-white rounded">
                          <small className="text-muted">
                            <strong>File Path:</strong> {selectedApplication.applicationLetterPath}
                          </small>
                          <br />
                          <small className="text-muted">
                            <strong>Full URL:</strong> {selectedApplication.applicationLetter}
                          </small>
                        </div>
                      )}
                    </div>
                  )}
                </Col>
              </Row>

              {/* In the modal footer status buttons section */}
<Row>
  <Col md={12}>
    <h6 className="text-primary border-bottom pb-2">Application Management</h6>
    <div className="d-flex gap-2 flex-wrap">
      <Button
        variant={(!selectedApplication.applicationStatus || selectedApplication.applicationStatus === "pending") ? "warning" : "outline-warning"}
        size="sm"
        onClick={() => handleStatusUpdate(selectedApplication.id, "pending")}
        disabled={actionLoading}
      >
        <i className="fas fa-clock me-1"></i>
        {actionLoading ? "Updating..." : "Mark as Pending"}
      </Button>
      <Button
        variant={selectedApplication.applicationStatus === "approved" ? "success" : "outline-success"}
        size="sm"
        onClick={() => handleStatusUpdate(selectedApplication.id, "approved")}
        disabled={actionLoading}
      >
        <i className="fas fa-check me-1"></i>
        {actionLoading ? "Approving..." : "Approve"}
      </Button>
      <Button
        variant={selectedApplication.applicationStatus === "rejected" ? "danger" : "outline-danger"}
        size="sm"
        onClick={() => handleStatusUpdate(selectedApplication.id, "rejected")}
        disabled={actionLoading}
      >
        <i className="fas fa-times me-1"></i>
        {actionLoading ? "Rejecting..." : "Reject"}
      </Button>
      <Button
        variant={selectedApplication.applicationStatus === "under_review" ? "info" : "outline-info"}
        size="sm"
        onClick={() => handleStatusUpdate(selectedApplication.id, "under_review")}
        disabled={actionLoading}
      >
        <i className="fas fa-search me-1"></i>
        {actionLoading ? "Updating..." : "Under Review"}
      </Button>
    </div>
    
    <div className="mt-3">
      <p className="text-muted mb-1">
        <strong>Application ID:</strong> <code>{selectedApplication.id}</code>
      </p>
      <p className="text-muted mb-1">
        <strong>User Email:</strong> {selectedApplication.email}
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