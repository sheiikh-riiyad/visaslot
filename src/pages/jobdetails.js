import { useState, useEffect } from "react";
import { Form, Button, Card, Container, Row, Col, Alert, InputGroup, Badge } from "react-bootstrap";
import { db, auth } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp, query,  getDocs, orderBy, limit } from "firebase/firestore";
import Payment from "./Payments";
import SupportGlowButton from "../components/buttons";


function Jobdetails() {
  const [formData, setFormData] = useState({
    name: "",
    passportNo: "",
    jobCategory: "",
    salary: "",
    currency: "USD",
    employmentType: "Full-time",
    experience: "",
    company: "",
    location: "",
    confirmationLetter: null
  });

  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasExistingApplication, setHasExistingApplication] = useState(false);
  const [existingApplication, setExistingApplication] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

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

  // Currency options
  const currencies = [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$" },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
    { code: "INR", name: "Indian Rupee", symbol: "₹" },
    { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
    { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
    { code: "SAR", name: "Saudi Riyal", symbol: "﷼" }
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          confirmationLetter: "Please upload only PDF or image files (JPG, PNG, GIF)"
        }));
        return;
      }

      if (file.size > maxSize) {
        setErrors(prev => ({
          ...prev,
          confirmationLetter: "File size must be less than 5MB"
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        confirmationLetter: file
      }));

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreview(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }

      // Clear any previous errors
      if (errors.confirmationLetter) {
        setErrors(prev => ({
          ...prev,
          confirmationLetter: ""
        }));
      }
    }
  };

  const removeFile = () => {
    setFormData(prev => ({
      ...prev,
      confirmationLetter: null
    }));
    setFilePreview(null);
    setErrors(prev => ({
      ...prev,
      confirmationLetter: ""
    }));
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

    if (!formData.salary.trim()) {
      newErrors.salary = "Salary is required";
    } else if (!/^\d+(\.\d{1,2})?$/.test(formData.salary.trim())) {
      newErrors.salary = "Please enter a valid salary amount";
    } else if (parseFloat(formData.salary) <= 0) {
      newErrors.salary = "Salary must be greater than 0";
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

    if (!formData.confirmationLetter) {
      newErrors.confirmationLetter = "Job confirmation letter is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Function to convert file to base64 for Firestore storage
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsLoading(true);
      setUploadProgress(0);
      
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

        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);

        // Prepare data for Firestore
        let confirmationLetterData = null;
        
        if (formData.confirmationLetter) {
          // Convert file to base64 for storage
          confirmationLetterData = await fileToBase64(formData.confirmationLetter);
        }

        const jobData = {
          // Form data
          name: formData.name.trim(),
          passportNo: formData.passportNo.trim().toUpperCase(),
          jobCategory: formData.jobCategory,
          salary: parseFloat(formData.salary),
          currency: formData.currency,
          employmentType: formData.employmentType,
          experience: formData.experience,
          company: formData.company.trim(),
          location: formData.location.trim(),
          
          // File data
          confirmationLetter: confirmationLetterData,
          fileName: formData.confirmationLetter?.name || null,
          fileType: formData.confirmationLetter?.type || null,
          fileSize: formData.confirmationLetter?.size || null,
          
          // Metadata
          userId: user.uid,
          userEmail: user.email,
          status: "pending",
          submittedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // Upload to Firestore
        const docRef = await addDoc(collection(db, "jobdetails", user.uid, "applications"), jobData);
        
        clearInterval(progressInterval);
        setUploadProgress(100);

        // Simulate final processing
        await new Promise(resolve => setTimeout(resolve, 500));
        
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
        setUploadProgress(0);
      }
    }
  };

  const getCurrencySymbol = (currencyCode) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency ? currency.symbol : '$';
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return "fa-file";
    if (fileType.startsWith('image/')) return "fa-file-image";
    if (fileType === 'application/pdf') return "fa-file-pdf";
    return "fa-file";
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
                        <i className="fas fa-money-bill me-2"></i>
                        Salary Information
                      </h6>
                      <div className="d-flex mb-2">
                        <span className="text-muted me-3" style={{ width: '140px' }}>Monthly Salary:</span>
                        <strong className="text-success">
                          {getCurrencySymbol(existingApplication.currency)}
                          {existingApplication.salary} {existingApplication.currency}
                        </strong>
                      </div>
                      <div className="d-flex mb-2">
                        <span className="text-muted me-3" style={{ width: '140px' }}>Application Status:</span>
                        <Badge bg="warning" text="dark">{existingApplication.status || "pending"}</Badge>
                      </div>
                      <div className="d-flex mb-2">
                        <span className="text-muted me-3" style={{ width: '140px' }}>Submitted On:</span>
                        <strong>{formatDate(existingApplication.submittedAt)}</strong>
                      </div>
                    </Col>
                  </Row>

                  {existingApplication.fileName && (
                    <Row className="mt-3">
                      <Col md={12}>
                        <h6 className="text-primary mb-3">
                          <i className="fas fa-file me-2"></i>
                          Uploaded Documents
                        </h6>
                        <div className="d-flex align-items-center">
                          <i className={`fas ${getFileIcon(existingApplication.fileType)} text-primary me-3 fa-lg`}></i>
                          <div>
                            <p className="mb-1 fw-semibold">{existingApplication.fileName}</p>
                            <p className="mb-0 text-muted small">
                              {existingApplication.fileSize ? `${(existingApplication.fileSize / 1024 / 1024).toFixed(2)} MB` : "File uploaded"}
                            </p>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  )}
                </div>
              </Card.Body>
            </Card>

            <Payment/>

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

                {/* Upload Progress Bar */}
                {isLoading && uploadProgress > 0 && (
                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-2">
                      <small className="text-muted">Uploading to database...</small>
                      <small className="text-muted">{uploadProgress}%</small>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div 
                        className="progress-bar progress-bar-striped progress-bar-animated" 
                        role="progressbar" 
                        style={{ width: `${uploadProgress}%` }}
                        aria-valuenow={uploadProgress} 
                        aria-valuemin="0" 
                        aria-valuemax="100"
                      ></div>
                    </div>
                  </div>
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
                          <Col md={6} lg={3}>
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

                          <Col md={6} lg={3}>
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

                          <Col md={6} lg={3}>
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

                          <Col md={6} lg={3}>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-semibold">
                                Currency <span className="text-danger">*</span>
                              </Form.Label>
                              <Form.Select
                                name="currency"
                                value={formData.currency}
                                onChange={handleChange}
                                isInvalid={!!errors.currency}
                                className="py-2"
                                required
                              >
                                <option value="">Select currency</option>
                                {currencies.map((currency) => (
                                  <option key={currency.code} value={currency.code}>
                                    {currency.symbol} {currency.code}
                                  </option>
                                ))}
                              </Form.Select>
                              <Form.Control.Feedback type="invalid">
                                {errors.currency}
                              </Form.Control.Feedback>
                            </Form.Group>
                          </Col>
                        </Row>

                        {/* Salary and Confirmation Letter Row */}
                        <Row>
                          <Col lg={6}>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-semibold">
                                Monthly Salary <span className="text-danger">*</span>
                              </Form.Label>
                              <InputGroup>
                                <InputGroup.Text className="bg-light border-end-0">
                                  <span className="fw-bold text-primary">
                                    {getCurrencySymbol(formData.currency)}
                                  </span>
                                </InputGroup.Text>
                                <Form.Control
                                  type="number"
                                  name="salary"
                                  value="N/A"
                                  onChange={handleChange}
                                  placeholder="N/A"
                                  isInvalid={!!errors.salary}
                                  className="border-start-0 py-2"
                                  step="0.01"
                                  min="0"
                                  
                                />
                                <InputGroup.Text className="bg-light border-start-0">
                                  <span className="text-muted small">/month</span>
                                </InputGroup.Text>
                              </InputGroup>
                              <Form.Control.Feedback type="invalid">
                                {errors.salary}
                              </Form.Control.Feedback>
                              <Form.Text className="text-muted small">
                                Gross monthly salary before deductions
                              </Form.Text>
                            </Form.Group>
                          </Col>

                          <Col lg={6}>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-semibold">
                                Job Confirmation Letter <span className="text-danger">*</span>
                              </Form.Label>
                              
                              {!formData.confirmationLetter ? (
                                <Form.Control
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.gif,image/*"
                                  onChange={handleFileChange}
                                  isInvalid={!!errors.confirmationLetter}
                                  className="py-2"
                                  
                                />
                              ) : (
                                <div className="border rounded p-3 bg-light">
                                  <div className="d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center">
                                      <i className={`fas ${getFileIcon(formData.confirmationLetter?.type)} text-primary me-3 fa-lg`}></i>
                                      <div>
                                        <p className="mb-1 fw-semibold">{formData.confirmationLetter.name}</p>
                                        <p className="mb-0 text-muted small">
                                          {(formData.confirmationLetter.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={removeFile}
                                    >
                                      <i className="fas fa-times"></i>
                                    </Button>
                                  </div>
                                  
                                  {/* Image Preview */}
                                  {filePreview && (
                                    <div className="mt-3 text-center">
                                      <img 
                                        src={filePreview} 
                                        alt="Document preview" 
                                        className="img-thumbnail"
                                        style={{ maxHeight: '150px', maxWidth: '100%' }}
                                      />
                                      <p className="text-muted small mt-2 mb-0">Document Preview</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <Form.Control.Feedback type="invalid">
                                {errors.confirmationLetter}
                              </Form.Control.Feedback>
                              <Form.Text className="text-muted small">
                                Upload PDF or image file (JPG, PNG, GIF) - Max 5MB
                              </Form.Text>
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
                          salary: "",
                          currency: "USD",
                          employmentType: "Full-time",
                          experience: "",
                          company: "",
                          location: "",
                          confirmationLetter: null
                        });
                        setErrors({});
                        setFilePreview(null);
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
                          {uploadProgress > 0 ? 'Uploading...' : 'Processing...'}
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