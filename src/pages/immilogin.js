import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebaseConfig';
import { 
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import emailjs from 'emailjs-com';
import './Immilogin.css';

// 🔥 REPLACE THESE WITH YOUR ACTUAL EMAILJS CREDENTIALS
const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_5qtns7f',
  TEMPLATE_ID: 'template_3n7t55a', // Replace with actual Template ID
  PUBLIC_KEY: 'qDIx-SRS4M2qgMvqa'    // Replace with actual Public Key
};

function Immilogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [step, setStep] = useState(1);
  const [countdown, setCountdown] = useState(0);
  const [userCredentials, setUserCredentials] = useState(null); // Store credentials instead of user object
  const [loginSuccess, setLoginSuccess] = useState(false); // Track login success
  
  const inputRefs = useRef([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Redirect when login is successful
  useEffect(() => {
    if (loginSuccess) {
      // Redirect after a short delay to show success message
      const redirectTimer = setTimeout(() => {
        window.location.href = '/immi.gov.au';
      }, 1500); // 1.5 second delay to show success message

      return () => clearTimeout(redirectTimer);
    }
  }, [loginSuccess]);

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  // Send email using EmailJS
  const sendEmailWithCode = async (userEmail, code) => {
    try {
      // Check if EmailJS credentials are set
      if (!EMAILJS_CONFIG.TEMPLATE_ID || EMAILJS_CONFIG.TEMPLATE_ID === 'your_template_id_here') {
        // TEMPORARY: Show code on screen for testing
        showMessage(`TEST MODE: Your verification code is ${code}`, 'success');
        console.log('📧 Verification Code:', code);
        return true;
      }

      const templateParams = {
        to_email: userEmail,
        verification_code: code,
        expiration_time: '10 minutes'
      };

      const result = await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams,
        EMAILJS_CONFIG.PUBLIC_KEY
      );

      console.log('Email sent successfully:', result);
      return true;
    } catch (error) {
      console.error('EmailJS error:', error);
      // Fallback: show code on screen if email fails
      showMessage(`Email failed. Your code is: ${code}`, 'success');
      return true;
    }
  };

  // Step 1: Verify Email and Password
  const handleEmailPasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      showMessage('Please fill in email and password', 'error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // ✅ FIXED: Verify credentials but DON'T keep user logged in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log(user)
      
      // ✅ Store credentials for later use
      setUserCredentials({ email, password });
      
      // ✅ Immediately sign out the user (they're not fully verified yet)
      await signOut(auth);
      
      // ✅ Send verification code to the email they used to login
      await generateAndSendVerificationCode(email);
      
      setStep(2);
      setCountdown(30);
      showMessage('6-digit verification code sent to your email!', 'success');
      
    } catch (error) {
      console.error('Login error:', error);
      handleLoginError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate code and send via EmailJS
  const generateAndSendVerificationCode = async (userEmail) => {
    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // console.log('Generated code for', userEmail, ':', code);

      // Store in Firestore
      await setDoc(doc(db, 'verificationCodes', userEmail), {
        code: code,
        email: userEmail,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        used: false,
        status: 'pending'
      });

      // Send email using EmailJS
      await sendEmailWithCode(userEmail, code);

      return code;
    } catch (error) {
      console.error('Error sending verification code:', error);
      throw new Error('Failed to send verification code: ' + error.message);
    }
  };

  // Step 2: Verify the 6-digit code
  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    
    const code = verificationCode.join('');
    
    if (code.length !== 6) {
      showMessage('Please enter the complete 6-digit code', 'error');
      return;
    }

    setIsLoading(true);

    try {
      // ✅ Verify the code from Firestore
      const docRef = doc(db, 'verificationCodes', email);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('No verification code found. Please request a new one.');
      }

      const verificationData = docSnap.data();

      // Check if code is expired
      if (verificationData.expiresAt.toDate() < new Date()) {
        await updateDoc(docRef, { status: 'expired' });
        throw new Error('Verification code has expired. Please request a new one.');
      }

      // Check if code is already used
      if (verificationData.used) {
        throw new Error('Verification code already used. Please request a new one.');
      }

      // Check if code matches
      if (verificationData.code !== code) {
        throw new Error('Invalid verification code. Please try again.');
      }

      // ✅ Mark code as used
      await updateDoc(docRef, {
        used: true,
        status: 'verified',
        verifiedAt: serverTimestamp()
      });

      // ✅ NOW log the user in properly (using stored credentials)
      if (userCredentials) {
        const userCredential = await signInWithEmailAndPassword(
          auth, 
          userCredentials.email, 
          userCredentials.password
        );
        const user = userCredential.user;
        
        // Login successful
        showMessage('Login successful! 🎉 Redirecting to dashboard...', 'success');
        console.log('User fully authenticated:', user.email);
        
        // Set login success to trigger redirect
        setLoginSuccess(true);
      }
      
    } catch (error) {
      console.error('Verification error:', error);
      showMessage(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle code input changes
  const handleCodeChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    try {
      await generateAndSendVerificationCode(email);
      setVerificationCode(['', '', '', '', '', '']);
      setCountdown(30);
      showMessage('New verification code sent! Check your email.', 'success');
    } catch (error) {
      showMessage(error.message, 'error');
    }
  };

  const handleBackToLogin = () => {
    setStep(1);
    setVerificationCode(['', '', '', '', '', '']);
    setMessage('');
    setUserCredentials(null);
  };

  const handleLoginError = (error) => {
    let errorMessage = 'Login failed';

    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many attempts. Please try again later';
        break;
      default:
        errorMessage = error.message;
    }

    showMessage(errorMessage, 'error');
  };

  return (
    <div className="immilogin-container">
      <div className="immilogin-card">
        <h2>
          {step === 1 ? 'Login to Your Account' : 'Enter Verification Code'}
        </h2>
        
        {message && (
          <div className={`message ${messageType}`}>
            {message}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleEmailPasswordSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                required
              />
            </div>
            
            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Login & Get Code'}
            </button>

            <div className="login-info">
              <p>After successful login, you'll receive a 6-digit verification code via email.</p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerificationSubmit} className="verification-form">
            <div className="form-group">
              <label>
                6-Digit Verification Code
                <span className="info-text">(Enter the code sent to {email})</span>
              </label>
              <div className="code-inputs-container">
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isLoading}
                    className="code-input"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>
            
            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? 'Verifying Code...' : 'Verify & Complete Login'}
            </button>

            <div className="form-actions">
              <button 
                type="button"
                onClick={handleResendCode}
                className="action-btn resend-btn"
                disabled={countdown > 0}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
              </button>
              
              <button 
                type="button"
                onClick={handleBackToLogin}
                className="action-btn back-btn"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
        
        <div className="register-link">
          <a href='/immi.gov.au/register'>Don't have an account? Register here</a>
        </div>
      </div>
    </div>
  );
}

export default Immilogin;