
"use client";

import LiveSensorData from "./components/livesensordata";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const sensors = [
  { icon: "🌡️", name: "Temperature", value: "28.5", unit: "°C", status: "Normal", color: "orange" },
  { icon: "💧", name: "Humidity", value: "65", unit: "%", status: "Optimal", color: "blue" },
  { icon: "🌱", name: "Soil Moisture", value: "72", unit: "%", status: "Good", color: "green" },
  { icon: "☀️", name: "Light Intensity", value: "850", unit: "lux", status: "Normal", color: "yellow" },
];

const week = [
  { day: "Mon", value: 55 },
  { day: "Tue", value: 72 },
  { day: "Wed", value: 64 },
  { day: "Thu", value: 85 },
  { day: "Fri", value: 70 },
  { day: "Sat", value: 92 },
  { day: "Sun", value: 78 },
];

const menu = [
  { name: "Overview", icon: "▦" },
  { name: "Plant Health", icon: "🌱", path: "/plant-health" },
  { name: "Disease Detection", icon: "🔬", path: "/disease-detection" },
  { name: "Irrigation", icon: "💧" },
  { name: "Analytics", icon: "📊" },
];

export default function Home() {
  const [lastUpdated, setLastUpdated] = useState("");

useEffect(() => {
  setLastUpdated(new Date().toLocaleString("en-IN"));
}, []);
  const router = useRouter();

  const [dark, setDark] = useState(false);
  const [pump, setPump] = useState(false);
  const [fan, setFan] = useState(true);
  const [light, setLight] = useState(false);
  const [active, setActive] = useState("Overview");

  const devices = [
    { name: "Water Pump", detail: "Irrigation system", icon: "🚿", value: pump, change: setPump },
    { name: "Cooling Fan", detail: "Temperature control", icon: "🌀", value: fan, change: setFan },
    { name: "Grow Light", detail: "Artificial lighting", icon: "💡", value: light, change: setLight },
  ];

  function navigate(item: { name: string; path?: string }) {
    setActive(item.name);

    if (item.path) {
      router.push(item.path);
    }
  }

  return (
    <main className={dark ? "app dark" : "app"}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">🌿</div>
          <div>
            <strong>Green<span>Mind</span></strong>
            <small>SMART GREENHOUSE</small>
          </div>
        </div>

        <div className="side-label">MENU</div>

        {menu.map((item) => (
          <button
            key={item.name}
            className={`nav-item ${active === item.name ? "selected" : ""}`}
            onClick={() => navigate(item)}
          >
            <span>{item.icon}</span>
            {item.name}
          </button>
        ))}

        <div className="side-label device-label">SYSTEM</div>

        <button
          className={`nav-item ${active === "Settings" ? "selected" : ""}`}
          onClick={() => setActive("Settings")}
        >
          <span>⚙️</span> Settings
        </button>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span>🌿</span>
            <strong>Growing smarter</strong>
            <p>Technology for healthier plants and better harvests.</p>
          </div>

          <div className="profile">
            <div className="avatar">SG</div>
            <div>
              <strong>Greenhouse Admin</strong>
              <small>Administrator</small>
            </div>
          </div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div>
            <div className="breadcrumb">Greenhouse / <b>{active}</b></div>
            <h1>Greenhouse Overview</h1>
            <p className="subtitle">
              Monitor your greenhouse and manage growing conditions.
            </p>
          </div>

          <div className="top-actions">
            <span className="demo-status"><i /> DEMO MODE</span>

            <button className="theme-button" onClick={() => setDark(!dark)}>
              {dark ? "☀️ Light" : "🌙 Dark"}
            </button>

            <div className="notification">🔔</div>
          </div>
        </header>

        <div className="content">
          <div className="welcome-banner">
            <div>
              <span className="banner-tag">SMART AGRICULTURE SYSTEM</span>
              <h2>Welcome to your Greenhouse 🌱</h2>
              <p>
                Your plants are growing. Here's your greenhouse status today.
              </p>
            </div>
            <div className="banner-art">🌿</div>
          </div>

          <LiveSensorData />

          <div className="sensor-grid">
            {sensors.map((sensor) => (
              <article className="sensor-card" key={sensor.name}>
                <div className="sensor-top">
                  <span className={`sensor-icon ${sensor.color}`}>
                    {sensor.icon}
                  </span>
                  <span className="sensor-menu">•••</span>
                </div>

                <p>{sensor.name}</p>

                <div className="sensor-value">
                  {sensor.value}<small>{sensor.unit}</small>
                </div>

                <span className="sensor-status">● {sensor.status}</span>
              </article>
            ))}
          </div>

          <div className="section-heading">
            <div>
              <h2>Greenhouse Insights</h2>
              <p>Plant condition and environmental trends</p>
            </div>
          </div>

          <div className="insights-grid">
            <article className="panel health-panel">
              <div className="panel-heading">
                <div>
                  <h3>Overall Plant Health</h3>
                  <p>Estimated health score</p>
                </div>
                <span>🌿</span>
              </div>

              <div className="health-content">
                <div className="health-ring">
                  <div>
                    <strong>92%</strong>
                    <small>Healthy</small>
                  </div>
                </div>

                <div className="health-info">
                  <strong>Excellent condition!</strong>
                  <p>Your sample plant health score is looking good.</p>
                  <span className="positive">↑ Healthy range</span>
                  <br />
                  <button onClick={() => router.push("/plant-health")}>
                    View full plant health →
                  </button>
                </div>
              </div>

              <div className="health-foot">
                <span>Health categories</span>
                <b>90–100% Healthy</b>
              </div>
            </article>

            <article className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h3>Weekly Greenhouse Activity</h3>
                  <p>Illustrative moisture readings</p>
                </div>
                <span className="chart-period">7 days</span>
              </div>

              <div className="chart">
                {week.map((item) => (
                  <div className="chart-column" key={item.day}>
                    <div className="bar-area">
                      <div
                        className="bar"
                        style={{ height: `${item.value}%` }}
                      />
                    </div>
                    <small>{item.day}</small>
                  </div>
                ))}
              </div>

              <div className="chart-caption">
                <span><i /> Soil moisture (%)</span>
                <b>Sample data</b>
              </div>
            </article>
          </div>

          <div className="section-heading">
            <div>
              <h2>Device Controls</h2>
              <p>Demonstration controls – not connected to hardware yet</p>
            </div>
            <span className="manual-tag">MANUAL DEMO</span>
          </div>

          <div className="device-grid">
            {devices.map((device) => (
              <article className="device-card" key={device.name}>
                <div className="device-icon">{device.icon}</div>

                <div className="device-details">
                  <strong>{device.name}</strong>
                  <small>{device.detail}</small>
                </div>

                <button
                  className={`toggle ${device.value ? "on" : ""}`}
                  onClick={() => device.change(!device.value)}
                  aria-label={`Toggle ${device.name}`}
                >
                  <span />
                </button>

                <div className="device-state">
                  {device.value ? "ON" : "OFF"}
                </div>
              </article>
            ))}
          </div>

          <div className="bottom-grid">
            <article className="panel recommendation">
              <div className="recommend-icon">🤖</div>
              <div>
                <span className="banner-tag">AI FARMER ASSISTANT</span>
                <h3>Your smart farming assistant</h3>
                <p>
                  Ask questions about watering, plant health and greenhouse
                  management.
                </p>
                <button onClick={() => alert("AI chatbot integration is the next step.")}>
                  Explore AI Assistant →
                </button>
              </div>
            </article>

            <article className="panel connection">
              <h3>Hardware Connection</h3>
              <div className="connection-status">
                <span className="offline-dot" />
                ESP32-S3 <b>Not connected</b>
              </div>
              <p>
                Your live sensor data will appear here after hardware
                integration.
              </p>
            </article>
          </div>

   
          <footer>
  GreenMind Smart Greenhouse · Built for intelligent agriculture ·
  Last updated: {lastUpdated || "Loading..."}
</footer>
        </div>
      </section>
    </main>
  );
}
