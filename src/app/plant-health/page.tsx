
"use client";

import Link from "next/link";

const plants = [
  { name: "Tomato Plant", health: 92, status: "Healthy", water: "Good" },
  { name: "Chilli Plant", health: 78, status: "Good", water: "Moderate" },
  { name: "Potato Plant", health: 56, status: "Needs attention", water: "Low" },
];

export default function PlantHealthPage() {
  return (
    <div className="gm-dashboard">
      <aside className="gm-side">
        <Link href="/" className="gm-side-brand">
          <span className="gm-brand-icon">🌿</span>
          <span>
            <strong>GreenMind</strong>
            <small>SMART GREENHOUSE</small>
          </span>
        </Link>

        <p className="gm-side-label">MENU</p>

        <nav className="gm-side-nav">
          <Link href="/" className="gm-side-link">
            <span>▦</span>Overview
          </Link>

          <Link href="/plant-health" className="gm-side-link active">
            <span>🌱</span>Plant Health
          </Link>

          <Link href="/disease-detection" className="gm-side-link">
            <span>🔬</span>Disease Detection
          </Link>

          <Link href="/irrigation" className="gm-side-link">
            <span>💧</span>Irrigation
          </Link>

          {/* NEW: SMART WATER MANAGEMENT */}
          <Link href="/water-management" className="gm-side-link">
            <span>🚰</span>Smart Water Management
          </Link>

          <Link href="/analytics" className="gm-side-link">
            <span>📊</span>Analytics
          </Link>

          <Link href="/settings" className="gm-side-link">
            <span>⚙</span>Settings
          </Link>
        </nav>

        <div className="gm-side-bottom">
          <div className="gm-side-leaf">🌱</div>
          <strong>GreenMind AI</strong>
          <p>Growing smarter, greener and healthier.</p>
        </div>
      </aside>

      <main className="gm-dashboard-main">
        <header className="gm-dashboard-header">
          <div>
            <p className="gm-breadcrumb">
              <Link href="/">Greenhouse</Link> / Plant Health
            </p>

            <h1>🌱 Complete Plant Health</h1>

            <p className="gm-subtitle">
              Monitor plant condition, health scores and growing environment.
            </p>
          </div>

          <Link href="/" className="gm-small-link">
            ← Back to Dashboard
          </Link>
        </header>

        <section className="gm-summary-grid">
          {[
            ["92%", "Overall Plant Health"],
            ["3", "Plants Monitored"],
            ["2", "Healthy Plants"],
            ["1", "Needs Attention"],
          ].map(([value, label]) => (
            <article className="gm-summary-card" key={label}>
              <h2>{value}</h2>
              <p>{label}</p>
            </article>
          ))}
        </section>

        <section className="gm-plant-section">
          <h2>Individual Plant Health</h2>

          <div className="gm-plant-grid">
            {plants.map((plant) => (
              <article className="gm-plant-card" key={plant.name}>
                <h3>🌿 {plant.name}</h3>

                <strong className="gm-plant-score">
                  {plant.health}%
                </strong>

                <div className="gm-plant-progress">
                  <div style={{ width: `${plant.health}%` }} />
                </div>

                <p>Status: <strong>{plant.status}</strong></p>
                <p>Water condition: <strong>{plant.water}</strong></p>
              </article>
            ))}
          </div>
        </section>

        <section className="gm-care-card">
          <h2>Plant Care Recommendations</h2>

          <ul>
            <li>💧 Check soil moisture before watering.</li>
            <li>☀️ Provide sufficient sunlight for healthy growth.</li>
            <li>🔍 Inspect leaves regularly for disease symptoms.</li>
            <li>🌱 Maintain suitable temperature and humidity.</li>
          </ul>
        </section>

        <p className="gm-demo-note gm-page-note">
          Demo plant scores only. Live plant health monitoring will be
          connected after sensor and plant-analysis integration.
        </p>
      </main>
    </div>
  );
}
