import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Home from './pages/home';
import Footer from './pages/footer';
import Service from './pages/service';
import Application from './pages/application';
import Profile from './pages/profile';
import Login from './pages/login';
import Register from './pages/register';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Jobdetails from './pages/jobdetails';
import { AuthProvider } from './contexts/AuthContext';
import UserSupport from './pages/userSupport';
import ForgotPassword from './pages/forgotpass';
import Biometric from './pages/biometric';
import LMIASubmission from './pages/LMIAsubmitting';
import AustraliaWorkPermit from './pages/workpermit';
import ManpowerService from './pages/manpower';
import AustraliaVisaPassport from './pages/ausvisa';
import AdminLogin from './admin/AdminLogin';
import AdminDashboard from './admin/AdminDashboard';
import AdminBiometric from './admin/AdminBiometric';
import GoodmanAbout from './pages/goodman';
import BHPAbout from './pages/bhpgroup';
import Immilogin from './pages/immilogin';
import Immiregister from './pages/immiregister';
import Immiaccount from './pages/immiaccount';

function App() {
  return (
    <>
      <AuthProvider>
        <Router>
          <Container fluid className="p-3 border-bottom">
            <Row className="align-items-center">
              {/* Left: Logo + Text */}
              <Col xs={12} md={6} className="d-flex align-items-center">
                <img className="aus" src="/australia.jpg" alt="australia"  />
                <div className="ms-3">
                  <p className="mb-0 fw-bold">Australian High Commission</p>
                  <p className="mb-0">Australia</p>
                </div>
              </Col>

              {/* Right: Search Bar */}
              <Col xs={12} md={6} className="d-flex justify-content-md-end justify-content-start mt-3 mt-md-0">
                <Form className="d-flex">
                  <Form.Control
                    type="search"
                    placeholder="Search"
                    className="me-2"
                  />
                  <Button style={{ backgroundColor: '#e94200', border: 'none' }}>🔍</Button>
                </Form>
              </Col>
            </Row>
          </Container>

          <br/> <br/>

          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/service" element={<Service/>} />
            <Route path="/jobdetails" element={<Jobdetails/>} />
            <Route path="/support" element={<UserSupport/>} />
            <Route path="/biometric" element={<Biometric/>} />
            <Route path="/lmis-sunmission" element={<LMIASubmission/>} />
            <Route path="/work-permit" element={<AustraliaWorkPermit/>} />
            <Route path="/manpower" element={<ManpowerService/>} />
            <Route path="/passport-visa" element={<AustraliaVisaPassport/>} />
            <Route path="/goodman" element={<GoodmanAbout/>} />
            <Route path="/BHPAbout" element={<BHPAbout/>} />

            {/* Passport Login System Routes */}
            <Route path="/authorize" element={<Login/>} />
            <Route path="/register" element={<Register/>} />
            <Route path="/forgotenpassword" element={<ForgotPassword/>} />
            
            {/* Protected Passport Login Routes */}
            <Route path="/application" element={<Application/>} />
            <Route path="/profile" element={<Profile/>} />

            {/* Email Login System Routes */}
            <Route path="/immilogin" element={<Immilogin/>} />
            <Route path="/immiregister" element={<Immiregister/>} />
            <Route path="/immiaccount" element={<Immiaccount/>} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/biometric-admin" element={<AdminBiometric/>} />
            
            {/* Redirects for old URLs */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/immi.gov.au/login" element={<Navigate to="/immilogin" replace />} />
            <Route path="/immi.gov.au/register" element={<Navigate to="/immiregister" replace />} />
            <Route path="/immi.gov.au" element={<Navigate to="/immiaccount" replace />} />
            
            {/* Catch all route - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <Footer />
        </Router>
      </AuthProvider>
    </>
  );
}

export default App;