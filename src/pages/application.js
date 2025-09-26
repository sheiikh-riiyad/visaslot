// src/pages/application.js
import { useState, useEffect } from "react";
import { Row, Col, Form, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import { db, auth } from "../firebaseConfig";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, signOut } from "firebase/auth";

const initialFormData = {
  surname: "",
  name: "",
  previousName: "",
  sex: "",
  maritalStatus: "",
  dob: "",
  religion: "",
  birthCity: "",
  birthCountry: "",
  nationalId: "",
  education: "",
  marks: "",
  passportNo: "",
  passportIssueDate: "",
  passportPlace: "",
  passportExpiry: "",
  otherCountry: "",
  otherPlace: "",
  otherPassportNo: "",
  otherIssueDate: "",
  otherNationality: "",
  contactAddress: "",
  phone: "",
  mobile: "",
  email: "",
  permanentAddress: "",
  fatherName: "",
  fatherNationality: "",
  fatherPrevNationality: "",
  fatherBirthCity: "",
  motherName: "",
  motherNationality: "",
  motherPrevNationality: "",
  motherBirthCity: "",
  visaType: "",
  entries: "",
  visaPeriod: "",
  journeyDate: "",
  arrival: "",
  exit: "",
  passportRegion: "",
  migrationType: "",
  photo: null,
};

function Application() {
  const [formData, setFormData] = useState(initialFormData);
  const [user, setUser] = useState(null);

  // whether user already submitted an application doc
  const [hasProfile, setHasProfile] = useState(false);
  const [applicationDocId, setApplicationDocId] = useState(null);

  // transactions list
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Listen for auth state and then check if application exists + fetch transactions
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        checkProfileAndTransactions(currentUser.uid);
      } else {
        // reset state when logged out
        setHasProfile(false);
        setApplicationDocId(null);
        setTransactions([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Check if user already has an application doc and fetch transactions
  const checkProfileAndTransactions = async (uid) => {
    try {
      setLoading(true);
      // check application
      const q = query(collection(db, "applications"), where("uid", "==", uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setHasProfile(true);
        setApplicationDocId(snap.docs[0].id);
      } else {
        setHasProfile(false);
        setApplicationDocId(null);
      }

      // fetch transactions
      const q2 = query(collection(db, "transactions"), where("userId", "==", uid));
      const snap2 = await getDocs(q2);
      const txs = snap2.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a,b) => 
        new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt) - 
        new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt)
      );
      setTransactions(txs);
    } catch (err) {
      console.error("Error checking profile/transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  // handle text/file inputs for application form
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Submit application (only once)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("You must be logged in to submit the form");

    try {
      setLoading(true);
      let photoURL = "";

      // upload photo to firebase storage (if provided)
      if (formData.photo) {
        const storage = getStorage();
        const storageRef = ref(storage, `photos/${Date.now()}_${formData.photo.name}`);
        await uploadBytes(storageRef, formData.photo);
        photoURL = await getDownloadURL(storageRef);
      }

      // save application doc
      const docRef = await addDoc(collection(db, "applications"), {
        ...formData,
        photo: photoURL,
        uid: user.uid,
        createdAt: new Date(),
      });

      setHasProfile(true);
      setApplicationDocId(docRef.id);

      // reset form
      setFormData(initialFormData);

      // refresh transactions (if any)
      await checkProfileAndTransactions(user.uid);

      alert("Application submitted successfully!");
    } catch (err) {
      console.error("Error adding document: ", err);
      alert("Failed to submit application.");
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("Logged out successfully!");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  // Get status badge with color
  const getStatusBadge = (status) => {
    const statusStyles = {
      Pending: "warning",
      Completed: "success",
      Failed: "danger",
      Approved: "info",
      Rejected: "dark"
    };
    
    return (
      <span className={`badge bg-${statusStyles[status] || 'secondary'}`}>
        {status}
      </span>
    );
  };

  // if not logged in
  if (!user) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <h3>You must log in to see the application form</h3>
        <Button as={Link} to="/authorize" variant="primary">
          Login
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 text-white" style={{ backgroundColor: "#1b4f72", textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <span style={{ marginRight: "10px" }}>Welcome, {user.email}</span>
        <Button onClick={handleLogout} variant="outline-info" className="me-2">Logout</Button>
        <Button as={Link} to="/profile" variant="outline-info">Profile</Button>
      </div>

      <div className="p-4 text-white mt-1" style={{ backgroundColor: "#2b91b2", textAlign: "center" }}>
        <h2>Visa and Migration</h2>
        <p>Information about visa and migration services</p>

        <div style={{ maxWidth: 1100, margin: "20px auto", textAlign: "left" }}>
          {/* If user has not submitted the application -> show the big form */}
          {!hasProfile ? (
            <Form onSubmit={handleSubmit}>
              <h4 style={{ color: "black" }}>A. Personal details (Asian passport)</h4>

              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Photo</Form.Label>
                    <Form.Control onChange={handleChange} type="file" accept="image/*" name="photo" required />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Surname</Form.Label>
                    <Form.Control value={formData.surname} onChange={handleChange} type="text" name="surname" placeholder="Surname" required />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Name</Form.Label>
                    <Form.Control value={formData.name} onChange={handleChange} type="text" name="name" placeholder="Name" required />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Previous/Other Name</Form.Label>
                    <Form.Control value={formData.previousName} onChange={handleChange} type="text" name="previousName" placeholder="Previous/Other Name" />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col>
                  <Form.Label>Sex</Form.Label>
                  <Form.Select value={formData.sex} onChange={handleChange} name="sex" required>
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </Form.Select>
                </Col>
                <Col>
                  <Form.Label>Marital Status</Form.Label>
                  <Form.Select value={formData.maritalStatus} onChange={handleChange} name="maritalStatus" required>
                    <option value="">Select</option>
                    <option>Married</option>
                    <option>Unmarried</option>
                    <option>Divorced</option>
                  </Form.Select>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Date of Birth</Form.Label>
                    <Form.Control value={formData.dob} onChange={handleChange} type="date" name="dob" required />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Religion</Form.Label>
                    <Form.Control value={formData.religion} onChange={handleChange} type="text" name="religion" placeholder="Religion" required />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Place of Birth (Town/City)</Form.Label>
                    <Form.Control value={formData.birthCity} onChange={handleChange} type="text" name="birthCity" required />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Country of Birth</Form.Label>
                    <Form.Control value={formData.birthCountry} onChange={handleChange} type="text" name="birthCountry" required />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Citizenship/National ID No</Form.Label>
                    <Form.Control value={formData.nationalId} onChange={handleChange} type="text" name="nationalId" required />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Educational Qualification</Form.Label>
                    <Form.Control value={formData.education} onChange={handleChange} type="text" name="education" />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Visible Identification Marks</Form.Label>
                    <Form.Control value={formData.marks} onChange={handleChange} type="text" name="marks" />
                  </Form.Group>
                </Col>
              </Row>

              <h4 style={{ color: "black" }}>B. Passport details</h4>
              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Passport No.</Form.Label>
                    <Form.Control value={formData.passportNo} onChange={handleChange} type="text" name="passportNo" required />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Date of Issue</Form.Label>
                    <Form.Control value={formData.passportIssueDate} onChange={handleChange} type="date" name="passportIssueDate" required />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Place of Issue</Form.Label>
                    <Form.Control value={formData.passportPlace} onChange={handleChange} type="text" name="passportPlace" required />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Date of Expiry</Form.Label>
                    <Form.Control value={formData.passportExpiry} onChange={handleChange} type="date" name="passportExpiry" required />
                  </Form.Group>
                </Col>
              </Row>

              <p style={{ color: "black" }}>
                Any other Passport/Identity Certificate held (if yes, fill below)
              </p>
              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Country of Issue</Form.Label>
                    <Form.Control  onChange={handleChange} type="text" name="otherCountry" />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Place of Issue</Form.Label>
                    <Form.Control  onChange={handleChange} type="text" name="otherPlace" />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Passport/IC No.</Form.Label>
                    <Form.Control onChange={handleChange} type="text" name="otherPassportNo" />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Date of Issue</Form.Label>
                    <Form.Control onChange={handleChange} type="date" name="otherIssueDate" />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Nationality/Status</Form.Label>
                    <Form.Control onChange={handleChange} type="text" name="otherNationality" />
                  </Form.Group>
                </Col>
              </Row>

              <h4 style={{ color: "black" }}>C. Applicant contact details</h4>
              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Passport Address</Form.Label>
                    <Form.Control value={formData.contactAddress} onChange={handleChange} type="text" name="contactAddress" required />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone No.</Form.Label>
                    <Form.Control value={formData.phone} onChange={handleChange} type="tel" name="phone" required />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Mobile/Cell No.</Form.Label>
                    <Form.Control value={formData.mobile} onChange={handleChange} type="tel" name="mobile" />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Email Address</Form.Label>
                    <Form.Control value={formData.email} onChange={handleChange} type="email" name="email" required />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Permanent Address</Form.Label>
                    <Form.Control value={formData.permanentAddress} onChange={handleChange} type="text" name="permanentAddress" required />
                  </Form.Group>
                </Col>
              </Row>

              <h4 style={{ color: "black" }}>D. Family details</h4>
              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Father's Name</Form.Label>
                    <Form.Control value={formData.fatherName} onChange={handleChange} type="text" name="fatherName" required />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Nationality</Form.Label>
                    <Form.Control value={formData.fatherNationality} onChange={handleChange} type="text" name="fatherNationality" required />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Previous Nationality</Form.Label>
                    <Form.Control  onChange={handleChange} type="text" name="fatherPrevNationality" />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Place/City of Birth</Form.Label>
                    <Form.Control onChange={handleChange} type="text" name="fatherBirthCity" required />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Mother's Name</Form.Label>
                    <Form.Control value={formData.motherName} onChange={handleChange} type="text" name="motherName" required />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Nationality</Form.Label>
                    <Form.Control value={formData.motherNationality} onChange={handleChange} type="text" name="motherNationality" required />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Previous Nationality</Form.Label>
                    <Form.Control onChange={handleChange} type="text" name="motherPrevNationality" />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Place/City of Birth</Form.Label>
                    <Form.Control onChange={handleChange} type="text" name="motherBirthCity" required />
                  </Form.Group>
                </Col>
              </Row>

              <h4 style={{ color: "black" }}>E. Details of visa</h4>
              <Row>
                <Col>
                  <Form.Label>Type of Visa</Form.Label>
                  <Form.Select value={formData.visaType} onChange={handleChange} name="visaType" required>
                    <option value="">Select</option>
                    <option>General</option>
                  </Form.Select>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>No. of Entries</Form.Label>
                    <Form.Control value={formData.entries} onChange={handleChange} type="number" name="entries" min="1" />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Period of Visa (Months)</Form.Label>
                    <Form.Control value={formData.visaPeriod} onChange={handleChange} type="number" name="visaPeriod" min="1" />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Expected Date of Journey</Form.Label>
                    <Form.Control value={formData.journeyDate} onChange={handleChange} type="date" name="journeyDate" />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Port of Arrival</Form.Label>
                    <Form.Control value={formData.arrival} onChange={handleChange} type="text" name="arrival" />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Port of Exit</Form.Label>
                    <Form.Control value={formData.exit} onChange={handleChange} type="text" name="exit" />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Form.Label>Passport Region</Form.Label>
                  <Form.Select value={formData.passportRegion} onChange={handleChange} name="passportRegion" required>
                    <option value="">Select</option>
                    <option>Asia</option>
                    <option>America</option>
                    <option>UAE</option>
                  </Form.Select>
                </Col>
                <Col>
                  <Form.Label>Type of Migration</Form.Label>
                  <Form.Select value={formData.migrationType} onChange={handleChange} name="migrationType" required>
                    <option value="">Select</option>
                    <option>Subclass 186 – Employer Nomination Scheme (ENS) visa</option>
                    <option>Subclass 187 – Regional Sponsored Migration Scheme (RSMS) visa</option>
                    <option>Subclass 494 – Skilled Employer Sponsored Regional (Provisional) visa</option>
                    <option>Subclass 400 – Temporary Work (Short Stay Specialist) visa</option>
                    <option>Subclass 407 – Training visa</option>
                    <option>Subclass 189 – Skilled Independent visa</option>
                    <option>Subclass 190 – Skilled Nominated visa</option>
                    <option>Subclass 491 – Skilled Work Regional (Provisional) visa</option>
                    <option>Subclass 408 – Temporary Activity visa</option>
                    <option>Subclass 600 – Visitor visa</option>
                  </Form.Select>
                </Col>
              </Row>

              <br />
              <Button variant="dark" type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit Application"}
              </Button>
            </Form>
          ) : (
            /* If user has already submitted -> show only transaction history */
            <div>
              <div className="card p-3 mb-3">
                <h4 style={{ color: "black" }}>Application Submitted Successfully! ✅</h4>
                <p className="text-muted">Your application has been received. Below is your payment history.</p>
                <p>
                  <strong>Note:</strong> To make payments, please go to the{" "}
                  <Link to="/profile" style={{textDecoration: 'none'}}>
                    <strong>Payment Page</strong>
                  </Link>
                </p>
              </div>

              <div className="card p-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Your Payment History</h5>
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    onClick={() => checkProfileAndTransactions(user.uid)}
                    disabled={loading}
                  >
                    {loading ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>
                
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2 text-muted">Loading payment history...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted">No payment history found.</p>
                    <small>Your payment history will appear here after you make payments.</small>
                    <div className="mt-3">
                      <Button as={Link} to="/profile" variant="primary">
                        Go to Payment Page
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped table-hover">
                      <thead className="table-dark">
                        <tr>
                          <th>Date & Time</th>
                          <th>Category</th>
                          <th>Method</th>
                          <th>Transaction ID</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((t) => (
                          <tr key={t.id}>
                            <td>
                              <small>{formatDate(t.createdAt)}</small>
                            </td>
                            <td>{t.paymentCategory}</td>
                            <td>
                              <span className="badge bg-light text-dark">
                                {t.paymentMethod}
                              </span>
                            </td>
                            <td>
                              <code className="text-primary">{t.transactionId || "—"}</code>
                            </td>
                            <td>{getStatusBadge(t.paymentStatus)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Application;