


function BHPAbout() {
  return (
    <div className="bhp-about">
      {/* Hero Section */}
      <section className="bhp-hero">
        <div className="bhp-hero-content">
          <h1>About BHP</h1>
          <p className="bhp-hero-subtitle">A Global Leader in Resources</p>
          <p className="bhp-hero-description">
            For over 160 years, BHP has been supplying the essential resources that power growth and development worldwide.
          </p>
        </div>
      </section>

      {/* Quick Facts */}
      <section className="bhp-facts">
        <div className="container">
          <div className="facts-grid">
            <div className="fact-item">
              <h3>160+</h3>
              <p>Years of Operation</p>
            </div>
            <div className="fact-item">
              <h3>80,000+</h3>
              <p>Employees & Contractors</p>
            </div>
            <div className="fact-item">
              <h3>25+</h3>
              <p>Countries of Operation</p>
            </div>
            <div className="fact-item">
              <h3>ASX Top 10</h3>
              <p>Market Capitalisation</p>
            </div>
          </div>
        </div>
      </section>

      {/* Company Overview */}
      <section className="bhp-overview">
        <div className="container">
          <div className="overview-grid">
            <div className="overview-content">
              <h2>Our Purpose</h2>
              <p>
                BHP's purpose is to bring people and resources together to build a better world. 
                We do this through our strategy to create long-term value and returns through the cycle, 
                by owning, operating and developing a diversified portfolio of high-quality resource assets.
              </p>
              <p>
                As one of the world's leading resource companies, we provide the essential commodities 
                that enable economic development and help improve living standards around the world.
              </p>
            </div>
            <div className="overview-highlights">
              <h3>Our Core Commodities</h3>
              <ul>
                <li>Iron Ore</li>
                <li>Copper</li>
                <li>Nickel</li>
                <li>Potash</li>
                <li>Metallurgical Coal</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Our Operations */}
      <section className="bhp-operations">
        <div className="container">
          <h2>Global Operations</h2>
          <div className="operations-grid">
            <div className="operation-card">
              <div className="operation-icon">⛏️</div>
              <h3>Western Australia Iron Ore</h3>
              <p>One of the world's premier suppliers of iron ore, operating multiple mines in the Pilbara region.</p>
            </div>
            <div className="operation-card">
              <div className="operation-icon">🏭</div>
              <h3>Copper Assets</h3>
              <p>Major copper operations in Chile, Peru, and South Australia, including the Olympic Dam mine.</p>
            </div>
            <div className="operation-card">
              <div className="operation-icon">⚡</div>
              <h3>Coal Operations</h3>
              <p>High-quality metallurgical coal operations in Queensland and New South Wales.</p>
            </div>
            <div className="operation-card">
              <div className="operation-icon">🌍</div>
              <h3>Global Presence</h3>
              <p>Operations and offices across Australia, the Americas, and Asia.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sustainability */}
      <section className="bhp-sustainability">
        <div className="container">
          <div className="sustainability-content">
            <h2>Sustainability & ESG</h2>
            <p>
              At BHP, we are committed to operating safely, sustainably, and responsibly. 
              Our approach to sustainability is integrated into everything we do, from how we manage 
              our operations to how we engage with our stakeholders.
            </p>
            <div className="sustainability-pillars">
              <div className="pillar">
                <h4>Environmental Stewardship</h4>
                <p>Committed to net zero emissions by 2050 and protecting biodiversity</p>
              </div>
              <div className="pillar">
                <h4>Social Responsibility</h4>
                <p>Investing in communities and maintaining strong social license to operate</p>
              </div>
              <div className="pillar">
                <h4>Governance Excellence</h4>
                <p>Highest standards of corporate governance and transparency</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="bhp-leadership">
        <div className="container">
          <h2>Our Leadership</h2>
          <div className="leadership-grid">
            <div className="leader-card">
              <div className="leader-photo"></div>
              <h3>Mike Henry</h3>
              <p>Chief Executive Officer & Executive Director</p>
            </div>
            <div className="leader-card">
              <div className="leader-photo"></div>
              <h3>David Lamont</h3>
              <p>Chief Financial Officer</p>
            </div>
            <div className="leader-card">
              <div className="leader-photo"></div>
              <h3>Geraldine Slattery</h3>
              <p>President, Australia</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bhp-values">
        <div className="container">
          <h2>Our Values</h2>
          <div className="values-grid">
            <div className="value-item">
              <h3>Safety</h3>
              <p>Zero harm to our people, communities, and environment</p>
            </div>
            <div className="value-item">
              <h3>Integrity</h3>
              <p>Doing what is right and ethical in all circumstances</p>
            </div>
            <div className="value-item">
              <h3>Performance</h3>
              <p>Achieving results and delivering on our commitments</p>
            </div>
            <div className="value-item">
              <h3>Respect</h3>
              <p>Valuing diversity and embracing different perspectives</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bhp-cta">
        <div className="container">
          <div className="cta-content">
            <h2>Building a Better World Through Resources</h2>
            <p>Join us in our mission to supply the essential resources for global development and a sustainable future.</p>
            <div className="cta-buttons">
              <button className="btn-primary">Investor Relations</button>
              <button className="btn-secondary">Sustainability Report</button>
              <button className="btn-outline">Careers at BHP</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default BHPAbout;