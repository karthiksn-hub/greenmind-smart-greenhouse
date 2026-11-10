
"use client";

import Link from "next/link";

const plants = [
  { name: "Tomato Plant", health: 92, status: "Healthy", water: "Good" },
  { name: "Chilli Plant", health: 78, status: "Good", water: "Moderate" },
  { name: "Potato Plant", health: 56, status: "Needs attention", water: "Low" },
];

export default function PlantHealthPage() {
  return (
    <main style={{
      minHeight: "100vh",
      padding: "35px",
      background: "#0b172b",
      color: "#eef5ff",
      fontFamily: "Arial, sans-serif"
    }}>
      <Link href="/" style={{ color: "#54d6a0" }}>← Back to Dashboard</Link>

      <h1 style={{ marginTop: 25 }}>🌱 Complete Plant Health</h1>
      <p style={{ color: "#a7b8d0" }}>
        Monitor plant condition, health scores and growing environment.
      </p>

      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
        gap: 18,
        marginTop: 30
      }}>
        {[
          ["92%", "Overall Plant Health"],
          ["3", "Plants Monitored"],
          ["2", "Healthy Plants"],
          ["1", "Needs Attention"]
        ].map(([value, label]) => (
          <article key={label} style={card}>
            <h2 style={{ fontSize: 34, color: "#54d6a0" }}>{value}</h2>
            <p>{label}</p>
          </article>
        ))}
      </section>

      <h2 style={{ marginTop: 40 }}>Individual Plant Health</h2>

      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
        gap: 18,
        marginTop: 20
      }}>
        {plants.map((plant) => (
          <article key={plant.name} style={card}>
            <h3>🌿 {plant.name}</h3>
            <h2 style={{ fontSize: 35, color: "#54d6a0" }}>
              {plant.health}%
            </h2>
            <div style={{
              background: "#263851",
              height: 10,
              borderRadius: 10,
              overflow: "hidden"
            }}>
              <div style={{
                width: `${plant.health}%`,
                height: "100%",
                background: "#35c991"
              }} />
            </div>
            <p>Status: {plant.status}</p>
            <p>Water condition: {plant.water}</p>
          </article>
        ))}
      </section>

      <article style={{ ...card, marginTop: 30 }}>
        <h2>Plant Care Recommendations</h2>
        <p>💧 Check soil moisture before watering.</p>
        <p>☀️ Provide sufficient sunlight for healthy growth.</p>
        <p>🔍 Inspect leaves regularly for disease symptoms.</p>
        <p>🌱 Maintain suitable temperature and humidity.</p>
      </article>

      <p style={{ color: "#91a4bd", marginTop: 30 }}>
        Demo plant scores only. Live plant health monitoring will be connected
        after sensor and plant-analysis integration.
      </p>
    </main>
  );
}

const card: React.CSSProperties = {
  background: "#12233c",
  border: "1px solid #294362",
  borderRadius: 16,
  padding: 22
};

