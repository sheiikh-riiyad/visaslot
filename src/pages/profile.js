// src/pages/Profile.js
import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs, doc,  updateDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import Payment from "./payment";
import { Card, Row, Col, Container, Badge, Alert, Button, Modal } from "react-bootstrap";
import SupportGlowButton from "../components/buttons";
import { useNavigate } from "react-router-dom";
import emailjs from '@emailjs/browser';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [docId, setDocId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [applicationLetter, setApplicationLetter] = useState(null);
  const [letterLoading, setLetterLoading] = useState(false);
  const navigate = useNavigate();


  console.log(docId)
  


  // Initialize EmailJS
  useEffect(() => {
    emailjs.init("tJ26AXoVZgC8h_htE");
  }, []);

  // Function to send approval confirmation email
  const sendApprovalEmail = async (userEmail, userName, applicationId) => {
    try {
      const templateParams = {
        to_email: userEmail,
        to_name: userName,
        from_name: "Australia Immigration Service",
        from_email: "contact@australiaimmigration.site",
        application_id: applicationId,
        user_email: userEmail,
        approval_date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        reply_to: "contact@australiaimmigration.site"
      };

      await emailjs.send(
        "service_4l8mwuf",    // Your Service ID
        "template_gjfiqui",   // Your Template ID for approval emails
        templateParams
      );
      
      
      return true;
    } catch (error) {
     
      return false;
    }
  };

  // Check if approval email needs to be sent
  const checkAndSendApprovalEmail = useCallback(async (profileData, documentId) => {
    // Check if status is approved and email hasn't been sent yet
    if (profileData.applicationStatus && 
        profileData.applicationStatus.toLowerCase() === "approved" && 
        !profileData.approvalEmailSent) {
      
     
      
      // Send approval email
      const emailSent = await sendApprovalEmail(
        profileData.email, 
        `${profileData.name} ${profileData.surname}`,
        documentId
      );
      
      if (emailSent) {
        // Update Firestore to mark that approval email was sent
        try {
          const applicationRef = doc(db, "applications", documentId);
          await updateDoc(applicationRef, {
            approvalEmailSent: true,
            approvalEmailSentAt: new Date()
          });
         
        } catch (error) {
          console.error("Error updating email sent status:", error);
        }
      }
    }
  }, []);

  // Function to fetch application letter from URL (not base64)
  const fetchApplicationLetter = async () => {
    if (!profile || !profile.applicationLetter) {
      setApplicationLetter(null);
      return;
    }
    
    setLetterLoading(true);
    try {
    
      
      // The applicationLetter field now contains the full URL from your server
      // We can use it directly for viewing/downloading
      setApplicationLetter(profile.applicationLetter);
      
    } catch (error) {
      console.error("Error fetching application letter:", error);
      setApplicationLetter(null);
    } finally {
      setLetterLoading(false);
    }
  };

  // Open modal and fetch application letter
  const handleViewLetter = async () => {
    setShowModal(true);
    await fetchApplicationLetter();
  };

  // Download application letter
  const handleDownloadLetter = () => {
    if (applicationLetter && profile.applicationLetterName) {
      const link = document.createElement('a');
      link.href = applicationLetter;
      link.download = profile.applicationLetterName || 'approval-letter';
      link.click();
    } else {
      alert("Download not available. Please try viewing the file first.");
    }
  };

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return "Not provided";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Format file size function
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Fetch profile data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        if (!user) {
          setError("Please log in to view your profile");
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, "applications"),
          where("uid", "==", user.uid)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docData = snap.docs[0];
          const data = docData.data();
          setProfile(data);
          setDocId(docData.id);
         
          
          // Check if we need to send approval email
          await checkAndSendApprovalEmail(data, docData.id);
        } else {
          setError("No application found for this user");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [checkAndSendApprovalEmail]);

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading profile...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">
          <Alert.Heading>No Application Found</Alert.Heading>
          <p>You haven't submitted an application yet. Please complete the application form first.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Container className="py-4">
        {/* Header Section */}
        <Card className="mb-4 shadow-sm border-0" style={{ background: 'linear-gradient(135deg, #1b4f72 0%, #2b91b2 100%)' }}>
          <Card.Body className="text-white p-4">
            <Row className="align-items-center">
              <Col md={8}>
                <div className="d-flex align-items-center mb-3">
                  <i className="fas fa-passport fa-2x me-3"></i>
                  <div>
                    <h1 className="h3 mb-0">Government of Australia</h1>
                    <h2 className="h5 mb-0 opacity-75">High Commission of Australia</h2>
                  </div>
                </div>
                <p className="mb-0 opacity-90">Visa Application Profile</p>
              </Col>
              <Col md={4} className="text-center">
                {profile.photo ? (
                  <div className="position-relative d-inline-block">
                    <img
                      src={profile.photo}
                      alt="Applicant"
                      className="rounded shadow"
                      style={{ 
                        width: "140px", 
                        height: "160px", 
                        objectFit: "cover",
                        border: "3px solid rgba(255,255,255,0.3)"
                      }}
                    />
                    <Badge bg="light" text="dark" className="position-absolute top-0 start-100 translate-middle">
                      Photo
                    </Badge>
                  </div>
                ) : (
                  <div className="bg-light rounded d-flex align-items-center justify-content-center"
                    style={{ width: "140px", height: "160px", margin: "0 auto" }}>
                    <i className="fas fa-user fa-3x text-muted"></i>
                  </div>
                )}
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Application Status Badge with View Button */}
        <Row className="mb-4">
          <Col>
            <Alert variant="info" className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <i className="fas fa-info-circle me-2"></i>
                <div>
                  <strong>Application Status:</strong> 
                  <Badge bg="primary" className="ms-2">
                    {profile.applicationStatus || "Under Review"}
                  </Badge>
                </div>
              </div>
              
              {/* View Button - Only show if status is "approved" and application letter exists */}
              {profile && profile.applicationStatus && 
               profile.applicationStatus.toLowerCase() === "approved" && 
               profile.applicationLetter && (
                <Button 
                  variant="success" 
                  onClick={handleViewLetter}
                  className="d-flex align-items-center"
                  size="lg"
                  disabled={letterLoading}
                >
                  {letterLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Loading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-file-alt me-2"></i>
                      View Approval Letter
                    </>
                  )}
                </Button>
              )}
            </Alert>
          </Col>
        </Row>

        {/* Show file info if available */}
        {profile.applicationLetter && (
          <Alert variant="light" className="mb-4">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Approval Letter Available</strong>
                <br />
                <small className="text-muted">
                  <strong>File:</strong> {profile.applicationLetterName || 'Approval Letter'}
                  {profile.applicationLetterSize && (
                    <> | <strong>Size:</strong> {formatFileSize(profile.applicationLetterSize)}</>
                  )}
                  {profile.applicationLetterUploadedAt && (
                    <> | <strong>Uploaded:</strong> {formatDate(profile.applicationLetterUploadedAt)}</>
                  )}
                </small>
              </div>
              <div>
                <Button variant="outline-primary" size="sm" onClick={handleViewLetter}>
                  <i className="fas fa-eye me-1"></i> View
                </Button>
                <Button variant="outline-success" size="sm" className="ms-2" onClick={handleDownloadLetter}>
                  <i className="fas fa-download me-1"></i> Download
                </Button>
              </div>
            </div>
          </Alert>
        )}
       
        {/* Process Steps for Approved Applications */}
        {profile && profile.applicationStatus && profile.applicationStatus.toLowerCase() === "approved" && (
          <Container className="my-4">
            <Card className="border-0 shadow-lg" style={{ 
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
              borderRadius: '20px',
              overflow: 'hidden'
            }}>
              <Card.Body className="p-4">
                {/* Header */}
                <div className="text-center mb-4">
                  <div className="success-icon mb-3">
                    <i className="fas fa-check-circle fa-3x text-success"></i>
                  </div>
                  <h3 className="text-dark fw-bold mb-2">Application Approved! 🎉</h3>
                  <p className="text-muted mb-0">Your visa application has been approved. Complete the next steps:</p>
                </div>

                {/* Process Steps */}
                <Row className="g-3">
                  {/* Job Details Verification */}
                  <Col md={6} lg={4}>
                    <Card 
                      className="h-100 process-card border-0 shadow-sm"
                      onClick={() => navigate('/jobdetails')}
                      style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    >
                      <Card.Body className="text-center p-4">
                        <div className="process-icon mb-3">
                          <i className="fas fa-briefcase fa-2x text-primary"></i>
                        </div>
                        <h6 className="fw-bold text-dark mb-2">Job Details Verification</h6>
                        <p className="text-muted small mb-3">
                          Verify your employment information and job offer details
                        </p>
                        <Badge bg="primary" className="px-3 py-2">
                          Step 1 <i className="fas fa-arrow-right ms-1"></i>
                        </Badge>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Biometric Collection */}
                  <Col md={6} lg={4}>
                    <Card 
                      className="h-100 process-card border-0 shadow-sm"
                      onClick={() => navigate('/biometric')}
                      style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    >
                      <Card.Body className="text-center p-4">
                        <div className="process-icon mb-3">
                          <i className="fas fa-fingerprint fa-2x text-success"></i>
                        </div>
                        <h6 className="fw-bold text-dark mb-2">Biometric Collection</h6>
                        <p className="text-muted small mb-3">
                          Schedule your biometric data collection appointment
                        </p>
                        <Badge bg="success" className="px-3 py-2">
                          Step 2 <i className="fas fa-arrow-right ms-1"></i>
                        </Badge>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* LMIA */}
                  <Col md={6} lg={4}>
                    <Card 
                      className="h-100 process-card border-0 shadow-sm"
                      onClick={() => navigate('/lmis-sunmission')}
                      style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    >
                      <Card.Body className="text-center p-4">
                        <div className="process-icon mb-3">
                          <i className="fas fa-file-contract fa-2x text-warning"></i>
                        </div>
                        <h6 className="fw-bold text-dark mb-2">LMIA Assessment</h6>
                        <p className="text-muted small mb-3">
                          Labour Market Impact Assessment documentation
                        </p>
                        <Badge bg="warning" text="dark" className="px-3 py-2">
                          Step 3 <i className="fas fa-arrow-right ms-1"></i>
                        </Badge>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Australian Work Permit */}
                  <Col md={6} lg={4}>
                    <Card 
                      className="h-100 process-card border-0 shadow-sm"
                      onClick={() => navigate('/work-permit')}
                      style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    >
                      <Card.Body className="text-center p-4">
                        <div className="process-icon mb-3">
                          <i className="fas fa-file-alt fa-2x text-info"></i>
                        </div>
                        <h6 className="fw-bold text-dark mb-2">Work Permit</h6>
                        <p className="text-muted small mb-3">
                          Australian work permit application and requirements
                        </p>
                        <Badge bg="info" className="px-3 py-2">
                          Step 4 <i className="fas fa-arrow-right ms-1"></i>
                        </Badge>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Man Power Services */}
                  <Col md={6} lg={4}>
                    <Card 
                      className="h-100 process-card border-0 shadow-sm"
                      onClick={() => navigate('/manpower')}
                      style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    >
                      <Card.Body className="text-center p-4">
                        <div className="process-icon mb-3">
                          <i className="fas fa-users fa-2x text-secondary"></i>
                        </div>
                        <h6 className="fw-bold text-dark mb-2">Man Power Services</h6>
                        <p className="text-muted small mb-3">
                          Workforce and employment support services
                        </p>
                        <Badge bg="secondary" className="px-3 py-2">
                          Step 5 <i className="fas fa-arrow-right ms-1"></i>
                        </Badge>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Passport & VISA */}
                  <Col md={6} lg={4}>
                    <Card 
                      className="h-100 process-card border-0 shadow-sm"
                      onClick={() => navigate('/passport-visa')}
                      style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    >
                      <Card.Body className="text-center p-4">
                        <div className="process-icon mb-3">
                          <i className="fas fa-passport fa-2x text-danger"></i>
                        </div>
                        <h6 className="fw-bold text-dark mb-2">Passport & VISA</h6>
                        <p className="text-muted small mb-3">
                          Final passport stamping and visa issuance
                        </p>
                        <Badge bg="danger" className="px-3 py-2">
                          Final Step <i className="fas fa-flag ms-1"></i>
                        </Badge>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* Help Text */}
                <div className="text-center mt-4">
                  <small className="text-muted">
                    <i className="fas fa-info-circle me-1"></i>
                    Complete each step in order to finalize your visa process
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Container>
        )}

        {/* Rest of your profile details sections remain the same */}
        {/* Personal Details Section */}
        <Row>
          <Col lg={6} className="mb-4">
            <Card className="h-100 shadow-sm">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">
                  <i className="fas fa-user me-2"></i>
                  Personal Details
                </h5>
              </Card.Header>
              <Card.Body>
                <table className="table table-borderless table-sm">
                  <tbody>
                    <tr>
                      <td width="40%" className="text-muted">Surname</td>
                      <td><strong>{profile.surname || "Not provided"}</strong></td>
                    </tr>
                    <tr>
                      <td className="text-muted">Name</td>
                      <td><strong>{profile.name || "Not provided"}</strong></td>
                    </tr>
                    <tr>
                      <td className="text-muted">Previous Name</td>
                      <td>{profile.previousName || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Sex</td>
                      <td><Badge bg="secondary">{profile.sex || "Not provided"}</Badge></td>
                    </tr>
                    <tr>
                      <td className="text-muted">Marital Status</td>
                      <td>{profile.maritalStatus || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Date of Birth</td>
                      <td>{formatDate(profile.dob)}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Religion</td>
                      <td>{profile.religion || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Birth City</td>
                      <td>{profile.birthCity || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Birth Country</td>
                      <td>{profile.birthCountry || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">National ID</td>
                      <td><code>{profile.nationalId || "Not provided"}</code></td>
                    </tr>
                    <tr>
                      <td className="text-muted">Education</td>
                      <td>{profile.education || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Identification Marks</td>
                      <td>{profile.marks || "Not provided"}</td>
                    </tr>
                  </tbody>
                </table>
              </Card.Body>
            </Card>
          </Col>

          {/* Passport & Contact Details */}
          <Col lg={6} className="mb-4">
            {/* Passport Details */}
            <Card className="mb-4 shadow-sm">
              <Card.Header className="bg-success text-white">
                <h5 className="mb-0">
                  <i className="fas fa-passport me-2"></i>
                  Passport Details
                </h5>
              </Card.Header>
              <Card.Body>
                <table className="table table-borderless table-sm">
                  <tbody>
                    <tr>
                      <td width="40%" className="text-muted">Passport No</td>
                      <td><code>{profile.passportNo || "Not provided"}</code></td>
                    </tr>
                    <tr>
                      <td className="text-muted">Issue Date</td>
                      <td>{formatDate(profile.passportIssueDate)}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Place of Issue</td>
                      <td>{profile.passportPlace || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Expiry Date</td>
                      <td>{formatDate(profile.passportExpiry)}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Passport Region</td>
                      <td><Badge bg="info">{profile.passportRegion || "Not provided"}</Badge></td>
                    </tr>
                  </tbody>
                </table>
              </Card.Body>
            </Card>

            {/* Contact Details */}
            <Card className="shadow-sm">
              <Card.Header className="bg-warning text-dark">
                <h5 className="mb-0">
                  <i className="fas fa-address-book me-2"></i>
                  Contact Details
                </h5>
              </Card.Header>
              <Card.Body>
                <table className="table table-borderless table-sm">
                  <tbody>
                    <tr>
                      <td width="40%" className="text-muted">Contact Address</td>
                      <td>{profile.contactAddress || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Phone</td>
                      <td>{profile.phone || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Mobile</td>
                      <td>{profile.mobile || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Email</td>
                      <td><a href={`mailto:${profile.email}`}>{profile.email || "Not provided"}</a></td>
                    </tr>
                    <tr>
                      <td className="text-muted">Permanent Address</td>
                      <td>{profile.permanentAddress || "Not provided"}</td>
                    </tr>
                  </tbody>
                </table>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Family Details */}
        <Row>
          <Col lg={6} className="mb-4">
            <Card className="shadow-sm">
              <Card.Header className="bg-info text-white">
                <h5 className="mb-0">
                  <i className="fas fa-male me-2"></i>
                  Father's Details
                </h5>
              </Card.Header>
              <Card.Body>
                <table className="table table-borderless table-sm">
                  <tbody>
                    <tr>
                      <td width="40%" className="text-muted">Name</td>
                      <td><strong>{profile.fatherName || "Not provided"}</strong></td>
                    </tr>
                    <tr>
                      <td className="text-muted">Nationality</td>
                      <td>{profile.fatherNationality || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Previous Nationality</td>
                      <td>{profile.fatherPrevNationality || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Birth City</td>
                      <td>{profile.fatherBirthCity || "Not provided"}</td>
                    </tr>
                  </tbody>
                </table>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6} className="mb-4">
            <Card className="shadow-sm">
              <Card.Header className="bg-info text-white">
                <h5 className="mb-0">
                  <i className="fas fa-female me-2"></i>
                  Mother's Details
                </h5>
              </Card.Header>
              <Card.Body>
                <table className="table table-borderless table-sm">
                  <tbody>
                    <tr>
                      <td width="40%" className="text-muted">Name</td>
                      <td><strong>{profile.motherName || "Not provided"}</strong></td>
                    </tr>
                    <tr>
                      <td className="text-muted">Nationality</td>
                      <td>{profile.motherNationality || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Previous Nationality</td>
                      <td>{profile.motherPrevNationality || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Birth City</td>
                      <td>{profile.motherBirthCity || "Not provided"}</td>
                    </tr>
                  </tbody>
                </table>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Visa Details */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-dark text-white">
            <h5 className="mb-0">
              <i className="fas fa-plane me-2"></i>
              Visa & Migration Details
            </h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <table className="table table-borderless table-sm">
                  <tbody>
                    <tr>
                      <td width="40%" className="text-muted">Visa Type</td>
                      <td><Badge bg="primary">{profile.visaType || "Not provided"}</Badge></td>
                    </tr>
                    <tr>
                      <td className="text-muted">Number of Entries</td>
                      <td>{profile.entries || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Visa Period (Months)</td>
                      <td>{profile.visaPeriod || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Sponsor</td>
                      <td>{profile.sponsor || "Not provided"}</td>
                    </tr>
                  </tbody>
                </table>
              </Col>
              <Col md={6}>
                <table className="table table-borderless table-sm">
                  <tbody>
                    <tr>
                      <td width="40%" className="text-muted">Expected Journey Date</td>
                      <td>{formatDate(profile.journeyDate)}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Port of Arrival</td>
                      <td>{profile.arrival || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Port of Exit</td>
                      <td>{profile.exit || "Not provided"}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Migration Type</td>
                      <td><Badge bg="secondary">{profile.migrationType || "Not provided"}</Badge></td>
                    </tr>
                  </tbody>
                </table>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Payment Section */}
        <Payment />
      </Container>

      {/* Application Letter Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-file-alt text-primary me-2"></i>
            Approval Letter - {profile?.applicationLetterName || 'Document'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {letterLoading ? (
            <div className="py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading approval letter...</span>
              </div>
              <p className="mt-2">Loading approval letter...</p>
            </div>
          ) : applicationLetter ? (
            <div>
              <div className="mb-3">
                {/* Display based on file type */}
                {profile.applicationLetterType?.includes('image/') ? (
                  <img
                    src={applicationLetter}
                    alt="Approval Letter"
                    className="img-fluid rounded shadow"
                    style={{ 
                      maxHeight: '60vh', 
                      objectFit: 'contain',
                      border: '1px solid #dee2e6',
                      maxWidth: '100%'
                    }}
                    onError={(e) => {
                      console.error("Error loading image from URL");
                      e.target.style.display = 'none';
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'alert alert-danger';
                      errorDiv.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Failed to load image. The file may be corrupted or unavailable.';
                      e.target.parentNode.appendChild(errorDiv);
                    }}
                  />
                ) : profile.applicationLetterType === 'application/pdf' ? (
                  <iframe
                    src={applicationLetter}
                    width="100%"
                    height="600"
                    style={{ border: '1px solid #dee2e6', borderRadius: '4px' }}
                    title="Approval Letter PDF"
                  >
                    <p>Your browser does not support PDFs. <a href={applicationLetter} download>Download the PDF</a> instead.</p>
                  </iframe>
                ) : (
                  <div className="alert alert-info">
                    <i className="fas fa-download me-2"></i>
                    This file type cannot be previewed. Please download the file to view it.
                  </div>
                )}
              </div>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <Button
                  variant="primary"
                  onClick={() => setShowModal(false)}
                  className="d-flex align-items-center"
                >
                  <i className="fas fa-times me-2"></i>
                  Close
                </Button>
                <Button
                  variant="success"
                  onClick={handleDownloadLetter}
                  className="d-flex align-items-center"
                >
                  <i className="fas fa-download me-2"></i>
                  Download
                </Button>
              </div>
              <div className="mt-3">
                <small className="text-muted">
                  <strong>File Type:</strong> {profile.applicationLetterType || 'Unknown'} | 
                  <strong> Size:</strong> {profile.applicationLetterSize ? formatFileSize(profile.applicationLetterSize) : 'Unknown'} | 
                  <strong> Uploaded:</strong> {profile.applicationLetterUploadedAt ? formatDate(profile.applicationLetterUploadedAt) : 'Unknown'}
                </small>
              </div>
            </div>
          ) : (
            <div className="py-5 text-muted">
              <i className="fas fa-file-exclamation fa-3x mb-3"></i>
              <h5>Approval Letter Not Available</h5>
              <p>The approval letter is not available at the moment. Please contact support if you believe this is an error.</p>
              <div className="mt-3">
                <Button variant="outline-secondary" onClick={() => setShowModal(false)} className="me-2">
                  Close
                </Button>
                <Button variant="primary" onClick={fetchApplicationLetter}>
                  <i className="fas fa-redo me-2"></i>
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

      <Container>
        <SupportGlowButton/>
      </Container>
    </>
  );
}

export default Profile;