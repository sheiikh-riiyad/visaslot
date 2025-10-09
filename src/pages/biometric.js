// src/pages/VisaDocumentSubmission.js
import { useState, useEffect } from "react";
import { Form, Button, Card, Container, Row, Col, Alert, Spinner, ProgressBar, Modal, Badge } from "react-bootstrap";
import { getFirestore, collection, addDoc, serverTimestamp, doc, setDoc, getDocs, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebaseConfig";
import BiometricPayment from "./biometricspay";

const db = getFirestore(app);
const auth = getAuth(app);

function Biometric() {
  const [loading, setLoading] = useState(false);
  const [checkingSubmission, setCheckingSubmission] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("success");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [hasExistingSubmission, setHasExistingSubmission] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState(null);

  const [formData, setFormData] = useState({
    vlnNumber: "",
    appointmentDate: "",
    appointmentTime: "",
    vfsCenter: "",
    vlnDocument: null,
    appointmentDocument: null,
    additionalNotes: ""
  });

  const vfsCenters = [
    "Dhaka VFS Global Center",
    "Sylhet VFS Global Center",
    "Chottogram VFS Global Center",
    "Aramco Dhahran VFS Global Center",
    "Dammam VFS Global Center",
    "Jeddah VFS Global Center",
    "Riyadh VFS Global Center",
    "Manama VFS Global Center",
    "Doha VFS Global Center",
    "Amman VFS Global Center",
    "Muscat VFS Global Center",
    "Kuala Lumpur VFS Global Center",
    "Umm Hurair 2 VFS Global Center",
    "Sharq, Kuwait City VFS Global Center",
    "Marriott, Kuwait City VFS Global Center",
    "Al Shuhada Street, Kuwait City VFS Global Center",
    "79 Anson Road, Singapore",
    
    "135 Cecil Street, Singapore",

  ];

  // Check for existing submission on component mount
  useEffect(() => {
    checkExistingSubmission();
  }, []);

  const checkExistingSubmission = async () => {
    const user = auth.currentUser;
    if (!user) {
      setCheckingSubmission(false);
      return;
    }

    try {
      const submissionsQuery = query(
        collection(db, "visaSubmissions"),
        where("userId", "==", user.uid)
      );
      
      const querySnapshot = await getDocs(submissionsQuery);
      
      if (!querySnapshot.empty) {
        const latestSubmission = querySnapshot.docs[0].data();
        setHasExistingSubmission(true);
        setExistingSubmission(latestSubmission);
      }
    } catch (error) {
      console.error("Error checking existing submission:", error);
    } finally {
      setCheckingSubmission(false);
    }
  };

  const showMessage = (message, variant = "success") => {
    setAlertMessage(message);
    setAlertVariant(variant);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e) => {
    const { name, files } = e.target;
    const file = files[0];
    
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        showMessage("❌ Please upload only JPG, PNG, or PDF files", "danger");
        return;
      }

      // Validate file size (2MB max for base64 storage)
      if (file.size > 2 * 1024 * 1024) {
        showMessage("❌ File size must be less than 2MB for base64 storage", "danger");
        return;
      }

      try {
        setLoading(true);
        // Convert file to base64
        const base64Data = await fileToBase64(file);
        
        setFormData(prev => ({
          ...prev,
          [name]: file,
          [`${name}Base64`]: base64Data,
          [`${name}Preview`]: file.type.startsWith('image/') ? base64Data : null
        }));

      } catch (error) {
        console.error("Error converting file to base64:", error);
        showMessage("❌ Error processing file. Please try again.", "danger");
      } finally {
        setLoading(false);
      }
    }
  };

  const previewDocument = (documentType) => {
    const preview = documentType === 'vln' ? formData.vlnDocumentPreview : formData.appointmentDocumentPreview;
    if (preview) {
      setPreviewImage(preview);
      setShowPreview(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!user) {
      showMessage("❌ Please log in to submit documents", "danger");
      return;
    }

    // Prevent multiple submissions
    if (hasExistingSubmission) {
      showMessage("❌ You have already submitted your documents. Only one submission is allowed per user.", "danger");
      return;
    }

    if (!formData.vlnNumber || !formData.appointmentDate || !formData.vfsCenter) {
      showMessage("❌ Please fill all required fields", "danger");
      return;
    }

    if (!formData.vlnDocument || !formData.appointmentDocument) {
      showMessage("❌ Please upload both required documents", "danger");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Save submission data to Firestore with base64 documents
      const submissionData = {
        userId: user.uid,
        userEmail: user.email,
        vlnNumber: formData.vlnNumber,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        vfsCenter: formData.vfsCenter,
        vlnDocument: {
          fileName: formData.vlnDocument.name,
          fileType: formData.vlnDocument.type,
          fileSize: formData.vlnDocument.size,
          base64Data: formData.vlnDocumentBase64,
          uploadedAt: serverTimestamp()
        },
        appointmentDocument: {
          fileName: formData.appointmentDocument.name,
          fileType: formData.appointmentDocument.type,
          fileSize: formData.appointmentDocument.size,
          base64Data: formData.appointmentDocumentBase64,
          uploadedAt: serverTimestamp()
        },
        additionalNotes: formData.additionalNotes,
        status: "submitted",
        submittedAt: serverTimestamp(),
        submissionId: `SUB${Date.now().toString().slice(-8)}`
      };

      await addDoc(collection(db, "visaSubmissions"), submissionData);

      // Also update user's profile with submission status
      await setDoc(doc(db, "users", user.uid), {
        hasSubmittedDocuments: true,
        lastSubmissionDate: serverTimestamp(),
        vlnNumber: formData.vlnNumber
      }, { merge: true });

      clearInterval(progressInterval);
      setUploadProgress(100);

      showMessage("✅ Documents submitted successfully! We'll review them within 24-48 hours.");
      
      // Update state to prevent further submissions
      setHasExistingSubmission(true);
      setExistingSubmission(submissionData);

      // Reset form
      setFormData({
        vlnNumber: "",
        appointmentDate: "",
        appointmentTime: "",
        vfsCenter: "",
        vlnDocument: null,
        appointmentDocument: null,
        additionalNotes: ""
      });

      setTimeout(() => setUploadProgress(0), 2000);

    } catch (error) {
      console.error("Submission error:", error);
      showMessage("❌ Failed to submit documents. Please try again.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      submitted: { variant: "warning", text: "Under Review" },
      approved: { variant: "success", text: "Approved" },
      rejected: { variant: "danger", text: "Needs Revision" }
    };
    
    const config = statusConfig[status] || { variant: "secondary", text: "Pending" };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  // Function to download base64 document
  const downloadDocument = (base64Data, fileName) => {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="visa-document-page">
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col lg={10} xl={8}>
            {/* Header Section */}
            <div className="text-center mb-5">
              <div className="document-icon mb-3">
                <i className="fas fa-file-upload fa-3x text-primary"></i>
              </div>
              <h1 className="fw-bold text-gradient">Document Submission</h1>
              <p className="lead text-muted">
                Submit your Visa Lodgement Number and Biometric Appointment documents
              </p>
              
              {/* Existing Submission Alert */}
              {hasExistingSubmission && (
                <Alert variant="info" className="mt-3">
                  <div className="d-flex align-items-center">
                    <i className="fas fa-info-circle me-2"></i>
                    <div>
                      <strong>You have already submitted your documents.</strong>
                      {existingSubmission && (
                        <div className="mt-2">
                          <small>
                            Submission ID: {existingSubmission.submissionId} | 
                            Status: {getStatusBadge(existingSubmission.status)} | 
                            Date: {existingSubmission.submittedAt?.toDate?.().toLocaleDateString()}
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
              )}
            </div>

            {/* Progress Steps */}
            <Card className="mb-4 shadow-sm border-0">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center">
                  {['Document Info', 'Upload Files', 'Review', 'Complete'].map((step, index) => (
                    <div key={step} className="text-center flex-fill">
                      <div className={`step-circle ${index === 0 ? 'active' : ''} mx-auto mb-2`}>
                        {index + 1}
                      </div>
                      <small className="text-muted">{step}</small>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>

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

            {/* Upload Progress */}
            {uploadProgress > 0 && (
              <Card className="mb-4 border-0 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-semibold">Processing Documents...</span>
                    <span className="text-primary">{uploadProgress}%</span>
                  </div>
                  <ProgressBar 
                    now={uploadProgress} 
                    variant="primary" 
                    animated 
                    style={{ height: '8px', borderRadius: '10px' }}
                  />
                </Card.Body>
              </Card>
            )}

            {/* Main Form */}
            <Card className="shadow-lg border-0">
              <Card.Header className={`py-3 ${hasExistingSubmission ? 'bg-secondary' : 'bg-primary text-white'}`}>
                <h4 className="mb-0">
                  <i className="fas fa-passport me-2"></i>
                  Visa Document Submission
                  {hasExistingSubmission && (
                    <Badge bg="light" text="dark" className="ms-2">
                      Already Submitted
                    </Badge>
                  )}
                </h4>
              </Card.Header>
              <Card.Body className="p-4">
                {hasExistingSubmission ? (
                  <div className="text-center py-4">
                    <i className="fas fa-check-circle fa-4x text-success mb-3"></i>
                    <h4 className="text-success mb-3">Documents Already Submitted</h4>
                    <p className="text-muted mb-4">
                      You have already submitted your visa documents. Each user can only submit once.
                      If you need to update your information, please contact support.
                    </p>
                    {existingSubmission && (
                      <Card className="bg-light">
                        <Card.Body>
                          <h6>Your Submission Details:</h6>
                          <Row className="text-start">
                            <Col md={6}>
                              <strong>VLN Number:</strong> {existingSubmission.vlnNumber}
                            </Col>
                            <Col md={6}>
                              <strong>VFS Center:</strong> {existingSubmission.vfsCenter}
                            </Col>
                            <Col md={6}>
                              <strong>Appointment Date:</strong> {existingSubmission.appointmentDate}
                            </Col>
                            <Col md={6}>
                              <strong>Status:</strong> {getStatusBadge(existingSubmission.status)}
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Form onSubmit={handleSubmit}>
                    <Row>
                      {/* VLN Information */}
                      <Col lg={6}>
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-semibold">
                            <i className="fas fa-hashtag me-2 text-primary"></i>
                            Visa Lodgement Number (VLN) *
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="vlnNumber"
                            value={formData.vlnNumber}
                            onChange={handleInputChange}
                            placeholder="e.g., VLN2024123456"
                            className="py-3"
                            required
                          />
                          <Form.Text className="text-muted">
                            Your unique Visa Lodgement Number from ImmiAccount
                          </Form.Text>
                        </Form.Group>
                      </Col>

                      <Col lg={6}>
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-semibold">
                            <i className="fas fa-map-marker-alt me-2 text-primary"></i>
                            VFS Global Center *
                          </Form.Label>
                          <Form.Select
                            name="vfsCenter"
                            value={formData.vfsCenter}
                            onChange={handleInputChange}
                            className="py-3"
                            required
                          >
                            <option value="">Select VFS Center</option>
                            {vfsCenters.map(center => (
                              <option key={center} value={center}>{center}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col lg={6}>
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-semibold">
                            <i className="fas fa-calendar me-2 text-primary"></i>
                            Appointment Date *
                          </Form.Label>
                          <Form.Control
                            type="date"
                            name="appointmentDate"
                            value={formData.appointmentDate}
                            onChange={handleInputChange}
                            className="py-3"
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col lg={6}>
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-semibold">
                            <i className="fas fa-clock me-2 text-primary"></i>
                            Appointment Time
                          </Form.Label>
                          <Form.Control
                            type="time"
                            name="appointmentTime"
                            value={formData.appointmentTime}
                            onChange={handleInputChange}
                            className="py-3"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    {/* Document Upload Sections */}
                    <Row>
                      <Col lg={6}>
                        <Card className="h-100 border-2">
                          <Card.Header className="bg-light">
                            <h6 className="mb-0">
                              <i className="fas fa-file-contract me-2 text-primary"></i>
                              VLN Document *
                            </h6>
                          </Card.Header>
                          <Card.Body>
                            <Form.Group>
                              <Form.Label>Upload VLN Confirmation</Form.Label>
                              <Form.Control
                                type="file"
                                name="vlnDocument"
                                onChange={handleFileChange}
                                accept=".jpg,.jpeg,.png,.pdf"
                                required
                                disabled={loading}
                              />
                              <Form.Text className="text-muted">
                                Upload your Visa Lodgement Number confirmation (PDF, JPG, PNG) - Max 2MB
                              </Form.Text>
                            </Form.Group>
                            {formData.vlnDocument && (
                              <div className="mt-3">
                                <Alert variant="success" className="py-2 small">
                                  <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                      <i className="fas fa-check me-2"></i>
                                      {formData.vlnDocument.name} 
                                      <small className="text-muted ms-2">
                                        ({(formData.vlnDocument.size / 1024 / 1024).toFixed(2)} MB)
                                      </small>
                                    </div>
                                    <div>
                                      {formData.vlnDocumentPreview && (
                                        <Button
                                          variant="outline-primary"
                                          size="sm"
                                          className="me-2"
                                          onClick={() => previewDocument('vln')}
                                        >
                                          <i className="fas fa-eye me-1"></i>
                                          Preview
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline-success"
                                        size="sm"
                                        onClick={() => downloadDocument(formData.vlnDocumentBase64, formData.vlnDocument.name)}
                                      >
                                        <i className="fas fa-download me-1"></i>
                                        Download
                                      </Button>
                                    </div>
                                  </div>
                                </Alert>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>

                      <Col lg={6}>
                        <Card className="h-100 border-2">
                          <Card.Header className="bg-light">
                            <h6 className="mb-0">
                              <i className="fas fa-calendar-check me-2 text-success"></i>
                              Appointment Confirmation *
                            </h6>
                          </Card.Header>
                          <Card.Body>
                            <Form.Group>
                              <Form.Label>Upload Appointment Letter</Form.Label>
                              <Form.Control
                                type="file"
                                name="appointmentDocument"
                                onChange={handleFileChange}
                                accept=".jpg,.jpeg,.png,.pdf"
                                required
                                disabled={loading}
                              />
                              <Form.Text className="text-muted">
                                Upload your VFS biometric appointment confirmation (PDF, JPG, PNG) - Max 2MB
                              </Form.Text>
                            </Form.Group>
                            {formData.appointmentDocument && (
                              <div className="mt-3">
                                <Alert variant="success" className="py-2 small">
                                  <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                      <i className="fas fa-check me-2"></i>
                                      {formData.appointmentDocument.name}
                                      <small className="text-muted ms-2">
                                        ({(formData.appointmentDocument.size / 1024 / 1024).toFixed(2)} MB)
                                      </small>
                                    </div>
                                    <div>
                                      {formData.appointmentDocumentPreview && (
                                        <Button
                                          variant="outline-primary"
                                          size="sm"
                                          className="me-2"
                                          onClick={() => previewDocument('appointment')}
                                        >
                                          <i className="fas fa-eye me-1"></i>
                                          Preview
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline-success"
                                        size="sm"
                                        onClick={() => downloadDocument(formData.appointmentDocumentBase64, formData.appointmentDocument.name)}
                                      >
                                        <i className="fas fa-download me-1"></i>
                                        Download
                                      </Button>
                                    </div>
                                  </div>
                                </Alert>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    {/* Additional Notes */}
                    <Form.Group className="mb-4 mt-4">
                      <Form.Label className="fw-semibold">
                        <i className="fas fa-sticky-note me-2 text-primary"></i>
                        Additional Notes
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        name="additionalNotes"
                        value={formData.additionalNotes}
                        onChange={handleInputChange}
                        placeholder="Any additional information or special requirements..."
                      />
                    </Form.Group>

                    {/* Submit Button */}
                    <div className="d-grid">
                      <Button
                        variant="primary"
                        type="submit"
                        size="lg"
                        disabled={loading}
                        className="py-3 fw-semibold submit-btn"
                      >
                        {loading ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            Processing Documents...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-paper-plane me-2"></i>
                            Submit Documents
                          </>
                        )}
                      </Button>
                    </div>
                  </Form>
                )}
              </Card.Body>
            </Card>

            {/* Information Card */}
            <Card className="mt-4 border-0 bg-light">
              <Card.Body className="p-4">
                <h5 className="mb-3">
                  <i className="fas fa-info-circle me-2 text-primary"></i>
                  Important Information
                </h5>
                <Row>
                  <Col md={6}>
                    <ul className="list-unstyled">
                      <li className="mb-2">
                        <i className="fas fa-check text-success me-2"></i>
                        Documents must be clear and readable
                      </li>
                      <li className="mb-2">
                        <i className="fas fa-check text-success me-2"></i>
                        Maximum file size: 2MB per document
                      </li>
                      <li className="mb-2">
                        <i className="fas fa-check text-success me-2"></i>
                        Accepted formats: PDF, JPG, PNG
                      </li>
                    </ul>
                  </Col>
                  <Col md={6}>
                    <ul className="list-unstyled">
                      <li className="mb-2">
                        <i className="fas fa-clock text-warning me-2"></i>
                        Processing time: 24-48 hours
                      </li>
                      <li className="mb-2">
                        <i className="fas fa-database text-info me-2"></i>
                        Documents stored as base64 data
                      </li>
                      <li className="mb-2">
                        <i className="fas fa-user-lock text-danger me-2"></i>
                        One submission allowed per user
                      </li>
                    </ul>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Document Preview Modal */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Document Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <img
            src={previewImage}
            alt="Document preview"
            className="img-fluid rounded shadow"
            style={{ maxHeight: '60vh' }}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .visa-document-page {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
        }
        
        .text-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .document-icon {
          animation: float 3s ease-in-out infinite;
        }
        
        .step-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #e9ecef;
          color: #6c757d;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          transition: all 0.3s ease;
        }
        
        .step-circle.active {
          background: #667eea;
          color: white;
        }
        
        .submit-btn {
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          transition: all 0.3s ease;
        }
        
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .card {
          border-radius: 15px;
        }
        
        .form-control, .form-select {
          border-radius: 10px;
          border: 2px solid #e9ecef;
          transition: all 0.3s ease;
        }
        
        .form-control:focus, .form-select:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
      `}</style>
    </div>


        <Container>
          <BiometricPayment/>
        </Container>


    </>
  );
}

export default Biometric;