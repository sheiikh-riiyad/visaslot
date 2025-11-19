import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

const EmailAuthContext = createContext();

export const useEmailAuth = () => {
  const context = useContext(EmailAuthContext);
  if (!context) {
    throw new Error('useEmailAuth must be used within an EmailAuthProvider');
  }
  return context;
};

export const EmailAuthProvider = ({ children }) => {
  const [emailUser, setEmailUser] = useState(null);
  const [loading, setLoading] = useState(true);
  console.log(loading)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('EmailAuth: User state changed:', user);
      setEmailUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    emailUser,
    setEmailUser
  };

  return (
    <EmailAuthContext.Provider value={value}>
      {children}
    </EmailAuthContext.Provider>
  );
};

