import React, { useState } from 'react';
import './AustralianEmbassy.css';
import { Link } from 'react-router-dom';

const Home = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="dfat-website">
      {/* Official Australian Government Header */}
      <header className="dfat-header">
        <div className="dfat-top-bar">
          <div className="container">
            <div className="top-links">
              <a href="#contact">Contact</a>
              <a href="#news">News</a>
              <a href="#about">About DFAT</a>
              <a href="#careers">Careers</a>
            </div>
          </div>
        </div>
        
        <div className="dfat-main-header">
          <div className="container">
            <div className="header-content">
              <div className="gov-branding">
                <div className="coat-arms">
                  <div className="official-logo">
                    <span className="gov-text">Australian Government</span>
                  </div>
                </div>
                <div className="department-branding">
                  <h1>Department of Foreign Affairs and Trade</h1>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Navigation */}
        <nav className="dfat-navigation">
          <div className="container">
            <button className="nav-toggle" onClick={toggleMenu} aria-label="Toggle navigation">
              <span></span>
              <span></span>
              <span></span>
            </button>
            
            <ul className={`nav-menu ${isMenuOpen ? 'nav-open' : ''}`}>
              <li className={activeTab === 'home' ? 'nav-active' : ''}>
                <a href="#home" onClick={() => setActiveTab('home')}>Home</a>
              </li>
              <li className={activeTab === 'countries' ? 'nav-active' : ''}>
                <a href="#countries" onClick={() => setActiveTab('countries')}>Countries and regions</a>
              </li>
              <li className={activeTab === 'international' ? 'nav-active' : ''}>
                <a href="#international" onClick={() => setActiveTab('international')}>International relations</a>
              </li>
              <li className={activeTab === 'trade' ? 'nav-active' : ''}>
                <a href="#trade" onClick={() => setActiveTab('trade')}>Trade and investment</a>
              </li>
              <li className={activeTab === 'aid' ? 'nav-active' : ''}>
                <a href="#aid" onClick={() => setActiveTab('aid')}>Australian aid</a>
              </li>
              <li className={activeTab === 'consular' ? 'nav-active' : ''}>
                <a href="#consular" onClick={() => setActiveTab('consular')}>Consular services</a>
              </li>
              <li className={activeTab === 'visas' ? 'nav-active' : ''}>
                <a href="#visas" onClick={() => setActiveTab('visas')}>Visas and migration</a>
              </li>
              <li className={activeTab === 'business' ? 'nav-active' : ''}>
                <a href="#business" onClick={() => setActiveTab('business')}>Business</a>
              </li>
            </ul>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="dfat-main">
        <div className="container">
          {/* Hero Banner */}
          <section className="dfat-hero">
            <div className="hero-content">
              <h1>Advancing Australia's international interests</h1>
              <p>Supporting Australians overseas, promoting international trade, and strengthening global partnerships.</p>
              <div className="hero-actions">
                <a href="#travel-advice" className="dfat-btn dfat-btn-primary">Travel advice</a>
                <a href="#smartraveller" className="dfat-btn dfat-btn-secondary">Smartraveller</a>
              </div>
            </div>
          </section>

          {/* Application Section */}
          <section className="application-section">
            <div className="application-content">
              <h2>Apply for Migration and Visa Services</h2>
              <p>Start your application for Australian migration and visa services through our secure online portal.</p>
              <Link to="/service" className="dfat-btn dfat-btn-primary application-btn">
                Apply for Migration and Visa
              </Link>
            </div>
          </section>

          {/* Emergency Alert Banner */}
          <section className="emergency-alert">
            <div className="alert-content">
              <div className="alert-icon">⚠️</div>
              <div className="alert-text">
                <h3>Emergency consular assistance</h3>
                <p>For urgent help, contact the 24-hour Consular Emergency Centre: <strong>+61 2 6261 3305</strong></p>
              </div>
              <a href="#emergency" className="alert-link">Learn more</a>
            </div>
          </section>

          {/* Quick Links Section */}
          <section className="quick-links-section">
            <h2>Popular services</h2>
            <div className="quick-links-grid">
              <a href="#passports" className="quick-link-card">
                <div className="link-icon">📘</div>
                <h3>Australian passports</h3>
                <p>Apply for or renew an Australian passport</p>
              </a>
              <a href="#notarial" className="quick-link-card">
                <div className="link-icon">📄</div>
                <h3>Notarial services</h3>
                <p>Document certification and notarial acts</p>
              </a>
              <a href="#visas" className="quick-link-card">
                <div className="link-icon">🛂</div>
                <h3>Visa services</h3>
                <p>Information on visas for Australia</p>
              </a>
              <a href="#trade" className="quick-link-card">
                <div className="link-icon">💼</div>
                <h3>Trade and investment</h3>
                <p>Support for Australian businesses overseas</p>
              </a>
            </div>
          </section>

          {/* News and Updates */}
          <section className="news-updates">
            <div className="section-header">
              <h2>News and announcements</h2>
              <a href="#all-news" className="view-all">View all news</a>
            </div>
            <div className="news-grid">
              <article className="news-card">
                <div className="news-date">15 March 2023</div>
                <h3>Australia strengthens Pacific partnerships</h3>
                <p>New agreements signed to enhance cooperation with Pacific Island nations on climate resilience and economic development.</p>
                <a href="#read-more" className="news-link">Read more</a>
              </article>
              <article className="news-card">
                <div className="news-date">12 March 2023</div>
                <h3>Updated travel advice for Southeast Asia</h3>
                <p>Revised travel recommendations for several Southeast Asian destinations based on latest security assessments.</p>
                <a href="#read-more" className="news-link">Read more</a>
              </article>
              <article className="news-card">
                <div className="news-date">8 March 2023</div>
                <h3>Australia celebrates International Women's Day</h3>
                <p>Global initiatives launched to support women's empowerment and gender equality in international development programs.</p>
                <a href="#read-more" className="news-link">Read more</a>
              </article>
            </div>
          </section>

          {/* Travel Advice Section */}
          <section className="travel-advice-section">
            <h2>Travel advice</h2>
            <div className="travel-grid">
              <div className="travel-card high-risk">
                <h3>Do not travel</h3>
                <p>Countries with extreme security risks</p>
                <a href="#list" className="travel-link">View destinations</a>
              </div>
              <div className="travel-card moderate-risk">
                <h3>Reconsider travel</h3>
                <p>Countries with high security risks</p>
                <a href="#list" className="travel-link">View destinations</a>
              </div>
              <div className="travel-card low-risk">
                <h3>Exercise caution</h3>
                <p>Countries with general safety advice</p>
                <a href="#list" className="travel-link">View destinations</a>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      
    </div>
  );
};

export default Home;