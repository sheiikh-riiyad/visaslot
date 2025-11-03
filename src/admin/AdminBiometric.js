import React, { useEffect, useState } from "react";
import { Table, Card, Badge, Button, Modal, Alert, Spinner, Form, Row, Col, Nav, Tabs, Tab } from "react-bootstrap";
import { db } from "../firebaseConfig";
import { collection, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";
import AdminBiometricPayments from './AdminBiometricPayments';

function AdminBiometric() {
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("submissions");
  const [uploadedFiles, setUploadedFiles] = useState({
    vlnDocument: null,
    appointmentDocument: null,
    additionalDocuments: []
  });

  const [editFormData, setEditFormData] = useState({
    vlnNumber: "",
    appointmentDate: "",
    appointmentTime: "",
    vfsCenter: "",
    additionalNotes: "",
    status: "requested"
  });

  const vfsCenters = [
    "Dhaka VFS Global Center",
    "Sylhet VFS Global Center",
    "Chottogram VFS Global Center",
    "Aramco Dhahran VFS Global Center",
    "Dammam VFS Global Center",
    "Jeddah VFS Global Center",
    "Riyadh VFS Global Center",
    "Manama VFS Global Center",
    "Doha VFS Global Center",
    "Amman VFS Global Center",
    "Muscat VFS Global Center",
    "Kuala Lumpur VFS Global Center",
    "Umm Hurair 2 VFS Global Center",
    "Sharq, Kuwait City VFS Global Center",
    "Marriott, Kuwait City VFS Global Center",
    "Al Shuhada Street, Kuwait City VFS Global Center",
    "79 Anson Road, Singapore",
    "135 Cecil Street, Singapore",
  ];

  useEffect(() => {
    if (activeTab === "submissions") {
      fetchUsersWithSubmissions();
    } else if (activeTab === "payments") {
      fetchPayments();
    }
  }, [activeTab]);

  // Fetch all users who have biometric submissions
  const fetchUsersWithSubmissions = async () => {
    try {
      setLoading(true);
      
      // Get all documents from visaSubmissions collection
      const submissionsRef = collection(db, "visaSubmissions");
      const submissionsSnapshot = await getDocs(submissionsRef);
      
      const usersData = [];
      
      for (const doc of submissionsSnapshot.docs) {
        const submissionData = doc.data();
        
        usersData.push({
          userId: doc.id,
          ...submissionData
        });
      }

      // Sort by submission date (newest first)
      usersData.sort((a, b) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt) : new Date(0);
        const dateB = b.submittedAt ? new Date(b.submittedAt) : new Date(0);
        return dateB - dateA;
      });

      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users with submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch payments data
  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      // Get all users with payment data
      const submissionsRef = collection(db, "visaSubmissions");
      const submissionsSnapshot = await getDocs(submissionsRef);
      
      const paymentsData = [];
      
      for (const doc of submissionsSnapshot.docs) {
        const submissionData = doc.data();
        
        if (submissionData.paymentStatus) {
          paymentsData.push({
            userId: doc.id,
            ...submissionData
          });
        }
      }

      // Sort by payment date (newest first)
      paymentsData.sort((a, b) => {
        const dateA = a.paymentCompletedAt ? new Date(a.paymentCompletedAt) : new Date(0);
        const dateB = b.paymentCompletedAt ? new Date(b.paymentCompletedAt) : new Date(0);
        return dateB - dateA;
      });

      setPayments(paymentsData);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  // In AdminBiometric.js, replace the handleFileUpload function with this:
// Fixed handleFileUpload function
const handleFileUpload = async (e, documentType) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (!validTypes.includes(file.type)) {
    alert("❌ Please upload only JPG, PNG, or PDF files");
    return;
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    alert("❌ File size must be less than 5MB");
    return;
  }

  try {
    setActionLoading(true);
    
    // Create FormData for file upload to server
    const formData = new FormData();
    formData.append('file', file);
    
    // FIXED: Added https:// protocol
    const uploadUrl = `https://admin.australiaimmigration.site/upload-manual?userId=${encodeURIComponent(selectedUser.userId)}&applicationId=${encodeURIComponent(selectedUser.submissionId || selectedUser.userId)}&fileType=biometric_${documentType}`;
    
    console.log(`Uploading ${documentType} to:`, uploadUrl);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
      // Don't set Content-Type header - let browser set it automatically
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('Server response:', result);

    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    // Store file info for later use in update
    setUploadedFiles(prev => ({
      ...prev,
      [documentType]: {
        fileInfo: result.fileInfo,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      }
    }));

    alert(`✅ ${documentType.replace(/([A-Z])/g, ' $1')} uploaded successfully!`);
    
  } catch (error) {
    console.error(`Error uploading ${documentType}:`, error);
    alert(`❌ Error uploading file: ${error.message}`);
  } finally {
    setActionLoading(false);
  }
};






  // Initialize edit form with user data
  const initializeEditForm = (user) => {
    setEditFormData({
      vlnNumber: user.vlnNumber || "",
      appointmentDate: user.appointmentDate || "",
      appointmentTime: user.appointmentTime || "",
      vfsCenter: user.vfsCenter || "",
      additionalNotes: user.additionalNotes || "",
      status: user.status || "requested"
    });
  };

  // Handle edit form changes
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Update user submission
  const updateUserSubmission = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);

      const updateData = {
        ...editFormData,
        updatedAt: serverTimestamp(),
        status: "documents_ready" // Always set to documents_ready when admin updates
      };

      // Add uploaded files to update data
      if (uploadedFiles.vlnDocument?.fileInfo) {
        updateData.vlnDocument = {
          fileName: uploadedFiles.vlnDocument.fileName,
          fileType: uploadedFiles.vlnDocument.fileType,
          fileSize: uploadedFiles.vlnDocument.fileSize,
          fileUrl: uploadedFiles.vlnDocument.fileInfo.fileUrl,
          fullUrl: uploadedFiles.vlnDocument.fileInfo.fullUrl,
          uploadedAt: new Date().toISOString()
        };
      }

      if (uploadedFiles.appointmentDocument?.fileInfo) {
        updateData.appointmentDocument = {
          fileName: uploadedFiles.appointmentDocument.fileName,
          fileType: uploadedFiles.appointmentDocument.fileType,
          fileSize: uploadedFiles.appointmentDocument.fileSize,
          fileUrl: uploadedFiles.appointmentDocument.fileInfo.fileUrl,
          fullUrl: uploadedFiles.appointmentDocument.fileInfo.fullUrl,
          uploadedAt: new Date().toISOString()
        };
      }

      // Update the user's document in visaSubmissions collection
      await setDoc(doc(db, "visaSubmissions", selectedUser.userId), updateData, { merge: true });

      // Update local state
      setUsers(prev => prev.map(user => 
        user.userId === selectedUser.userId 
          ? { ...user, ...updateData }
          : user
      ));

      // Update selected user
      setSelectedUser(prev => ({
        ...prev,
        ...updateData
      }));

      // Reset uploaded files
      setUploadedFiles({
        vlnDocument: null,
        appointmentDocument: null,
        additionalDocuments: []
      });

      setActionLoading(false);
      alert("✅ User submission updated successfully!");
      
    } catch (error) {
      console.error("Error updating user submission:", error);
      alert("❌ Failed to update submission: " + error.message);
      setActionLoading(false);
    }
  };

  // Handle manual payment status update
  const handlePaymentStatusUpdate = async (userId, newStatus) => {
    try {
      setActionLoading(true);

      await setDoc(doc(db, "visaSubmissions", userId), {
        paymentStatus: newStatus,
        paymentCompletedAt: newStatus === "completed" ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Update local state for both users and payments
      setUsers(prev => prev.map(user => 
        user.userId === userId 
          ? { ...user, paymentStatus: newStatus }
          : user
      ));

      setPayments(prev => prev.map(payment => 
        payment.userId === userId 
          ? { ...payment, paymentStatus: newStatus }
          : payment
      ));

      setActionLoading(false);
      alert(`✅ Payment status updated to ${newStatus}`);
      
    } catch (error) {
      console.error("Error updating payment status:", error);
      alert("❌ Failed to update payment status: " + error.message);
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      if (dateString.toDate) {
        return dateString.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "N/A";
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "approved": return "success";
      case "rejected": return "danger";
      case "requested": return "warning";
      case "documents_ready": return "info";
      case "completed": return "primary";
      default: return "secondary";
    }
  };

  const getPaymentVariant = (status) => {
    switch (status) {
      case "completed": return "success";
      case "pending": return "warning";
      case "failed": return "danger";
      default: return "secondary";
    }
  };

  // Filter users based on status and search term
  const filteredUsers = users.filter(user => {
    const statusMatch = statusFilter === "all" || user.status === statusFilter;
    const searchMatch = 
      user.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.submissionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.vlnNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && searchMatch;
  });

  // Filter payments based on payment status
  const filteredPayments = payments.filter(payment => {
    const paymentMatch = paymentFilter === "all" || payment.paymentStatus === paymentFilter;
    const searchMatch = 
      payment.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.submissionId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return paymentMatch && searchMatch;
  });

  const requestedCount = users.filter(user => user.status === "requested").length;
  const totalUsers = users.length;
  const pendingPayments = payments.filter(payment => payment.paymentStatus === "pending").length;
  const totalPayments = payments.length;

  const downloadFile = (fileData, fileName) => {
  if (fileData?.fullUrl) {
    const link = document.createElement('a');
    link.href = fileData.fullUrl;
    link.download = fileName || fileData.fileName || 'document';
    link.click();
  } else if (fileData?.fileUrl) {
    const link = document.createElement('a');
    link.href = `https://localhost:4000${fileData.fileUrl}`;
    link.download = fileName || fileData.fileName || 'document';
    link.click();
  } else {
    alert('❌ File URL not available');
  }
};

const viewFile = (fileData) => {
  if (fileData?.fullUrl) {
    window.open(fileData.fullUrl, '_blank');
  } else if (fileData?.fileUrl) {
    window.open(`https://localhost:4000${fileData.fileUrl}`, '_blank');
  } else {
    alert('❌ File URL not available');
  }
};



  
  

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Tab Navigation */}
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-light">
          <Nav variant="tabs" activeKey={activeTab} onSelect={setActiveTab}>
            <Nav.Item>
              <Nav.Link eventKey="submissions">
                <i className="fas fa-fingerprint me-2"></i>
                Biometric Submissions
                {requestedCount > 0 && (
                  <Badge bg="danger" className="ms-2">
                    {requestedCount}
                  </Badge>
                )}
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="payments">
                <i className="fas fa-money-check me-2"></i>
                Payments
                {pendingPayments > 0 && (
                  <Badge bg="warning" className="ms-2">
                    {pendingPayments}
                  </Badge>
                )}
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Header>
      </Card>

      {/* Submissions Tab Content */}
      {activeTab === "submissions" && (
        <Card className="shadow-sm">
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-0">
                <i className="fas fa-fingerprint me-2"></i>
                Biometric Submissions Management
              </h4>
              <small>Total: {totalUsers} | Requested: {requestedCount}</small>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <Form.Control
                type="text"
                placeholder="Search by email, submission ID, VLN number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '300px' }}
              />
              <Button 
                variant="outline-light" 
                size="sm"
                onClick={fetchUsersWithSubmissions}
              >
                <i className="fas fa-sync-alt me-1"></i>
                Refresh
              </Button>
              <Form.Select 
                style={{ width: 'auto' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="requested">Requested</option>
                <option value="documents_ready">Documents Ready</option>
                <option value="completed">Completed</option>
              </Form.Select>
            </div>
          </Card.Header>
          <Card.Body>
            {filteredUsers.length === 0 ? (
              <Alert variant="info" className="text-center">
                <i className="fas fa-info-circle me-2"></i>
                No biometric submissions found.
              </Alert>
            ) : (
              <div className="table-responsive">
                <Table striped hover>
                  <thead className="table-dark">
                    <tr>
                      <th>User Email</th>
                      <th>Submission ID</th>
                      <th>VLN Number</th>
                      <th>Status</th>
                      <th>Payment Status</th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.userId}>
                        <td>
                          <small>{user.userEmail}</small>
                          {user.userRequested && (
                            <Badge bg="info" className="ms-1" title="User Requested">User</Badge>
                          )}
                        </td>
                        <td>
                          <code>{user.submissionId}</code>
                        </td>
                        <td>
                          <code>{user.vlnNumber || "Not set"}</code>
                        </td>
                        <td>
                          <Badge bg={getStatusVariant(user.status)}>
                            {user.status || "requested"}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={getPaymentVariant(user.paymentStatus)}>
                            {user.paymentStatus || "pending"}
                          </Badge>
                        </td>
                        <td>
                          <small>{formatDate(user.submittedAt)}</small>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                initializeEditForm(user);
                                setShowModal(true);
                              }}
                              title="Edit Submission"
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Payments Tab Content */}
      {activeTab === "payments" && (
        <Card className="shadow-sm">
          <Card.Header className="bg-success text-white d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-0">
                <i className="fas fa-money-check me-2"></i>
                Payment Management
              </h4>
              <small>Total: {totalPayments} | Pending: {pendingPayments}</small>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <Form.Control
                type="text"
                placeholder="Search by email, submission ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '300px' }}
              />
              <Button 
                variant="outline-light" 
                size="sm"
                onClick={fetchPayments}
              >
                <i className="fas fa-sync-alt me-1"></i>
                Refresh
              </Button>
              <Form.Select 
                style={{ width: 'auto' }}
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <option value="all">All Payments</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </Form.Select>
            </div>
          </Card.Header>
          <Card.Body>
            {filteredPayments.length === 0 ? (
              <Alert variant="info" className="text-center">
                <i className="fas fa-info-circle me-2"></i>
                No payments found.
              </Alert>
            ) : (
              <div className="table-responsive">
                <Table striped hover>
                  <thead className="table-dark">
                    <tr>
                      <th>User Email</th>
                      <th>Submission ID</th>
                      <th>Amount</th>
                      <th>Payment Status</th>
                      <th>Payment Date</th>
                      <th>Document Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr key={payment.userId}>
                        <td>
                          <small>{payment.userEmail}</small>
                        </td>
                        <td>
                          <code>{payment.submissionId}</code>
                        </td>
                        <td>
                          <strong>$150.00</strong>
                        </td>
                        <td>
                          <Badge bg={getPaymentVariant(payment.paymentStatus)}>
                            {payment.paymentStatus || "pending"}
                          </Badge>
                        </td>
                        <td>
                          <small>
                            {payment.paymentCompletedAt 
                              ? formatDate(payment.paymentCompletedAt) 
                              : "Not paid"
                            }
                          </small>
                        </td>
                        <td>
                          <Badge bg={getStatusVariant(payment.status)}>
                            {payment.status || "requested"}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handlePaymentStatusUpdate(payment.userId, "completed")}
                              disabled={actionLoading}
                              title="Mark as Paid"
                            >
                              <i className="fas fa-check"></i>
                            </Button>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => handlePaymentStatusUpdate(payment.userId, "pending")}
                              disabled={actionLoading}
                              title="Mark as Pending"
                            >
                              <i className="fas fa-clock"></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handlePaymentStatusUpdate(payment.userId, "failed")}
                              disabled={actionLoading}
                              title="Mark as Failed"
                            >
                              <i className="fas fa-times"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}

            {/* Test Payment Section for Admin */}
            <Card className="mt-4 border-0 bg-light">
              <Card.Header className="bg-warning">
                <h5 className="mb-0">
                  <i className="fas fa-credit-card me-2"></i>
                  Test Payment Integration
                </h5>
              </Card.Header>
              <Card.Body>
                <p className="text-muted mb-3">
                  Use this section to test the payment integration. This is the same payment component that users see.
                </p>
                <AdminBiometricPayments 
                  onPaymentComplete={() => {
                    alert("Payment completed successfully in test mode!");
                    fetchPayments();
                  }}
                />
              </Card.Body>
            </Card>
          </Card.Body>
        </Card>
      )}

      {/* Edit User Submission Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="xl">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="fas fa-edit me-2"></i>
            Edit Submission - {selectedUser?.userEmail}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {selectedUser && (
            <Tabs defaultActiveKey="edit" className="mb-3">
              <Tab eventKey="edit" title="Edit Data">
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>VLN Number *</Form.Label>
                      <Form.Control
                        type="text"
                        name="vlnNumber"
                        value={editFormData.vlnNumber}
                        onChange={handleEditFormChange}
                        placeholder="e.g., VLN2024123456"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>VFS Center *</Form.Label>
                      <Form.Select
                        name="vfsCenter"
                        value={editFormData.vfsCenter}
                        onChange={handleEditFormChange}
                        required
                      >
                        <option value="">Select VFS Center</option>
                        {vfsCenters.map(center => (
                          <option key={center} value={center}>{center}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Appointment Date</Form.Label>
                      <Form.Control
                        type="date"
                        name="appointmentDate"
                        value={editFormData.appointmentDate}
                        onChange={handleEditFormChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Appointment Time</Form.Label>
                      <Form.Control
                        type="time"
                        name="appointmentTime"
                        value={editFormData.appointmentTime}
                        onChange={handleEditFormChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Additional Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="additionalNotes"
                    value={editFormData.additionalNotes}
                    onChange={handleEditFormChange}
                    placeholder="Any additional information or notes for the user..."
                  />
                </Form.Group>

                <div className="text-center mt-4">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={updateUserSubmission}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Updating Submission...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>
                        Update Submission
                      </>
                    )}
                  </Button>
                </div>
              </Tab>

              <Tab eventKey="documents" title="Upload Documents">
                <Row>
                  <Col md={6}>
                    <Card className="h-100">
                      <Card.Header className="bg-primary text-white">
                        <h6 className="mb-0">VLN Document *</h6>
                      </Card.Header>
                      <Card.Body>
                        <Form.Group>
                          <Form.Label>Upload VLN Confirmation</Form.Label>
                          <Form.Control
                            type="file"
                            onChange={(e) => handleFileUpload(e, 'vlnDocument')}
                            accept=".jpg,.jpeg,.png,.pdf"
                            disabled={actionLoading}
                          />
                          <Form.Text className="text-muted">
                            Supported formats: JPG, PNG, PDF (Max 5MB)
                          </Form.Text>
                        </Form.Group>
                        {uploadedFiles.vlnDocument && (
                          <Alert variant="success" className="mt-2 py-2 small">
                            <i className="fas fa-check me-2"></i>
                            {uploadedFiles.vlnDocument.fileName} - Ready to save
                          </Alert>
                        )}
                        {selectedUser.vlnDocument && (
                          <div className="mt-3 p-3 border rounded bg-light">
                            <h6 className="mb-2">Current VLN Document:</h6>
                            <p className="mb-1">
                              <strong>File:</strong> {selectedUser.vlnDocument.fileName}
                            </p>
                            <p className="mb-1">
                              <strong>Size:</strong> {formatFileSize(selectedUser.vlnDocument.fileSize)}
                            </p>
                            <p className="mb-2">
                              <strong>Type:</strong> {selectedUser.vlnDocument.fileType}
                            </p>
                            <div className="d-flex gap-2">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => viewFile(selectedUser.vlnDocument)}
                              >
                                <i className="fas fa-eye me-1"></i>
                                View
                              </Button>
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => downloadFile(selectedUser.vlnDocument, selectedUser.vlnDocument.fileName)}
                              >
                                <i className="fas fa-download me-1"></i>
                                Download
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={6}>
                    <Card className="h-100">
                      <Card.Header className="bg-success text-white">
                        <h6 className="mb-0">Appointment Document *</h6>
                      </Card.Header>
                      <Card.Body>
                        <Form.Group>
                          <Form.Label>Upload Appointment Letter</Form.Label>
                          <Form.Control
                            type="file"
                            onChange={(e) => handleFileUpload(e, 'appointmentDocument')}
                            accept=".jpg,.jpeg,.png,.pdf"
                            disabled={actionLoading}
                          />
                          <Form.Text className="text-muted">
                            Supported formats: JPG, PNG, PDF (Max 5MB)
                          </Form.Text>
                        </Form.Group>
                        {uploadedFiles.appointmentDocument && (
                          <Alert variant="success" className="mt-2 py-2 small">
                            <i className="fas fa-check me-2"></i>
                            {uploadedFiles.appointmentDocument.fileName} - Ready to save
                          </Alert>
                        )}
                        {selectedUser.appointmentDocument && (
                          <div className="mt-3 p-3 border rounded bg-light">
                            <h6 className="mb-2">Current Appointment Document:</h6>
                            <p className="mb-1">
                              <strong>File:</strong> {selectedUser.appointmentDocument.fileName}
                            </p>
                            <p className="mb-1">
                              <strong>Size:</strong> {formatFileSize(selectedUser.appointmentDocument.fileSize)}
                            </p>
                            <p className="mb-2">
                              <strong>Type:</strong> {selectedUser.appointmentDocument.fileType}
                            </p>
                            <div className="d-flex gap-2">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => viewFile(selectedUser.appointmentDocument)}
                              >
                                <i className="fas fa-eye me-1"></i>
                                View
                              </Button>
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => downloadFile(selectedUser.appointmentDocument, selectedUser.appointmentDocument.fileName)}
                              >
                                <i className="fas fa-download me-1"></i>
                                Download
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <div className="text-center mt-4">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={updateUserSubmission}
                    disabled={actionLoading || (!uploadedFiles.vlnDocument && !uploadedFiles.appointmentDocument)}
                  >
                    {actionLoading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Updating Documents...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>
                        Save Documents
                      </>
                    )}
                  </Button>
                  <p className="text-muted mt-2 small">
                    Upload new documents above, then click Save to update the user's submission.
                  </p>
                </div>
              </Tab>

              <Tab eventKey="payment" title="Payment Management">
                <Card className="border-0 bg-light">
                  <Card.Header className="bg-info text-white">
                    <h5 className="mb-0">
                      <i className="fas fa-credit-card me-2"></i>
                      Payment Management for {selectedUser.userEmail}
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <h6>Current Payment Status</h6>
                        <Badge bg={getPaymentVariant(selectedUser.paymentStatus)} className="fs-6">
                          {selectedUser.paymentStatus || "pending"}
                        </Badge>
                        {selectedUser.paymentCompletedAt && (
                          <p className="mt-2 mb-0">
                            <small>Paid on: {formatDate(selectedUser.paymentCompletedAt)}</small>
                          </p>
                        )}
                      </Col>
                      <Col md={6}>
                        <h6>Update Payment Status</h6>
                        <div className="d-flex gap-2 flex-wrap">
                          <Button
                            variant="outline-success"
                            onClick={() => handlePaymentStatusUpdate(selectedUser.userId, "completed")}
                            disabled={actionLoading}
                          >
                            <i className="fas fa-check me-1"></i>
                            Mark as Paid
                          </Button>
                          <Button
                            variant="outline-warning"
                            onClick={() => handlePaymentStatusUpdate(selectedUser.userId, "pending")}
                            disabled={actionLoading}
                          >
                            <i className="fas fa-clock me-1"></i>
                            Mark as Pending
                          </Button>
                          <Button
                            variant="outline-danger"
                            onClick={() => handlePaymentStatusUpdate(selectedUser.userId, "failed")}
                            disabled={actionLoading}
                          >
                            <i className="fas fa-times me-1"></i>
                            Mark as Failed
                          </Button>
                        </div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Tab>
            </Tabs>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default AdminBiometric;