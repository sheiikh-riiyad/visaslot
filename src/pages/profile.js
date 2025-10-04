// src/pages/Profile.js
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import Payment from "./payment";
import { Card, Row, Col, Container, Badge, Alert, Button, Modal } from "react-bootstrap";
import SupportGlowButton from "../components/buttons";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [docId, setDocId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [applicationLetter, setApplicationLetter] = useState(null);
  const [letterLoading, setLetterLoading] = useState(false);

  // Function to fetch application letter from base64
  const fetchApplicationLetter = async () => {
    if (!docId) return;
    
    setLetterLoading(true);
    try {
      const applicationDocRef = doc(db, "applications", docId);
      const applicationDoc = await getDoc(applicationDocRef);
      
      if (applicationDoc.exists()) {
        const data = applicationDoc.data();
        console.log("Application data:", data);
        
        // Check for base64 data in different possible field names
        const base64Data = data.applicationLetter || data.letterBase64 || data.documentBase64 || data.approvalLetter;
        
        if (base64Data) {
          console.log("Found base64 data, length:", base64Data.length);
          // Check if it's already a data URL or needs conversion
          if (base64Data.startsWith('data:image/')) {
            setApplicationLetter(base64Data);
          } else {
            // Convert base64 string to data URL - try different image formats
            let dataUrl = base64Data;
            if (!base64Data.startsWith('data:')) {
              // Try to detect image type or default to png
              dataUrl = `data:image/png;base64,${base64Data}`;
            }
            setApplicationLetter(dataUrl);
          }
        } else {
          console.log("No base64 data found in fields");
          setApplicationLetter(null);
        }
      } else {
        console.log("Document does not exist");
        setApplicationLetter(null);
      }
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

  // Download base64 image as file

  // const downloadLetter = () => {
  //   if (!applicationLetter) return;
    
  //   try {
  //     const link = document.createElement('a');
  //     link.href = applicationLetter;
  //     link.download = `approval-letter-${profile?.surname || 'document'}.png`;
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //   } catch (error) {
  //     console.error("Error downloading letter:", error);
  //     alert("Error downloading document. Please try again.");
  //   }
  // };

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
          console.log("Profile loaded:", data);
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
  }, []);

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
              
              {/* View Button - Only show if status is "approved" */}
              {profile && profile.applicationStatus && 
               profile.applicationStatus.toLowerCase() === "approved" && (
                <>
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

                <a href="/jobdetails">We Need to Verify Your Job Details</a>
                </>
              )}
            </Alert>
          </Col>
        </Row>

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
            Approval Letter
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
                <img
                  src={profile.applicationLetter}
                  alt="Approval Letter"
                  className="img-fluid rounded shadow"
                  style={{ 
                    maxHeight: '60vh', 
                    objectFit: 'contain',
                    border: '1px solid #dee2e6',
                    maxWidth: '100%'
                  }}
                  onError={(e) => {
                    console.error("Error loading base64 image");
                    e.target.style.display = 'none';
                    // Show error message
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'alert alert-danger';
                    errorDiv.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Failed to load image. The base64 data may be corrupted.';
                    e.target.parentNode.appendChild(errorDiv);
                  }}
                />
              </div>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                {/* <Button
                  variant="outline-primary"
                  onClick={downloadLetter}
                  className="d-flex align-items-center"
                >
                  <i className="fas fa-download me-2"></i>
                  Download Letter
                </Button> */}
                <Button
                  variant="primary"
                  onClick={() => setShowModal(false)}
                  className="d-flex align-items-center"
                >
                  <i className="fas fa-times me-2"></i>
                  Close
                </Button>
              </div>
              <div className="mt-3">
                <small className="text-muted">
                  File format: PNG Image | Base64 encoded
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