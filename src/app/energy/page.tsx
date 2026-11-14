
"use client";

import { useCallback, useEffect, useState } from "react";
import "./energy.css";

type EnergyReading = {
  device_id: string | null;
  voltage_v: number | null;
  current_a: number | null;
  power_w: number | null;
  energy_wh: number | null;
  created_at: string;
};

type EnergyResponse = {
  success: boolean;
  mode?: "live" | "stale" | "waiting";
  message?: string;
  ageSeconds?: number | null;
  telemetry?: EnergyReading | null;
  history?: EnergyReading[];
};

function formatDate(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString();
}

function formatNumber(value: number | null | undefined, unit: string) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value} ${unit}`
    : "--";
}

export default function EnergyPage() {
  const [data, setData] = useState<EnergyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastChecked, setLastChecked] = useState("");

  const loadEnergy = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);

    try {
      const response = await fetch("/api/energy", {
        cache: "no-store",
      });

      const result: EnergyResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load energy readings."
        );
      }

      setData(result);
      setLastChecked(new Date().toLocaleTimeString());
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Energy monitoring is unavailable."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadEnergy();

    const interval = window.setInterval(() => {
      void loadEnergy();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadEnergy]);

  const reading = data?.telemetry ?? null;
  const history = data?.history ?? [];

  const status =
    data?.mode === "live"
      ? "LIVE"
      : data?.mode === "stale"
        ? "STALE"
        : "WAITING";

  return (
    <main className="energy-page">
      <div className="energy-container">
        <header className="energy-header">
          <div>
            <p className="energy-brand">
              GREENMIND SMART AGRICULTURE
            </p>

            <h1>Smart Energy Monitoring</h1>

            <p>
              Monitor greenhouse electricity usage and energy readings.
            </p>
          </div>

          <button
            className="energy-refresh"
            onClick={() => void loadEnergy(true)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh Data"}
          </button>
        </header>

        {error && (
          <div className="energy-error" role="alert">
            {error}
          </div>
        )}

        <section className="energy-connection">
          <div className="energy-connection-heading">
            <h2>ESP32 Energy Sensor Connection</h2>
            <span className={`energy-status energy-${status.toLowerCase()}`}>
              {status}
            </span>
          </div>

          <p>
            {loading
              ? "Connecting to energy telemetry..."
              : data?.message ?? "Waiting for energy readings."}
          </p>

          <small>Last checked: {lastChecked || "--"}</small>
          <small>Data source: Energy telemetry database</small>
        </section>

        <section className="energy-section">
          <h2>Energy Overview</h2>
          <p>Latest available energy sensor readings</p>

          <div className="energy-grid">
            <article className="energy-card">
              <span>⚡</span>
              <p>Voltage</p>
              <h3>{formatNumber(reading?.voltage_v, "V")}</h3>
              <small>Electrical voltage</small>
            </article>

            <article className="energy-card">
              <span>🔌</span>
              <p>Current</p>
              <h3>{formatNumber(reading?.current_a, "A")}</h3>
              <small>Electrical current</small>
            </article>

            <article className="energy-card">
              <span>💡</span>
              <p>Power</p>
              <h3>{formatNumber(reading?.power_w, "W")}</h3>
              <small>Instantaneous power</small>
            </article>

            <article className="energy-card">
              <span>📊</span>
              <p>Energy Consumption</p>
              <h3>{formatNumber(reading?.energy_wh, "Wh")}</h3>
              <small>Recorded energy usage</small>
            </article>
          </div>
        </section>

        <section className="energy-section">
          <h2>Energy Usage Analysis</h2>

          <div className="energy-analysis">
            <h3>Latest Recorded Power</h3>

            <strong className="energy-large">
              {formatNumber(reading?.power_w, "W")}
            </strong>

            <p>
              This value represents the latest power reading stored in
              the energy telemetry database.
            </p>

            <h3>Total Recorded Energy</h3>

            <strong className="energy-large">
              {formatNumber(reading?.energy_wh, "Wh")}
            </strong>

            <p>
              This is the cumulative energy value reported by the sensor.
              It is not calculated from missing readings.
            </p>
          </div>
        </section>

        <section className="energy-section">
          <h2>Energy Monitoring Status</h2>

          <div className="energy-status-grid">
            <div>
              <span>📡</span>
              <p>ESP32 Controller</p>
              <strong>
                {data?.mode === "live"
                  ? "Connected"
                  : data?.mode === "stale"
                    ? "Not confirmed"
                    : "Waiting"}
              </strong>
            </div>

            <div>
              <span>🕒</span>
              <p>Last Sensor Reading</p>
              <strong>
                {reading ? formatDate(reading.created_at) : "--"}
              </strong>
            </div>

            <div>
              <span>🔋</span>
              <p>Device ID</p>
              <strong>{reading?.device_id || "Not available"}</strong>
            </div>
          </div>
        </section>

        <section className="energy-section">
          <h2>Recent Energy History</h2>
          <p>Latest {history.length} readings received</p>

          <div className="energy-table-wrapper">
            <table className="energy-table">
              <thead>
                <tr>
                  <th>Date and Time</th>
                  <th>Voltage</th>
                  <th>Current</th>
                  <th>Power</th>
                  <th>Energy</th>
                </tr>
              </thead>

              <tbody>
                {history.length > 0 ? (
                  history.map((item, index) => (
                    <tr key={`${item.created_at}-${index}`}>
                      <td>{formatDate(item.created_at)}</td>
                      <td>{formatNumber(item.voltage_v, "V")}</td>
                      <td>{formatNumber(item.current_a, "A")}</td>
                      <td>{formatNumber(item.power_w, "W")}</td>
                      <td>{formatNumber(item.energy_wh, "Wh")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="energy-empty">
                      No energy history is available yet. Connect the
                      ESP32 energy sensor and send real readings.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="energy-footer">
          GREENMIND SMART AGRICULTURE · ENERGY MANAGEMENT
          <p>
            Energy information is read from the greenhouse telemetry
            database. No simulated energy readings are displayed.
          </p>
        </footer>
      </div>
    </main>
  );
}
