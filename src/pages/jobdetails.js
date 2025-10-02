import { useState } from "react";
import { Form, Button, Card, Container, Row, Col, Alert, InputGroup, Badge } from "react-bootstrap";


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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log("Form submitted:", formData);
      setIsSubmitted(true);
      setIsLoading(false);
    }
  };

  const handleReset = () => {
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
    setIsSubmitted(false);
    setFilePreview(null);
  };

  const getCurrencySymbol = (currencyCode) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency ? currency.symbol : '$';
  };

  const getFileIcon = (file) => {
    if (!file) return "fa-file";
    if (file.type.startsWith('image/')) return "fa-file-image";
    if (file.type === 'application/pdf') return "fa-file-pdf";
    return "fa-file";
  };

  return (
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
            <p className="text-muted">Please provide your current or prospective employment information</p>
          </div>

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
              {isSubmitted && (
                <Alert variant="success" className="d-flex align-items-center mb-4">
                  <i className="fas fa-check-circle fa-2x me-3 text-success"></i>
                  <div>
                    <h5 className="alert-heading mb-1">Successfully Submitted!</h5>
                    <p className="mb-0">Your employment details have been recorded.</p>
                  </div>
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
                                value={formData.salary}
                                onChange={handleChange}
                                placeholder="0.00"
                                isInvalid={!!errors.salary}
                                className="border-start-0 py-2"
                                step="0.01"
                                min="0"
                                required
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
                                required
                              />
                            ) : (
                              <div className="border rounded p-3 bg-light">
                                <div className="d-flex align-items-center justify-content-between">
                                  <div className="d-flex align-items-center">
                                    <i className={`fas ${getFileIcon(formData.confirmationLetter)} text-primary me-3 fa-lg`}></i>
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
                                      required
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
                    onClick={handleReset}
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

          {/* Enhanced Preview Section */}
          {(formData.name || formData.passportNo || formData.jobCategory || formData.salary || formData.confirmationLetter) && (
            <Card className="mt-4 shadow-sm border-0">
              <Card.Header className="bg-light py-3">
                <h5 className="mb-0 d-flex align-items-center">
                  <i className="fas fa-eye text-primary me-2"></i>
                  Form Preview
                </h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6} className="border-end">
                    <h6 className="text-muted mb-3">Personal Information</h6>
                    <div className="d-flex mb-2">
                      <span className="text-muted me-3" style={{ width: '120px' }}>Name:</span>
                      <strong>{formData.name || "Not provided"}</strong>
                    </div>
                    <div className="d-flex mb-2">
                      <span className="text-muted me-3" style={{ width: '120px' }}>Passport No:</span>
                      <strong className="text-uppercase">{formData.passportNo || "Not provided"}</strong>
                    </div>
                  </Col>
                  <Col md={6}>
                    <h6 className="text-muted mb-3">Employment Details</h6>
                    <div className="d-flex mb-2">
                      <span className="text-muted me-3" style={{ width: '120px' }}>Company:</span>
                      <strong>{formData.company || "Not provided"}</strong>
                    </div>
                    <div className="d-flex mb-2">
                      <span className="text-muted me-3" style={{ width: '120px' }}>Location:</span>
                      <strong>{formData.location || "Not provided"}</strong>
                    </div>
                    <div className="d-flex mb-2">
                      <span className="text-muted me-3" style={{ width: '120px' }}>Salary:</span>
                      <strong className="text-success">
                        {formData.salary ? `${getCurrencySymbol(formData.currency)}${formData.salary} ${formData.currency}` : "Not provided"}
                      </strong>
                    </div>
                  </Col>
                </Row>
                <Row className="mt-3">
                  <Col md={4}>
                    <div className="d-flex mb-2">
                      <span className="text-muted me-3" style={{ width: '120px' }}>Job Category:</span>
                      <strong>{formData.jobCategory || "Not provided"}</strong>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="d-flex mb-2">
                      <span className="text-muted me-3" style={{ width: '120px' }}>Employment Type:</span>
                      <strong>{formData.employmentType || "Not provided"}</strong>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="d-flex mb-2">
                      <span className="text-muted me-3" style={{ width: '120px' }}>Experience:</span>
                      <strong>{formData.experience || "Not provided"}</strong>
                    </div>
                  </Col>
                </Row>
                {formData.confirmationLetter && (
                  <Row className="mt-3">
                    <Col md={12}>
                      <div className="d-flex align-items-center">
                        <span className="text-muted me-3" style={{ width: '120px' }}>Confirmation Letter:</span>
                        <div className="d-flex align-items-center">
                          <i className={`fas ${getFileIcon(formData.confirmationLetter)} text-primary me-2`}></i>
                          <strong>{formData.confirmationLetter.name}</strong>
                          <Badge bg="light" text="dark" className="ms-2">
                            {(formData.confirmationLetter.size / 1024 / 1024).toFixed(2)} MB
                          </Badge>
                        </div>
                      </div>
                    </Col>
                  </Row>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default Jobdetails;