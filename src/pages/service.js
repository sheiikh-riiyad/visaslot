import { Link } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";

function Service() {
  return (
    <Container className="">
      {/* Header */}
      <div className="p-4  text-white" style={{ backgroundColor: "#2b91b2" }}>
        <h2>Services for Australians</h2>
      </div>

      {/* Main Content */}
      <p>
        The Australian High Commission in Dhaka provides consular, notarial and passport services{" "}
        <strong>by appointment only</strong>. We are open from Sunday to Thursday, 8am–12:30pm and 1:30pm–4pm.
      </p>
      <p>
        The <strong>Consular Services Charter</strong> outlines how and when we can help Australian citizens overseas.
      </p>

      {/* Button */}
      <div className="mb-4">
        <Button as={Link} to="/application" variant="light" className="border shadow-sm">
          <strong>Apply migration</strong>
        </Button>
      </div>

      {/* Fees Section */}
      <h5 className="text-primary">Australian Passport and Notarial Fees 2025</h5>
      <h6>Booking policy</h6>
      <ul>
        <li>Please arrive 10 minutes before your appointment time for security screening.</li>
        <li>If you are late for your appointment, you may need to reschedule the appointment.</li>
        <li>Bookings can be made 2 months in advance.</li>
        <li>You can amend, reschedule, or cancel your appointment via the links in your appointment notification email.</li>
        <li>
          Please ensure you select the correct type and number of services you require when you make the appointment.  
          If you select the wrong service, we may not be able to help at your appointment time.
        </li>
      </ul>

      {/* Contact Info */}
      <p>
        For <strong>urgent consular assistance</strong> for <strong>Australian citizens</strong> in Bangladesh:
      </p>
      <p>
        <strong>Email:</strong> consular.dhaka@dfat.gov.au <br />
        <strong>Telephone:</strong> +61 2 6261 3305 (from Bangladesh) or +61 1300 555 135 (within Australia).
      </p>
    </Container>
  );
}

export default Service;
