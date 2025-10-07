// src/pages/ManpowerService.js
import { useState, useEffect } from "react";
import { Form, Button, Card, Container, Row, Col, Alert, Spinner, ProgressBar, Modal, Badge } from "react-bootstrap";
import { getFirestore, collection, addDoc, serverTimestamp, doc, setDoc, getDocs, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebaseConfig";
import ManpowerServicePayment from "./manpowerpay";

const db = getFirestore(app);
const auth = getAuth(app);

function ManpowerService() {
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
    passportNumber: "",
    fullName: "",
    dateOfBirth: "",
    nationality: "",
    contactNumber: "",
    email: "",
    serviceType: "",
    destinationCountry: "",
    documentFile: null,
    documentBase64: null,
    documentPreview: null,
    additionalNotes: ""
  });

  const serviceTypes = [
    "Skilled Worker",
    "Semi-Skilled Worker",
    "Unskilled Worker",
    "Domestic Worker",
    "Construction Worker",
    "Factory Worker",
    "Hospitality Staff",
    "Healthcare Worker",
    "IT Professional",
    "Engineer",
    "Driver",
    "Security Guard",
    "Other"
  ];

  const destinationCountries = [
    "Saudi Arabia",
    "United Arab Emirates",
    "Qatar",
    "Kuwait",
    "Oman",
    "Bahrain",
    "Malaysia",
    "Singapore",
    "South Korea",
    "Japan",
    "Australia",
    "Canada",
    "United Kingdom",
    "United States",
    "Germany",
    "France",
    "Italy",
    "Spain",
    "Other"
  ];

  const nationalities = [
    "Bangladeshi",
    "Indian",
    "Pakistani",
    "Sri Lankan",
    "Nepalese",
    "Filipino",
    "Indonesian",
    "Vietnamese",
    "Other"
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
        collection(db, "manpowerSubmissions"),
        where("userId", "==", user.uid)
      );
      
      const querySnapshot = await getDocs(submissionsQuery);
      
      if (!querySnapshot.empty) {
        const latestSubmission = querySnapshot.docs[0].data();
        setHasExistingSubmission(true);
        setExistingSubmission(latestSubmission);
      }
    } catch (error) {
      console.error("Error checking existing manpower submission:", error);
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

  const validateForm = () => {
    // Basic validation for passport number format
    const passportRegex = /^[A-Z0-9]{6,9}$/;
    if (!passportRegex.test(formData.passportNumber)) {
      showMessage("❌ Please enter a valid passport number (6-9 alphanumeric characters)", "danger");
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      showMessage("❌ Please enter a valid email address", "danger");
      return false;
    }

    // Phone number validation (basic)
    const phoneRegex = /^[0-9+\-\s()]{10,}$/;
    if (formData.contactNumber && !phoneRegex.test(formData.contactNumber)) {
      showMessage("❌ Please enter a valid contact number", "danger");
      return false;
    }

    // Check if date of birth is valid
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      if (dob >= today) {
        showMessage("❌ Date of birth cannot be in the future", "danger");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!user) {
      showMessage("❌ Please log in to submit manpower service application", "danger");
      return;
    }

    // Prevent multiple submissions
    if (hasExistingSubmission) {
      showMessage("❌ You have already submitted your manpower service application. Only one submission is allowed per user.", "danger");
      return;
    }

    if (!formData.passportNumber || !formData.fullName || !formData.dateOfBirth || 
        !formData.nationality || !formData.serviceType || !formData.destinationCountry) {
      showMessage("❌ Please fill all required fields", "danger");
      return;
    }

    if (!formData.documentFile) {
      showMessage("❌ Please upload the required document", "danger");
      return;
    }

    // Validate form data
    if (!validateForm()) {
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

      // Save manpower service data to Firestore with base64 document
      const manpowerData = {
        userId: user.uid,
        userEmail: user.email,
        passportNumber: formData.passportNumber.toUpperCase(),
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        nationality: formData.nationality,
        contactNumber: formData.contactNumber,
        email: formData.email,
        serviceType: formData.serviceType,
        destinationCountry: formData.destinationCountry,
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
        submissionId: `MAN${Date.now().toString().slice(-8)}`,
        verified: false
      };

      await addDoc(collection(db, "manpowerSubmissions"), manpowerData);

      // Update user's profile with manpower submission status
      await setDoc(doc(db, "users", user.uid), {
        hasManpowerSubmission: true,
        manpowerPassportNumber: formData.passportNumber.toUpperCase(),
        manpowerStatus: "submitted",
        lastManpowerSubmission: serverTimestamp()
      }, { merge: true });

      clearInterval(progressInterval);
      setUploadProgress(100);

      showMessage("✅ Manpower service application submitted successfully! We'll process your application within 24-48 hours.");
      
      // Update state to prevent further submissions
      setHasExistingSubmission(true);
      setExistingSubmission(manpowerData);

      // Reset form
      setFormData({
        passportNumber: "",
        fullName: "",
        dateOfBirth: "",
        nationality: "",
        contactNumber: "",
        email: "",
        serviceType: "",
        destinationCountry: "",
        documentFile: null,
        documentBase64: null,
        documentPreview: null,
        additionalNotes: ""
      });

      setTimeout(() => setUploadProgress(0), 2000);

    } catch (error) {
      console.error("Manpower service submission error:", error);
      showMessage("❌ Failed to submit manpower service application. Please try again.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      submitted: { variant: "warning", text: "Under Review" },
      approved: { variant: "success", text: "Approved" },
      rejected: { variant: "danger", text: "Needs Revision" },
      processing: { variant: "info", text: "Processing" },
      shortlisted: { variant: "primary", text: "Shortlisted" }
    };
    
    const config = statusConfig[status] || { variant: "secondary", text: "Pending" };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  if (checkingSubmission) {
    return (
      <div className="manpower-service-page">
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col lg={8} className="text-center">
              <Spinner animation="border" variant="primary" className="mb-3" />
              <h4>Checking your manpower service application status...</h4>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <>
    <div className="manpower-service-page">
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col lg={10} xl={8}>
            {/* Header Section */}
            <div className="text-center mb-5">
              <div className="document-icon mb-3">
                <i className="fas fa-users fa-3x text-primary"></i>
              </div>
              <h1 className="fw-bold text-gradient">Manpower Service Application</h1>
              <p className="lead text-muted">
                Submit your application for overseas employment opportunities
              </p>
              
              {/* Existing Submission Alert */}
              {hasExistingSubmission && (
                <Alert variant="info" className="mt-3">
                  <div className="d-flex align-items-center">
                    <i className="fas fa-info-circle me-2"></i>
                    <div>
                      <strong>You have already submitted your manpower service application.</strong>
                      {existingSubmission && (
                        <div className="mt-2">
                          <small>
                            Application ID: {existingSubmission.submissionId} | 
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
                  {['Personal Info', 'Service Details', 'Upload Document', 'Complete'].map((step, index) => (
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
                    <span className="fw-semibold">Processing Application...</span>
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
                  <i className="fas fa-briefcase me-2"></i>
                  Manpower Service Application
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
                    <h4 className="text-success mb-3">Application Already Submitted</h4>
                    <p className="text-muted mb-4">
                      You have already submitted your manpower service application. Each user can only submit once.
                      If you need to update your information, please contact our recruitment team.
                    </p>
                    {existingSubmission && (
                      <Card className="bg-light">
                        <Card.Body>
                          <h6>Your Application Details:</h6>
                          <Row className="text-start">
                            <Col md={6}>
                              <strong>Passport Number:</strong> {existingSubmission.passportNumber}
                            </Col>
                            <Col md={6}>
                              <strong>Full Name:</strong> {existingSubmission.fullName}
                            </Col>
                            <Col md={6}>
                              <strong>Service Type:</strong> {existingSubmission.serviceType}
                            </Col>
                            <Col md={6}>
                              <strong>Destination:</strong> {existingSubmission.destinationCountry}
                            </Col>
                            <Col md={6}>
                              <strong>Status:</strong> {getStatusBadge(existingSubmission.status)}
                            </Col>
                            <Col md={6}>
                              <strong>Submitted:</strong> {existingSubmission.submittedAt?.toDate?.().toLocaleDateString()}
                            </Col>
                          </Row>
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
                    {/* Personal Information */}
                    <Row className="mb-4">
                      <Col lg={12}>
                        <h5 className="fw-bold text-primary mb-3">
                          <i className="fas fa-user me-2"></i>
                          Personal Information
                        </h5>
                      </Col>
                      
                      <Col md={6} lg={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
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
                            placeholder="A12345678"
                            className="py-2"
                            required
                            maxLength={9}
                          />
                          <Form.Text className="text-muted">
                            6-9 alphanumeric characters
                          </Form.Text>
                        </Form.Group>
                      </Col>

                      <Col md={6} lg={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            Full Name *
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            placeholder="Your full name"
                            className="py-2"
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6} lg={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            Date of Birth *
                          </Form.Label>
                          <Form.Control
                            type="date"
                            name="dateOfBirth"
                            value={formData.dateOfBirth}
                            onChange={handleInputChange}
                            className="py-2"
                            required
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6} lg={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            Nationality *
                          </Form.Label>
                          <Form.Select
                            name="nationality"
                            value={formData.nationality}
                            onChange={handleInputChange}
                            className="py-2"
                            required
                          >
                            <option value="">Select Nationality</option>
                            {nationalities.map(nationality => (
                              <option key={nationality} value={nationality}>{nationality}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>

                      <Col md={6} lg={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            Contact Number
                          </Form.Label>
                          <Form.Control
                            type="tel"
                            name="contactNumber"
                            value={formData.contactNumber}
                            onChange={handleInputChange}
                            placeholder="+880 XXXX-XXXXXX"
                            className="py-2"
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6} lg={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            Email Address
                          </Form.Label>
                          <Form.Control
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="your.email@example.com"
                            className="py-2"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    {/* Service Details */}
                    <Row className="mb-4">
                      <Col lg={12}>
                        <h5 className="fw-bold text-primary mb-3">
                          <i className="fas fa-briefcase me-2"></i>
                          Service Details
                        </h5>
                      </Col>

                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            Service Type *
                          </Form.Label>
                          <Form.Select
                            name="serviceType"
                            value={formData.serviceType}
                            onChange={handleInputChange}
                            className="py-2"
                            required
                          >
                            <option value="">Select Service Type</option>
                            {serviceTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            Destination Country *
                          </Form.Label>
                          <Form.Select
                            name="destinationCountry"
                            value={formData.destinationCountry}
                            onChange={handleInputChange}
                            className="py-2"
                            required
                          >
                            <option value="">Select Destination</option>
                            {destinationCountries.map(country => (
                              <option key={country} value={country}>{country}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>

                    {/* Document Upload */}
                    <Row className="mb-4">
                      <Col lg={12}>
                        <h5 className="fw-bold text-primary mb-3">
                          <i className="fas fa-file-upload me-2"></i>
                          Document Upload
                        </h5>
                      </Col>

                      <Col lg={12}>
                        <Card className="border-2 border-dashed">
                          <Card.Body className="text-center p-4">
                            <Form.Group>
                              <Form.Label className="fw-semibold">
                                Upload Your Passport or CV *
                              </Form.Label>
                              <Form.Control
                                type="file"
                                name="documentFile"
                                onChange={handleFileChange}
                                accept=".jpg,.jpeg,.png,.pdf"
                                className="mb-3"
                                required
                                disabled={loading}
                              />
                              <Form.Text className="text-muted d-block">
                                Upload your passport bio page or CV (PDF, JPG, PNG) - Max 2MB for base64 storage
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
                        placeholder="Any additional information about your skills, experience, or preferences..."
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
                            Processing Application...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-paper-plane me-2"></i>
                            Submit Application
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
                        One application allowed per user
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
                <h6 className="fw-semibold">Available Job Categories:</h6>
                <Row>
                  <Col md={6}>
                    <ul className="small text-muted">
                      <li><strong>Skilled Workers:</strong> Engineers, IT Professionals, Accountants</li>
                      <li><strong>Semi-Skilled:</strong> Technicians, Machine Operators</li>
                      <li><strong>Hospitality:</strong> Hotel Staff, Restaurant Workers</li>
                    </ul>
                  </Col>
                  <Col md={6}>
                    <ul className="small text-muted">
                      <li><strong>Construction:</strong> Laborers, Masons, Carpenters</li>
                      <li><strong>Domestic:</strong> Housekeepers, Caregivers</li>
                      <li><strong>Drivers:</strong> Truck, Bus, and Personal Drivers</li>
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
        .manpower-service-page {
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
          <ManpowerServicePayment/>
        </Container>


    </>
  );
}

export default ManpowerService;