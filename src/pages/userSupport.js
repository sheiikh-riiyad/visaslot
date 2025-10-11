// src/components/UserSupport.js
import { useState } from "react";
import { Card, Form, Button, Alert, Row, Col, Badge, Accordion } from "react-bootstrap";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebaseConfig";

function UserSupport() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    category: "",
    subject: "",
    description: "",
    priority: "medium",
    attachment: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [ticketId, setTicketId] = useState("");

  // User authentication
  useState(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsub();
  }, []);

  const complaintCategories = [
    { value: "payment", label: "Payment Issues", icon: "fa-credit-card" },
    { value: "technical", label: "Technical Problems", icon: "fa-bug" },
    { value: "verification", label: "Verification Process", icon: "fa-user-check" },
    { value: "account", label: "Account Issues", icon: "fa-user" },
    { value: "refund", label: "Refund Request", icon: "fa-money-bill-wave" },
    { value: "other", label: "Other Issues", icon: "fa-question-circle" }
  ];

  const priorityLevels = [
    { value: "low", label: "Low", color: "success" },
    { value: "medium", label: "Medium", color: "warning" },
    { value: "high", label: "High", color: "danger" },
    { value: "urgent", label: "Urgent", color: "dark" }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      attachment: e.target.files[0]
    }));
  };

  const generateTicketId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `TKT-${timestamp}-${random}`;
  };

  const saveComplaintToFirestore = async (complaintData) => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const complaintsRef = collection(db, "supportTickets");
      const docRef = await addDoc(complaintsRef, {
        ...complaintData,
        userId: user.uid,
        userEmail: user.email || "N/A",
        userName: user.displayName || "Anonymous User",
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return docRef.id;
    } catch (error) {
      console.error("Error saving complaint to database", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setMessage("⚠️ Please log in to submit a complaint.");
      return;
    }

    if (!formData.category || !formData.subject || !formData.description) {
      setMessage("⚠️ Please fill all required fields.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const generatedTicketId = generateTicketId();
      
      const complaintData = {
        ticketId: generatedTicketId,
        category: formData.category,
        subject: formData.subject,
        description: formData.description,
        priority: formData.priority,
        attachment: formData.attachment ? formData.attachment.name : null
      };

      await saveComplaintToFirestore(complaintData);

      // Reset form
      setFormData({
        category: "",
        subject: "",
        description: "",
        priority: "medium",
        attachment: null
      });

      setTicketId(generatedTicketId);
      setMessage("✅ Your complaint has been submitted successfully! We'll get back to you within 24 hours.");

      // Clear ticket ID after 10 seconds
      setTimeout(() => {
        setTicketId("");
      }, 10000);

    } catch (error) {
      console.error("Error submitting complaint:", error);
      setMessage("❌ There was an error submitting your complaint. Please try again or contact us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // const getPriorityBadge = (priority) => {
  //   const level = priorityLevels.find(p => p.value === priority);
  //   return (
  //     <Badge bg={level?.color || "secondary"}>
  //       {level?.label || priority}
  //     </Badge>
  //   );
  // };

  // const getCategoryIcon = (categoryValue) => {
  //   const category = complaintCategories.find(c => c.value === categoryValue);
  //   return category?.icon || "fa-question";
  // };

  return (
    <div className="container-fluid py-4">
      <div className="row justify-content-center">
        <div className="col-lg-10 col-xl-8">
          {/* Header Section */}
          <div className="text-center mb-5">
            <h1 className="fw-bold text-primary">Customer Support</h1>
            <p className="text-muted fs-5">We're here to help! Submit your complaint and we'll assist you promptly.</p>
          </div>

          <Row className="g-4">
            {/* Complaint Form */}
            <Col lg={8}>
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-primary text-white py-3">
                  <h4 className="mb-0">
                    <i className="fas fa-headset me-2"></i>
                    Submit Your Complaint
                  </h4>
                </Card.Header>
                <Card.Body className="p-4">
                  {message && (
                    <Alert variant={
                      message.includes('✅') ? 'success' : 
                      message.includes('⚠️') ? 'warning' : 'danger'
                    }>
                      <i className={`fas ${
                        message.includes('✅') ? 'fa-check-circle' :
                        message.includes('⚠️') ? 'fa-exclamation-triangle' : 'fa-times-circle'
                      } me-2`}></i>
                      {message}
                    </Alert>
                  )}

                  {ticketId && (
                    <Alert variant="info">
                      <strong>Your Ticket ID:</strong> 
                      <Badge bg="primary" className="ms-2 fs-6">
                        {ticketId}
                      </Badge>
                      <div className="mt-2">
                        <small>Please keep this reference number for future communication.</small>
                      </div>
                    </Alert>
                  )}

                  {!user && (
                    <Alert variant="warning">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      Please log in to submit a complaint. Your complaints will be linked to your account for better tracking.
                    </Alert>
                  )}

                  <Form onSubmit={handleSubmit}>
                    {/* Category Selection */}
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold">
                        <i className="fas fa-folder me-2 text-primary"></i>
                        Complaint Category *
                      </Form.Label>
                      <Row className="g-3">
                        {complaintCategories.map((category) => (
                          <Col md={6} key={category.value}>
                            <div className={`category-card ${formData.category === category.value ? 'active' : ''}`}>
                              <Form.Check
                                type="radio"
                                id={category.value}
                                name="category"
                                label={
                                  <div className="p-3 text-center">
                                    <i className={`fas ${category.icon} fa-2x text-primary mb-2`}></i>
                                    <div>{category.label}</div>
                                  </div>
                                }
                                value={category.value}
                                checked={formData.category === category.value}
                                onChange={handleInputChange}
                              />
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </Form.Group>

                    {/* Priority Selection */}
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold">
                        <i className="fas fa-flag me-2 text-primary"></i>
                        Priority Level
                      </Form.Label>
                      <div className="d-flex flex-wrap gap-2">
                        {priorityLevels.map((priority) => (
                          <div key={priority.value} className="priority-option">
                            <Form.Check
                              type="radio"
                              id={priority.value}
                              name="priority"
                              label={
                                <Badge bg={priority.color} className="px-3 py-2">
                                  {priority.label}
                                </Badge>
                              }
                              value={priority.value}
                              checked={formData.priority === priority.value}
                              onChange={handleInputChange}
                            />
                          </div>
                        ))}
                      </div>
                    </Form.Group>

                    {/* Subject */}
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold">
                        <i className="fas fa-tag me-2 text-primary"></i>
                        Subject *
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        placeholder="Brief description of your issue"
                        required
                      />
                    </Form.Group>

                    {/* Description */}
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold">
                        <i className="fas fa-file-alt me-2 text-primary"></i>
                        Detailed Description *
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={6}
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Please provide detailed information about your issue, including any error messages, steps to reproduce, and what you were trying to accomplish..."
                        required
                      />
                      <Form.Text className="text-muted">
                        The more details you provide, the better we can help you.
                      </Form.Text>
                    </Form.Group>

                    {/* Attachment */}
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold">
                        <i className="fas fa-paperclip me-2 text-primary"></i>
                        Attachment (Optional)
                      </Form.Label>
                      <Form.Control
                        type="file"
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                      />
                      <Form.Text className="text-muted">
                        You can attach screenshots, documents, or images (Max: 5MB)
                      </Form.Text>
                    </Form.Group>

                    {/* Submit Button */}
                    <div className="d-grid">
                      <Button
                        variant="primary"
                        type="submit"
                        size="lg"
                        disabled={isSubmitting || !user}
                        className="py-3 fw-semibold"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Submitting Your Complaint...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-paper-plane me-2"></i>
                            Submit Complaint
                          </>
                        )}
                      </Button>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            </Col>

            {/* Help & Information Sidebar */}
            <Col lg={4}>
              {/* Contact Information */}
              <Card className="shadow-sm border-0 mb-4">
                <Card.Header className="bg-light py-3">
                  <h5 className="mb-0">
                    <i className="fas fa-phone me-2 text-primary"></i>
                    Contact Information
                  </h5>
                </Card.Header>
                <Card.Body>
                  <div className="contact-item mb-3">
                    <i className="fas fa-envelope text-primary me-2"></i>
                    <strong>Email:</strong>
                    <div>australiaimmigration2026@gmail.com</div>
                  </div>
                  <div className="contact-item mb-3">
                    <i className="fas fa-phone text-primary me-2"></i>
                    <strong>Phone:</strong>
                    <div>+88 06905 624898</div>
                  </div>
                  <div className="contact-item mb-3">
                    <i className="fas fa-clock text-primary me-2"></i>
                    <strong>Support Hours:</strong>
                    <div>Sun-Thu: 9:00 AM - 4:00 PM</div>
                    <div>Sat: 10:00 AM - 2:00 PM</div>
                  </div>
                  <div className="contact-item">
                    <i className="fas fa-globe text-primary me-2"></i>
                    <strong>Response Time:</strong>
                    <div>Within 48 hours</div>
                  </div>
                </Card.Body>
              </Card>

              {/* FAQ Section */}
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-light py-3">
                  <h5 className="mb-0">
                    <i className="fas fa-question-circle me-2 text-primary"></i>
                    Frequently Asked Questions
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Accordion flush>
                    <Accordion.Item eventKey="0">
                      <Accordion.Header>
                        How long does verification take?
                      </Accordion.Header>
                      <Accordion.Body>
                        Typically 2-3 business days after successful payment verification.
                      </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="1">
                      <Accordion.Header>
                        What if my payment fails?
                      </Accordion.Header>
                      <Accordion.Body>
                        Check your payment method details and try again. You have 2 attempts per session.
                      </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="2">
                      <Accordion.Header>
                        Can I get a refund?
                      </Accordion.Header>
                      <Accordion.Body>
                        Refunds are available within 7 days if verification hasn't started.
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                </Card.Body>
              </Card>

              {/* Quick Tips */}
              <Card className="shadow-sm border-0 mt-4">
                <Card.Header className="bg-light py-3">
                  <h5 className="mb-0">
                    <i className="fas fa-lightbulb me-2 text-warning"></i>
                    Quick Tips
                  </h5>
                </Card.Header>
                <Card.Body>
                  <ul className="list-unstyled mb-0">
                    <li className="mb-2">
                      <i className="fas fa-check text-success me-2"></i>
                      Include specific error messages
                    </li>
                    <li className="mb-2">
                      <i className="fas fa-check text-success me-2"></i>
                      Attach screenshots when possible
                    </li>
                    <li className="mb-2">
                      <i className="fas fa-check text-success me-2"></i>
                      Provide transaction IDs for payment issues
                    </li>
                    <li>
                      <i className="fas fa-check text-success me-2"></i>
                      Check our FAQ before submitting
                    </li>
                  </ul>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      {/* Custom CSS */}
      <style jsx>{`
        .category-card {
          border: 2px solid #e9ecef;
          border-radius: 10px;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .category-card:hover {
          border-color: #007bff;
          transform: translateY(-2px);
        }
        .category-card.active {
          border-color: #007bff;
          background-color: #f8f9fa;
        }
        .category-card .form-check {
          margin: 0;
        }
        .category-card .form-check-input {
          display: none;
        }
        .category-card .form-check-label {
          cursor: pointer;
          width: 100%;
          margin: 0;
        }
        .priority-option .form-check-input {
          display: none;
        }
        .priority-option .form-check-label {
          cursor: pointer;
        }
        .priority-option .form-check-input:checked + .form-check-label .badge {
          transform: scale(1.1);
          box-shadow: 0 0 0 2px #007bff;
        }
        .contact-item {
          border-left: 3px solid #007bff;
          padding-left: 15px;
        }
      `}</style>
    </div>
  );
}

export default UserSupport;