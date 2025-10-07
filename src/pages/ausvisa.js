// src/pages/AustraliaVisaPassport.js
import { useState,  } from "react";
import { Card, Container, Row, Col, Alert, Spinner, Button, Badge, Modal, Tabs, Tab } from "react-bootstrap";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebaseConfig";

import { Link } from "react-router-dom";

const db = getFirestore(app);
const auth = getAuth(app);

function AustraliaVisaPassport() {
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("success");
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [userData, setUserData] = useState(null);
  const [visaData, setVisaData] = useState(null);
  const [passportData, setPassportData] = useState(null);

  const showMessage = (message, variant = "success") => {
    setAlertMessage(message);
    setAlertVariant(variant);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 5000);
  };

  // Fetch user's Australia visa and passport data
  const fetchUserData = async () => {
    const user = auth.currentUser;
    if (!user) {
      showMessage("❌ Please log in to view your documents", "danger");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch user's basic data from users collection
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        setUserData(userDocSnap.data());
      }

      // Fetch Australia visa data from australiavisa collection
      const australiaVisaQuery = query(
        collection(db, "australiavisa"),
        where("userId", "==", user.uid)
      );
      
      const visaSnapshot = await getDocs(australiaVisaQuery);
      if (!visaSnapshot.empty) {
        const visaDoc = visaSnapshot.docs[0];
        const visaData = visaDoc.data();

        console.log(visaData)
        
        // Fetch the data subcollection for this visa document
        const dataSubcollectionRef = collection(db, "australiavisa", visaDoc.id, "data");
        const dataSnapshot = await getDocs(dataSubcollectionRef);
        
        if (!dataSnapshot.empty) {
          const allData = dataSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setVisaData(allData);
        } else {
          setVisaData([]);
        }
      }

      // Fetch passport data (assuming similar structure)
      const passportQuery = query(
        collection(db, "australiaPassports"),
        where("userId", "==", user.uid)
      );
      
      const passportSnapshot = await getDocs(passportQuery);
      if (!passportSnapshot.empty) {
        const passportDoc = passportSnapshot.docs[0];
        setPassportData(passportDoc.data());
      }

    } catch (error) {
      console.error("Error fetching user data:", error);
      showMessage("❌ Failed to load your documents. Please try again.", "danger");
    } finally {
      setLoading(false);
    }
  };

  // useEffect(() => {
  //   fetchUserData();
  // }, []);

  const previewDocument = (base64Data, title) => {
    if (base64Data) {
      setPreviewImage(base64Data);
      setPreviewTitle(title);
      setShowPreview(true);
    }
  };

  const downloadDocument = (base64Data, fileName) => {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { variant: "success", text: "Active" },
      expired: { variant: "danger", text: "Expired" },
      pending: { variant: "warning", text: "Pending" },
      approved: { variant: "success", text: "Approved" },
      rejected: { variant: "danger", text: "Rejected" },
      submitted: { variant: "info", text: "Under Review" }
    };
    
    const config = statusConfig[status] || { variant: "secondary", text: "Unknown" };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="australia-visa-page">
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col lg={8} className="text-center">
              <Spinner animation="border" variant="primary" className="mb-3" />
              <h4>Loading your Australia documents...</h4>
              <p className="text-muted">Please wait while we fetch your visa and passport information.</p>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <div className="australia-visa-page">
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col lg={10} xl={8}>
            {/* Header Section */}
            <div className="text-center mb-5">
              <div className="document-icon mb-3">
                <i className="fas fa-file-contract fa-3x text-primary"></i>
              </div>
              <h1 className="fw-bold text-gradient">Australia Visa & ePassport</h1>
              <p className="lead text-muted">
                View your Australian visa and ePassport documents
              </p>
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

            {/* Main Content Tabs */}
            <Card className="shadow-lg border-0">
              <Card.Header className="bg-primary text-white py-3">
                <h4 className="mb-0">
                  <i className="fas fa-passport me-2"></i>
                  My Australia Documents
                </h4>
              </Card.Header>
              <Card.Body className="p-0">
                <Tabs defaultActiveKey="visa" className="p-3">
                  {/* Visa Tab */}
                  <Tab eventKey="visa" title={
                    <span>
                      <i className="fas fa-stamp me-1"></i>
                      Visa Documents
                      {visaData && visaData.length > 0 && (
                        <Badge bg="success" className="ms-1">{visaData.length}</Badge>
                      )}
                    </span>
                  }>
                    <div className="p-3">
                      {!visaData || visaData.length === 0 ? (
                        <div className="text-center py-5">
                          <i className="fas fa-file-alt fa-4x text-muted mb-3"></i>
                          <h4 className="text-muted">No Visa Documents Found</h4>
                          <p className="text-muted">
                            Your visa documents will appear here once they are uploaded by the administrator.
                          </p>
                          <Button variant="primary" onClick={fetchUserData}>
                            <i className="fas fa-sync me-2"></i>
                            Refresh
                          </Button>
                        </div>
                      ) : (
                        <Row>
                          {visaData.map((doc, index) => (
                            <Col lg={6} key={doc.id} className="mb-4">
                              <Card className="h-100 border-0 shadow-sm">
                                <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                                  <h6 className="mb-0">
                                    <i className="fas fa-file-contract me-2 text-primary"></i>
                                    {doc.documentType || `Visa Document ${index + 1}`}
                                  </h6>
                                  {doc.status && getStatusBadge(doc.status)}
                                </Card.Header>
                                <Card.Body>
                                  <div className="mb-3">
                                    <strong>Document Type:</strong> {doc.documentType || "Visa Document"}<br/>
                                    <strong>Uploaded:</strong> {formatDate(doc.uploadedAt)}<br/>
                                    {doc.validUntil && (
                                      <><strong>Valid Until:</strong> {formatDate(doc.validUntil)}</>
                                    )}
                                    {doc.visaSubclass && (
                                      <><strong>Visa Subclass:</strong> {doc.visaSubclass}</>
                                    )}
                                  </div>
                                  
                                  {doc.document && doc.document.base64Data && (
                                    <div className="text-center">
                                      <div className="mb-3">
                                        {doc.document.fileType.startsWith('image/') ? (
                                          <img
                                            src={doc.document.base64Data}
                                            alt={doc.document.fileName}
                                            className="img-fluid rounded shadow-sm"
                                            style={{ maxHeight: '200px', cursor: 'pointer' }}
                                            onClick={() => previewDocument(doc.document.base64Data, doc.document.fileName)}
                                          />
                                        ) : (
                                          <div className="text-center py-4 border rounded">
                                            <i className="fas fa-file-pdf fa-3x text-danger mb-3"></i>
                                            <p className="mb-2">{doc.document.fileName}</p>
                                            <small className="text-muted">
                                              PDF Document - {(doc.document.fileSize / 1024 / 1024).toFixed(2)} MB
                                            </small>
                                          </div>
                                        )}
                                      </div>
                                      <div className="d-grid gap-2">
                                        <Button
                                          variant="outline-primary"
                                          size="sm"
                                          onClick={() => previewDocument(doc.document.base64Data, doc.document.fileName)}
                                        >
                                          <i className="fas fa-eye me-1"></i>
                                          Preview Document
                                        </Button>
                                        <Button
                                          variant="outline-success"
                                          size="sm"
                                          onClick={() => downloadDocument(doc.document.base64Data, doc.document.fileName)}
                                        >
                                          <i className="fas fa-download me-1"></i>
                                          Download Document
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </Card.Body>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      )}
                    </div>
                  </Tab>

                  {/* ePassport Tab */}
                  <Tab eventKey="passport" title={
                    <span>
                      <i className="fas fa-passport me-1"></i>
                      ePassport
                      {passportData && (
                        <Badge bg="info" className="ms-1">1</Badge>
                      )}
                    </span>
                  }>
                    <div className="p-3">
                      {!passportData ? (
                        <div className="text-center py-5">
                          <i className="fas fa-passport fa-4x text-muted mb-3"></i>
                          <h4 className="text-muted">No ePassport Found</h4>
                          <p className="text-muted">
                            Your ePassport will appear here once it is uploaded by the administrator.
                          </p>
                          <Button variant="primary" onClick={fetchUserData}>
                            <i className="fas fa-sync me-2"></i>
                            Refresh
                          </Button>
                        </div>
                      ) : (
                        <Row>
                          <Col lg={6} className="mb-4">
                            <Card className="h-100 border-0 shadow-sm">
                              <Card.Header className="bg-light">
                                <h6 className="mb-0">
                                  <i className="fas fa-id-card me-2 text-primary"></i>
                                  ePassport Information
                                </h6>
                              </Card.Header>
                              <Card.Body>
                                <div className="mb-4">
                                  <Row>
                                    <Col sm={6}>
                                      <strong>Passport Number:</strong><br/>
                                      <span className="fs-5 fw-bold text-primary">
                                        {passportData.passportNumber}
                                      </span>
                                    </Col>
                                    <Col sm={6}>
                                      <strong>Nationality:</strong><br/>
                                      {passportData.nationality}
                                    </Col>
                                  </Row>
                                  <hr/>
                                  <Row>
                                    <Col sm={6}>
                                      <strong>Given Name:</strong><br/>
                                      {passportData.givenName}
                                    </Col>
                                    <Col sm={6}>
                                      <strong>Surname:</strong><br/>
                                      {passportData.surname}
                                    </Col>
                                  </Row>
                                  <hr/>
                                  <Row>
                                    <Col sm={6}>
                                      <strong>Date of Birth:</strong><br/>
                                      {formatDate(passportData.dateOfBirth)}
                                    </Col>
                                    <Col sm={6}>
                                      <strong>Gender:</strong><br/>
                                      {passportData.gender}
                                    </Col>
                                  </Row>
                                  <hr/>
                                  <Row>
                                    <Col sm={6}>
                                      <strong>Issue Date:</strong><br/>
                                      {formatDate(passportData.issueDate)}
                                    </Col>
                                    <Col sm={6}>
                                      <strong>Expiry Date:</strong><br/>
                                      {formatDate(passportData.expiryDate)}
                                    </Col>
                                  </Row>
                                  {passportData.issuingAuthority && (
                                    <>
                                      <hr/>
                                      <Row>
                                        <Col sm={12}>
                                          <strong>Issuing Authority:</strong><br/>
                                          {passportData.issuingAuthority}
                                        </Col>
                                      </Row>
                                    </>
                                  )}
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>

                          <Col lg={6} className="mb-4">
                            <Card className="h-100 border-0 shadow-sm">
                              <Card.Header className="bg-light">
                                <h6 className="mb-0">
                                  <i className="fas fa-image me-2 text-primary"></i>
                                  ePassport Document
                                </h6>
                              </Card.Header>
                              <Card.Body>
                                {passportData.document && passportData.document.base64Data ? (
                                  <div className="text-center">
                                    <div className="mb-3">
                                      {passportData.document.fileType.startsWith('image/') ? (
                                        <img
                                          src={passportData.document.base64Data}
                                          alt="ePassport"
                                          className="img-fluid rounded shadow-sm"
                                          style={{ maxHeight: '250px', cursor: 'pointer' }}
                                          onClick={() => previewDocument(passportData.document.base64Data, "ePassport")}
                                        />
                                      ) : (
                                        <div className="text-center py-4 border rounded">
                                          <i className="fas fa-file-pdf fa-3x text-danger mb-3"></i>
                                          <p className="mb-2">{passportData.document.fileName}</p>
                                          <small className="text-muted">
                                            PDF Document - {(passportData.document.fileSize / 1024 / 1024).toFixed(2)} MB
                                          </small>
                                        </div>
                                      )}
                                    </div>
                                    <div className="d-grid gap-2">
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => previewDocument(passportData.document.base64Data, "ePassport")}
                                      >
                                        <i className="fas fa-eye me-1"></i>
                                        Preview ePassport
                                      </Button>
                                      <Button
                                        variant="outline-success"
                                        size="sm"
                                        onClick={() => downloadDocument(passportData.document.base64Data, passportData.document.fileName)}
                                      >
                                        <i className="fas fa-download me-1"></i>
                                        Download ePassport
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-4">
                                    <i className="fas fa-times-circle fa-3x text-muted mb-3"></i>
                                    <p className="text-muted">ePassport document not available</p>
                                  </div>
                                )}
                              </Card.Body>
                            </Card>
                          </Col>
                        </Row>
                      )}
                    </div>
                  </Tab>

                  {/* Status Tab */}
                  <Tab eventKey="status" title={
                    <span>
                      <i className="fas fa-info-circle me-1"></i>
                      Application Status
                    </span>
                  }>
                    <div className="p-3">
                      <Row>
                        <Col lg={6} className="mb-4">
                          <Card className="border-0 shadow-sm">
                            <Card.Header className="bg-info text-white">
                              <h6 className="mb-0">
                                <i className="fas fa-sync-alt me-2"></i>
                                Current Status
                              </h6>
                            </Card.Header>
                            <Card.Body>
                              {userData?.australiaWorkPermitStatus ? (
                                <div className="text-center">
                                  <div className="mb-3">
                                    {getStatusBadge(userData.australiaWorkPermitStatus)}
                                  </div>
                                  <p className="mb-2">
                                    <strong>Last Updated:</strong><br/>
                                    {userData.lastAustraliaSubmission ? 
                                      formatDate(userData.lastAustraliaSubmission) : "N/A"
                                    }
                                  </p>
                                  {userData.australiaPassportNumber && (
                                    <p className="mb-0">
                                      <strong>Passport Number:</strong><br/>
                                      {userData.australiaPassportNumber}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-3">
                                  <i className="fas fa-clock fa-2x text-muted mb-2"></i>
                                  <p className="text-muted mb-0">No Australia application found</p>
                                </div>
                              )}
                            </Card.Body>
                          </Card>
                        </Col>

                        <Col lg={6} className="mb-4">
                          <Card className="border-0 shadow-sm">
                            <Card.Header className="bg-warning">
                              <h6 className="mb-0">
                                <i className="fas fa-question-circle me-2"></i>
                                Need Help?
                              </h6>
                            </Card.Header>
                            <Card.Body>
                              <p className="small text-muted">
                                If you have any questions about your Australia visa or ePassport, 
                                please contact our support team.
                              </p>
                              <ul className="small text-muted">
                                <li>Ensure your documents are clear and readable</li>
                                <li>Check expiry dates regularly</li>
                                <li>Keep digital copies secure</li>
                              </ul>
                              <Button variant="outline-primary" size="sm" as={Link} to="/support" >
                                <i className="fas fa-envelope me-1"></i>
                                Contact Support
                              </Button>
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>
                    </div>
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>

            {/* Information Card */}
            <Card className="mt-4 border-0 bg-light">
              <Card.Body className="p-4">
                <h5 className="mb-3">
                  <i className="fas fa-info-circle me-2 text-primary"></i>
                  About Australia Visa & ePassport
                </h5>
                <Row>
                  <Col md={6}>
                    <h6>Visa Types</h6>
                    <ul className="small text-muted">
                      <li><strong>Visitor Visa:</strong> For tourism and short stays</li>
                      <li><strong>Student Visa:</strong> For international students</li>
                      <li><strong>Work Visa:</strong> For employment opportunities</li>
                      <li><strong>Permanent Visa:</strong> For long-term residence</li>
                    </ul>
                  </Col>
                  <Col md={6}>
                    <h6>ePassport Features</h6>
                    <ul className="small text-muted">
                      <li>Biometric data storage</li>
                      <li>Enhanced security features</li>
                      <li>Electronic chip technology</li>
                      <li>Faster border processing</li>
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
          <Modal.Title>{previewTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <img
            src={previewImage}
            alt="Document preview"
            className="img-fluid rounded shadow"
            style={{ maxHeight: '70vh' }}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="success"
            onClick={() => downloadDocument(previewImage, previewTitle)}
          >
            <i className="fas fa-download me-1"></i>
            Download
          </Button>
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .australia-visa-page {
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
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .card {
          border-radius: 15px;
        }
        
        .nav-tabs .nav-link {
          border: none;
          border-bottom: 3px solid transparent;
          font-weight: 500;
        }
        
        .nav-tabs .nav-link.active {
          border-bottom: 3px solid #667eea;
          background: transparent;
          color: #667eea;
        }
        
        .nav-tabs .nav-link:hover {
          border-bottom: 3px solid #667eea;
        }
      `}</style>
    </div>
  );
}

export default AustraliaVisaPassport;