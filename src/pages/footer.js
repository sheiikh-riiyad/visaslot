function Footer() {
  return (
    <footer className="bg-dark text-light pt-4 mt-5">
      <div className="container">
        <div className="row">
          {/* Left Section */}
          <div className="col-md-4 mb-4">
            <h5>Australian High Commission</h5>
            <p>Bangladesh</p>
            <p>
              184 Gulshan Avenue <br />
              Gulshan 2 <br />
              Dhaka 1212 <br />
              <strong>Email:</strong> ahc.dhaka@dfat.gov.au <br />
              <strong>Telephone:</strong> +88 09604 260100
            </p>
            <p>Follow us:</p>
            <a href="https://www.facebook.com/AusHCBangladesh" target="_blank" rel="noreferrer">
              <i className="bi bi-facebook fs-4 text-light"></i>
            </a>
          </div>

          {/* About Us Section */}
          <div className="col-md-2 mb-4">
            <h6>About us</h6>
            <ul className="list-unstyled">
              <li><a href="/" className="text-light">Home</a></li>
              <li><a href="https://bangladesh.embassy.gov.au/daca/aboutus.html" className="text-light">About us</a></li>
              <li><a href="https://bangladesh.embassy.gov.au/daca/development_cooperat.html " className="text-light">Development cooperation</a></li>
              <li><a href="/relationship" className="text-light">Australia-Bangladesh relationship</a></li>
              <li><a href="/jobs" className="text-light">Job Vacancies</a></li>
            </ul>
          </div>

          {/* Connecting Section */}
          <div className="col-md-2 mb-4">
            <h6>Connecting with Australia</h6>
            <ul className="list-unstyled">
              <li><a href="/visas" className="text-light">Visas and migration</a></li>
              <li><a href="/travel" className="text-light">Travelling to Australia</a></li>
              <li><a href="/business" className="text-light">Doing business with Australia</a></li>
              <li><a href="/study" className="text-light">Study in Australia</a></li>
            </ul>
          </div>

          {/* External Websites */}
          <div className="col-md-4 mb-4">
            <h6>External Websites</h6>
            <ul className="list-unstyled">
              <li><a href="https://www.dfat.gov.au/" className="text-light">Department of Foreign Affairs and Trade</a></li>
              <li><a href="https://www.homeaffairs.gov.au/" className="text-light">Department of Home Affairs</a></li>
              <li><a href="https://visit.australia.com/" className="text-light">Visit Australia</a></li>
              <li><a href="https://www.austrade.gov.au/" className="text-light">Austrade</a></li>
              <li><a href="#" className="text-light">Prime Minister of Australia</a></li>
              <li><a href="#" className="text-light">Minister for Foreign Affairs</a></li>
              <li><a href="#" className="text-light">Minister for Trade and Tourism</a></li>
              <li><a href="#" className="text-light">Minister for Pacific Island Affairs</a></li>
              <li><a href="#" className="text-light">Minister for International Development</a></li>
              <li><a href="#" className="text-light">Minister for Home Affairs</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="text-center border-top pt-3 mt-3">
          <a href="#" className="text-light me-3">Copyright</a>
          <a href="#" className="text-light me-3">Privacy</a>
          <a href="#" className="text-light me-3">Disclaimer</a>
          <a href="#" className="text-light me-3">Accessibility</a>
          <a href="#" className="text-light">Freedom of information</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
