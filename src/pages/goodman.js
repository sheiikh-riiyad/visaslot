import React from 'react';


function GoodmanAbout() {
  return (
    <div className="goodman-about">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="hero-content">
          <h1>About Goodman Group</h1>
          <p className="hero-subtitle">Leading the Future of Industrial Property in Australia</p>
        </div>
      </section>

      {/* Company Overview */}
      <section className="company-overview">
        <div className="container">
          <div className="overview-content">
            <div className="overview-text">
              <h2>Our Story</h2>
              <p>
                Goodman Group is a leading global industrial property group with operations 
                throughout Australia, New Zealand, Asia, Europe, the United Kingdom, and the Americas. 
                Founded in 1989, we have grown to become one of the largest listed industrial property 
                groups on the Australian Securities Exchange.
              </p>
              <p>
                Our focus is on owning, developing, and managing high-quality industrial and 
                business space in strategic locations. We work closely with our customers to 
                create properties that support their business growth and operational efficiency.
              </p>
            </div>
            <div className="overview-stats">
              <div className="stat-item">
                <h3>30+</h3>
                <p>Years in Business</p>
              </div>
              <div className="stat-item">
                <h3>$70B+</h3>
                <p>Assets Under Management</p>
              </div>
              <div className="stat-item">
                <h3>17</h3>
                <p>Countries Worldwide</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="our-values">
        <div className="container">
          <h2>Our Values</h2>
          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon">🏭</div>
              <h3>Innovation</h3>
              <p>Pioneering sustainable and technologically advanced industrial solutions</p>
            </div>
            <div className="value-card">
              <div className="value-icon">🤝</div>
              <h3>Partnership</h3>
              <p>Building long-term relationships based on trust and mutual success</p>
            </div>
            <div className="value-card">
              <div className="value-icon">🌱</div>
              <h3>Sustainability</h3>
              <p>Committed to environmental responsibility and sustainable development</p>
            </div>
            <div className="value-card">
              <div className="value-icon">🎯</div>
              <h3>Excellence</h3>
              <p>Delivering exceptional quality in every project we undertake</p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="what-we-do">
        <div className="container">
          <h2>What We Do</h2>
          <div className="services-grid">
            <div className="service-item">
              <h3>Property Development</h3>
              <p>Designing and constructing state-of-the-art industrial facilities tailored to our clients' needs</p>
            </div>
            <div className="service-item">
              <h3>Property Management</h3>
              <p>Professional management services ensuring optimal performance of industrial assets</p>
            </div>
            <div className="service-item">
              <h3>Investment Management</h3>
              <p>Strategic investment in prime industrial property across global markets</p>
            </div>
            <div className="service-item">
              <h3>Fund Management</h3>
              <p>Managing property funds for institutional and private investors</p>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="leadership-team">
        <div className="container">
          <h2>Leadership Team</h2>
          <div className="team-grid">
            <div className="team-member">
              <div className="member-photo"></div>
              <h3>Greg Goodman</h3>
              <p>Group Chief Executive Officer</p>
            </div>
            <div className="team-member">
              <div className="member-photo"></div>
              <h3>Danny Peeters</h3>
              <p>Chief Operating Officer</p>
            </div>
            <div className="team-member">
              <div className="member-photo"></div>
              <h3>Anthony Rozic</h3>
              <p>Chief Financial Officer</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Ready to Partner With Us?</h2>
          <p>Discover how Goodman Group can support your business growth with our premium industrial solutions.</p>
          <div className="cta-buttons">
            <button className="btn-primary">Contact Us</button>
            <button className="btn-secondary">View Properties</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default GoodmanAbout;