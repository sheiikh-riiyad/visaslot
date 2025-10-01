// src/pages/Profile.js
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import Payment from "./payment";
import { Card, Row, Col, Container, Badge, Alert } from "react-bootstrap";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [docId, setDocId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  console.log(docId)
  useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    try {
      if (!user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "applications"),
        where("uid", "==", user.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setProfile(snap.docs[0].data());
        setDocId(snap.docs[0].id);
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

  // Cleanup function
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

  // Format date fields for better display
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

  return (
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

      {/* Application Status Badge */}
      <Row className="mb-4">
        <Col>
          <Alert variant="info" className="d-flex align-items-center">
            <i className="fas fa-info-circle me-2"></i>
            <div>
              <strong>Application Status:</strong> 
              <Badge bg="primary" className="ms-2">
                {profile.applicationStatus || "Under Review"}


              </Badge>
              
            </div>
          </Alert>
        </Col>
      </Row>

      <Row>
        {/* Personal Details Section */}
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
  );
}

export default Profile;