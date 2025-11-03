// src/pages/AustraliaWorkPermit.js
import { useState, useEffect } from "react";
import { Form, Button, Card, Container, Row, Col, Alert, Spinner, ProgressBar, Modal, Badge } from "react-bootstrap";
import { getFirestore, collection, addDoc, serverTimestamp, doc, setDoc, getDocs, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebaseConfig";
import AustraliaWorkPermitFees from "./workpayment";

const db = getFirestore(app);
const auth = getAuth(app);

function AustraliaWorkPermit() {
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
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedConfirmationDoc, setSelectedConfirmationDoc] = useState(null);

  const [formData, setFormData] = useState({
    passportNumber: "",
    documentType: "",
    documentFile: null,
    documentBase64: null,
    documentPreview: null,
    visaSubclass: "",
    applicationDate: "",
    additionalNotes: ""
  });

  const documentTypes = [
    "Passport Bio Page",
    "Visa Grant Notice",
    "Work Permit Approval",
    "ImmiAccount Application",
    "Other Supporting Document"
  ];

  const visaSubclasses = [
    "482 - Temporary Skill Shortage",
    "400 - Temporary Work (Short Stay)",
    "403 - Temporary Work (International Relations)",
    "407 - Training Visa",
    "408 - Temporary Activity",
    "186 - Employer Nomination Scheme",
    "187 - Regional Sponsored Migration Scheme",
    "189 - Skilled Independent",
    "190 - Skilled Nominated",
    "491 - Skilled Work Regional (Provisional)",
    "494 - Skilled Employer Sponsored Regional (Provisional)"
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
        collection(db, "australiaWorkPermits"),
        where("userId", "==", user.uid)
      );
      
      const querySnapshot = await getDocs(submissionsQuery);
      
      if (!querySnapshot.empty) {
        const latestSubmission = querySnapshot.docs[0].data();
        setHasExistingSubmission(true);
        setExistingSubmission(latestSubmission);
      }
    } catch (error) {
      console.error("Error checking existing work permit submission:", error);
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
          documentBase64: base64Data,
          documentPreview: file.type.startsWith('image/') ? base64Data : null
        }));

      } catch (error) {
        console.error("Error converting file to base64:", error);
        showMessage("❌ Error processing file. Please try again.", "danger");
      } finally {
        setLoading(false);
      }
    }
  };

  const previewDocument = () => {
    if (formData.documentPreview) {
      setPreviewImage(formData.documentPreview);
      setShowPreview(true);
    }
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

  // Function to download confirmation document
  const downloadConfirmationDocument = (document) => {
    if (document?.fullUrl) {
      window.open(document.fullUrl, '_blank');
    } else if (document?.fileUrl) {
      window.open(`http://localhost:4000${document.fileUrl}`, '_blank');
    } else {
      alert('❌ File URL not available');
    }
  };

  // Handle viewing confirmation document in modal
  const handleViewConfirmationDocument = (document) => {
    setSelectedConfirmationDoc(document);
    setShowConfirmationModal(true);
  };

  const validatePassport = () => {
    // Basic validation for passport number format
    const passportRegex = /^[A-Z0-9]{6,9}$/;
    if (!passportRegex.test(formData.passportNumber)) {
      showMessage("❌ Please enter a valid passport number (6-9 alphanumeric characters)", "danger");
      return false;
    }

    // Check if application date is provided and valid
    if (formData.applicationDate) {
      const appDate = new Date(formData.applicationDate);
      const today = new Date();
      if (appDate > today) {
        showMessage("❌ Application date cannot be in the future", "danger");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!user) {
      showMessage("❌ Please log in to submit work permit documents", "danger");
      return;
    }

    // Prevent multiple submissions
    if (hasExistingSubmission) {
      showMessage("❌ You have already submitted your work permit documents. Only one submission is allowed per user.", "danger");
      return;
    }

    if (!formData.passportNumber || !formData.documentType) {
      showMessage("❌ Please fill all required fields", "danger");
      return;
    }

    if (!formData.documentFile) {
      showMessage("❌ Please upload the required document", "danger");
      return;
    }

    // Validate passport format
    if (!validatePassport()) {
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

      // Save work permit data to Firestore with base64 document
      const workPermitData = {
        userId: user.uid,
        userEmail: user.email,
        passportNumber: formData.passportNumber.toUpperCase(),
        documentType: formData.documentType,
        visaSubclass: formData.visaSubclass,
        applicationDate: formData.applicationDate,
        document: {
          fileName: formData.documentFile.name,
          fileType: formData.documentFile.type,
          fileSize: formData.documentFile.size,
          base64Data: formData.documentBase64,
          uploadedAt: serverTimestamp()
        },
        additionalNotes: formData.additionalNotes,
        status: "submitted",
        submittedAt: serverTimestamp(),
        submissionId: `AUS${Date.now().toString().slice(-8)}`,
        country: "Australia",
        verified: false
      };

      await addDoc(collection(db, "australiaWorkPermits"), workPermitData);

      // Update user's profile with work permit submission status
      await setDoc(doc(db, "users", user.uid), {
        hasAustraliaWorkPermit: true,
        australiaPassportNumber: formData.passportNumber.toUpperCase(),
        australiaWorkPermitStatus: "submitted",
        lastAustraliaSubmission: serverTimestamp()
      }, { merge: true });

      clearInterval(progressInterval);
      setUploadProgress(100);

      showMessage("✅ Work Permit documents submitted successfully! We'll review them within 24-48 hours.");
      
      // Update state to prevent further submissions
      setHasExistingSubmission(true);
      setExistingSubmission(workPermitData);

      // Reset form
      setFormData({
        passportNumber: "",
        documentType: "",
        documentFile: null,
        documentBase64: null,
        documentPreview: null,
        visaSubclass: "",
        applicationDate: "",
        additionalNotes: ""
      });

      setTimeout(() => setUploadProgress(0), 2000);

    } catch (error) {
      console.error("Work Permit submission error:", error);
      showMessage("❌ Failed to submit work permit documents. Please try again.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      submitted: { variant: "warning", text: "Under Review" },
      approved: { variant: "success", text: "Approved" },
      rejected: { variant: "danger", text: "Needs Revision" },
      processing: { variant: "info", text: "Processing" }
    };
    
    const config = statusConfig[status] || { variant: "secondary", text: "Pending" };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Render document preview for confirmation modal
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

    // For URL-based documents (confirmation documents from server)
    if ((document.fileUrl || document.fullUrl) && !document.base64Data) {
      const fileUrl = document.fullUrl || `http://localhost:4000${document.fileUrl}`;
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
            onClick={() => downloadConfirmationDocument(document)}
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
            onClick={() => downloadDocument(document.base64Data, document.fileName)}
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
            onClick={() => downloadDocument(document.base64Data, document.fileName)}
            className="mt-2"
          >
            <i className="fas fa-download me-1"></i>
            Try Downloading Instead
          </Button>
        </div>
      );
    }
  };

  if (checkingSubmission) {
    return (
      <div className="work-permit-page">
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col lg={8} className="text-center">
              <Spinner animation="border" variant="primary" className="mb-3" />
              <h4>Checking your work permit submission status...</h4>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <>
      <div className="work-permit-page">
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col lg={10} xl={8}>
              {/* Header Section */}
              <div className="text-center mb-5">
                <div className="document-icon mb-3">
                  <i className="fas fa-file-contract fa-3x text-primary"></i>
                </div>
                <h1 className="fw-bold text-gradient">Australia Work Permit</h1>
                <p className="lead text-muted">
                  Submit your Australian Work Permit documents for verification
                </p>
              
                {/* Existing Submission Alert */}
                {hasExistingSubmission && (
                  <Alert variant="info" className="mt-3">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-info-circle me-2"></i>
                      <div>
                        <strong>You have already submitted your work permit documents.</strong>
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
                    {['Personal Info', 'Upload Document', 'Review', 'Complete'].map((step, index) => (
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
                      <span className="fw-semibold">Processing Document...</span>
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
                    Australian Work Permit Submission
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
                      <h4 className="text-success mb-3">Work Permit Documents Already Submitted</h4>
                      <p className="text-muted mb-4">
                        You have already submitted your Australian work permit documents. Each user can only submit once.
                        If you need to update your information, please contact support.
                      </p>
                      {existingSubmission && (
                        <Card className="bg-light">
                          <Card.Body>
                            <h6>Your Submission Details:</h6>
                            <Row className="text-start">
                              <Col md={6}>
                                <strong>Passport Number:</strong> {existingSubmission.passportNumber}
                              </Col>
                              <Col md={6}>
                                <strong>Document Type:</strong> {existingSubmission.documentType}
                              </Col>
                              <Col md={6}>
                                <strong>Visa Subclass:</strong> {existingSubmission.visaSubclass || "Not specified"}
                              </Col>
                              <Col md={6}>
                                <strong>Status:</strong> {getStatusBadge(existingSubmission.status)}
                              </Col>
                              <Col md={6}>
                                <strong>Submitted:</strong> {existingSubmission.submittedAt?.toDate?.().toLocaleDateString()}
                              </Col>
                            </Row>
                            
                            {/* Confirmation Document Section */}
                            {existingSubmission.confirmationDocument && (
                              <div className="mt-3 p-3 border rounded bg-white">
                                <h6 className="text-success mb-2">
                                  <i className="fas fa-file-check me-2"></i>
                                  Confirmation Document
                                </h6>
                                <Row className="align-items-center">
                                  <Col md={8}>
                                    <p className="mb-1">
                                      <strong>File:</strong> {existingSubmission.confirmationDocument.fileName}
                                    </p>
                                    <p className="mb-1 text-muted small">
                                      <strong>Type:</strong> {existingSubmission.confirmationDocument.fileType} | 
                                      <strong> Size:</strong> {formatFileSize(existingSubmission.confirmationDocument.fileSize)}
                                    </p>
                                    {existingSubmission.confirmationDocument.uploadedAt && (
                                      <p className="mb-0 text-muted small">
                                        <strong>Uploaded:</strong> {new Date(existingSubmission.confirmationDocument.uploadedAt).toLocaleDateString()}
                                      </p>
                                    )}
                                  </Col>
                                  <Col md={4} className="text-end">
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      className="me-2"
                                      onClick={() => handleViewConfirmationDocument(existingSubmission.confirmationDocument)}
                                    >
                                      <i className="fas fa-eye me-1"></i>
                                      View
                                    </Button>
                                    <Button
                                      variant="outline-success"
                                      size="sm"
                                      onClick={() => downloadConfirmationDocument(existingSubmission.confirmationDocument)}
                                    >
                                      <i className="fas fa-download me-1"></i>
                                      Download
                                    </Button>
                                  </Col>
                                </Row>
                              </div>
                            )}

                            {/* Original Document */}
                            {existingSubmission.document && (
                              <div className="mt-3 text-center">
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => downloadDocument(existingSubmission.document.base64Data, existingSubmission.document.fileName)}
                                >
                                  <i className="fas fa-download me-1"></i>
                                  Download Submitted Document
                                </Button>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <Form onSubmit={handleSubmit}>
                      <Row>
                        {/* Passport Information */}
                        <Col lg={6}>
                          <Form.Group className="mb-4">
                            <Form.Label className="fw-semibold">
                              <i className="fas fa-hashtag me-2 text-primary"></i>
                              Passport Number *
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="passportNumber"
                              value={formData.passportNumber}
                              onChange={(e) => {
                                e.target.value = e.target.value.toUpperCase();
                                handleInputChange(e);
                              }}
                              placeholder="e.g., A12345678"
                              className="py-3"
                              required
                              maxLength={9}
                            />
                            <Form.Text className="text-muted">
                              Your passport number (6-9 alphanumeric characters)
                            </Form.Text>
                          </Form.Group>
                        </Col>

                        <Col lg={6}>
                          <Form.Group className="mb-4">
                            <Form.Label className="fw-semibold">
                              <i className="fas fa-file-alt me-2 text-primary"></i>
                              Document Type *
                            </Form.Label>
                            <Form.Select
                              name="documentType"
                              value={formData.documentType}
                              onChange={handleInputChange}
                              className="py-3"
                              required
                            >
                              <option value="">Select Document Type</option>
                              {documentTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col lg={6}>
                          <Form.Group className="mb-4">
                            <Form.Label className="fw-semibold">
                              <i className="fas fa-visa me-2 text-primary"></i>
                              Visa Subclass
                            </Form.Label>
                            <Form.Select
                              name="visaSubclass"
                              value={formData.visaSubclass}
                              onChange={handleInputChange}
                              className="py-3"
                            >
                              <option value="">Select Visa Subclass</option>
                              {visaSubclasses.map(subclass => (
                                <option key={subclass} value={subclass}>{subclass}</option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>

                        <Col lg={6}>
                          <Form.Group className="mb-4">
                            <Form.Label className="fw-semibold">
                              <i className="fas fa-calendar me-2 text-primary"></i>
                              Application Date
                            </Form.Label>
                            <Form.Control
                              type="date"
                              name="applicationDate"
                              value={formData.applicationDate}
                              onChange={handleInputChange}
                              className="py-3"
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      {/* Document Upload Section */}
                      <Row>
                        <Col lg={12}>
                          <Card className="h-100 border-2 border-dashed">
                            <Card.Header className="bg-light">
                              <h6 className="mb-0">
                                <i className="fas fa-file-upload me-2 text-primary"></i>
                                Upload Document *
                              </h6>
                            </Card.Header>
                            <Card.Body className="text-center p-4">
                              <Form.Group>
                                <Form.Label className="fw-semibold">
                                  Upload your CV of Passport
                                </Form.Label>
                                <Form.Control
                                  type="file"
                                  name="documentFile"
                                  onChange={handleFileChange}
                                  accept=".jpg,.jpeg,.png,.pdf"
                                  required
                                  disabled={loading}
                                />
                                <Form.Text className="text-muted d-block">
                                  Upload your CV of Passport (PDF, JPG, PNG) - Max 2MB for base64 storage
                                </Form.Text>
                              </Form.Group>
                            
                              {formData.documentFile && (
                                <div className="mt-3">
                                  <Alert variant="success" className="py-2 small">
                                    <div className="d-flex justify-content-between align-items-center">
                                      <div>
                                        <i className="fas fa-check me-2"></i>
                                        {formData.documentFile.name}
                                        <small className="text-muted ms-2">
                                          ({(formData.documentFile.size / 1024 / 1024).toFixed(2)} MB)
                                        </small>
                                      </div>
                                      <div>
                                        {formData.documentPreview && (
                                          <Button
                                            variant="outline-primary"
                                            size="sm"
                                            className="me-2"
                                            onClick={previewDocument}
                                          >
                                            <i className="fas fa-eye me-1"></i>
                                            Preview
                                          </Button>
                                        )}
                                        <Button
                                          variant="outline-success"
                                          size="sm"
                                          onClick={() => downloadDocument(formData.documentBase64, formData.documentFile.name)}
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
                          placeholder="Any additional information about your work permit application..."
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
                              Processing Document...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-paper-plane me-2"></i>
                              Submit Work Permit Documents
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
                          One submission allowed per user
                        </li>
                        <li className="mb-2">
                          <i className="fas fa-check text-success me-2"></i>
                          Documents stored as base64 data
                        </li>
                        <li className="mb-2">
                          <i className="fas fa-check text-success me-2"></i>
                          Maximum file size: 2MB per document
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
                          <i className="fas fa-file text-info me-2"></i>
                          Accepted formats: PDF, JPG, PNG
                        </li>
                        <li className="mb-2">
                          <i className="fas fa-envelope text-primary me-2"></i>
                          You'll receive email notifications
                        </li>
                      </ul>
                    </Col>
                  </Row>
                  <hr />
                  <h6 className="fw-semibold">Common Australian Work Visas:</h6>
                  <Row>
                    <Col md={6}>
                      <ul className="small text-muted">
                        <li><strong>482 Visa:</strong> Temporary Skill Shortage</li>
                        <li><strong>400 Visa:</strong> Temporary Work (Short Stay)</li>
                        <li><strong>186 Visa:</strong> Employer Nomination Scheme</li>
                      </ul>
                    </Col>
                    <Col md={6}>
                      <ul className="small text-muted">
                        <li><strong>189 Visa:</strong> Skilled Independent</li>
                        <li><strong>190 Visa:</strong> Skilled Nominated</li>
                        <li><strong>491 Visa:</strong> Skilled Work Regional</li>
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

        {/* Confirmation Document View Modal */}
        <Modal show={showConfirmationModal} onHide={() => setShowConfirmationModal(false)} size="xl" centered>
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="fas fa-file-check me-2 text-success"></i>
              Confirmation Document - {selectedConfirmationDoc?.fileName}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedConfirmationDoc && (
              <div>
                <Row className="mb-3">
                  <Col>
                    <h6>Document Information</h6>
                    <p><strong>Name:</strong> {selectedConfirmationDoc.fileName}</p>
                    <p><strong>Type:</strong> {selectedConfirmationDoc.fileType}</p>
                    <p><strong>Size:</strong> {formatFileSize(selectedConfirmationDoc.fileSize)}</p>
                    {selectedConfirmationDoc.uploadedAt && (
                      <p><strong>Uploaded:</strong> {new Date(selectedConfirmationDoc.uploadedAt).toLocaleDateString()}</p>
                    )}
                  </Col>
                </Row>
                
                <Row>
                  <Col className="text-center">
                    {renderDocumentPreview(selectedConfirmationDoc)}
                  </Col>
                </Row>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowConfirmationModal(false)}>
              Close
            </Button>
            {selectedConfirmationDoc && (
              <Button
                variant="primary"
                onClick={() => downloadConfirmationDocument(selectedConfirmationDoc)}
              >
                <i className="fas fa-download me-1"></i>
                Download
              </Button>
            )}
          </Modal.Footer>
        </Modal>

        <style jsx>{`
          .work-permit-page {
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
          
          .border-dashed {
            border-style: dashed !important;
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
        <AustraliaWorkPermitFees/>
      </Container>
    </>
  );
}

export default AustraliaWorkPermit;