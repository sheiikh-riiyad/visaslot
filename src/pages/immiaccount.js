import React, { useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import './Immiaccount.css';
import Payment from './payment';

function Immiaccount() {
  const { user } = useAuth();
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const fetchUserData = useCallback(async (userId) => {
    try {
      setLoading(true);
      
      const applicationsRef = collection(db, "applications");
      const q = query(applicationsRef, where("uid", "==", userId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const applicationDoc = querySnapshot.docs[0];
        const applicationData = applicationDoc.data();
        setApplicationStatus(applicationData.applicationStatus || 'No status available');
        
        await fetchRecentActivities(userId);
        await fetchUserProfile(userId);
      } else {
        setApplicationStatus('No application submitted');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setApplicationStatus('Error loading application status');
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ FIXED: Simple approach - Check if user came from email verification
  useEffect(() => {
    const checkLoginMethod = async () => {
      if (user) {
        console.log('User logged in:', user.email);
        
        try {
          // Check if user has a verification record with status 'verified'
          const verificationDoc = await getDoc(doc(db, 'verificationCodes', user.email));
          
          if (verificationDoc.exists()) {
            const verificationData = verificationDoc.data();
            
            
            if (verificationData.status === 'verified') {
              console.log('User verified via email system - loading data');
              await fetchUserData(user.uid);
              return;
            }
          }
          
          // If no verification or status not 'verified', redirect to email login
          console.log('User not verified via email system - redirecting to email login');
          await signOut(auth);
          window.location.href = '/immilogin';
          
        } catch (error) {
          console.error('Error checking verification:', error);
          await signOut(auth);
          window.location.href = '/immilogin';
        }
      } else {
        console.log('No user found');
        setLoading(false);
      }
    };

    checkLoginMethod();
  }, [user, fetchUserData]); // ✅ Added fetchUserData to dependencies

  const fetchUserProfile = async (userId) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uid", "==", userId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        setUserProfile(userDoc.data());
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchRecentActivities = async (userId) => {
    try {
      const activitiesRef = collection(db, 'applications', userId, 'activities');
      const activitiesQuery = query(
        activitiesRef, 
        orderBy('timestamp', 'desc'), 
        limit(5)
      );
      
      const activitiesSnap = await getDocs(activitiesQuery);
      const activities = activitiesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handlePaymentClick = () => {
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      case 'pending':
        return 'status-pending';
      case 'under review':
        return 'status-review';
      case 'submitted':
        return 'status-submitted';
      case 'processing':
        return 'status-processing';
      case 'completed':
        return 'status-completed';
      default:
        return 'status-default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
      case 'pending':
        return '⏳';
      case 'under review':
        return '🔍';
      case 'submitted':
        return '📤';
      case 'processing':
        return '⚙️';
      case 'completed':
        return '✅';
      default:
        return '📄';
    }
  };

  if (loading) {
    return (
      <div className="immi-account-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your account information...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="immi-account-container">
        <div className="not-logged-in">
          <h2>Welcome to Australia Immigration</h2>
          <p>Please log in with your email and verification code to access your account.</p>
          <div className="auth-buttons">
            <button onClick={() => window.location.href = '/immilogin'} className="btn-primary">
              Login with Email
            </button>
            <button onClick={() => window.location.href = '/immiregister'} className="btn-secondary">
              Register
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="immi-account-container">
      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="payment-modal-overlay" onClick={handleClosePaymentModal}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="payment-modal-header">
              <h3>Make Payment</h3>
              <button className="close-modal-btn" onClick={handleClosePaymentModal}>
                ×
              </button>
            </div>
            <div className="payment-modal-content">
              <Payment />
            </div>
          </div>
        </div>
      )}

      <div className="account-header">
        <div className="header-content">
          <h1>Australia Immigration Account</h1>
          <p>Welcome back, {userProfile?.displayName || user.email}</p>
        </div>
        <button onClick={handleSignOut} className="sign-out-btn">
          Sign Out
        </button>
      </div>

      <div className="account-content">
        {/* Application Status & Payment Card */}
        <div className="status-payment-card">
          <div className="status-section">
            <h3>Application Status</h3>
            <div className="status-content">
              <div className="status-badge-large">
                <span className={`status-icon-large ${getStatusColor(applicationStatus)}`}>
                  {getStatusIcon(applicationStatus)}
                </span>
                <div className="status-text">
                  <span className="status-label">Current Status</span>
                  <span className="status-value">{applicationStatus}</span>
                </div>
              </div>
              <div className="status-details">
                <p><strong>Application ID:</strong> {user.uid.substring(0, 8)}...</p>
                <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
                <p><strong>Processing Time:</strong> 4-6 weeks</p>
              </div>
            </div>
          </div>

          <div className="payment-section">
            <h3>Payment</h3>
            <div className="payment-content">
              <div className="payment-info">
                <p><strong>Application Fee:</strong> $275 AUD</p>
                <p><strong>Due Date:</strong> 3 days from submission</p>
              </div>
              <button className="payment-btn-large" onClick={handlePaymentClick}>
                <span className="payment-icon">💳</span>
                <span className="payment-text">Pay Application Fee</span>
              </button>
            </div>
          </div>
        </div>

        {/* User Information Card */}
        <div className="info-card">
          <h3>Personal Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Email Address</label>
              <p>{user.email}</p>
            </div>
            <div className="info-item">
              <label>Account Created</label>
              <p>{user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div className="info-item">
              <label>Last Sign In</label>
              <p>{user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div className="info-item">
              <label>Email Verified</label>
              <p>{user.emailVerified ? '✅ Verified' : '❌ Not Verified'}</p>
            </div>
          </div>
        </div>

        {/* Recent Activities Card */}
        {recentActivities.length > 0 && (
          <div className="activities-card">
            <h3>Recent Activities</h3>
            <div className="activities-list">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">
                    {getStatusIcon(activity.type)}
                  </div>
                  <div className="activity-content">
                    <h4>{activity.title || 'Activity Update'}</h4>
                    <p>{activity.description || 'No description available'}</p>
                    <span className="activity-time">
                      {activity.timestamp?.toDate?.().toLocaleDateString() || 'Recent'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="actions-card">
          <h3>Quick Actions</h3>
          <div className="actions-grid">
            <button className="action-btn" onClick={() => window.location.href = '/application'}>
              📋 View Full Application
            </button>
            <button className="action-btn" onClick={() => window.location.href = '/documents'}>
              📎 Upload Documents
            </button>
            <button className="action-btn" onClick={() => window.location.href = '/support'}>
              💬 Contact Support
            </button>
            <button className="action-btn" onClick={() => window.location.href = '/profile'}>
              👤 Update Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Immiaccount;