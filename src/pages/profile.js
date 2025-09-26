// src/pages/Profile.js
import { useEffect, useState } from "react";
import { collection, query, where, getDocs,  } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";


import Payment from "./payment";




function Profile() {
  const [profile, setProfile] = useState(null);

  const [docId, setDocId] = useState(""); // Save document ID
  console.log("Document ID:", docId); // Debugging line


  


  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "applications"),
        where("email", "==", user.email)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setProfile(snap.docs[0].data());
        setDocId(snap.docs[0].id); // Save Firestore document ID
      }
    };

    fetchProfile();
  }, []);

// const handlePaymentSubmit = async () => {
//   if (!paymentMethod || !transactionId) {
//     alert("Please complete all fields");
//     return;
//   }

//   if (profile.paymentStatus === "completed") {
//     alert("Payment already submitted!");
//     return;
//   }

//   try {
//     const ref = doc(db, "applications", docId);
//     await updateDoc(ref, { 
//       paymentCategory, 
//       paymentMethod, 
//       transactionId,
//       paymentStatus: "completed"
//     });
//     alert("Payment info submitted successfully!");
//   } catch (err) {
//     console.error("Error saving payment info:", err);
//     alert("Failed to submit payment.");
//   }
// };

   

   

  if (!profile) return <p>Loading profile...</p>;

  return (
    <>
      <div style={{ maxWidth: "900px", margin: "20px auto", padding: "20px", border: "1px solid #ccc" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3>Government of Australia</h3>
            <h4>High Commission of Australia</h4>
            <h2 style={{ marginTop: "10px" }}>Visa Application Form</h2>
          </div>
          {profile.photo && (
            <img
              src={profile.photo}
              alt="Applicant"
              style={{ width: "120px", height: "140px", border: "1px solid #000" }}
            />
          )}
        </div>

        {/* Section A */}
        <h4 style={{ marginTop: "20px" }}>A. Personal Particulars (As in Passport)</h4>
        <table border="1" cellPadding="8" cellSpacing="0" width="100%">
          <tbody>
            <tr><td>Surname</td><td>{profile.surname}</td></tr>
            <tr><td>Name</td><td>{profile.name}</td></tr>
            <tr><td>Previous Name</td><td>{profile.previousName}</td></tr>
            <tr><td>Sex</td><td>{profile.sex}</td></tr>
            <tr><td>Marital Status</td><td>{profile.maritalStatus}</td></tr>
            <tr><td>Date of Birth</td><td>{profile.dob}</td></tr>
            <tr><td>Religion</td><td>{profile.religion}</td></tr>
            <tr><td>Birth City</td><td>{profile.birthCity}</td></tr>
            <tr><td>Birth Country</td><td>{profile.birthCountry}</td></tr>
            <tr><td>National ID</td><td>{profile.nationalId}</td></tr>
            <tr><td>Education</td><td>{profile.education}</td></tr>
            <tr><td>Marks</td><td>{profile.marks}</td></tr>
          </tbody>
        </table>

        {/* Section B */}
        <h4 style={{ marginTop: "20px" }}>B. Passport Details</h4>
        <table border="1" cellPadding="8" cellSpacing="0" width="100%">
          <tbody>
            <tr><td>Passport No</td><td>{profile.passportNo}</td></tr>
            <tr><td>Issue Date</td><td>{profile.passportIssueDate}</td></tr>
            <tr><td>Place of Issue</td><td>{profile.passportPlace}</td></tr>
            <tr><td>Expiry Date</td><td>{profile.passportExpiry}</td></tr>
            <tr><td>Passport Region</td><td>{profile.passportRegion}</td></tr>
          </tbody>
        </table>

        {/* Section C */}
        <h4 style={{ marginTop: "20px" }}>C. Applicant’s Contact Details</h4>
        <table border="1" cellPadding="8" cellSpacing="0" width="100%">
          <tbody>
            <tr><td>Contact Address</td><td>{profile.contactAddress}</td></tr>
            <tr><td>Phone</td><td>{profile.phone}</td></tr>
            <tr><td>Mobile</td><td>{profile.mobile}</td></tr>
            <tr><td>Email</td><td>{profile.email}</td></tr>
            <tr><td>Permanent Address</td><td>{profile.permanentAddress}</td></tr>
          </tbody>
        </table>

        {/* Section D */}
        <h4 style={{ marginTop: "20px" }}>D. Family Details</h4>
        <table border="1" cellPadding="8" cellSpacing="0" width="100%">
          <tbody>
            <tr><td>Father’s Name</td><td>{profile.fatherName}</td></tr>
            <tr><td>Father’s Nationality</td><td>{profile.fatherNationality}</td></tr>
            <tr><td>Father Previous Nationality</td><td>{profile.fatherPrevNationality}</td></tr>
            <tr><td>Father Birth City</td><td>{profile.fatherBirthCity}</td></tr>
            <tr><td>Mother’s Name</td><td>{profile.motherName}</td></tr>
            <tr><td>Mother’s Nationality</td><td>{profile.motherNationality}</td></tr>
            <tr><td>Mother Previous Nationality</td><td>{profile.motherPrevNationality}</td></tr>
            <tr><td>Mother Birth City</td><td>{profile.motherBirthCity}</td></tr>
          </tbody>
        </table>

        {/* Section E */}
        <h4 style={{ marginTop: "20px" }}>E. Visa Details</h4>
        <table border="1" cellPadding="8" cellSpacing="0" width="100%">
          <tbody>
            <tr><td>Visa Type</td><td>{profile.visaType}</td></tr>
            <tr><td>Entries</td><td>{profile.entries}</td></tr>
            <tr><td>Visa Period</td><td>{profile.visaPeriod}</td></tr>
            <tr><td>Journey Date</td><td>{profile.journeyDate}</td></tr>
            <tr><td>Arrival</td><td>{profile.arrival}</td></tr>
            <tr><td>Exit</td><td>{profile.exit}</td></tr>
            <tr><td>Migration Type</td><td>{profile.migrationType}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Payment Section */}
      {/* Payment Section */}
      <Payment />
    </>
  );
}

export default Profile;
