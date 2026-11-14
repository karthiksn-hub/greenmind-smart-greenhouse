"use client";

import { useCallback, useEffect, useState } from "react";
import "./irrigation.css";

type Telemetry = {
  temperature_c: number | null;
  humidity_percent: number | null;
  soil_moisture_percent: number | null;
  light_percent: number | null;
  battery_voltage: number | null;
  created_at: string | null;
};

type IrrigationResponse = {
  success: boolean;
  mode?: "waiting" | "stale" | "live";
  isSimulated?: boolean;
  isStale?: boolean;
  message?: string;
  ageSeconds?: number | null;
  telemetry?: Telemetry | null;
  history?: Telemetry[];
  error?: string;
};

function formatValue(
  value: number | null | undefined,
  suffix = "",
  decimals = 1
) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }

  return `${value.toFixed(decimals)}${suffix}`;
}

function formatTime(value: string | null | undefined) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleString();
}

function getMoistureAdvice(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return {
      title: "Waiting for soil moisture data",
      message: "Connect the ESP32 soil moisture sensor to receive watering advice.",
      type: "neutral",
    };
  }

  if (value < 30) {
    return {
      title: "Soil moisture is low",
      message:
        "The soil may need watering. Check the plant and confirm the sensor reading before watering.",
      type: "warning",
    };
  }

  if (value < 45) {
    return {
      title: "Soil moisture is below the preferred range",
      message:
        "Monitor the soil condition. Consider watering if the crop requires it.",
      type: "caution",
    };
  }

  if (value <= 70) {
    return {
      title: "Soil moisture is in a suitable range",
      message: "Continue monitoring the soil moisture level.",
      type: "good",
    };
  }

  return {
    title: "Soil moisture is high",
    message:
      "Avoid additional watering until the soil moisture level decreases. Check drainage if needed.",
    type: "caution",
  };
}

export default function IrrigationPage() {
  const [data, setData] = useState<IrrigationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState("");

  const fetchIrrigationData = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    }

    try {
      const response = await fetch("/api/irrigation", {
        method: "GET",
        cache: "no-store",
      });

      const result: IrrigationResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to load irrigation information."
        );
      }

      setData(result);
      setError("");
      setLastChecked(new Date());
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to connect to the irrigation API.";

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchIrrigationData();

    const interval = window.setInterval(() => {
      fetchIrrigationData();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [fetchIrrigationData]);

  const telemetry = data?.telemetry ?? null;
  const history = data?.history ?? [];
  const isLive = data?.mode === "live" && !data?.isStale;
  const isWaiting = data?.mode === "waiting";
  const isStale = data?.mode === "stale" || data?.isStale === true;
  const advice = getMoistureAdvice(
    telemetry?.soil_moisture_percent
  );

  const moisture = telemetry?.soil_moisture_percent;
  const moistureWidth =
    moisture !== null && moisture !== undefined
      ? Math.max(0, Math.min(100, moisture))
      : 0;

  return (
    <main className="irrigation-page">
      <div className="irrigation-container">
        <header className="irrigation-header">
          <div>
            <p className="irrigation-eyebrow">
              GREENMIND SMART AGRICULTURE
            </p>

            <h1>Smart Irrigation Management</h1>

            <p className="irrigation-subtitle">
              Monitor greenhouse soil moisture and receive irrigation
              guidance from real sensor readings.
            </p>
          </div>

          <button
            className="irrigation-refresh"
            onClick={() => fetchIrrigationData(true)}
            disabled={loading || refreshing}
          >
            <span>{refreshing ? "↻" : "⟳"}</span>
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
        </header>

        <section className="irrigation-connection">
          <div className="connection-heading">
            <div className="connection-title">
              <span
                className={`connection-dot ${
                  isLive ? "dot-live" : "dot-offline"
                }`}
              />

              <div>
                <h2>ESP32 Sensor Connection</h2>
                <p>
                  {isLive
                    ? "Live sensor readings received"
                    : isStale
                      ? "Sensor readings are outdated"
                      : "Waiting for ESP32 connection"}
                </p>
              </div>
            </div>

            <span
              className={`connection-badge ${
                isLive
                  ? "badge-live"
                  : isStale
                    ? "badge-stale"
                    : "badge-offline"
              }`}
            >
              {loading
                ? "CHECKING"
                : isLive
                  ? "LIVE"
                  : isStale
                    ? "STALE"
                    : "WAITING"}
            </span>
          </div>

          <p className="connection-message">
            {error ||
              data?.message ||
              (loading
                ? "Checking for greenhouse sensor readings..."
                : "No sensor information is currently available.")}
          </p>

          <div className="connection-footer">
            <span>
              Last checked:{" "}
              {lastChecked
                ? lastChecked.toLocaleTimeString()
                : "Not checked"}
            </span>

            <span>
              Data source:{" "}
              {data?.isSimulated ? "Simulated" : "Greenhouse telemetry"}
            </span>
          </div>
        </section>

        <section className="irrigation-section">
          <div className="section-heading">
            <div>
              <h2>Sensor Monitoring</h2>
              <p>Latest available greenhouse readings</p>
            </div>
          </div>

          <div className="irrigation-metric-grid">
            <article className="irrigation-metric-card">
              <div className="metric-icon moisture-icon">💧</div>
              <p className="metric-label">Soil Moisture</p>
              <h3>
                {formatValue(
                  telemetry?.soil_moisture_percent,
                  "%",
                  1
                )}
              </h3>
              <p className="metric-description">
                Soil water level
              </p>
            </article>

            <article className="irrigation-metric-card">
              <div className="metric-icon temperature-icon">🌡️</div>
              <p className="metric-label">Temperature</p>
              <h3>
                {formatValue(telemetry?.temperature_c, "°C", 1)}
              </h3>
              <p className="metric-description">
                Greenhouse temperature
              </p>
            </article>

            <article className="irrigation-metric-card">
              <div className="metric-icon humidity-icon">☁️</div>
              <p className="metric-label">Air Humidity</p>
              <h3>
                {formatValue(
                  telemetry?.humidity_percent,
                  "%",
                  1
                )}
              </h3>
              <p className="metric-description">
                Relative air humidity
              </p>
            </article>

            <article className="irrigation-metric-card">
              <div className="metric-icon light-icon">☀️</div>
              <p className="metric-label">Light Intensity</p>
              <h3>
                {formatValue(telemetry?.light_percent, "%", 1)}
              </h3>
              <p className="metric-description">
                Recorded light level
              </p>
            </article>
          </div>
        </section>

        <section className="irrigation-section">
          <div className="section-heading">
            <div>
              <h2>Soil Moisture Analysis</h2>
              <p>Latest recorded soil moisture percentage</p>
            </div>
          </div>

          <article className="moisture-panel">
            <div className="moisture-panel-top">
              <div>
                <p className="metric-label">Current Soil Moisture</p>
                <h3>
                  {formatValue(moisture, "%", 1)}
                </h3>
              </div>

              <span className="moisture-symbol">💧</span>
            </div>

            <div
              className="moisture-progress-track"
              role="progressbar"
              aria-label="Soil moisture"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={
                moisture !== null && moisture !== undefined
                  ? moisture
                  : 0
              }
            >
              <div
                className="moisture-progress-fill"
                style={{ width: `${moistureWidth}%` }}
              />
            </div>

            <div className="moisture-scale">
              <span>0% — Dry</span>
              <span>100% — High</span>
            </div>

            <p className="moisture-note">
              This percentage is displayed directly from the latest
              stored sensor reading. It is not a simulated value.
            </p>
          </article>
        </section>

        <section className="irrigation-section">
          <div className="section-heading">
            <div>
              <h2>Smart Irrigation Advisory</h2>
              <p>Guidance based on the latest soil moisture reading</p>
            </div>
          </div>

          <article className={`advisory-card advisory-${advice.type}`}>
            <div className="advisory-icon">
              {advice.type === "warning"
                ? "⚠️"
                : advice.type === "good"
                  ? "✓"
                  : advice.type === "caution"
                    ? "!"
                    : "💧"}
            </div>

            <div>
              <h3>{advice.title}</h3>
              <p>{advice.message}</p>
            </div>
          </article>

          {!isLive && (
            <p className="advisory-warning">
              Advisory information may be unavailable or based on an
              outdated reading. Check the ESP32 connection before
              making irrigation decisions.
            </p>
          )}
        </section>

        <section className="irrigation-section">
          <div className="section-heading">
            <div>
              <h2>Irrigation System Status</h2>
              <p>Controller and sensor information</p>
            </div>
          </div>

          <div className="system-status-grid">
            <article className="system-status-card">
              <span className="status-card-icon">📡</span>
              <div>
                <p>ESP32 Controller</p>
                <strong>{isLive ? "Connected" : "Not confirmed"}</strong>
              </div>
            </article>

            <article className="system-status-card">
              <span className="status-card-icon">🚿</span>
              <div>
                <p>Water Pump</p>
                <strong>Control not configured</strong>
              </div>
            </article>

            <article className="system-status-card">
              <span className="status-card-icon">🔋</span>
              <div>
                <p>Battery Voltage</p>
                <strong>
                  {formatValue(telemetry?.battery_voltage, " V", 2)}
                </strong>
              </div>
            </article>

            <article className="system-status-card">
              <span className="status-card-icon">🕒</span>
              <div>
                <p>Last Sensor Reading</p>
                <strong className="reading-time">
                  {formatTime(telemetry?.created_at)}
                </strong>
              </div>
            </article>
          </div>
        </section>

        <section className="irrigation-section">
          <div className="section-heading">
            <div>
              <h2>Recent Sensor History</h2>
              <p>
                Latest {history.length} readings received from the
                greenhouse database
              </p>
            </div>
          </div>

          <div className="history-table-wrapper">
            <table className="irrigation-history-table">
              <thead>
                <tr>
                  <th>Date and Time</th>
                  <th>Soil Moisture</th>
                  <th>Temperature</th>
                  <th>Humidity</th>
                  <th>Light</th>
                </tr>
              </thead>

              <tbody>
                {history.length > 0 ? (
                  history.map((item, index) => (
                    <tr
                      key={`${item.created_at ?? "reading"}-${index}`}
                    >
                      <td>{formatTime(item.created_at)}</td>
                      <td>
                        {formatValue(
                          item.soil_moisture_percent,
                          "%"
                        )}
                      </td>
                      <td>
                        {formatValue(item.temperature_c, "°C")}
                      </td>
                      <td>
                        {formatValue(
                          item.humidity_percent,
                          "%"
                        )}
                      </td>
                      <td>
                        {formatValue(item.light_percent, "%")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="history-empty">
                      {loading
                        ? "Loading sensor history..."
                        : "No sensor history is available yet. Connect the ESP32 and send readings to the database."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="irrigation-footer">
          <p>
            GREENMIND SMART AGRICULTURE · SMART IRRIGATION
          </p>
          <p>
            Sensor data is read from the greenhouse telemetry database.
          </p>
        </footer>
      </div>
    </main>
  );
}