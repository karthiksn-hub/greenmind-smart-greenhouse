
"use client";

import { useCallback, useEffect, useState } from "react";
import "./digital-twin.css";

type TwinData = {
  success: boolean;
  mode: "waiting" | "live" | "delayed" | "stale" | "unknown";
  message: string;
  ageSeconds: number | null;
  telemetry: {
    temperature: number | null;
    humidity: number | null;
    soilMoisture: number | null;
    light: number | null;
    batteryVoltage: number | null;
    deviceId: string | null;
    createdAt: string | null;
    wifiRssi: number | null;
  } | null;
  devices: {
    pump: string;
    fan: string;
    growLight: string;
  };
};

const emptyData: TwinData = {
  success: true,
  mode: "waiting",
  message: "Waiting for greenhouse sensor readings.",
  ageSeconds: null,
  telemetry: null,
  devices: {
    pump: "Unknown",
    fan: "Unknown",
    growLight: "Unknown",
  },
};

function displayValue(
  value: number | null | undefined,
  suffix = ""
) {
  return value === null || value === undefined
    ? "--"
    : `${value}${suffix}`;
}

function deviceClass(value: string) {
  return value === "ON"
    ? "twin-device-on"
    : value === "OFF"
      ? "twin-device-off"
      : "twin-device-unknown";
}

export default function DigitalTwinPage() {
  const [data, setData] = useState<TwinData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastChecked, setLastChecked] = useState("");

  // Fetch Digital Twin API safely
  const refreshData = useCallback(async () => {
    try {
      const response = await fetch("/api/digital-twin", {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const responseText = await response.text();

      if (!responseText.trim()) {
        throw new Error(
          `Digital Twin API returned an empty response. HTTP ${response.status}.`
        );
      }

      let result: TwinData;

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Digital Twin API returned invalid JSON. HTTP ${response.status}.`
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            `API request failed. HTTP ${response.status}.`
        );
      }

      setData(result);
      setError("");
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load greenhouse data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Automatic refresh every 10 seconds
  useEffect(() => {
    refreshData();

    const interval = setInterval(refreshData, 10000);

    return () => clearInterval(interval);
  }, [refreshData]);

  const telemetry = data.telemetry;

  const statusLabel = {
    live: "LIVE",
    waiting: "WAITING",
    delayed: "DELAYED",
    stale: "STALE",
    unknown: "UNKNOWN",
  }[data.mode];

  return (
    <main className="digital-twin-page">

      {/* HEADER */}
      <header className="twin-header">
        <div>
          <p className="twin-brand">
            GREENMIND SMART AGRICULTURE
          </p>

          <h1>Greenhouse Digital Twin</h1>

          <p className="twin-subtitle">
            A digital view of your greenhouse environment and connected devices.
          </p>
        </div>

        <button
          className="twin-refresh"
          onClick={refreshData}
          disabled={loading}
        >
          ↻ {loading ? "Refreshing..." : "Refresh Data"}
        </button>
      </header>

      {/* ESP32 CONNECTION */}
      <section
        className={`twin-connection twin-status-${data.mode}`}
      >
        <div>
          <span className="twin-section-label">
            ESP32 CONTROLLER
          </span>

          <h2>{statusLabel}</h2>

          <p>{data.message}</p>

          <small>
            Last checked: {lastChecked || "Not checked yet"}

            {data.ageSeconds !== null &&
              ` · Reading age: ${data.ageSeconds} seconds`}
          </small>
        </div>

        <div className="twin-connection-icon">
          📡
        </div>
      </section>

      {/* API ERROR */}
      {error && (
        <div className="twin-error" role="alert">
          {error}
        </div>
      )}

      {/* GREENHOUSE MODEL */}
      <section className="twin-section">
        <div className="twin-section-heading">
          <div>
            <span className="twin-section-label">
              GREENHOUSE MODEL
            </span>

            <h2>Virtual Greenhouse Layout</h2>
          </div>

          <span className="twin-model-tag">
            Digital representation
          </span>
        </div>

        <div className="twin-house">
          <div className="twin-roof">
            <span>GREENHOUSE</span>
          </div>

          <div className="twin-house-content">

            <div className="twin-zone">
              <span className="twin-zone-icon">🌱</span>

              <strong>Plant Zone A</strong>

              <small>Growing area</small>

              <span className="twin-zone-value">
                Soil: {displayValue(telemetry?.soilMoisture, "%")}
              </span>
            </div>

            <div className="twin-zone">
              <span className="twin-zone-icon">🌿</span>

              <strong>Plant Zone B</strong>

              <small>Growing area</small>

              <span className="twin-zone-value">
                Environment:{" "}
                {data.mode === "live" ? "Updated" : "Waiting"}
              </span>
            </div>

            <div className="twin-zone twin-equipment">
              <span className="twin-zone-icon">💧</span>

              <strong>Irrigation Unit</strong>

              <small>Pump state</small>

              <span className="twin-zone-value">
                {data.devices.pump}
              </span>
            </div>

            <div className="twin-zone twin-equipment">
              <span className="twin-zone-icon">🌀</span>

              <strong>Ventilation</strong>

              <small>Fan state</small>

              <span className="twin-zone-value">
                {data.devices.fan}
              </span>
            </div>

          </div>

          <div className="twin-house-footer">
            <span>
              ☀️ Light: {displayValue(telemetry?.light, "%")}
            </span>

            <span>
              🌡️ Temperature:{" "}
              {displayValue(telemetry?.temperature, "°C")}
            </span>

            <span>
              💨 Humidity: {displayValue(telemetry?.humidity, "%")}
            </span>
          </div>
        </div>

        <p className="twin-note">
          This is a conceptual greenhouse layout. Plant zones are
          visual placeholders and do not represent measured plant
          counts or physical zone locations.
        </p>
      </section>

      {/* SENSOR MONITORING */}
      <section className="twin-section">
        <span className="twin-section-label">
          SENSOR MONITORING
        </span>

        <h2>Greenhouse Environment</h2>

        <div className="twin-metric-grid">

          <article className="twin-metric">
            <span>🌡️ Temperature</span>

            <strong>
              {displayValue(telemetry?.temperature, "°C")}
            </strong>

            <small>Air temperature</small>
          </article>

          <article className="twin-metric">
            <span>💧 Humidity</span>

            <strong>
              {displayValue(telemetry?.humidity, "%")}
            </strong>

            <small>Relative humidity</small>
          </article>

          <article className="twin-metric">
            <span>🌱 Soil Moisture</span>

            <strong>
              {displayValue(telemetry?.soilMoisture, "%")}
            </strong>

            <small>Soil moisture reading</small>
          </article>

          <article className="twin-metric">
            <span>☀️ Light</span>

            <strong>
              {displayValue(telemetry?.light, "%")}
            </strong>

            <small>Light sensor reading</small>
          </article>

        </div>
      </section>

      {/* CONNECTED EQUIPMENT */}
      <section className="twin-section">
        <span className="twin-section-label">
          CONNECTED EQUIPMENT
        </span>

        <h2>Device Status</h2>

        <div className="twin-device-grid">

          <article className="twin-device">
            <span>💧 Irrigation Pump</span>

            <strong className={deviceClass(data.devices.pump)}>
              {data.devices.pump}
            </strong>
          </article>

          <article className="twin-device">
            <span>🌀 Ventilation Fan</span>

            <strong className={deviceClass(data.devices.fan)}>
              {data.devices.fan}
            </strong>
          </article>

          <article className="twin-device">
            <span>💡 Grow Light</span>

            <strong className={deviceClass(data.devices.growLight)}>
              {data.devices.growLight}
            </strong>
          </article>

        </div>

        <p className="twin-note">
          Device states are read from telemetry. Unknown means the
          latest database record does not provide a recognizable
          device state. This page does not control equipment.
        </p>
      </section>

      {/* CONTROLLER INFORMATION */}
      <section className="twin-section twin-system-info">
        <h2>Controller Information</h2>

        <div>
          <span>ESP32 Device ID</span>

          <strong>
            {telemetry?.deviceId || "Not available"}
          </strong>
        </div>

        <div>
          <span>Battery Voltage</span>

          <strong>
            {displayValue(telemetry?.batteryVoltage, " V")}
          </strong>
        </div>

        <div>
          <span>Wi-Fi Signal</span>

          <strong>
            {displayValue(telemetry?.wifiRssi, " dBm")}
          </strong>
        </div>

        <div>
          <span>Last Sensor Reading</span>

          <strong>
            {telemetry?.createdAt
              ? new Date(telemetry.createdAt).toLocaleString()
              : "--"}
          </strong>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="twin-footer">
        GREENMIND SMART AGRICULTURE · DIGITAL TWIN

        <p>
          Data is read from greenhouse telemetry. No simulated
          sensor readings or equipment controls are used.
        </p>
      </footer>

    </main>
  );
}
