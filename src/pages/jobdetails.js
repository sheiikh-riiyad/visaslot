import { useState, useEffect } from "react";
import { Form, Button, Card, Container, Row, Col, Alert, InputGroup, Badge, Modal } from "react-bootstrap";
import { db, auth } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp, query, getDocs, orderBy, limit } from "firebase/firestore";
import Payment from "./Payments";
import SupportGlowButton from "../components/buttons";

function Jobdetails() {
  const [formData, setFormData] = useState({
    name: "",
    passportNo: "",
    jobCategory: "",
    employmentType: "Full-time",
    experience: "",
    company: "",
    location: ""
  });

  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasExistingApplication, setHasExistingApplication] = useState(false);
  const [existingApplication, setExistingApplication] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);

  console.log(isSubmitted)

  // Job categories options
  const jobCategories = [
    "Information Technology",
    "Healthcare & Medical",
    "Engineering & Construction",
    "Education & Training",
    "Finance & Accounting",
    "Sales & Marketing",
    "Management & Business",
    "Hospitality & Tourism",
    "Manufacturing & Production",
    "Retail & Customer Service",
    "Creative & Design",
    "Legal & Compliance",
    "Science & Research",
    "Logistics & Supply Chain",
    "Other"
  ];

  const employmentTypes = [
    "Full-time",
    "Part-time",
    "Contract",
    "Freelance",
    "Internship",
    "Temporary"
  ];

  const experienceLevels = [
    "Entry Level (0-2 years)",
    "Mid Level (2-5 years)",
    "Senior Level (5-8 years)",
    "Executive Level (8+ years)"
  ];

  // Check if user has existing application
  useEffect(() => {
    checkExistingApplication();
  }, []);

  const checkExistingApplication = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("No user logged in");
        setIsChecking(false);
        return;
      }

      console.log("Checking applications for user:", user.uid);
      
      const applicationsRef = collection(db, "jobdetails", user.uid, "applications");
      const q = query(applicationsRef, orderBy("submittedAt", "desc"), limit(1));
      const querySnapshot = await getDocs(q);

      console.log("Query snapshot:", querySnapshot.empty ? "empty" : "has data");

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const applicationData = {
          id: doc.id,
          ...doc.data()
        };
        
        console.log("Found existing application:", applicationData);
        setExistingApplication(applicationData);
        setHasExistingApplication(true);
        setIsSubmitted(true);
      } else {
        console.log("No existing application found");
        setHasExistingApplication(false);
        setIsSubmitted(false);
      }
    } catch (error) {
      console.error("Error checking existing application:", error);
      setHasExistingApplication(false);
      setIsSubmitted(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters long";
    }

    if (!formData.passportNo.trim()) {
      newErrors.passportNo = "Passport number is required";
    } else if (!/^[A-Z0-9]{6,12}$/i.test(formData.passportNo.trim())) {
      newErrors.passportNo = "Please enter a valid passport number";
    }

    if (!formData.jobCategory) {
      newErrors.jobCategory = "Please select a job category";
    }

    if (!formData.employmentType) {
      newErrors.employmentType = "Please select employment type";
    }

    if (!formData.experience) {
      newErrors.experience = "Please select experience level";
    }

    if (!formData.company.trim()) {
      newErrors.company = "Company name is required";
    }

    if (!formData.location.trim()) {
      newErrors.location = "Job location is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsLoading(true);
      
      try {
        // Get current user
        const user = auth.currentUser;
        if (!user) {
          throw new Error("You must be logged in to submit the form");
        }

        // Double check if user already has an application
        await checkExistingApplication();
        if (hasExistingApplication) {
          throw new Error("You have already submitted an application. Only one application per user is allowed.");
        }

        const jobData = {
          // Form data
          name: formData.name.trim(),
          passportNo: formData.passportNo.trim().toUpperCase(),
          jobCategory: formData.jobCategory,
          employmentType: formData.employmentType,
          experience: formData.experience,
          company: formData.company.trim(),
          location: formData.location.trim(),
          
          // Metadata
          userId: user.uid,
          userEmail: user.email,
          status: "pending",
          submittedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // Upload to Firestore
        const docRef = await addDoc(collection(db, "jobdetails", user.uid, "applications"), jobData);
        
        console.log("Document written with ID: ", docRef.id);
        
        // Update state to show success view
        setExistingApplication({
          id: docRef.id,
          ...jobData
        });
        setHasExistingApplication(true);
        setIsSubmitted(true);
        
      } catch (error) {
        console.error("Error submitting form:", error);
        setErrors(prev => ({
          ...prev,
          submit: error.message || "Failed to submit form. Please try again."
        }));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      return new Date(timestamp.toDate()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
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

  const downloadConfirmationFile = () => {
    if (existingApplication?.confirmationLetter) {
      const link = document.createElement('a');
      link.href = existingApplication.confirmationLetter;
      link.download = existingApplication.confirmationLetterName || 'confirmation-letter';
      link.click();
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

  const handleViewConfirmation = () => {
    setFileLoading(true);
    setShowConfirmationModal(true);
    // Simulate loading for better UX
    setTimeout(() => setFileLoading(false), 500);
  };

  if (isChecking) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col xl={10}>
            <Card className="shadow-lg border-0">
              <Card.Body className="text-center py-5">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h5>Checking your application status...</h5>
                <p className="text-muted">Please wait while we load your data</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <>
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col xl={10}>
            {/* Header Section */}
            <div className="text-center mb-5">
              <div className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                   style={{ width: '80px', height: '80px' }}>
                <i className="fas fa-briefcase text-white fa-2x"></i>
              </div>
              <h1 className="h2 fw-bold text-dark mb-2">Employment Details</h1>
              <p className="text-muted">
                {hasExistingApplication 
                  ? "Your employment application details" 
                  : "Please provide your current or prospective employment information"
                }
              </p>
            </div>

            {/* Show existing application if user has already submitted */}
            {hasExistingApplication && existingApplication ? (
              <>
                <Card className="shadow-lg border-0">
                  <Card.Header className="bg-success text-white py-4 border-0">
                    <div className="d-flex align-items-center">
                      <div className="bg-white bg-opacity-20 rounded-circle p-2 me-3">
                        <i className="fas fa-check-circle fa-lg"></i>
                      </div>
                      <div>
                        <h3 className="h4 mb-1">Application Submitted</h3>
                        <p className="mb-0 opacity-75">Your employment details have been recorded</p>
                      </div>
                    </div>
                  </Card.Header>
                  
                  <Card.Body className="p-4 p-md-5">
                    <Alert variant="info" className="mb-4">
                      <i className="fas fa-info-circle me-2"></i>
                      You have already submitted an employment application. Only one application per user is allowed.
                    </Alert>

                    <div className="bg-light p-4 rounded">
                      <h5 className="mb-4 border-bottom pb-3">Your Application Details</h5>
                      
                      <Row>
                        <Col md={6}>
                          <h6 className="text-primary mb-3">
                            <i className="fas fa-user me-2"></i>
                            Personal Information
                          </h6>
                          <div className="d-flex mb-2">
                            <span className="text-muted me-3" style={{ width: '140px' }}>Full Name:</span>
                            <strong>{existingApplication.name}</strong>
                          </div>
                          <div className="d-flex mb-2">
                            <span className="text-muted me-3" style={{ width: '140px' }}>Passport Number:</span>
                            <strong className="text-uppercase">{existingApplication.passportNo}</strong>
                          </div>
                        </Col>

                        <Col md={6}>
                          <h6 className="text-primary mb-3">
                            <i className="fas fa-building me-2"></i>
                            Employment Details
                          </h6>
                          <div className="d-flex mb-2">
                            <span className="text-muted me-3" style={{ width: '140px' }}>Company:</span>
                            <strong>{existingApplication.company}</strong>
                          </div>
                          <div className="d-flex mb-2">
                            <span className="text-muted me-3" style={{ width: '140px' }}>Location:</span>
                            <strong>{existingApplication.location}</strong>
                          </div>
                        </Col>
                      </Row>

                      <Row className="mt-3">
                        <Col md={6}>
                          <h6 className="text-primary mb-3">
                            <i className="fas fa-chart-line me-2"></i>
                            Professional Details
                          </h6>
                          <div className="d-flex mb-2">
                            <span className="text-muted me-3" style={{ width: '140px' }}>Job Category:</span>
                            <strong>{existingApplication.jobCategory}</strong>
                          </div>
                          <div className="d-flex mb-2">
                            <span className="text-muted me-3" style={{ width: '140px' }}>Employment Type:</span>
                            <strong>{existingApplication.employmentType}</strong>
                          </div>
                          <div className="d-flex mb-2">
                            <span className="text-muted me-3" style={{ width: '140px' }}>Experience Level:</span>
                            <strong>{existingApplication.experience}</strong>
                          </div>
                        </Col>

                        <Col md={6}>
                          <h6 className="text-primary mb-3">
                            <i className="fas fa-info-circle me-2"></i>
                            Application Information
                          </h6>
                          <div className="d-flex mb-2">
                            <span className="text-muted me-3" style={{ width: '140px' }}>Application Status:</span>
                            <Badge bg={getStatusVariant(existingApplication.status)} className="fs-6">
                              {existingApplication.status || "pending"}
                            </Badge>
                          </div>
                          <div className="d-flex mb-2">
                            <span className="text-muted me-3" style={{ width: '140px' }}>Submitted On:</span>
                            <strong>{formatDate(existingApplication.submittedAt)}</strong>
                          </div>

                          {/* Show Confirmation Button if status is approved and confirmation exists */}
                          {existingApplication.status === "approved" && existingApplication.confirmationLetter && (
                            <div className="d-flex mb-2 align-items-center">
                              <span className="text-muted me-3" style={{ width: '140px' }}>Confirmation:</span>
                              <div>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={handleViewConfirmation}
                                  className="me-2"
                                >
                                  <i className="fas fa-file-alt me-1"></i>
                                  View Confirmation
                                </Button>
                                <small className="text-muted d-block mt-1">
                                  File: {existingApplication.confirmationLetterName}
                                  {existingApplication.confirmationLetterSize && (
                                    <> ({formatFileSize(existingApplication.confirmationLetterSize)})</>
                                  )}
                                </small>
                              </div>
                            </div>
                          )}
                        </Col>
                      </Row>
                    </div>

                    {/* Show payment section only if status is not approved */}
                    {existingApplication.status !== "approved" && <Payment />}
                  </Card.Body>
                </Card>

                {/* Confirmation File Modal */}
                <Modal show={showConfirmationModal} onHide={() => setShowConfirmationModal(false)} size="xl" centered>
                  <Modal.Header closeButton className="bg-success text-white">
                    <Modal.Title>
                      <i className="fas fa-file-contract me-2"></i>
                      Confirmation Letter - {existingApplication.name}
                    </Modal.Title>
                  </Modal.Header>
                  <Modal.Body className="p-4">
                    {fileLoading ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-success mb-3" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p>Loading confirmation letter...</p>
                      </div>
                    ) : (
                      <>
                        <div className="text-center mb-4">
                          <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                               style={{ width: '80px', height: '80px' }}>
                            <i className="fas fa-file-contract fa-2x text-success"></i>
                          </div>
                          <h4 className="text-success">Application Approved!</h4>
                          <p className="text-muted">
                            Your job application has been approved. Below is your confirmation letter.
                          </p>
                        </div>

                        <Row className="mb-4">
                          <Col md={6}>
                            <h6 className="text-primary border-bottom pb-2">File Information</h6>
                            <div className="mb-3">
                              <strong>File Name:</strong> 
                              <div className="text-muted">{existingApplication.confirmationLetterName}</div>
                            </div>
                            <div className="mb-3">
                              <strong>File Type:</strong> 
                              <div className="text-muted">{existingApplication.confirmationLetterType || 'Unknown'}</div>
                            </div>
                            <div className="mb-3">
                              <strong>File Size:</strong> 
                              <div className="text-muted">
                                {existingApplication.confirmationLetterSize 
                                  ? formatFileSize(existingApplication.confirmationLetterSize) 
                                  : 'Unknown'
                                }
                              </div>
                            </div>
                            {existingApplication.confirmationLetterUploadedAt && (
                              <div className="mb-3">
                                <strong>Uploaded:</strong> 
                                <div className="text-muted">{formatDate(existingApplication.confirmationLetterUploadedAt)}</div>
                              </div>
                            )}
                          </Col>
                          
                          <Col md={6}>
                            <h6 className="text-primary border-bottom pb-2">Document Preview</h6>
                            {existingApplication.confirmationLetterType?.includes('image') ? (
                              <div className="text-center border rounded p-3">
                                <img 
                                  src={existingApplication.confirmationLetter} 
                                  alt="Confirmation Letter" 
                                  className="img-fluid rounded"
                                  style={{ maxHeight: '400px', maxWidth: '100%' }}
                                  onError={(e) => {
                                    console.error("Error loading image");
                                    e.target.style.display = 'none';
                                    const errorDiv = e.target.parentNode.querySelector('.image-error');
                                    if (errorDiv) errorDiv.style.display = 'block';
                                  }}
                                />
                                <div className="image-error alert alert-warning mt-2" style={{display: 'none'}}>
                                  <i className="fas fa-exclamation-triangle me-2"></i>
                                  Unable to load image preview. Please download the file to view it.
                                </div>
                                <p className="text-muted small mt-2">Image Preview</p>
                              </div>
                            ) : existingApplication.confirmationLetterType === 'application/pdf' ? (
                              <div className="text-center border rounded p-4 bg-light">
                                <i className="fas fa-file-pdf fa-4x text-danger mb-3"></i>
                                <p className="mb-2 fw-bold">PDF Document</p>
                                <p className="text-muted small">
                                  This is a PDF document. Click the download button below to view the confirmation letter.
                                </p>
                              </div>
                            ) : (
                              <div className="text-center border rounded p-4 bg-light">
                                <i className="fas fa-file fa-4x text-primary mb-3"></i>
                                <p className="mb-2 fw-bold">Document File</p>
                                <p className="text-muted small">
                                  This file type cannot be previewed. Please download the file to view it.
                                </p>
                              </div>
                            )}
                          </Col>
                        </Row>

                        <div className="d-flex justify-content-center gap-3 pt-3 border-top">
                          <Button
                            variant="success"
                            onClick={downloadConfirmationFile}
                            className="px-4 py-2"
                          >
                            <i className="fas fa-download me-2"></i>
                            Download Confirmation
                          </Button>
                          <Button
                            variant="outline-secondary"
                            onClick={() => setShowConfirmationModal(false)}
                            className="px-4 py-2"
                          >
                            <i className="fas fa-times me-2"></i>
                            Close
                          </Button>
                        </div>

                        <div className="text-center mt-3">
                          <small className="text-muted">
                            <i className="fas fa-info-circle me-1"></i>
                            File stored securely on our servers. Download to save a copy.
                          </small>
                        </div>
                      </>
                    )}
                  </Modal.Body>
                </Modal>
              </>
            ) : (
              /* Show form only if user hasn't submitted */
              <Card className="shadow-lg border-0">
                <Card.Header className="bg-dark text-white py-4 border-0">
                  <div className="d-flex align-items-center">
                    <div className="bg-white bg-opacity-20 rounded-circle p-2 me-3">
                      <i className="fas fa-user-tie fa-lg"></i>
                    </div>
                    <div>
                      <h3 className="h4 mb-1">Professional Information</h3>
                      <p className="mb-0 opacity-75">Complete all fields to proceed with your application</p>
                    </div>
                  </div>
                </Card.Header>
                
                <Card.Body className="p-4 p-md-5">
                  {errors.submit && (
                    <Alert variant="danger" className="mb-4">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      {errors.submit}
                    </Alert>
                  )}

                  <Form onSubmit={handleSubmit}>
                    <Row>
                      {/* Personal Information Column */}
                      <Col lg={6}>
                        <div className="mb-4">
                          <h5 className="text-primary mb-3 border-bottom pb-2">
                            <i className="fas fa-user me-2"></i>
                            Personal Information
                          </h5>
                          
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              Full Name <span className="text-danger">*</span>
                            </Form.Label>
                            <InputGroup>
                              <InputGroup.Text className="bg-light border-end-0">
                                <i className="fas fa-user text-muted"></i>
                              </InputGroup.Text>
                              <Form.Control
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                isInvalid={!!errors.name}
                                className="border-start-0 py-2"
                                required
                              />
                            </InputGroup>
                            <Form.Control.Feedback type="invalid">
                              {errors.name}
                            </Form.Control.Feedback>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              Passport Number <span className="text-danger">*</span>
                            </Form.Label>
                            <InputGroup>
                              <InputGroup.Text className="bg-light border-end-0">
                                <i className="fas fa-passport text-muted"></i>
                              </InputGroup.Text>
                              <Form.Control
                                type="text"
                                name="passportNo"
                                value={formData.passportNo}
                                onChange={handleChange}
                                placeholder="Enter passport number"
                                isInvalid={!!errors.passportNo}
                                className="border-start-0 py-2"
                                style={{ textTransform: 'uppercase' }}
                                required
                              />
                            </InputGroup>
                            <Form.Text className="text-muted small">
                              As it appears on your passport document
                            </Form.Text>
                            <Form.Control.Feedback type="invalid">
                              {errors.passportNo}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </div>
                      </Col>

                      {/* Job Information Column */}
                      <Col lg={6}>
                        <div className="mb-4">
                          <h5 className="text-primary mb-3 border-bottom pb-2">
                            <i className="fas fa-building me-2"></i>
                            Employment Details
                          </h5>

                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              Company Name <span className="text-danger">*</span>
                            </Form.Label>
                            <InputGroup>
                              <InputGroup.Text className="bg-light border-end-0">
                                <i className="fas fa-building text-muted"></i>
                              </InputGroup.Text>
                              <Form.Control
                                type="text"
                                name="company"
                                value={formData.company}
                                onChange={handleChange}
                                placeholder="Enter company name"
                                isInvalid={!!errors.company}
                                className="border-start-0 py-2"
                                required
                              />
                            </InputGroup>
                            <Form.Control.Feedback type="invalid">
                              {errors.company}
                            </Form.Control.Feedback>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              Job Location <span className="text-danger">*</span>
                            </Form.Label>
                            <InputGroup>
                              <InputGroup.Text className="bg-light border-end-0">
                                <i className="fas fa-map-marker-alt text-muted"></i>
                              </InputGroup.Text>
                              <Form.Control
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="Enter job location"
                                isInvalid={!!errors.location}
                                className="border-start-0 py-2"
                                required
                              />
                            </InputGroup>
                            <Form.Control.Feedback type="invalid">
                              {errors.location}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </div>
                      </Col>
                    </Row>

                    {/* Professional Details Row */}
                    <Row>
                      <Col lg={12}>
                        <div className="mb-4">
                          <h5 className="text-primary mb-3 border-bottom pb-2">
                            <i className="fas fa-chart-line me-2"></i>
                            Professional Specifications
                          </h5>
                          
                          <Row>
                            <Col md={6} lg={4}>
                              <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">
                                  Job Category <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Select
                                  name="jobCategory"
                                  value={formData.jobCategory}
                                  onChange={handleChange}
                                  isInvalid={!!errors.jobCategory}
                                  className="py-2"
                                  required
                                >
                                  <option value="">Select category</option>
                                  {jobCategories.map((category, index) => (
                                    <option key={index} value={category}>
                                      {category}
                                    </option>
                                  ))}
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">
                                  {errors.jobCategory}
                                </Form.Control.Feedback>
                              </Form.Group>
                            </Col>

                            <Col md={6} lg={4}>
                              <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">
                                  Employment Type <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Select
                                  name="employmentType"
                                  value={formData.employmentType}
                                  onChange={handleChange}
                                  isInvalid={!!errors.employmentType}
                                  className="py-2"
                                  required
                                >
                                  <option value="">Select type</option>
                                  {employmentTypes.map((type, index) => (
                                    <option key={index} value={type}>
                                      {type}
                                    </option>
                                  ))}
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">
                                  {errors.employmentType}
                                </Form.Control.Feedback>
                              </Form.Group>
                            </Col>

                            <Col md={6} lg={4}>
                              <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">
                                  Experience Level <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Select
                                  name="experience"
                                  value={formData.experience}
                                  onChange={handleChange}
                                  isInvalid={!!errors.experience}
                                  className="py-2"
                                  required
                                >
                                  <option value="">Select level</option>
                                  {experienceLevels.map((level, index) => (
                                    <option key={index} value={level}>
                                      {level}
                                    </option>
                                  ))}
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">
                                  {errors.experience}
                                </Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                          </Row>
                        </div>
                      </Col>
                    </Row>

                    {/* Action Buttons */}
                    <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => {
                          setFormData({
                            name: "",
                            passportNo: "",
                            jobCategory: "",
                            employmentType: "Full-time",
                            experience: "",
                            company: "",
                            location: ""
                          });
                          setErrors({});
                        }}
                        className="px-4"
                        disabled={isLoading}
                      >
                        <i className="fas fa-eraser me-2"></i>
                        Clear Form
                      </Button>
                      
                      <Button 
                        variant="primary" 
                        type="submit"
                        className="px-5 py-2"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-paper-plane me-2"></i>
                            Submit Employment Details
                          </>
                        )}
                      </Button>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </Container>
      
      <Container>
        <SupportGlowButton/>
      </Container>
    </>
  );
}

export default Jobdetails;