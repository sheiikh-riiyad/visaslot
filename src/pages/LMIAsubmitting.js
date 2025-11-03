// src/pages/LMIASubmission.js
import { useState, useEffect } from "react";
import { Form, Button, Card, Container, Row, Col, Alert, Spinner, ProgressBar, Modal, Badge } from "react-bootstrap";
import { getFirestore, collection, addDoc, serverTimestamp, doc, setDoc, getDocs, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebaseConfig";
import LMIAVerifyFee from "./lmiapayment";

const db = getFirestore(app);
const auth = getAuth(app);

function LMIASubmission() {
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

  // Function to generate certificate number (format: LMIA + random 6 digits)
  const generateCertificateNumber = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
    return `LMIA${randomNum}`;
  };

  // Function to get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  // Function to get date 5 years from now
  const getFiveYearsFromNow = () => {
    const now = new Date();
    const fiveYearsLater = new Date(now.setFullYear(now.getFullYear() + 5));
    return fiveYearsLater.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    certificateNumber: generateCertificateNumber(),
    expiryDate: getFiveYearsFromNow(),
    issueDate: getCurrentDate(),
    employerName: "",
    employerAddress: "",
    jobTitle: "",
    nocCode: "",
    province: "",
    wage: "",
    documentFile: null,
    documentPreview: null,
    additionalNotes: ""
  });

  const nocCodes = [
    "0001 - Senior Management",
    "0011 - Administrative Services Managers",
    "0111 - Financial Managers",
    "0211 - Engineering Managers",
    "0311 - Health Care Managers",
    "1111 - Financial Auditors and Accountants",
    "1112 - Financial and Investment Analysts",
    "1114 - Other Financial Officers",
    "1121 - Human Resources Professionals",
    "1122 - Professional Occupations in Business Management",
    "1123 - Professional Occupations in Advertising, Marketing and Public Relations",
    "1211 - Supervisors, General Office and Administrative Support",
    "1212 - Supervisors, Finance and Insurance",
    "1221 - Administrative Officers",
    "1222 - Executive Assistants",
    "1223 - Human Resources and Recruitment Officers",
    "1224 - Property Administrators",
    "1225 - Purchasing Agents and Officers",
    "1241 - Administrative Assistants",
    "1242 - Legal Administrative Assistants",
    "1251 - Court Reporters and Medical Transcriptionists",
    "1252 - Health Information Management",
    "1253 - Records Management Technicians",
    "1311 - Accounting Technicians and Bookkeepers",
    "1312 - Insurance Adjusters and Claims Examiners",
    "1313 - Insurance Underwriters",
    "1314 - Assessors, Valuators and Appraisers",
    "1315 - Customs, Ship and Other Brokers",
    "2111 - Physicists and Astronomers",
    "Plumber",
    "Agriculture Worker",
    "2114 - Meteorologists and Climatologists",
    "Restaurant Worker",
    "Electrician",
    "Driver",
    "2123 - Agricultural Representatives, Consultants and Specialists",
    "Delivery Man",
    "Cleaner",
    "Shopping Mall Worker",
    "Construction Worker",
    "Fruit Packaging Worker",
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
        collection(db, "lmiaSubmissions"),
        where("userId", "==", user.uid)
      );
      
      const querySnapshot = await getDocs(submissionsQuery);
      
      if (!querySnapshot.empty) {
        const latestSubmission = querySnapshot.docs[0].data();
        setHasExistingSubmission(true);
        setExistingSubmission(latestSubmission);
      }
    } catch (error) {
      console.error("Error checking existing LMIA submission:", error);
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

  // File upload handler for LMIA documents
  const handleFileUpload = async (e, documentType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      showMessage("❌ Please upload only JPG, PNG, or PDF files", "danger");
      return;
    }

    // Validate file size (10MB max for server upload)
    if (file.size > 10 * 1024 * 1024) {
      showMessage("❌ File size must be less than 10MB", "danger");
      return;
    }

    try {
      setLoading(true);
      
      // Create FormData for file upload to server
      const formData = new FormData();
      formData.append('file', file);
      
      // Use localhost:4000 for development
      const uploadUrl = `http://localhost:4000/upload-manual?userId=${encodeURIComponent(auth.currentUser.uid)}&applicationId=${encodeURIComponent(formData.certificateNumber)}&fileType=lmia_document`;
      
      console.log(`Uploading LMIA document to:`, uploadUrl);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
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

      // Store file info in form data
      setFormData(prev => ({
        ...prev,
        documentFile: file,
        documentPreview: file.type.startsWith('image/') ? result.fileInfo.fullUrl : null,
        uploadedFileInfo: result.fileInfo
      }));

      showMessage("✅ LMIA document uploaded successfully!");
      
    } catch (error) {
      console.error(`Error uploading LMIA document:`, error);
      showMessage(`❌ Error uploading file: ${error.message}`, "danger");
    } finally {
      setLoading(false);
    }
  };

  // File delete handler
  const handleFileDelete = async () => {
    if (!formData.uploadedFileInfo) return;

    try {
      setLoading(true);
      
      // Call server API to delete file
      const response = await fetch('http://localhost:4000/delete-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: formData.uploadedFileInfo.filePath
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.warn('File not found on server, continuing with cleanup');
      }
      
      // Clear file from form data
      setFormData(prev => ({
        ...prev,
        documentFile: null,
        documentPreview: null,
        uploadedFileInfo: null
      }));
      
      showMessage("File removed successfully!");
    } catch (error) {
      console.error("Error removing file:", error);
      showMessage("Error removing file: " + error.message, "danger");
    } finally {
      setLoading(false);
    }
  };

  // File view/download functions
  const downloadFile = (fileData) => {
    if (fileData?.fullUrl) {
      const link = document.createElement('a');
      link.href = fileData.fullUrl;
      link.download = fileData.fileName || 'lmia-document';
      link.click();
    } else if (fileData?.fileUrl) {
      const link = document.createElement('a');
      link.href = `http://localhost:4000${fileData.fileUrl}`;
      link.download = fileData.fileName || 'lmia-document';
      link.click();
    } else {
      alert('❌ File URL not available');
    }
  };

  const viewFile = (fileData) => {
    if (fileData?.fullUrl) {
      window.open(fileData.fullUrl, '_blank');
    } else if (fileData?.fileUrl) {
      window.open(`http://localhost:4000${fileData.fileUrl}`, '_blank');
    } else {
      alert('❌ File URL not available');
    }
  };

  const previewDocument = () => {
    if (formData.documentPreview) {
      setPreviewImage(formData.documentPreview);
      setShowPreview(true);
    } else if (formData.uploadedFileInfo?.fullUrl) {
      setPreviewImage(formData.uploadedFileInfo.fullUrl);
      setShowPreview(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!user) {
      showMessage("❌ Please log in to submit LMIA documents", "danger");
      return;
    }

    // Prevent multiple submissions
    if (hasExistingSubmission) {
      showMessage("❌ You have already submitted your LMIA. Only one submission is allowed per user.", "danger");
      return;
    }

    // Check only required fields (document is now optional)
    if (!formData.employerName || !formData.jobTitle || !formData.nocCode) {
      showMessage("❌ Please fill all required fields", "danger");
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

      // Prepare document data only if file exists
      const documentData = formData.uploadedFileInfo ? {
        fileName: formData.uploadedFileInfo.fileName,
        fileType: formData.uploadedFileInfo.fileType,
        fileSize: formData.uploadedFileInfo.fileSize,
        fileUrl: formData.uploadedFileInfo.fileUrl,
        fullUrl: formData.uploadedFileInfo.fullUrl,
        filePath: formData.uploadedFileInfo.filePath,
        uploadedAt: new Date().toISOString()
      } : null;

      // Save LMIA data to Firestore
      const lmiaData = {
        userId: user.uid,
        userEmail: user.email,
        certificateNumber: formData.certificateNumber,
        expiryDate: formData.expiryDate,
        issueDate: formData.issueDate,
        employerName: formData.employerName,
        employerAddress: formData.employerAddress,
        jobTitle: formData.jobTitle,
        nocCode: formData.nocCode,
        province: formData.province,
        wage: formData.wage,
        additionalNotes: formData.additionalNotes,
        status: "submitted",
        submittedAt: serverTimestamp(),
        submissionId: `LMIA${Date.now().toString().slice(-8)}`,
        verified: false,
        // Include document only if it exists
        ...(documentData && { lmiaDocument: documentData })
      };

      await addDoc(collection(db, "lmiaSubmissions"), lmiaData);

      // Update user's profile with LMIA submission status
      await setDoc(doc(db, "users", user.uid), {
        hasLMIA: true,
        lmiaNumber: formData.certificateNumber,
        lmiaStatus: "submitted",
        lastLMIAUpdate: serverTimestamp()
      }, { merge: true });

      clearInterval(progressInterval);
      setUploadProgress(100);

      showMessage("✅ LMIA submitted successfully! We'll verify your documents within 24-48 hours.");
      
      // Update state to prevent further submissions
      setHasExistingSubmission(true);
      setExistingSubmission(lmiaData);

      // Reset form (but keep auto-generated fields)
      setFormData({
        certificateNumber: generateCertificateNumber(),
        expiryDate: getFiveYearsFromNow(),
        issueDate: getCurrentDate(),
        employerName: "",
        employerAddress: "",
        jobTitle: "",
        nocCode: "",
        province: "",
        wage: "",
        documentFile: null,
        documentPreview: null,
        uploadedFileInfo: null,
        additionalNotes: ""
      });

      setTimeout(() => setUploadProgress(0), 2000);

    } catch (error) {
      console.error("LMIA submission error:", error);
      showMessage("❌ Failed to submit LMIA. Please try again.", "danger");
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

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (checkingSubmission) {
    return (
      <div className="lmia-submission-page">
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col lg={8} className="text-center">
              <Spinner animation="border" variant="primary" className="mb-3" />
              <h4>Checking your LMIA submission status...</h4>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <>
      <div className="lmia-submission-page">
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col lg={10} xl={8}>
              {/* Header Section */}
              <div className="text-center mb-5">
                <div className="lmia-icon mb-3">
                  <i className="fas fa-file-contract fa-3x text-primary"></i>
                </div>
                <h1 className="fw-bold text-gradient">LMIA Submission</h1>
                <p className="lead text-muted">
                  Submit your Labour Market Impact Assessment (LMIA) details and documents
                </p>
                
                {/* Existing Submission Alert */}
                {hasExistingSubmission && (
                  <Alert variant="info" className="mt-3">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-info-circle me-2"></i>
                      <div>
                        <strong>You have already submitted your LMIA.</strong>
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
                      <span className="fw-semibold">Processing LMIA Document...</span>
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
                    <i className="fas fa-industry me-2"></i>
                    Labour Market Impact Assessment (LMIA)
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
                      <h4 className="text-success mb-3">LMIA Already Submitted</h4>
                      <p className="text-muted mb-4">
                        You have already submitted your LMIA documents. Each user can only submit once.
                        If you need to update your information, please contact support.
                      </p>
                      {existingSubmission && (
                        <Card className="bg-light">
                          <Card.Body>
                            <h6>Your LMIA Submission Details:</h6>
                            <Row className="text-start">
                              <Col md={6}>
                                <strong>Certificate Number:</strong> {existingSubmission.certificateNumber}
                              </Col>
                              <Col md={6}>
                                <strong>Employer:</strong> {existingSubmission.employerName}
                              </Col>
                              <Col md={6}>
                                <strong>Job Title:</strong> {existingSubmission.jobTitle}
                              </Col>
                              <Col md={6}>
                                <strong>NOC Code:</strong> {existingSubmission.nocCode}
                              </Col>
                              <Col md={6}>
                                <strong>Status:</strong> {getStatusBadge(existingSubmission.status)}
                              </Col>
                              <Col md={6}>
                                <strong>Submitted:</strong> {existingSubmission.submittedAt?.toDate?.().toLocaleDateString()}
                              </Col>
                            </Row>
                            {existingSubmission.lmiaDocument && (
                              <div className="mt-3 text-center">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  className="me-2"
                                  onClick={() => viewFile(existingSubmission.lmiaDocument)}
                                >
                                  <i className="fas fa-eye me-1"></i>
                                  View Document
                                </Button>
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => downloadFile(existingSubmission.lmiaDocument)}
                                >
                                  <i className="fas fa-download me-1"></i>
                                  Download LMIA Document
                                </Button>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <Form onSubmit={handleSubmit}>
                      {/* Auto-generated LMIA Certificate Details */}
                      <Row className="mb-4">
                        <Col lg={12}>
                          <h5 className="fw-bold text-primary mb-3">
                            <i className="fas fa-certificate me-2"></i>
                            LMIA Certificate Details
                          </h5>
                        </Col>
                        
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              Certificate Number
                            </Form.Label>
                            <Form.Control
                              type="text"
                              value={formData.certificateNumber}
                              className="py-2 bg-light"
                              readOnly
                            />
                            <Form.Text className="text-muted">
                              Auto-generated certificate number
                            </Form.Text>
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              Issue Date
                            </Form.Label>
                            <Form.Control
                              type="text"
                              value={formData.issueDate}
                              className="py-2 bg-light"
                              readOnly
                            />
                            <Form.Text className="text-muted">
                              Date of issue
                            </Form.Text>
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              Expiry Date
                            </Form.Label>
                            <Form.Control
                              type="text"
                              value={formData.expiryDate}
                              className="py-2 bg-light"
                              readOnly
                            />
                            <Form.Text className="text-muted">
                              Valid for 5 years
                            </Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>

                      {/* Employer Information */}
                      <Row className="mb-4">
                        <Col lg={12}>
                          <h5 className="fw-bold text-primary mb-3">
                            <i className="fas fa-building me-2"></i>
                            Employer Information
                          </h5>
                        </Col>

                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              Employer Name *
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="employerName"
                              value={formData.employerName}
                              onChange={handleInputChange}
                              placeholder="Company Name"
                              className="py-2"
                              required
                            />
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              Province/Territory
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="province"
                              value={formData.province}
                              onChange={handleInputChange}
                              placeholder="e.g., Ontario, British Columbia"
                              className="py-2"
                            />
                          </Form.Group>
                        </Col>

                        <Col lg={12}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              Employer Address
                            </Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={2}
                              name="employerAddress"
                              value={formData.employerAddress}
                              onChange={handleInputChange}
                              placeholder="Full company address"
                              className="py-2"
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      {/* Job Details */}
                      <Row className="mb-4">
                        <Col lg={12}>
                          <h5 className="fw-bold text-primary mb-3">
                            <i className="fas fa-briefcase me-2"></i>
                            Job Details
                          </h5>
                        </Col>

                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              Job Title *
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="jobTitle"
                              value={formData.jobTitle}
                              onChange={handleInputChange}
                              placeholder="e.g., Software Developer"
                              className="py-2"
                              required
                            />
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              NOC Code *
                            </Form.Label>
                            <Form.Select
                              name="nocCode"
                              value={formData.nocCode}
                              onChange={handleInputChange}
                              className="py-2"
                              required
                            >
                              <option value="">Select NOC Code</option>
                              {nocCodes.map(code => (
                                <option key={code} value={code}>{code}</option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              Hourly Wage ($ CAD)
                            </Form.Label>
                            <Form.Control
                              type="number"
                              name="wage"
                              value={formData.wage}
                              onChange={handleInputChange}
                              placeholder="e.g., 25.50"
                              step="0.01"
                              min="0"
                              className="py-2"
                            />
                            <Form.Text className="text-muted">
                              Current wage offered in Canadian dollars
                            </Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>

                      {/* Document Upload Section */}
                      <Row className="mb-4">
                        <Col lg={12}>
                          <h5 className="fw-bold text-primary mb-3">
                            <i className="fas fa-file-upload me-2"></i>
                            LMIA Document Upload (Optional)
                          </h5>
                        </Col>

                        <Col lg={12}>
                          <Card className="border-2 border-dashed">
                            <Card.Body className="text-center p-4">
                              <Form.Group>
                                <Form.Label className="fw-semibold">
                                  Upload LMIA Certificate (Optional)
                                </Form.Label>
                                <Form.Control
                                  type="file"
                                  name="documentFile"
                                  onChange={(e) => handleFileUpload(e, 'lmiaDocument')}
                                  accept=".jpg,.jpeg,.png,.pdf"
                                  className="mb-3"
                                  disabled={loading}
                                />
                                <Form.Text className="text-muted d-block">
                                  Upload your official LMIA certificate (PDF, JPG, PNG) - Max 10MB
                                </Form.Text>
                                <Form.Text className="text-info d-block">
                                  <i className="fas fa-info-circle me-1"></i>
                                  This field is optional. You can submit without uploading a document.
                                </Form.Text>
                              </Form.Group>
                              
                              {formData.uploadedFileInfo && (
                                <div className="mt-3">
                                  <Alert variant="success" className="py-2 small">
                                    <div className="d-flex justify-content-between align-items-center">
                                      <div>
                                        <i className="fas fa-check me-2"></i>
                                        {formData.uploadedFileInfo.fileName}
                                        <small className="text-muted ms-2">
                                          ({formatFileSize(formData.uploadedFileInfo.fileSize)})
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
                                          className="me-2"
                                          onClick={() => downloadFile(formData.uploadedFileInfo)}
                                        >
                                          <i className="fas fa-download me-1"></i>
                                          Download
                                        </Button>
                                        <Button
                                          variant="outline-danger"
                                          size="sm"
                                          onClick={handleFileDelete}
                                          disabled={loading}
                                        >
                                          <i className="fas fa-trash me-1"></i>
                                          Remove
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
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold">
                          <i className="fas fa-sticky-note me-2 text-primary"></i>
                          Additional Notes
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="additionalNotes"
                          value={formData.additionalNotes}
                          onChange={handleInputChange}
                          placeholder="Any additional information about your LMIA or employment..."
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
                              Processing LMIA...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-paper-plane me-2"></i>
                              Submit LMIA Details
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
                    About LMIA (Labour Market Impact Assessment)
                  </h5>
                  <Row>
                    <Col md={6}>
                      <h6>What is LMIA?</h6>
                      <p className="small text-muted">
                        A Labour Market Impact Assessment (LMIA) is a document that an employer in Canada may need to get before hiring a foreign worker.
                      </p>
                      <ul className="small text-muted">
                        <li>Positive LMIA shows no Canadian available for the job</li>
                        <li>Required for most employer-specific work permits</li>
                        <li>Valid for specific period (usually 1-2 years)</li>
                      </ul>
                    </Col>
                    <Col md={6}>
                      <h6>Submission Rules</h6>
                      <ul className="small text-muted">
                        <li>One submission allowed per user</li>
                        <li>Certificate number, issue date, and expiry date are auto-generated</li>
                        <li>Document upload is optional</li>
                        <li>Processing time: 24-48 hours</li>
                        <li>You'll receive email notifications</li>
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
            <Modal.Title>LMIA Document Preview</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center">
            <img
              src={previewImage}
              alt="LMIA document preview"
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
          .lmia-submission-page {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
          }
          
          .text-gradient {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          
          .lmia-icon {
            animation: float 3s ease-in-out infinite;
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
            border-radius: 8px;
            border: 2px solid #e9ecef;
            transition: all 0.3s ease;
          }
          
          .form-control:focus, .form-select:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
          }

          .bg-light {
            background-color: #f8f9fa !important;
          }
        `}</style>
      </div>

      <Container>
        <LMIAVerifyFee/>
      </Container>
    </>
  );
}

export default LMIASubmission;