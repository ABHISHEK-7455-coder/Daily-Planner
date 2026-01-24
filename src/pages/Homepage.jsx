import "./Homepage.css";

export default function Homepage({ onNavigateToToday }) {
  return (
    <div className="homepage-wrapper">
      {/* HEADER */}
      <header className="homepage-header">
        <div className="homepage-logo">
          <span className="homepage-logo-icon">✨</span>
          <span className="homepage-logo-text">SereneLife</span>
        </div>
        <nav className="homepage-nav">
          <button className="homepage-nav-link homepage-nav-active">Dashboard</button>
          <button className="homepage-nav-link">Reflections</button>
          <button className="homepage-nav-link">Library</button>
          <button className="homepage-nav-icon-btn">⚙️</button>
          <div className="homepage-avatar">👤</div>
        </nav>
      </header>

      {/* MAIN CONTENT */}
      <main className="homepage-main">
        {/* HERO SECTION */}
        <section className="homepage-hero">
          <div className="homepage-hero-content">
            <p className="homepage-anchor">PERSONAL ANCHOR</p>
            <h1 className="homepage-title">
              "Breathe, focus, and find joy in the small things."
            </h1>
          </div>
          <button className="homepage-cta-btn" onClick={onNavigateToToday}>
            <span className="homepage-cta-icon">📋</span>
            <span>Go to Dashboard</span>
          </button>
          <button className="homepage-edit-btn">✏️ Edit Mantra</button>
        </section>

        {/* DAILY BUCKETS SECTION */}
        <section className="homepage-buckets-section">
          <div className="homepage-section-header">
            <h2>Daily Buckets</h2>
            <span className="homepage-completion">65% COMPLETION</span>
          </div>

          <div className="homepage-buckets-grid">
            {/* Morning Bucket */}
            <div className="homepage-bucket">
              <div className="homepage-bucket-image homepage-bucket-morning">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Cdefs%3E%3ClinearGradient id='g1' x1='0%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23134e4a'/%3E%3Cstop offset='100%25' style='stop-color:%2322543d'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g1)' width='400' height='300'/%3E%3Cellipse cx='200' cy='80' rx='60' ry='60' fill='%23fbbf24' opacity='0.3'/%3E%3Cpath d='M 50 200 Q 100 180 150 200 T 250 200 T 350 200' stroke='%2322543d' stroke-width='3' fill='none'/%3E%3C/svg%3E" alt="Morning" />
              </div>
              <div className="homepage-bucket-content">
                <div className="homepage-bucket-header">
                  <h3>Morning</h3>
                  <span className="homepage-bucket-icon">☀️</span>
                </div>
                <p className="homepage-bucket-subtitle">Meditation, Hydrate</p>
                <div className="homepage-bucket-progress">
                  <div className="homepage-bucket-progress-bar">
                    <div className="homepage-bucket-progress-fill" style={{ width: "67%" }}></div>
                  </div>
                  <span className="homepage-bucket-count">2/3</span>
                </div>
              </div>
            </div>

            {/* Afternoon Bucket */}
            <div className="homepage-bucket">
              <div className="homepage-bucket-image homepage-bucket-afternoon">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Cdefs%3E%3ClinearGradient id='g2' x1='0%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2360a5fa'/%3E%3Cstop offset='100%25' style='stop-color:%2393c5fd'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g2)' width='400' height='300'/%3E%3Cellipse cx='350' cy='60' rx='50' ry='50' fill='%23fbbf24' opacity='0.8'/%3E%3Crect x='150' y='220' width='100' height='15' fill='%23e0f2fe' rx='2'/%3E%3Crect x='160' y='230' width='80' height='8' fill='%23bae6fd' rx='1'/%3E%3C/svg%3E" alt="Afternoon" />
              </div>
              <div className="homepage-bucket-content">
                <div className="homepage-bucket-header">
                  <h3>Afternoon</h3>
                  <span className="homepage-bucket-icon">⚡</span>
                </div>
                <p className="homepage-bucket-subtitle">Deep Work, Nature</p>
                <div className="homepage-bucket-progress">
                  <div className="homepage-bucket-progress-bar">
                    <div className="homepage-bucket-progress-fill" style={{ width: "0%" }}></div>
                  </div>
                  <span className="homepage-bucket-count">0/2</span>
                </div>
              </div>
            </div>

            {/* Night Bucket */}
            <div className="homepage-bucket">
              <div className="homepage-bucket-image homepage-bucket-night">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Cdefs%3E%3CradialGradient id='g3'%3E%3Cstop offset='0%25' style='stop-color:%231e3a8a'/%3E%3Cstop offset='100%25' style='stop-color:%230f172a'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect fill='url(%23g3)' width='400' height='300'/%3E%3Cpath d='M 200 80 Q 210 70 220 80 Q 230 90 220 100 Q 210 110 200 100 Q 190 90 200 80' fill='%23f1f5f9' opacity='0.9'/%3E%3Ccircle cx='150' cy='50' r='2' fill='%23ffffff' opacity='0.8'/%3E%3Ccircle cx='280' cy='70' r='1.5' fill='%23ffffff' opacity='0.7'/%3E%3Crect x='150' y='250' width='100' height='40' fill='%23422006' rx='2'/%3E%3Crect x='165' y='230' width='20' height='20' fill='%23fbbf24' opacity='0.6'/%3E%3C/svg%3E" alt="Night" />
              </div>
              <div className="homepage-bucket-content">
                <div className="homepage-bucket-header">
                  <h3>Night</h3>
                  <span className="homepage-bucket-icon">🌙</span>
                </div>
                <p className="homepage-bucket-subtitle">Reading, Gratitude</p>
                <div className="homepage-bucket-progress">
                  <div className="homepage-bucket-progress-bar">
                    <div className="homepage-bucket-progress-fill" style={{ width: "0%" }}></div>
                  </div>
                  <span className="homepage-bucket-count">0/3</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TIMELINE SECTION */}
        <aside className="homepage-timeline">
          <h2>Timeline</h2>
          <div className="homepage-timeline-list">
            <div className="homepage-timeline-item homepage-timeline-active">
              <span className="homepage-timeline-dot"></span>
              <div className="homepage-timeline-content">
                <span className="homepage-timeline-time">10:45 AM — NOW</span>
                <h4>Morning Reflection</h4>
                <p>Feeling centered and ready</p>
              </div>
            </div>
            <div className="homepage-timeline-item">
              <span className="homepage-timeline-dot"></span>
              <div className="homepage-timeline-content">
                <span className="homepage-timeline-time">12:30 PM</span>
                <h4>Lunch & Hydration</h4>
              </div>
            </div>
            <div className="homepage-timeline-item">
              <span className="homepage-timeline-dot"></span>
              <div className="homepage-timeline-content">
                <span className="homepage-timeline-time">4:00 PM</span>
                <h4>Afternoon Walk</h4>
              </div>
            </div>
          </div>
        </aside>

        {/* STATS SECTION */}
        <section className="homepage-stats">
          <div className="homepage-stat-card">
            <p className="homepage-stat-label">CURRENT STREAK</p>
            <p className="homepage-stat-value homepage-stat-purple">12 Days</p>
          </div>
          <div className="homepage-stat-card">
            <p className="homepage-stat-label">MINDFUL MINUTES</p>
            <p className="homepage-stat-value homepage-stat-cyan">480m</p>
          </div>
          <div className="homepage-stat-card">
            <p className="homepage-stat-label">MOMENTS LOGGED</p>
            <p className="homepage-stat-value homepage-stat-dark">142</p>
          </div>
        </section>

        {/* WELLBEING FEATURES */}
        <section className="homepage-features">
          <h2>Wellbeing Features</h2>
          <p className="homepage-features-subtitle">
            Tools designed to help you live with intention and document the beauty in your everyday life.
          </p>

          <div className="homepage-features-grid">
            <div className="homepage-feature-card">
              <div className="homepage-feature-icon homepage-feature-purple">📖</div>
              <h3>Gentle Journaling</h3>
              <p>
                A space for soft reflection without the pressure of a blank page. 
                Guided prompts for morning clarity and evening peace.
              </p>
            </div>
            <div className="homepage-feature-card">
              <div className="homepage-feature-icon homepage-feature-cyan">🌱</div>
              <h3>Calm Productivity</h3>
              <p>
                Move away from overwhelming to-do lists. Organize your day into 
                three manageable buckets for a balanced pace.
              </p>
            </div>
            <div className="homepage-feature-card">
              <div className="homepage-feature-icon homepage-feature-purple">📷</div>
              <h3>Life Documentation</h3>
              <p>
                Capture small, meaningful moments with photos and notes. 
                Create a living archive of your personal journey and growth.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="homepage-footer">
        <div className="homepage-footer-left">
          <span className="homepage-footer-logo">✨ SereneLife</span>
          <p className="homepage-footer-copyright">© 2024 SereneLife. All rights reserved.</p>
        </div>
        <nav className="homepage-footer-nav">
          <a href="#about">About</a>
          <a href="#privacy">Privacy</a>
          <a href="#support">Support</a>
        </nav>
        <div className="homepage-footer-social">
          <p>FOLLOW US</p>
          <a href="#instagram">📷 Instagram</a>
          <a href="#pinterest">📌 Pinterest</a>
        </div>
      </footer>

      {/* FLOATING ACTION BUTTON */}
      <button className="homepage-fab">+</button>
    </div>
  );
}