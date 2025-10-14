import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Nav, Badge, Alert, Spinner } from "react-bootstrap";
import { db, auth, ADMIN_EMAILS } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import AdminApplications from "./AdminApplications";
import AdminPayments from "./AdminPayments";

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState("applications");
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingApplications: 0,
    totalPayments: 0,
    pendingPayments: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && ADMIN_EMAILS.includes(currentUser.email)) {
        setAuthorized(true);
        await loadDashboardStats();
      } else {
        setAuthorized(false);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Count applications
      const appsRef = collection(db, "applications");
      const appsSnapshot = await getDocs(appsRef);
      const totalApps = appsSnapshot.size;
      const pendingApps = appsSnapshot.docs.filter(doc => 
        doc.data().status === "pending" || !doc.data().status
      ).length;

      // Count payments
      const paymentsRef = collection(db, "transactions");
      const paymentsSnapshot = await getDocs(paymentsRef);
      const totalPays = paymentsSnapshot.size;
      const pendingPays = paymentsSnapshot.docs.filter(doc => 
        doc.data().paymentStatus === "pending"
      ).length;

      setStats({
        totalApplications: totalApps,
        pendingApplications: pendingApps,
        totalPayments: totalPays,
        pendingPayments: pendingPays
      });
      
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("adminEmail");
    navigate("/");
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading admin dashboard...</p>
        </div>
      </Container>
    );
  }

  if (!authorized) {
    return (
      <Container className="py-5">
        <Alert variant="danger" className="text-center">
          <h4>Access Denied</h4>
          <p>Only authorized admin emails can access this page.</p>
          <Button variant="primary" onClick={() => navigate("/admin/login")}>
            Go to Admin Login
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 bg-light min-vh-100">
      <Row>
        {/* Sidebar */}
        <Col md={3} lg={2}>
          <Card className="shadow-sm sticky-top">
            <Card.Header className="bg-dark text-white">
              <h5 className="mb-1">Admin Dashboard</h5>
              <small className="text-light opacity-75">
                <i className="fas fa-user-shield me-1"></i>
                {user?.email}
              </small>
            </Card.Header>
            <Card.Body className="p-0">
              <Nav variant="pills" className="flex-column">
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === "applications"} 
                    onClick={() => setActiveTab("applications")}
                    className="rounded-0 d-flex align-items-center"
                  >
                    <i className="fas fa-file-alt me-2"></i>
                    Visa Applications
                    {stats.pendingApplications > 0 && (
                      <Badge bg="danger" className="ms-auto">
                        {stats.pendingApplications}
                      </Badge>
                    )}
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === "payments"} 
                    onClick={() => setActiveTab("payments")}
                    className="rounded-0 d-flex align-items-center"
                  >
                    <i className="fas fa-credit-card me-2"></i>
                    Payments
                    {stats.pendingPayments > 0 && (
                      <Badge bg="warning" className="ms-auto">
                        {stats.pendingPayments}
                      </Badge>
                    )}
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Card.Body>
            <Card.Footer className="bg-light">
              <div className="d-grid gap-2">
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={loadDashboardStats}
                >
                  <i className="fas fa-sync-alt me-1"></i>
                  Refresh Stats
                </Button>
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  onClick={handleLogout}
                >
                  <i className="fas fa-sign-out-alt me-1"></i>
                  Logout
                </Button>
              </div>
            </Card.Footer>
          </Card>
        </Col>

        {/* Main Content */}
        <Col md={9} lg={10}>
          {/* Dashboard Header */}
          <Row className="mb-4">
            <Col>
              <Card className="shadow-sm border-0">
                <Card.Body className="p-4">
                  <Row className="align-items-center">
                    <Col>
                      <h4 className="mb-1 text-dark">
                        <i className="fas fa-tachometer-alt me-2 text-primary"></i>
                        Admin Dashboard
                      </h4>
                      <p className="mb-0 text-muted">
                        Welcome back, {user?.email}
                      </p>
                    </Col>
                    <Col xs="auto">
                      <Badge bg="success" className="fs-6">
                        <i className="fas fa-circle me-1"></i>
                        Online
                      </Badge>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Statistics Cards */}
          <Row className="mb-4">
            <Col xl={3} lg={6} className="mb-3">
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center">
                  <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                       style={{ width: '60px', height: '60px' }}>
                    <i className="fas fa-file-alt fa-lg text-primary"></i>
                  </div>
                  <h3 className="text-primary fw-bold">{stats.totalApplications}</h3>
                  <h6 className="text-muted mb-0">Total Applications</h6>
                  {stats.pendingApplications > 0 && (
                    <Badge bg="warning" className="mt-2">
                      {stats.pendingApplications} Pending
                    </Badge>
                  )}
                </Card.Body>
              </Card>
            </Col>
            
            <Col xl={3} lg={6} className="mb-3">
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center">
                  <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                       style={{ width: '60px', height: '60px' }}>
                    <i className="fas fa-credit-card fa-lg text-success"></i>
                  </div>
                  <h3 className="text-success fw-bold">{stats.totalPayments}</h3>
                  <h6 className="text-muted mb-0">Total Payments</h6>
                  {stats.pendingPayments > 0 && (
                    <Badge bg="danger" className="mt-2">
                      {stats.pendingPayments} Pending
                    </Badge>
                  )}
                </Card.Body>
              </Card>
            </Col>
            
            <Col xl={3} lg={6} className="mb-3">
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center">
                  <div className="bg-info bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                       style={{ width: '60px', height: '60px' }}>
                    <i className="fas fa-users fa-lg text-info"></i>
                  </div>
                  <h3 className="text-info fw-bold">
                    {new Set().size}
                  </h3>
                  <h6 className="text-muted mb-0">Unique Users</h6>
                </Card.Body>
              </Card>
            </Col>
            
            <Col xl={3} lg={6} className="mb-3">
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center">
                  <div className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                       style={{ width: '60px', height: '60px' }}>
                    <i className="fas fa-chart-line fa-lg text-warning"></i>
                  </div>
                  <h3 className="text-warning fw-bold">
                    ${((stats.totalPayments * 350) || 0).toLocaleString()}
                  </h3>
                  <h6 className="text-muted mb-0">Total Revenue</h6>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Tab Content */}
          {activeTab === "applications" && <AdminApplications />}
          {activeTab === "payments" && <AdminPayments />}
        </Col>
      </Row>
    </Container>
  );
}

export default AdminDashboard;