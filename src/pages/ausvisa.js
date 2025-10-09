// src/pages/AustraliaVisaPassport.js
import { useState, useEffect } from "react";
import { Card, Container, Row, Col, Alert, Spinner, Button, Badge, Modal } from "react-bootstrap";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebaseConfig";

const db = getFirestore(app);
const auth = getAuth(app);

function AustraliaVisaPassport() {
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("success");
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  // const [userData, setUserData] = useState(null);
  const [userDocument, setUserDocument] = useState(null);
  const [dataPathCreated, setDataPathCreated] = useState(false);

  const showMessage = (message, variant = "success") => {
    setAlertMessage(message);
    setAlertVariant(variant);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 5000);
  };

  // Check if data path already exists
  const checkDataPathStatus = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoading(true);
      const userDocumentRef = doc(db, "userDocuments", user.uid);
      const documentSnap = await getDoc(userDocumentRef);
      
      if (documentSnap.exists()) {
        setUserDocument(documentSnap.data());
        setDataPathCreated(true);
        showMessage("✅ Your document path is ready! Admin will upload your data soon.", "info");
      }
    } catch (error) {
      console.error("Error checking data path:", error);
    } finally {
      setLoading(false);
    }
  };

  // Create blank data path in Firebase
  const createDataPath = async () => {
    const user = auth.currentUser;
    if (!user) {
      showMessage("❌ Please log in first", "danger");
      return;
    }

    try {
      setLoading(true);

      // Create blank document structure for admin to populate later
      const blankDocumentData = {
        userId: user.uid,
        userEmail: user.email,
        status: "pending",
        createdAt: serverTimestamp(),
        // Blank fields for admin to fill
        passportData: {
          passportNumber: "",
          givenName: "",
          surname: "",
          nationality: "",
          dateOfBirth: "",
          gender: "",
          issueDate: "",
          expiryDate: "",
          issuingAuthority: ""
        },
        visaData: {
          documentType: "",
          visaSubclass: "",
          validUntil: "",
          status: "pending"
        },
        // Document will be uploaded by admin as Base64
        documents: {
          passport: {
            fileName: "",
            fileType: "",
            fileSize: 0,
            base64Data: "",
            uploadedAt: null
          },
          visa: {
            fileName: "",
            fileType: "",
            fileSize: 0,
            base64Data: "", 
            uploadedAt: null
          }
        },
        // Admin metadata
        adminNotes: "",
        lastUpdatedByAdmin: null,
        dataPathCreated: true
      };

      // Create the document with user UID as document ID
      const userDocumentRef = doc(db, "userDocuments", user.uid);
      await setDoc(userDocumentRef, blankDocumentData);

      showMessage("✅ Data path created successfully! Admin will now upload your documents.");
      setDataPathCreated(true);
      setUserDocument(blankDocumentData);

    } catch (error) {
      console.error("Error creating data path:", error);
      showMessage("❌ Failed to create data path. Please try again.", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkDataPathStatus();
  }, []);

  const previewDocument = (documentData, title) => {
    if (!documentData || !documentData.base64Data) {
      showMessage("❌ No document available for preview", "warning");
      return;
    }
    setPreviewImage(documentData.base64Data);
    setPreviewTitle(title);
    setShowPreview(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: "warning", text: "Pending" },
      approved: { variant: "success", text: "Approved" },
      rejected: { variant: "danger", text: "Rejected" },
      uploaded: { variant: "info", text: "Documents Uploaded" }
    };
    const config = statusConfig[status] || { variant: "secondary", text: "Unknown" };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  // const formatDate = (dateString) => {
  //   if (!dateString) return "Not set";
  //   try {
  //     const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
  //     return date.toLocaleDateString('en-US');
  //   } catch (error) {
  //     return "Invalid Date";
  //   }
  // };

  return (
    <div className="australia-visa-page">
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col lg={10} xl={8}>
            {/* Header Section */}
            <div className="text-center mb-5">
              <h1 className="fw-bold text-gradient">Australia Visa & ePassport</h1>
              <p className="lead text-muted">Check your document status</p>
            </div>

            {/* Alert Message */}
            {showAlert && (
              <Alert variant={alertVariant} className="mb-4" dismissible onClose={() => setShowAlert(false)}>
                {alertMessage}
              </Alert>
            )}

            {/* Main Content */}
            <Card className="shadow-lg border-0">
              <Card.Header className="bg-primary text-white py-3">
                <h4 className="mb-0">
                  <i className="fas fa-file-contract me-2"></i>
                  Document Status
                </h4>
              </Card.Header>
              <Card.Body className="p-4 text-center">
                
                {!dataPathCreated ? (
                  // Show Check Status button if no data path exists
                  <div className="py-4">
                    <i className="fas fa-search fa-4x text-muted mb-4"></i>
                    <h4 className="text-gradient">Check Your Document Status</h4>
                    <p className="text-muted mb-4">
                      Click the button below to create your personal data space. 
                      This will generate a secure location where administrators can upload your Australia visa and passport documents.
                    </p>
                    <Button 
                      variant="primary" 
                      size="lg"
                      onClick={createDataPath}
                      disabled={loading}
                      className="px-5"
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Creating Data Path...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check-circle me-2"></i>
                          Check Status & Create Data Path
                        </>
                      )}
                    </Button>
                    <div className="mt-4 small text-muted">
                      <p>After clicking, administrators will be able to:</p>
                      <ul className="list-unstyled">
                        <li><i className="fas fa-upload text-success me-2"></i>Upload your passport documents</li>
                        <li><i className="fas fa-upload text-success me-2"></i>Add your visa information</li>
                        <li><i className="fas fa-upload text-success me-2"></i>Update your application status</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  // Show status information after data path is created
                  <div className="py-4">
                    <i className="fas fa-check-circle fa-4x text-success mb-4"></i>
                    <h4 className="text-success">Data Path Created Successfully!</h4>
                    <p className="text-muted mb-4">
                      Your personal data space has been created. Administrators can now upload your documents.
                      You will be notified when your documents are ready.
                    </p>
                    
                    <div className="alert alert-info mx-auto" style={{maxWidth: '500px'}}>
                      <i className="fas fa-info-circle me-2"></i>
                      <strong>Current Status:</strong> {userDocument?.status ? getStatusBadge(userDocument.status) : "Pending"}
                    </div>

                    {/* Document preview section when admin uploads data */}
                    {userDocument?.documents?.passport?.base64Data && (
                      <div className="mt-4">
                        <h5>Your Documents</h5>
                        <Row className="mt-3">
                          <Col md={6}>
                            <Card className="border-0 shadow-sm">
                              <Card.Header className="bg-light">
                                <h6 className="mb-0">Passport Document</h6>
                              </Card.Header>
                              <Card.Body>
                                <Button
                                  variant="outline-primary"
                                  onClick={() => previewDocument(
                                    userDocument.documents.passport, 
                                    "Passport Document"
                                  )}
                                >
                                  <i className="fas fa-eye me-1"></i>
                                  Preview Passport
                                </Button>
                              </Card.Body>
                            </Card>
                          </Col>
                        </Row>
                      </div>
                    )}

                    <Button 
                      variant="outline-secondary" 
                      onClick={checkDataPathStatus}
                      disabled={loading}
                      className="mt-3"
                    >
                      <i className="fas fa-sync me-2"></i>
                      Refresh Status
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Information Card */}
            <Card className="mt-4 border-0 bg-light">
              <Card.Body className="p-4">
                <h5 className="mb-3">
                  <i className="fas fa-info-circle me-2 text-primary"></i>
                  How It Works
                </h5>
                <Row>
                  <Col md={6}>
                    <h6>For Users</h6>
                    <ul className="small text-muted">
                      <li>Click "Check Status" to create your data space</li>
                      <li>Button disappears after successful creation</li>
                      <li>Wait for admin to upload your documents</li>
                      <li>Return later to view your documents</li>
                    </ul>
                  </Col>
                  <Col md={6}>
                    <h6>For Administrators</h6>
                    <ul className="small text-muted">
                      <li>System creates blank data structure</li>
                      <li>Upload documents as Base64 files</li>
                      <li>Update application status</li>
                      <li>Fill in passport and visa details</li>
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
          {previewImage && (
            <img
              src={previewImage}
              alt="Document preview"
              className="img-fluid rounded shadow"
              style={{ maxHeight: '70vh' }}
            />
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default AustraliaVisaPassport;