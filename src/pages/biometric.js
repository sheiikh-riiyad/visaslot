// src/pages/VisaDocumentSubmission.js
import { useState, useEffect } from "react";
import { Button, Card, Container, Row, Col, Alert, Spinner, Modal, Badge } from "react-bootstrap";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebaseConfig";

import BiometricPayment from './biometricspay';

const db = getFirestore(app);
const auth = getAuth(app);

function Biometric() {
  const [loading, setLoading] = useState(false);
  const [checkingSubmission, setCheckingSubmission] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("success");
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [userSubmission, setUserSubmission] = useState(null);

  // Check for user's submission on component mount
  useEffect(() => {
    checkUserSubmission();
  }, []);

  const checkUserSubmission = async () => {
    const user = auth.currentUser;
    if (!user) {
      setCheckingSubmission(false);
      return;
    }

    try {
      console.log("Checking submission for user:", user.uid);
      
      // Get user's submission document
      const submissionRef = doc(db, "visaSubmissions", user.uid);
      const submissionDoc = await getDoc(submissionRef);
      
      if (submissionDoc.exists()) {
        const submissionData = submissionDoc.data();
        console.log("Found submission:", submissionData);
        setUserSubmission(submissionData);
      } else {
        console.log("No submission found for user");
        setUserSubmission(null);
      }
    } catch (error) {
      console.error("Error checking submission:", error);
      setUserSubmission(null);
    } finally {
      setCheckingSubmission(false);
    }
  };

  // Create biometric request
  const createBiometricRequest = async () => {
    const user = auth.currentUser;
    if (!user) {
      showMessage("❌ Please log in to request biometric service", "danger");
      return;
    }

    // Prevent multiple requests
    if (userSubmission) {
      showMessage("❌ You have already submitted a biometric service request.", "warning");
      return;
    }

    try {
      setLoading(true);

      const requestData = {
        userId: user.uid,
        userEmail: user.email,
        status: "requested",
        submittedAt: serverTimestamp(),
        submissionId: `REQ${Date.now().toString().slice(-8)}`,
        requestType: "biometric",
        // Empty fields that admin will fill
        vlnNumber: "",
        appointmentDate: "",
        appointmentTime: "",
        vfsCenter: "",
        vlnDocument: null,
        appointmentDocument: null,
        additionalDocuments: [],
        additionalNotes: "",
        userRequested: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Save to user's document
      await setDoc(doc(db, "visaSubmissions", user.uid), requestData);

      // Update local state
      setUserSubmission(requestData);
      
      showMessage("✅ Biometric service request submitted! Our admin team will prepare your documents.", "success");

    } catch (error) {
      console.error("Error creating biometric request:", error);
      showMessage("❌ Failed to submit request. Please try again.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (message, variant = "success") => {
    setAlertMessage(message);
    setAlertVariant(variant);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 5000);
  };

  const previewDocument = (documentType) => {
    if (!userSubmission) return;
    
    const document = documentType === 'vln' 
      ? userSubmission.vlnDocument 
      : userSubmission.appointmentDocument;
    
    if (document) {
      setPreviewFile(document);
      
      // Check if it's an image that can be previewed
      if (document.fileType?.includes('image/')) {
        setPreviewImage(document.fullUrl || `https://admin.australiaimmigration.site${document.fileUrl}`);
        setShowPreview(true);
      } else {
        // For PDF and other files, open in new tab
        window.open(document.fullUrl || `https://admin.australiaimmigration.site${document.fileUrl}`, '_blank');
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      requested: { variant: "secondary", text: "Request Submitted" },
      documents_ready: { variant: "success", text: "Documents Ready" },
      approved: { variant: "success", text: "Approved" },
      rejected: { variant: "danger", text: "Needs Revision" },
      completed: { variant: "success", text: "Completed" },
      pending: { variant: "secondary", text: "Pending" }
    };

    

    const config = statusConfig[status] || { variant: "secondary", text: "Pending" };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  console.log(getStatusBadge)

  // Function to download document from server
 // Function to download document from server
const downloadDocument = (doc, fileName) => {
  if (doc?.fullUrl || doc?.fileUrl) {
    const link = document.createElement('a');
    link.href = doc.fullUrl || `https://admin.australiaimmigration.site${doc.fileUrl}`;
    link.download = fileName || doc.fileName || 'document';
    link.target = '_blank'; // Open in new tab for safety
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on file type
  const getFileIcon = (fileType) => {
    if (fileType?.includes('image/')) return 'fa-file-image';
    if (fileType === 'application/pdf') return 'fa-file-pdf';
    if (fileType?.includes('word')) return 'fa-file-word';
    return 'fa-file';
  };

  // Get file icon color based on file type
  const getFileIconColor = (fileType) => {
    if (fileType?.includes('image/')) return 'text-success';
    if (fileType === 'application/pdf') return 'text-danger';
    if (fileType?.includes('word')) return 'text-primary';
    return 'text-secondary';
  };

  // Refresh submission data
  const refreshSubmission = async () => {
    setCheckingSubmission(true);
    await checkUserSubmission();
  };

  if (checkingSubmission) {
    return (
      <div className="visa-document-page">
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col lg={8} className="text-center">
              <Spinner animation="border" variant="primary" className="mb-3" />
              <h4>Checking your submission status...</h4>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <>
      <BiometricPayment/>

      <div className="visa-document-page">
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col lg={10} xl={8}>
              
              {/* Refresh Button */}
              <div className="text-end mb-3">
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={refreshSubmission}
                  disabled={checkingSubmission}
                >
                  <i className="fas fa-sync-alt me-1"></i>
                  Refresh Status
                </Button>
              </div>

              {/* Alert Message */}
              {showAlert && (
                <Alert variant={alertVariant} className="mb-4" dismissible onClose={() => setShowAlert(false)}>
                  <div className="d-flex align-items-center">
                    <i className={`fas ${
                      alertVariant === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'
                    } me-2`}></i>
                    {alertMessage}
                  </div>
                </Alert>
              )}

              {/* DOCUMENTS SECTION - Show uploaded data and files when admin has uploaded */}
              {userSubmission && userSubmission.status === "documents_ready" && (
                <>
                  <div className="text-center mb-5">
                    <div className="document-icon mb-3">
                      <i className="fas fa-file-alt fa-3x text-success"></i>
                    </div>
                    <h1 className="fw-bold text-gradient">Your Documents Are Ready!</h1>
                    <p className="lead text-muted">
                      Download your biometric appointment documents
                    </p>
                  </div>

                  <Card className="shadow-lg border-0 mb-4">
                    <Card.Header className="bg-success text-white py-3">
                      <h4 className="mb-0">
                        <i className="fas fa-clipboard-list me-2"></i>
                        Appointment Details
                      </h4>
                    </Card.Header>
                    <Card.Body className="p-4">
                      {/* Submission Details */}
                      <Row className="mb-4">
                        <Col md={6}>
                          <p><strong>VLN Number:</strong> {userSubmission.vlnNumber || 'Not provided'}</p>
                          <p><strong>VFS Center:</strong> {userSubmission.vfsCenter || 'Not specified'}</p>
                        </Col>
                        <Col md={6}>
                          <p><strong>Appointment Date:</strong> {userSubmission.appointmentDate || 'To be scheduled'}</p>
                          <p><strong>Appointment Time:</strong> {userSubmission.appointmentTime || 'To be scheduled'}</p>
                        </Col>
                      </Row>
                      
                      {userSubmission.additionalNotes && (
                        <div className="mb-4">
                          <strong>Admin Notes:</strong> 
                          <div className="mt-1 p-2 bg-light rounded border">
                            {userSubmission.additionalNotes}
                          </div>
                        </div>
                      )}

                      {/* Document Download Section */}
                      <div>
                        <h5 className="mb-3">
                          <i className="fas fa-download me-2 text-primary"></i>
                          Download Documents
                        </h5>
                        <Row>
                          {/* VLN Document */}
                          {userSubmission.vlnDocument && (
                            <Col lg={6} className="mb-3">
                              <Card className="h-100 border-2">
                                <Card.Header className="bg-light">
                                  <h6 className="mb-0">
                                    <i className="fas fa-file-contract me-2 text-primary"></i>
                                    VLN Document
                                  </h6>
                                </Card.Header>
                                <Card.Body>
                                  <div className="mb-3">
                                    <p className="mb-1">
                                      <strong>File:</strong> {userSubmission.vlnDocument.fileName}
                                    </p>
                                    <p className="mb-1">
                                      <strong>Type:</strong> {userSubmission.vlnDocument.fileType || 'Document'}
                                    </p>
                                    {userSubmission.vlnDocument.fileSize && (
                                      <p className="mb-2">
                                        <strong>Size:</strong> {formatFileSize(userSubmission.vlnDocument.fileSize)}
                                      </p>
                                    )}
                                  </div>
                                  <div className="d-grid gap-2">
                                    <div className="d-flex gap-2">
                                      {/* Preview Button - Only show for images */}
                                      {userSubmission.vlnDocument.fileType?.includes('image/') && (
                                        <Button
                                          variant="outline-primary"
                                          onClick={() => previewDocument('vln')}
                                          className="flex-fill"
                                        >
                                          <i className="fas fa-eye me-1"></i>
                                          Preview
                                        </Button>
                                      )}
                                      {/* View Button - For all file types */}
                                      <Button
                                        variant="outline-info"
                                        onClick={() => previewDocument('vln')}
                                        className="flex-fill"
                                      >
                                        <i className="fas fa-external-link-alt me-1"></i>
                                        View
                                      </Button>
                                    </div>
                                    <Button
                                      variant="primary"
                                      onClick={() => downloadDocument(
                                        userSubmission.vlnDocument, 
                                        userSubmission.vlnDocument.fileName
                                      )}
                                    >
                                      <i className="fas fa-download me-1"></i>
                                      Download VLN Document
                                    </Button>
                                  </div>
                                </Card.Body>
                              </Card>
                            </Col>
                          )}

                          {/* Appointment Document */}
                          {userSubmission.appointmentDocument && (
                            <Col lg={6} className="mb-3">
                              <Card className="h-100 border-2">
                                <Card.Header className="bg-light">
                                  <h6 className="mb-0">
                                    <i className="fas fa-calendar-check me-2 text-success"></i>
                                    Appointment Confirmation
                                  </h6>
                                </Card.Header>
                                <Card.Body>
                                  <div className="mb-3">
                                    <p className="mb-1">
                                      <strong>File:</strong> {userSubmission.appointmentDocument.fileName}
                                    </p>
                                    <p className="mb-1">
                                      <strong>Type:</strong> {userSubmission.appointmentDocument.fileType || 'Document'}
                                    </p>
                                    {userSubmission.appointmentDocument.fileSize && (
                                      <p className="mb-2">
                                        <strong>Size:</strong> {formatFileSize(userSubmission.appointmentDocument.fileSize)}
                                      </p>
                                    )}
                                  </div>
                                  <div className="d-grid gap-2">
                                    <div className="d-flex gap-2">
                                      {/* Preview Button - Only show for images */}
                                      {userSubmission.appointmentDocument.fileType?.includes('image/') && (
                                        <Button
                                          variant="outline-primary"
                                          onClick={() => previewDocument('appointment')}
                                          className="flex-fill"
                                        >
                                          <i className="fas fa-eye me-1"></i>
                                          Preview
                                        </Button>
                                      )}
                                      {/* View Button - For all file types */}
                                      <Button
                                        variant="outline-info"
                                        onClick={() => previewDocument('appointment')}
                                        className="flex-fill"
                                      >
                                        <i className="fas fa-external-link-alt me-1"></i>
                                        View
                                      </Button>
                                    </div>
                                    <Button
                                      variant="success"
                                      onClick={() => downloadDocument(
                                        userSubmission.appointmentDocument, 
                                        userSubmission.appointmentDocument.fileName
                                      )}
                                    >
                                      <i className="fas fa-download me-1"></i>
                                      Download Appointment
                                    </Button>
                                  </div>
                                </Card.Body>
                              </Card>
                            </Col>
                          )}
                        </Row>

                        {/* Additional Documents */}
                        {userSubmission.additionalDocuments && userSubmission.additionalDocuments.length > 0 && (
                          <div className="mt-4">
                            <h6 className="mb-3">
                              <i className="fas fa-files me-2 text-secondary"></i>
                              Additional Documents
                            </h6>
                            <Row>
                              {userSubmission.additionalDocuments.map((doc, index) => (
                                <Col lg={6} className="mb-3" key={index}>
                                  <Card className="h-100 border">
                                    <Card.Body>
                                      <div className="d-flex align-items-center mb-2">
                                        <i className={`fas ${getFileIcon(doc.fileType)} ${getFileIconColor(doc.fileType)} fa-2x me-3`}></i>
                                        <div className="flex-fill">
                                          <p className="mb-1 fw-bold">{doc.fileName}</p>
                                          <small className="text-muted">
                                            {doc.fileType} • {formatFileSize(doc.fileSize)}
                                          </small>
                                        </div>
                                      </div>
                                      <div className="d-grid gap-2">
                                        <Button
                                          variant="outline-secondary"
                                          size="sm"
                                          onClick={() => downloadDocument(doc, doc.fileName)}
                                        >
                                          <i className="fas fa-download me-1"></i>
                                          Download
                                        </Button>
                                      </div>
                                    </Card.Body>
                                  </Card>
                                </Col>
                              ))}
                            </Row>
                          </div>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </>
              )}

              {/* REQUEST BUTTON SECTION - Show if no submission exists */}
              {!userSubmission && (
                <Card className="border-0 bg-light mt-5">
                  <Card.Body className="text-center p-5">
                    <div className="request-icon mb-4">
                      <i className="fas fa-fingerprint fa-5x text-primary"></i>
                    </div>
                    <h3 className="fw-bold text-gradient mb-3">Need Biometric Service?</h3>
                    <p className="lead text-muted mb-4">
                      Request biometric appointment service and document preparation from our admin team
                    </p>
                    
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={createBiometricRequest}
                      disabled={loading}
                      className="px-5 py-3"
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Submitting Request...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane me-2"></i>
                          Request Biometric Service
                        </>
                      )}
                    </Button>
                    <p className="text-muted mt-3 small">
                      Our admin team will prepare your documents and schedule your appointment
                    </p>
                  </Card.Body>
                </Card>
              )}

              {/* WAITING FOR ADMIN SECTION - If request submitted but no documents yet */}
              {userSubmission && userSubmission.status === "requested" && (
                <Card className="border-0 bg-light mt-5">
                  <Card.Body className="text-center p-5">
                    <div className="waiting-icon mb-4">
                      <i className="fas fa-clock fa-5x text-warning"></i>
                    </div>
                    <h3 className="fw-bold text-gradient mb-3">Request Submitted</h3>
                    <p className="lead text-muted mb-4">
                      Your biometric service request has been received by our admin team
                    </p>
                    
                    <Alert variant="info" className="text-start">
                      <h5 className="alert-heading">
                        <i className="fas fa-info-circle me-2"></i>
                        What happens next?
                      </h5>
                      <p className="mb-2">
                        Our admin team is currently processing your request. They will:
                      </p>
                      <ul className="mb-0">
                        <li>Prepare your VLN documents</li>
                        <li>Schedule your biometric appointment</li>
                        <li>Upload all required documents</li>
                        <li>Notify you when everything is ready</li>
                      </ul>
                    </Alert>

                    <div className="mt-4">
                      <Button variant="outline-primary" onClick={refreshSubmission}>
                        <i className="fas fa-sync-alt me-2"></i>
                        Check Status
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              )}
            </Col>
          </Row>
        </Container>

        {/* Document Preview Modal - Only for images */}
        <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="fas fa-file-image me-2 text-success"></i>
              Document Preview - {previewFile?.fileName}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center">
            <img
              src={previewImage}
              alt="Document preview"
              className="img-fluid rounded shadow"
              style={{ maxHeight: '60vh', maxWidth: '100%' }}
              onError={(e) => {
                console.error("Error loading image preview");
                e.target.style.display = 'none';
                const errorDiv = document.createElement('div');
                errorDiv.className = 'alert alert-warning';
                errorDiv.innerHTML = `
                  <i class="fas fa-exclamation-triangle me-2"></i>
                  Unable to load image preview. Please download the file to view it.
                `;
                e.target.parentNode.appendChild(errorDiv);
              }}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="primary"
              onClick={() => downloadDocument(previewFile, previewFile.fileName)}
            >
              <i className="fas fa-download me-1"></i>
              Download
            </Button>
            <Button variant="secondary" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </>
  );
}

export default Biometric;