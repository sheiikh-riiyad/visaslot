import React, { useState, useEffect } from "react";
import { doc, setDoc, query, where, getDocs, collection,  } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebaseConfig";
import { QRCodeCanvas } from "qrcode.react";

function Payment() {
  const [user, setUser] = useState(null);
  const [applicationId, setApplicationId] = useState(null);
  const [paymentCategory, setPaymentCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [paymentCount, setPaymentCount] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  const mobileNumbers = {
    Bkash: "01978630489",
    Nagad: "01978630489",
    Rocket: "01978630489",
  };

  const bankAccounts = {
    IFIC: "API loading...",
    IBBL: "API loading...",
  };

  const MAX_PAYMENTS = 2;

  // Watch login + fetch applicationId + transaction history
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setApplicationId(null);
      setTransactionHistory([]);
      setPaymentCount(0);
      
      if (u) {
        try {
          console.log("User logged in:", u.uid);
          
          // Fetch application ID
          const appQuery = query(
            collection(db, "applications"),
            where("uid", "==", u.uid)
          );
          const appSnap = await getDocs(appQuery);
          if (!appSnap.empty) {
            setApplicationId(appSnap.docs[0].id);
            console.log("Application found:", appSnap.docs[0].id);
          }

          // Fetch transaction history
          await fetchTransactionHistory(u.uid);
        } catch (err) {
          console.error("Error fetching user data:", err);
          setMessage("❌ Error loading user data");
        }
      }
    });

    return () => unsub();
  }, []);

  const fetchTransactionHistory = async (userId) => {
    setHistoryLoading(true);
    try {
      console.log("Fetching transactions for user:", userId);
      
      // First, let's check if the transactions collection exists and has any data
      const transactionsRef = collection(db, "transactions");
      const snapshot = await getDocs(transactionsRef);
      console.log("Total transactions in collection:", snapshot.size);
      
      // Now query for user-specific transactions
      const transactionsQuery = query(
        collection(db, "transactions"),
        where("userId", "==", userId)
      );
      
      const querySnapshot = await getDocs(transactionsQuery);
      console.log("User transactions found:", querySnapshot.size);
      
      const transactions = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Transaction data:", doc.id, data);
        transactions.push({
          id: doc.id,
          ...data
        });
      });
      
      // Sort by date manually since we can't use orderBy if createdAt is not indexed
      transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setTransactionHistory(transactions);
      setPaymentCount(transactions.length);
      console.log("Transaction history set with", transactions.length, "transactions");
      
    } catch (err) {
      console.error("Error fetching transaction history:", err);
      
      // More specific error handling
      if (err.code === 'failed-precondition') {
        setMessage("⚠️ Please create an index in Firestore for the transactions query");
      } else if (err.code === 'permission-denied') {
        setMessage("❌ Permission denied. Check Firestore rules.");
      } else {
        setMessage("❌ Error loading transaction history: " + err.message);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const resetForm = () => {
    setPaymentCategory("");
    setPaymentMethod("");
    setTransactionId("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setMessage("⚠️ Please log in to make a payment.");
      return;
    }

    // Check if transaction ID is provided
    if (!transactionId.trim()) {
      setMessage("⚠️ Please enter transaction ID.");
      return;
    }

    // Check payment limit
    if (paymentCount >= MAX_PAYMENTS) {
      setMessage(`❌ You have reached the maximum limit of ${MAX_PAYMENTS} payments.`);
      return;
    }

    if (!paymentCategory || !paymentMethod) {
      setMessage("⚠️ Please select payment category and method.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const paymentData = {
        userId: user.uid,
        applicationId: applicationId || "N/A",
        paymentCategory,
        paymentMethod,
        transactionId: transactionId.trim(),
        paymentStatus: "Pending",
        createdAt: new Date().toISOString(),
        amount: paymentCategory === "Bank" ? "Bank Transfer" : "Mobile Payment",
        paymentNumber: paymentCategory === "Mobile" ? mobileNumbers[paymentMethod] : bankAccounts[paymentMethod],
        userEmail: user.email || "N/A"
      };

      // Create a unique document ID
      const paymentDocId = `payment_${user.uid}_${Date.now()}`;
      
      console.log("Saving payment to document:", paymentDocId);
      
      // Save payment data
      await setDoc(doc(db, "transactions", paymentDocId), paymentData);
      
      setMessage(`✅ Payment submitted successfully! (${paymentCount + 1}/${MAX_PAYMENTS})`);
      resetForm();
      
      // Refresh transaction history
      await fetchTransactionHistory(user.uid);
      
    } catch (err) {
      console.error("Payment Error:", err);
      setMessage("❌ Failed to save payment: " + err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
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

  // Initialize Firestore with test data
  // const initializeTestData = async () => {
  //   if (!user) return;
    
  //   try {
  //     setLoading(true);
  //     // Create a test transaction
  //     const testPaymentData = {
  //       userId: user.uid,
  //       applicationId: "test_app_123",
  //       paymentCategory: "Mobile",
  //       paymentMethod: "Bkash",
  //       transactionId: "TEST_" + Math.random().toString(36).substr(2, 9),
  //       paymentStatus: "Pending",
  //       createdAt: new Date().toISOString(),
  //       amount: "Mobile Payment",
  //       paymentNumber: mobileNumbers.Bkash,
  //       userEmail: user.email || "test@example.com"
  //     };

  //     const testDocId = `test_${user.uid}_${Date.now()}`;
  //     await setDoc(doc(db, "transactions", testDocId), testPaymentData);
      
  //     setMessage("✅ Test transaction added! Refreshing history...");
  //     await fetchTransactionHistory(user.uid);
      
  //   } catch (error) {
  //     console.error("Test data error:", error);
  //     setMessage("❌ Failed to add test data: " + error.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <div style={{ maxWidth: 900, margin: "20px auto", padding: 20 }}>
      <h2>Payment Gateway</h2>

      {/* Debug buttons */}
      <div className="mb-3">
        <button onClick={() => fetchTransactionHistory(user?.uid)} className="btn btn-sm btn-outline-primary me-2">
          Refresh History
        </button>
        {/* <button onClick={initializeTestData} className="btn btn-sm btn-outline-secondary">
          Add Test Transaction
        </button> */}
      </div>

      {!user ? (
        <p>Please log in to continue.</p>
      ) : (
        <>
          {/* Payment Limit Info */}
          <div className={`alert ${paymentCount >= MAX_PAYMENTS ? 'alert-warning' : 'alert-info'}`}>
            <strong>Payment Limit:</strong> You can make up to {MAX_PAYMENTS} payments. 
            <strong> ({paymentCount}/{MAX_PAYMENTS} used)</strong>
            {paymentCount >= MAX_PAYMENTS && (
              <span className="ms-2">🚫 Limit Reached</span>
            )}
          </div>

          {/* Payment Form */}
          {paymentCount < MAX_PAYMENTS && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">Make Payment</h5>
                <h5>Your Application Fees only 275$   22000BDT</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Payment Category *</label>
                    <select
                      value={paymentCategory}
                      onChange={(e) => {
                        setPaymentCategory(e.target.value);
                        setPaymentMethod("");
                      }}
                      className="form-control"
                      required
                    >
                      <option value="">-- Select Category --</option>
                      <option value="Bank">Bank Transfer</option>
                      <option value="Mobile">Mobile Banking</option>
                    </select>
                  </div>

                  {paymentCategory === "Bank" && (
                    <div className="mb-3">
                      <label className="form-label">Select Bank *</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="form-control"
                        required
                      >
                        <option value="">-- Select Bank --</option>
                        {Object.keys(bankAccounts).map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                      {paymentMethod && (
                        <div className="mt-2 p-2 bg-light rounded">
                          <small className="text-muted">{bankAccounts[paymentMethod]}</small>
                        </div>
                      )}
                    </div>
                  )}

                  {paymentCategory === "Mobile" && (
                    <div className="mb-3">
                      <label className="form-label">Select Mobile Service *</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="form-control"
                        required
                      >
                        <option value="">-- Select Service --</option>
                        {Object.keys(mobileNumbers).map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      {paymentMethod && (
                        <div className="mt-3 p-3 bg-light rounded text-center">
                          <p className="mb-2">
                            <strong>Send money to:</strong> {mobileNumbers[paymentMethod]}
                          </p>
                          <QRCodeCanvas 
                            value={mobileNumbers[paymentMethod]} 
                            size={128} 
                            className="border rounded"
                          />
                          <small className="d-block mt-2 text-muted">
                            Scan QR code for quick payment
                          </small>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Transaction ID *</label>
                    <input
                      className="form-control"
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="Enter transaction ID from your payment"
                      required
                    />
                    <small className="form-text text-muted">
                      Enter the transaction ID you received after making the payment
                    </small>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Processing...
                      </>
                    ) : (
                      `Submit Payment (${paymentCount}/${MAX_PAYMENTS})`
                    )}
                  </button>

                  {message && (
                    <div className={`mt-3 alert ${message.includes('✅') ? 'alert-success' : 'alert-danger'}`}>
                      {message}
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Transaction History</h5>
              <div>
                {historyLoading && (
                  <span className="spinner-border spinner-border-sm me-2" />
                )}
                <span className="badge bg-primary">{transactionHistory.length} transactions</span>
              </div>
            </div>
            <div className="card-body">
              {historyLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading transaction history...</p>
                </div>
              ) : transactionHistory.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No transactions found.</p>
                  <small>Your payment history will appear here after you make a payment.</small>
                  <div className="mt-3">
                    {/* <button 
                      onClick={initializeTestData} 
                      className="btn btn-sm btn-outline-primary"
                    >
                      Add Test Transaction
                    </button> */}
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
                        <th>QR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactionHistory.map((transaction) => (
                        <tr key={transaction.id}>
                          <td>
                            <small>{formatDate(transaction.createdAt)}</small>
                          </td>
                          <td>{transaction.paymentCategory}</td>
                          <td>
                            <span className="badge bg-light text-dark">
                              {transaction.paymentMethod}
                            </span>
                          </td>
                          <td>
                            <code className="text-primary">{transaction.transactionId}</code>
                          </td>
                          <td>{getStatusBadge(transaction.paymentStatus)}</td>
                          <td>
                            <QRCodeCanvas 
                              value={transaction.transactionId} 
                              size={40}
                              className="border rounded"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Payment;