import React, { useState, useRef, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { 
  createUserWithEmailAndPassword,
  updateProfile,
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
import './Immiregister.css';

const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_5qtns7f',
  TEMPLATE_ID: 'template_3n7t55a',
  PUBLIC_KEY: 'qDIx-SRS4M2qgMvqa'
};

function Immiregister() {
  const [formData, setFormData] = useState({
    passportNo: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [step, setStep] = useState(1); // 1: Registration, 2: Verification
  const [countdown, setCountdown] = useState(0);
  const [userCredentials, setUserCredentials] = useState(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false); // Track registration success
  
  const inputRefs = useRef([]);

  // Countdown timer
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Redirect when registration is successful
  useEffect(() => {
    if (registrationSuccess) {
      // Redirect after a short delay to show success message
      const redirectTimer = setTimeout(() => {
        window.location.href = '/immi.gov.au/login';
      }, 2000); // 2 second delay to show success message

      return () => clearTimeout(redirectTimer);
    }
  }, [registrationSuccess]);

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate form data
  const validateForm = () => {
    const { passportNo, email, phone, password, confirmPassword } = formData;

    if (!passportNo.trim()) {
      showMessage('Please enter your passport number', 'error');
      return false;
    }

    if (!email.trim()) {
      showMessage('Please enter your email address', 'error');
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showMessage('Please enter a valid email address', 'error');
      return false;
    }

    if (!phone.trim()) {
      showMessage('Please enter your phone number', 'error');
      return false;
    }

    if (password.length < 6) {
      showMessage('Password must be at least 6 characters long', 'error');
      return false;
    }

    if (password !== confirmPassword) {
      showMessage('Passwords do not match', 'error');
      return false;
    }

    return true;
  };

  // Check if passport number already exists
  const checkPassportExists = async (passportNo) => {
    try {
      const docRef = doc(db, 'users', passportNo);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error('Error checking passport:', error);
      return false;
    }
  };

  // Send verification email using EmailJS
  const sendVerificationEmail = async (userEmail, code) => {
    try {
      if (!EMAILJS_CONFIG.TEMPLATE_ID || EMAILJS_CONFIG.TEMPLATE_ID === 'your_template_id_here') {
        // Fallback for testing
        showMessage(`TEST MODE: Your verification code is ${code}`, 'success');
        console.log('📧 Verification Code:', code);
        return true;
      }

      const templateParams = {
        to_email: userEmail,
        verification_code: code,
        expiration_time: '10 minutes'
      };

      await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams,
        EMAILJS_CONFIG.PUBLIC_KEY
      );

      console.log('Verification email sent to:', userEmail);
      return true;
    } catch (error) {
      console.error('EmailJS error:', error);
      showMessage(`Email failed. Your code is: ${code}`, 'success');
      return true;
    }
  };

  // Generate and store verification code
  const generateAndSendVerificationCode = async (userEmail) => {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store in Firestore
      await setDoc(doc(db, 'verificationCodes', userEmail), {
        code: code,
        email: userEmail,
        type: 'registration',
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        used: false,
        status: 'pending'
      });

      await sendVerificationEmail(userEmail, code);
      return code;
    } catch (error) {
      console.error('Error sending verification code:', error);
      throw new Error('Failed to send verification code');
    }
  };

  // Step 1: Handle registration
  const handleRegistration = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { passportNo, email, phone, password } = formData;

      // Check if passport number already exists
      const passportExists = await checkPassportExists(passportNo);
      if (passportExists) {
        showMessage('This passport number is already registered', 'error');
        setIsLoading(false);
        return;
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store user data in Firestore
      await setDoc(doc(db, 'users', passportNo), {
        uid: user.uid,
        passportNo: passportNo,
        email: email,
        phone: phone,
        createdAt: serverTimestamp(),
        emailVerified: false,
        status: 'pending'
      });

      // Update user profile
      await updateProfile(user, {
        displayName: `Passport: ${passportNo}`
      });

      // Store credentials for verification step
      setUserCredentials({ email, password });
      
      // Send verification code
      await generateAndSendVerificationCode(email);
      
      // Sign out user until verification is complete
      await signOut(auth);
      
      setStep(2);
      setCountdown(30);
      showMessage('Registration successful! Verification code sent to your email.', 'success');
      
    } catch (error) {
      console.error('Registration error:', error);
      handleRegistrationError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify email
  const handleVerification = async (e) => {
    e.preventDefault();
    
    const code = verificationCode.join('');
    
    if (code.length !== 6) {
      showMessage('Please enter the complete 6-digit code', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const { email } = userCredentials;
      const { passportNo } = formData;

      // Verify the code from Firestore
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

      // Mark code as used
      await updateDoc(docRef, {
        used: true,
        status: 'verified',
        verifiedAt: serverTimestamp()
      });

      // Update user status in Firestore
      await updateDoc(doc(db, 'users', passportNo), {
        emailVerified: true,
        status: 'active',
        verifiedAt: serverTimestamp()
      });

      // Complete registration and redirect
      await completeRegistration();
      
    } catch (error) {
      console.error('Verification error:', error);
      showMessage(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Complete registration and redirect to login
  const completeRegistration = async () => {
    if (userCredentials) {
      try {
        // Log the user in temporarily to complete registration
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          userCredentials.email, 
          userCredentials.password
        );

        console.log(userCredential)
        
        console.log('User registered and verified:', userCredentials.email);
        
        // Show success message and trigger redirect
        showMessage('Registration completed successfully! 🎉 Redirecting to login...', 'success');
        setRegistrationSuccess(true);
        
      } catch (error) {
        console.error('Error during final registration:', error);
        // Even if login fails, still redirect to login page
        showMessage('Registration completed! Redirecting to login...', 'success');
        setRegistrationSuccess(true);
      }
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
      await generateAndSendVerificationCode(userCredentials.email);
      setVerificationCode(['', '', '', '', '', '']);
      setCountdown(30);
      showMessage('New verification code sent! Check your email.', 'success');
    } catch (error) {
      showMessage(error.message, 'error');
    }
  };

  const handleBackToRegistration = () => {
    setStep(1);
    setVerificationCode(['', '', '', '', '', '']);
    setMessage('');
  };

  const handleRegistrationError = (error) => {
    let errorMessage = 'Registration failed';

    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'This email is already registered';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password is too weak';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Email/password accounts are not enabled';
        break;
      default:
        errorMessage = error.message;
    }

    showMessage(errorMessage, 'error');
  };

  return (
    <div className="immi-register-container">
      <div className="immi-register-card">
        <h2>
          {step === 1 ? 'Create Your Account' : 'Verify Your Email'}
        </h2>
        
        {message && (
          <div className={`message ${messageType}`}>
            {message}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRegistration} className="register-form">
            <div className="form-group">
              <label htmlFor="passportNo">Passport Number *</label>
              <input
                type="text"
                id="passportNo"
                name="passportNo"
                value={formData.passportNo}
                onChange={handleInputChange}
                placeholder="Enter your passport number"
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                disabled={isLoading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter your phone number"
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Create a password (min. 6 characters)"
                disabled={isLoading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                disabled={isLoading}
                required
              />
            </div>
            
            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account & Verify Email'}
            </button>

            <div className="login-link">
              <a href='/immi.gov.au/login'>Already have an account? Login here</a>
            </div>

            <div className="register-info">
              <p>After registration, you'll receive a 6-digit verification code via email.</p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerification} className="verification-form">
            <div className="verification-info">
              <p>We've sent a verification code to:</p>
              <p className="user-email">{userCredentials?.email}</p>
              <p>Please check your email and enter the 6-digit code below.</p>
            </div>

            <div className="form-group">
              <label>
                6-Digit Verification Code
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
              {isLoading ? 'Verifying...' : 'Verify & Complete Registration'}
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
                onClick={handleBackToRegistration}
                className="action-btn back-btn"
              >
                Back to Registration
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Immiregister;