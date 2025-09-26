import { Form, Button } from "react-bootstrap";
import { Formik } from "formik";
import * as Yup from "yup";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { app } from "../firebaseConfig"; // your config
import { useNavigate } from "react-router-dom"; // 🔑
import { Link } from "react-router-dom";

const RegisterSchema = Yup.object().shape({
  passport: Yup.string().required("Passport No. is required").min(5),
  email: Yup.string().email("Invalid email").required("Email is required"),
  phone: Yup.string()
    .matches(/^[0-9]+$/, "Phone must be digits only")
    .min(10)
    .required("Phone is required"),
  password: Yup.string().min(6).required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password"), null], "Passwords must match")
    .required("Confirm Password is required"),
});

const auth = getAuth(app);
const db = getFirestore(app);

function Register() {
  const navigate = useNavigate(); // 🔑

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Register</h2>
      <Formik
        initialValues={{
          passport: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
        }}
        validationSchema={RegisterSchema}
        onSubmit={async (values, { setSubmitting, resetForm }) => {
          try {
            // 1️⃣ Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(
              auth,
              values.email,
              values.password
            );

            const user = userCredential.user;

            // 2️⃣ Save passport + phone in Firestore
            await setDoc(doc(db, "users", user.uid), {
              passport: values.passport,
              email: values.email,
              phone: values.phone,
            });

            alert("✅ Registration successful!");
            resetForm();

            navigate("/authorize"); // 🔑 redirect after registration
          } catch (err) {
            console.error(err);
            alert("❌ Registration failed: " + err.message);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ handleSubmit, handleChange, values, errors, touched, isSubmitting }) => (
          <Form noValidate onSubmit={handleSubmit} style={{ maxWidth: 400, margin: "0 auto", textAlign: "left" }}>
            {/* Passport */}
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

            {/* Email */}
            <Form.Group className="mb-3" controlId="email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={values.email}
                onChange={handleChange}
                isInvalid={touched.email && !!errors.email}
              />
              <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
            </Form.Group>

            {/* Phone */}
            <Form.Group className="mb-3" controlId="phone">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="tel"
                name="phone"
                value={values.phone}
                onChange={handleChange}
                isInvalid={touched.phone && !!errors.phone}
              />
              <Form.Control.Feedback type="invalid">{errors.phone}</Form.Control.Feedback>
            </Form.Group>

            {/* Password */}
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

            {/* Confirm Password */}
            <Form.Group className="mb-3" controlId="confirmPassword">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control
                type="password"
                name="confirmPassword"
                value={values.confirmPassword}
                onChange={handleChange}
                isInvalid={touched.confirmPassword && !!errors.confirmPassword}
              />
              <Form.Control.Feedback type="invalid">{errors.confirmPassword}</Form.Control.Feedback>
            </Form.Group>

            <Button variant="primary" type="submit" disabled={isSubmitting}>
              Submit
            </Button>
          </Form>
        )}
      </Formik>
      <Button as={Link} to="/authorize"> Go to Login</Button>
    </div>
  );
}

export default Register;
