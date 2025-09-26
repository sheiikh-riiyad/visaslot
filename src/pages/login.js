import { Form, Button } from "react-bootstrap";
import { Formik } from "formik";
import * as Yup from "yup";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { app } from "../firebaseConfig";
import { useNavigate } from "react-router-dom"; // 🔑
import { useState } from "react";
import { Link } from "react-router-dom";

const LoginSchema = Yup.object().shape({
  passport: Yup.string().required("Passport No. is required").min(5),
  password: Yup.string().required("Password is required").min(6),
});

const auth = getAuth(app);
const db = getFirestore(app);

function Login() {
  const navigate = useNavigate(); // 🔑
  const [currentUser, setCurrentUser] = useState(null); 
console.log("Current User:", currentUser); // Debugging line
  return (
    <div style={{ textAlign: "center" }}>
      <h2>Login</h2>
      <Formik
        initialValues={{ passport: "", password: "" }}
        validationSchema={LoginSchema}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            // 1️⃣ Find user by passport in Firestore
            const q = query(collection(db, "users"), where("passport", "==", values.passport));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
              alert("❌ Passport not found");
              return;
            }

            const userData = querySnapshot.docs[0].data();
            const email = userData.email; // get email associated with passport

            // 2️⃣ Sign in with email/password
            const userCredential = await signInWithEmailAndPassword(auth, email, values.password);
            setCurrentUser(userCredential.user); // store logged-in user

            alert("✅ Login successful!");
            navigate("/application"); // 🔑 Redirect after login
          } catch (err) {
            console.error(err);
            alert("❌ Login failed: " + err.message);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ handleSubmit, handleChange, values, errors, touched, isSubmitting }) => (
          <Form noValidate onSubmit={handleSubmit} style={{ maxWidth: 400, margin: "0 auto", textAlign: "left" }}>
            <Form.Group className="mb-3" controlId="passport">
              <Form.Label>Passport NO.</Form.Label>
              <Form.Control
                type="text"
                name="passport"
                value={values.passport}
                onChange={handleChange}
                isInvalid={touched.passport && !!errors.passport}
              />
              <Form.Control.Feedback type="invalid">{errors.passport}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="password">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={values.password}
                onChange={handleChange}
                isInvalid={touched.password && !!errors.password}
              />
              <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
            </Form.Group>

            <Button variant="primary" type="submit" disabled={isSubmitting}>
              Login
            </Button>
          </Form>
        )}
      </Formik>
      <Button as={Link} to="/register" > Register an account</Button>
    </div>
  );
}

export default Login;
