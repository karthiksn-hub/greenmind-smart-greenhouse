
"use client";

import { useCallback, useEffect, useState } from "react";
import "./water-management.css";

type WaterReading = {
  device_id: string | null;
  tank_level_percent: number | null;
  water_volume_liters: number | null;
  created_at: string;
};

type WaterResponse = {
  success: boolean;
  mode?: "live" | "stale" | "waiting";
  isStale?: boolean;
  message?: string;
  ageSeconds?: number | null;
  telemetry?: WaterReading | null;
  history?: WaterReading[];
};

function formatDate(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString();
}

function formatAge(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return "Not available";
  if (seconds < 60) return `${seconds} seconds ago`;

  return `${Math.floor(seconds / 60)} minutes ago`;
}

export default function WaterManagementPage() {
  const [data, setData] = useState<WaterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);

    try {
      const response = await fetch("/api/water-management", {
        cache: "no-store",
      });

      const result: WaterResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error("Unable to load water tank data.");
      }

      setData(result);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadData]);

  const reading = data?.telemetry ?? null;

  const level = reading?.tank_level_percent;
  const volume = reading?.water_volume_liters;

  const validLevel =
    typeof level === "number" &&
    Number.isFinite(level) &&
    level >= 0 &&
    level <= 100;

  const validVolume =
    typeof volume === "number" &&
    Number.isFinite(volume) &&
    volume >= 0;

  let waterStatus = "Waiting for data";

  if (validLevel) {
    if (level <= 20) waterStatus = "Low water level";
    else if (level <= 50) waterStatus = "Moderate water level";
    else waterStatus = "Water level sufficient";
  }

  const connectionStatus =
    data?.mode === "live"
      ? "LIVE"
      : data?.mode === "stale"
        ? "STALE"
        : "WAITING";

  return (
    <main className="water-page">
      <div className="water-container">
        <header className="water-header">
          <div>
            <p className="water-brand">GREENMIND SMART AGRICULTURE</p>
            <h1>Smart Water Management</h1>
            <p>
              Monitor greenhouse water availability and tank readings.
            </p>
          </div>

          <button
            className="water-refresh"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh Data"}
          </button>
        </header>

        {error && (
          <div className="water-error" role="alert">
            {error}
          </div>
        )}

        <section className="water-connection">
          <div className="water-section-heading">
            <div>
              <h2>Water Tank Sensor Connection</h2>
              <p>ESP32 greenhouse telemetry status</p>
            </div>

            <span
              className={`water-status ${
                data?.mode === "live"
                  ? "status-live"
                  : data?.mode === "stale"
                    ? "status-stale"
                    : "status-waiting"
              }`}
            >
              {connectionStatus}
            </span>
          </div>

          <p className="water-message">
            {loading
              ? "Loading water tank information..."
              : data?.message ?? "Waiting for ESP32 connection."}
          </p>

          <small>
            Last checked: {new Date().toLocaleTimeString()}
          </small>
          <small>Data source: Water tank telemetry</small>
        </section>

        <section className="water-section">
          <h2>Water Tank Overview</h2>
          <p>Latest available sensor readings</p>

          <div className="water-stats">
            <article className="water-card">
              <span>💧</span>
              <p>Tank Level</p>
              <h3>{validLevel ? `${level}%` : "--"}</h3>
              <small>Water level percentage</small>
            </article>

            <article className="water-card">
              <span>🚰</span>
              <p>Available Water</p>
              <h3>{validVolume ? `${volume} L` : "--"}</h3>
              <small>Recorded water volume</small>
            </article>

            <article className="water-card">
              <span>📡</span>
              <p>ESP32 Controller</p>
              <h3>
                {data?.mode === "live"
                  ? "Connected"
                  : data?.mode === "stale"
                    ? "Not confirmed"
                    : "Waiting"}
              </h3>
              <small>Based on telemetry freshness</small>
            </article>

            <article className="water-card">
              <span>🕒</span>
              <p>Last Sensor Reading</p>
              <h3 className="water-date">
                {reading ? formatDate(reading.created_at) : "--"}
              </h3>
              <small>
                {reading
                  ? formatAge(data?.ageSeconds)
                  : "No reading received"}
              </small>
            </article>
          </div>
        </section>

        <section className="water-section">
          <h2>Tank Level Analysis</h2>
          <p>Water level from the latest stored sensor reading</p>

          <div className="water-analysis">
            <div className="water-analysis-heading">
              <strong>Current Tank Level</strong>
              <strong>{validLevel ? `${level}%` : "--"}</strong>
            </div>

            <div
              className="water-progress"
              role="progressbar"
              aria-label="Water tank level"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={validLevel ? level : undefined}
            >
              <div
                className="water-progress-fill"
                style={{
                  width: validLevel ? `${level}%` : "0%",
                }}
              />
            </div>

            <div className="water-scale">
              <span>0% — Empty</span>
              <span>100% — Full</span>
            </div>

            <div className="water-advisory">
              <strong>{waterStatus}</strong>
              <p>
                {validLevel
                  ? level <= 20
                    ? "The recorded tank level is low. Check the water supply before irrigation."
                    : level <= 50
                      ? "The recorded tank level is moderate. Monitor water availability."
                      : "The recorded tank level is sufficient."
                  : "Waiting for a valid water tank sensor reading. Connect the ESP32 to receive water-level guidance."}
              </p>
            </div>
          </div>
        </section>

        <section className="water-section">
          <h2>Water Management Advisory</h2>

          <div className="water-advisory">
            <h3>💧 Water Availability Guidance</h3>
            <p>
              {data?.mode !== "live"
                ? "Water availability advice is unavailable because no current sensor reading has been confirmed."
                : !validLevel
                  ? "The latest reading does not contain a valid tank level."
                  : level <= 20
                    ? "Water is running low. Inspect the tank and refill it before the next irrigation cycle."
                    : level <= 50
                      ? "Water is available at a moderate level. Continue monitoring the tank."
                      : "Water availability is currently sufficient based on the latest sensor reading."}
            </p>
          </div>

          <p className="water-disclaimer">
            Recommendations are based on stored sensor readings. They do
            not operate pumps or control water equipment.
          </p>
        </section>

        <section className="water-section">
          <h2>Recent Water Tank History</h2>
          <p>
            Latest {data?.history?.length ?? 0} readings received
          </p>

          <div className="water-table-wrapper">
            <table className="water-table">
              <thead>
                <tr>
                  <th>Date and Time</th>
                  <th>Tank Level</th>
                  <th>Water Volume</th>
                  <th>Device ID</th>
                </tr>
              </thead>

              <tbody>
                {data?.history?.length ? (
                  data.history.map((item, index) => (
                    <tr key={`${item.created_at}-${index}`}>
                      <td>{formatDate(item.created_at)}</td>
                      <td>
                        {typeof item.tank_level_percent === "number"
                          ? `${item.tank_level_percent}%`
                          : "--"}
                      </td>
                      <td>
                        {typeof item.water_volume_liters === "number"
                          ? `${item.water_volume_liters} L`
                          : "--"}
                      </td>
                      <td>{item.device_id || "Not provided"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="water-empty">
                      No water tank history is available yet. Connect the
                      ESP32 and send real readings to the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="water-footer">
          GREENMIND SMART AGRICULTURE · SMART WATER MANAGEMENT
          <p>
            Water information is read from the greenhouse telemetry
            database. No simulated sensor readings are displayed.
          </p>
        </footer>
      </div>
    </main>
  );
}