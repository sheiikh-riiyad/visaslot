// src/pages/VisaDocumentSubmission.js
import { useState } from "react";
import { Form, Button, Card, Container, Row, Col, Alert, Spinner, ProgressBar, Modal, Badge } from "react-bootstrap";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebaseConfig";


const storage = getStorage(app);
const db = getFirestore(app);
const auth = getAuth(app);

function Biometric() {
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("success");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState("");

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
    "Sydney VFS Global Center",
    "Melbourne VFS Global Center", 
    "Brisbane VFS Global Center",
    "Perth VFS Global Center",
    "Adelaide VFS Global Center",
    "Canberra VFS Global Center"
  ];

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

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files[0];
    
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        showMessage("❌ Please upload only JPG, PNG, or PDF files", "danger");
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showMessage("❌ File size must be less than 5MB", "danger");
        return;
      }

      setFormData(prev => ({
        ...prev,
        [name]: file
      }));

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (name === 'vlnDocument') {
            setFormData(prev => ({ ...prev, vlnDocumentPreview: e.target.result }));
          } else {
            setFormData(prev => ({ ...prev, appointmentDocumentPreview: e.target.result }));
          }
        };
        reader.readAsDataURL(file);
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

  const uploadFile = async (file, path) => {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!user) {
      showMessage("❌ Please log in to submit documents", "danger");
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

      // Upload documents to Firebase Storage
      const vlnDocumentUrl = await uploadFile(
        formData.vlnDocument, 
        `documents/${user.uid}/vln_${Date.now()}.${formData.vlnDocument.name.split('.').pop()}`
      );

      const appointmentDocumentUrl = await uploadFile(
        formData.appointmentDocument,
        `documents/${user.uid}/appointment_${Date.now()}.${formData.appointmentDocument.name.split('.').pop()}`
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Save submission data to Firestore
      const submissionData = {
        userId: user.uid,
        userEmail: user.email,
        vlnNumber: formData.vlnNumber,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        vfsCenter: formData.vfsCenter,
        vlnDocumentUrl: vlnDocumentUrl,
        appointmentDocumentUrl: appointmentDocumentUrl,
        additionalNotes: formData.additionalNotes,
        status: "submitted",
        submittedAt: serverTimestamp(),
        submissionId: `SUB${Date.now().toString().slice(-8)}`
      };

      await addDoc(collection(db, "visaSubmissions"), submissionData);

      // Also update user's profile with submission status
      await setDoc(doc(db, "users", user.uid), {
        hasSubmittedDocuments: true,
        lastSubmissionDate: serverTimestamp()
      }, { merge: true });

      showMessage("✅ Documents submitted successfully! We'll review them within 24-48 hours.");

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

  console.log(getStatusBadge)

  return (
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
                    <span className="fw-semibold">Uploading Documents...</span>
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
              <Card.Header className="bg-primary text-white py-3">
                <h4 className="mb-0">
                  <i className="fas fa-passport me-2"></i>
                  Visa Document Submission
                </h4>
              </Card.Header>
              <Card.Body className="p-4">
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
                            />
                            <Form.Text className="text-muted">
                              Upload your Visa Lodgement Number confirmation (PDF, JPG, PNG)
                            </Form.Text>
                          </Form.Group>
                          {formData.vlnDocument && (
                            <div className="mt-3">
                              <Alert variant="success" className="py-2 small">
                                <i className="fas fa-check me-2"></i>
                                {formData.vlnDocument.name}
                                {formData.vlnDocumentPreview && (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 ms-2"
                                    onClick={() => previewDocument('vln')}
                                  >
                                    <i className="fas fa-eye me-1"></i>
                                    Preview
                                  </Button>
                                )}
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
                            />
                            <Form.Text className="text-muted">
                              Upload your VFS biometric appointment confirmation (PDF, JPG, PNG)
                            </Form.Text>
                          </Form.Group>
                          {formData.appointmentDocument && (
                            <div className="mt-3">
                              <Alert variant="success" className="py-2 small">
                                <i className="fas fa-check me-2"></i>
                                {formData.appointmentDocument.name}
                                {formData.appointmentDocumentPreview && (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 ms-2"
                                    onClick={() => previewDocument('appointment')}
                                  >
                                    <i className="fas fa-eye me-1"></i>
                                    Preview
                                  </Button>
                                )}
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
                          Submitting Documents...
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
                        Maximum file size: 5MB per document
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
                        <i className="fas fa-shield-alt text-info me-2"></i>
                        Your documents are securely encrypted
                      </li>
                      <li className="mb-2">
                        <i className="fas fa-envelope text-primary me-2"></i>
                        You'll receive email notifications
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
  );
}

export default Biometric;