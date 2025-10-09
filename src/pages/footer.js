import './AustralianEmbassy.css';
function Footer() {
  return (
    <>
      <footer className="aus-footer bg-dark mt-5">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section text-white">
              <h3>Contact Information</h3>
              <p>Address: R.G. Casey Building John McEwen Crescent Barton ACT 0221 Australia</p>
              <p>Phone: +61 2 6261 1111</p>
              <p>Email: [Embassy Email]</p>
              
            </div>
            <div className="footer-section text-white">
              <h3>Office Hours</h3>
              <p>Monday - Friday: 9:00 AM - 5:00 PM</p>
              <p>Consular Section: 9:30 AM - 12:30 PM</p>
              <p>Closed on Australian and local holidays</p>
            </div>
            <div className="footer-section">
              <h3>Quick Links</h3>
              <ul>
                <li><a href="#smartraveller">Smartraveller</a></li>
                <li><a href="#dfat">DFAT Website</a></li>
                <li><a href="#immi">Department of Home Affairs</a></li>
                <li><a href="#austrade">Austrade</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-logo">
              <div className="logo-placeholder-small">Australian Government</div>
            </div>
            <div className="footer-links">
              <a href="#privacy">Privacy Policy</a>
              <a href="#accessibility">Accessibility</a>
              <a href="#copyright">Copyright</a>
              <a href="#disclaimer">Disclaimer</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default Footer;
