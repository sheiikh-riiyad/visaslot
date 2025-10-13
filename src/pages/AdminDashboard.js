// src/pages/AdminDashboard.js
import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy,  } from 'firebase/firestore';
import { db, auth, ADMIN_EMAILS } from '../firebaseConfig';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Table, 
  Button, 
  Badge, 
  Form, 
  Modal,
 
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
  const [applications, setApplications] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const navigate = useNavigate();

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = () => {
      const user = auth.currentUser;
      if (!user || !ADMIN_EMAILS.includes(user.email)) {
        navigate('/admin/login');
        return false;
      }
      return true;
    };

    if (!checkAdmin()) return;

    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch applications
      const applicationsQuery = query(
        collection(db, 'applications'),
        orderBy('createdAt', 'desc')
      );
      const applicationsSnapshot = await getDocs(applicationsQuery);
      const applicationsData = applicationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setApplications(applicationsData);

      // Fetch transactions
      const transactionsQuery = query(
        collection(db, 'transactions'),
        orderBy('createdAt', 'desc')
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactionsData = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(transactionsData);

      // Calculate stats
      calculateStats(applicationsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (apps) => {
    const stats = {
      total: apps.length,
      pending: apps.filter(app => !app.applicationStatus || app.applicationStatus === 'Under Review').length,
      approved: apps.filter(app => app.applicationStatus === 'approved').length,
      rejected: apps.filter(app => app.applicationStatus === 'rejected').length
    };
    setStats(stats);
  };

  const updateApplicationStatus = async (applicationId, newStatus) => {
    try {
      const applicationRef = doc(db, 'applications', applicationId);
      await updateDoc(applicationRef, {
        applicationStatus: newStatus,
        updatedAt: new Date()
      });

      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === applicationId ? { ...app, applicationStatus: newStatus } : app
      ));

      // Recalculate stats
      calculateStats(applications.map(app => 
        app.id === applicationId ? { ...app, applicationStatus: newStatus } : app
      ));

      alert(`Application status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating application status');
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const filteredApplications = applications.filter(app => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return !app.applicationStatus || app.applicationStatus === 'Under Review';
    return app.applicationStatus === statusFilter;
  });

  const getStatusBadge = (status) => {
    const statusMap = {
      'approved': 'success',
      'rejected': 'danger',
      'Under Review': 'warning',
      'pending': 'warning'
    };
    
    const displayStatus = status || 'Under Review';
    return (
      <Badge bg={statusMap[displayStatus] || 'secondary'}>
        {displayStatus}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading admin dashboard...</p>
        </div>
      </Container>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="bg-dark text-white p-3">
        <Container>
          <Row className="align-items-center">
            <Col>
              <h4 className="mb-0">Admin Dashboard</h4>
              <small>Australia Immigration Service</small>
            </Col>
            <Col xs="auto">
              <Button variant="outline-light" onClick={handleLogout}>
                Logout
              </Button>
            </Col>
          </Row>
        </Container>
      </div>

      <Container fluid className="py-4">
        {/* Statistics Cards */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3>{stats.total}</h3>
                <p className="text-muted mb-0">Total Applications</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-warning">{stats.pending}</h3>
                <p className="text-muted mb-0">Pending Review</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-success">{stats.approved}</h3>
                <p className="text-muted mb-0">Approved</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-danger">{stats.rejected}</h3>
                <p className="text-muted mb-0">Rejected</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Applications Section */}
        <Row>
          <Col>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Visa Applications</h5>
                <Form.Select 
                  style={{ width: 'auto' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Applications</option>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </Form.Select>
              </Card.Header>
              <Card.Body>
                <div className="table-responsive">
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Visa Type</th>
                        <th>Submission Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApplications.map((app) => (
                        <tr key={app.id}>
                          <td>
                            <small className="text-muted">{app.id.substring(0, 8)}...</small>
                          </td>
                          <td>
                            <strong>{app.name} {app.surname}</strong>
                          </td>
                          <td>{app.email}</td>
                          <td>{app.visaType}</td>
                          <td>
                            {app.createdAt?.toDate ? 
                              app.createdAt.toDate().toLocaleDateString() : 
                              'N/A'
                            }
                          </td>
                          <td>{getStatusBadge(app.applicationStatus)}</td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-1"
                              onClick={() => {
                                setSelectedApplication(app);
                                setShowModal(true);
                              }}
                            >
                              View
                            </Button>
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="me-1"
                              onClick={() => updateApplicationStatus(app.id, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => updateApplicationStatus(app.id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Transactions Section */}
        <Row className="mt-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Payment Transactions</h5>
              </Card.Header>
              <Card.Body>
                <div className="table-responsive">
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>User ID</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td>
                            <code>{tx.transactionId || 'N/A'}</code>
                          </td>
                          <td>
                            <small>{tx.userId?.substring(0, 8)}...</small>
                          </td>
                          <td>${tx.amount || 'N/A'}</td>
                          <td>
                            <Badge bg="info">{tx.paymentMethod}</Badge>
                          </td>
                          <td>
                            <Badge bg={
                              tx.paymentStatus === 'Completed' ? 'success' :
                              tx.paymentStatus === 'Pending' ? 'warning' : 'danger'
                            }>
                              {tx.paymentStatus}
                            </Badge>
                          </td>
                          <td>
                            {tx.createdAt?.toDate ? 
                              tx.createdAt.toDate().toLocaleDateString() : 
                              'N/A'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Application Detail Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Application Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedApplication && (
            <div>
              <Row>
                <Col md={6}>
                  <h6>Personal Information</h6>
                  <p><strong>Name:</strong> {selectedApplication.name} {selectedApplication.surname}</p>
                  <p><strong>Email:</strong> {selectedApplication.email}</p>
                  <p><strong>Phone:</strong> {selectedApplication.phone}</p>
                  <p><strong>DOB:</strong> {selectedApplication.dob}</p>
                </Col>
                <Col md={6}>
                  <h6>Application Details</h6>
                  <p><strong>Visa Type:</strong> {selectedApplication.visaType}</p>
                  <p><strong>Migration Type:</strong> {selectedApplication.migrationType}</p>
                  <p><strong>Sponsor:</strong> {selectedApplication.sponsor}</p>
                  <p><strong>Status:</strong> {getStatusBadge(selectedApplication.applicationStatus)}</p>
                </Col>
              </Row>
              
              <hr />
              
              <h6>Passport Details</h6>
              <p><strong>Passport No:</strong> {selectedApplication.passportNo}</p>
              <p><strong>Expiry:</strong> {selectedApplication.passportExpiry}</p>
              
              {selectedApplication.photo && (
                <>
                  <hr />
                  <h6>Applicant Photo</h6>
                  <img 
                    src={selectedApplication.photo} 
                    alt="Applicant" 
                    style={{ maxWidth: '200px', maxHeight: '200px' }}
                  />
                </>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default AdminDashboard;