import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { Link } from "react-router-dom";


function Navbars() {
  return (
    <>
      <Navbar expand="lg" className="custom-navbar" variant="dark">
        <Container>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <NavDropdown title="About us" id="nav-about">
                <NavDropdown.Item as={Link} to="/">Home</NavDropdown.Item>
                <NavDropdown.Item href="https://bangladesh.embassy.gov.au/daca/aboutus.html">About Us</NavDropdown.Item>
                <NavDropdown.Item href="https://bangladesh.embassy.gov.au/daca/development_cooperat.html">Development cooperation</NavDropdown.Item>
                <NavDropdown.Item href="https://bangladesh.embassy.gov.au/daca/relations.html">Australia-Bangladesh relationship</NavDropdown.Item>
                <NavDropdown.Item href="https://bangladesh.embassy.gov.au/daca/JobVacancies.html">Job vacaneies</NavDropdown.Item>
              </NavDropdown>

              <NavDropdown title="Australians" id="nav-australians">
                <NavDropdown.Item as={Link} to="https://bangladesh.embassy.gov.au/daca/consular.html" >Service for Austrilians</NavDropdown.Item>
                
              </NavDropdown>

              <NavDropdown title="Connecting with Australia" id="nav-connecting">
                <NavDropdown.Item as={Link} to="https://bangladesh.embassy.gov.au/daca/Visas_and_Migration.html" >Visa and migation</NavDropdown.Item>
                <NavDropdown.Item href="https://bangladesh.embassy.gov.au/daca/visiting_australia.html">Travelling to austrilia</NavDropdown.Item>
                <NavDropdown.Item href="https://bangladesh.embassy.gov.au/daca/trade.html">Doing business with Australia</NavDropdown.Item>
                <NavDropdown.Item href="https://bangladesh.embassy.gov.au/daca/study.html">Study in Australia</NavDropdown.Item>
              </NavDropdown>

              <NavDropdown title="Showcasing Australia" id="nav-showcasing">
                <NavDropdown.Item href="https://bangladesh.embassy.gov.au/daca/australia.html">About Australia</NavDropdown.Item>
                
              </NavDropdown>

              <NavDropdown title="Events" id="nav-events">
                <NavDropdown.Item href="https://bangladesh.embassy.gov.au/daca/events.html">Event</NavDropdown.Item>
              </NavDropdown>

              <NavDropdown title="News and media" id="nav-news">
                <NavDropdown.Item href="https://bangladesh.embassy.gov.au/daca/LatitudeFinancialServicesdatabreach.html">Latitude Financial Service date breach </NavDropdown.Item>
                <NavDropdown.Item href="https://bangladesh.embassy.gov.au/daca/news.html">News </NavDropdown.Item>
                <NavDropdown.Item href="https://bangladesh.embassy.gov.au/daca/media.html">Media </NavDropdown.Item>
              </NavDropdown>

              <NavDropdown title="Contact us" id="nav-contact">
                <NavDropdown.Item href="https://bangladesh.embassy.gov.au/daca/contact-us.html">Contact us</NavDropdown.Item>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
}

export default Navbars;
