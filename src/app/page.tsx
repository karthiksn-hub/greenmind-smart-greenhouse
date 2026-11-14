
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Telemetry = {
  id?: number;
  device_id: string;
  temperature_c: number | null;
  humidity_percent: number | null;
  soil_moisture_percent: number | null;
  light_percent: number | null;
  battery_voltage: number | null;
  pump_on: boolean;
  fan_on: boolean;
  grow_light_on: boolean;
  wifi_rssi: number | null;
  created_at: string;
};

const navigation = [
  { label: "Overview", href: "/", icon: "▦" },
  { label: "Plant Health", href: "/plant-health", icon: "🌱" },
  { label: "Disease Detection", href: "/disease-detection", icon: "🔬" },
  { label: "Irrigation", href: "/irrigation", icon: "💧" },
  { label: "Smart Water Management", href: "/water-management", icon: "🚰" },
  { label: "Energy Monitoring", href: "/energy", icon: "⚡" },
  { label: "Greenhouse Digital Twin", href: "/digital-twin", icon: "🏡" },
  { label: "Camera Monitoring", href: "/camera", icon: "📷" },
  { label: "Notification Center", href: "/notifications", icon: "🔔" },
  { label: "AI Predictive Analytics", href: "/predictive-analytics", icon: "🔮" },
  { label: "Analytics", href: "/analytics", icon: "📊" },
  { label: "Settings", href: "/settings", icon: "⚙" },
];

const DEVICE_ID = "greenhouse-esp32-s3-01";
const ONLINE_TIMEOUT_MS = 30000;

export default function Dashboard() {
  const [data, setData] = useState<Telemetry | null>(null);
  const [recentData, setRecentData] = useState<Telemetry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());

  const loadTelemetry = useCallback(async () => {
    try {
      const { data: rows, error: queryError } = await supabase
        .from("greenhouse_telemetry")
        .select(
          "id, device_id, temperature_c, humidity_percent, soil_moisture_percent, light_percent, battery_voltage, pump_on, fan_on, grow_light_on, wifi_rssi, created_at"
        )
        .eq("device_id", DEVICE_ID)
        .order("created_at", { ascending: false })
        .limit(30);

      if (queryError) throw queryError;

      const records = (rows || []) as Telemetry[];

      setRecentData(records);
      setData(records[0] ?? null);
      setError("");
      setLastChecked(new Date());
    } catch (err) {
      console.error("Telemetry loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load sensor data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTelemetry();

    const channel = supabase
      .channel("greenmind-live-telemetry")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "greenhouse_telemetry",
        },
        (payload) => {
          const incoming = payload.new as Telemetry;

          if (incoming.device_id !== DEVICE_ID) return;

          setData(incoming);

          setRecentData((previous) =>
            [incoming, ...previous]
              .filter(
                (item, index, array) =>
                  array.findIndex(
                    (record) =>
                      record.created_at === item.created_at
                  ) === index
              )
              .slice(0, 30)
          );

          setError("");
        }
      )
      .subscribe();

    const refreshInterval = window.setInterval(() => {
      void loadTelemetry();
    }, 5000);

    const clockInterval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(refreshInterval);
      window.clearInterval(clockInterval);
      void supabase.removeChannel(channel);
    };
  }, [loadTelemetry]);

  const deviceOnline = useMemo(() => {
    if (!data?.created_at) return false;

    const age = now - new Date(data.created_at).getTime();

    return age >= 0 && age <= ONLINE_TIMEOUT_MS;
  }, [data, now]);

  const temperature = data?.temperature_c ?? null;
  const humidity = data?.humidity_percent ?? null;
  const soil = data?.soil_moisture_percent ?? null;

  const sensorCards = [
    {
      title: "Temperature",
      value: temperature,
      unit: "°C",
      icon: "🌡️",
      color: "orange",
      status:
        temperature === null
          ? "No data"
          : temperature >= 35
          ? "High temperature"
          : temperature < 15
          ? "Low temperature"
          : "Normal",
    },
    {
      title: "Humidity",
      value: humidity,
      unit: "%",
      icon: "💧",
      color: "blue",
      status:
        humidity === null
          ? "No data"
          : humidity > 80
          ? "High humidity"
          : humidity < 30
          ? "Low humidity"
          : "Normal",
    },
    {
      title: "Soil Moisture",
      value: soil,
      unit: "%",
      icon: "🌱",
      color: "green",
      status:
        soil === null
          ? "No data"
          : soil < 30
          ? "Needs water"
          : soil > 80
          ? "Very wet"
          : "Good",
    },
    {
      title: "Light Intensity",
      value: null,
      unit: "%",
      icon: "☀️",
      color: "yellow",
      status: "Sensor not installed",
    },
  ];

  const latestReadings = recentData.slice(0, 7).reverse();

  const chartMaximum = Math.max(
    100,
    ...latestReadings.map(
      (item) => item.soil_moisture_percent ?? 0
    )
  );

  const healthInputs = [
    temperature === null
      ? null
      : temperature >= 20 && temperature <= 32
      ? 100
      : 60,
    humidity === null
      ? null
      : humidity >= 40 && humidity <= 80
      ? 100
      : 60,
    soil === null
      ? null
      : soil >= 30 && soil <= 80
      ? 100
      : 50,
  ].filter((value): value is number => value !== null);

  const estimatedScore =
    healthInputs.length > 0
      ? Math.round(
          healthInputs.reduce((sum, value) => sum + value, 0) /
            healthInputs.length
        )
      : null;

  const healthLabel =
    estimatedScore === null
      ? "Insufficient data"
      : estimatedScore >= 90
      ? "Healthy"
      : estimatedScore >= 70
      ? "Good"
      : estimatedScore >= 40
      ? "Needs attention"
      : "Critical";

  function formatValue(value: number | null, unit: string) {
    if (value === null || value === undefined) return "--";
    return `${Number(value).toFixed(1)} ${unit}`;
  }

  function formatTimestamp(timestamp?: string) {
    if (!timestamp) return "No readings received";

    return new Date(timestamp).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "medium",
    });
  }

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
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                item.href === "/"
                  ? "gm-side-link active"
                  : "gm-side-link"
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
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
            <p className="gm-breadcrumb">Greenhouse / Overview</p>
            <h1>Greenhouse Overview</h1>
            <p className="gm-subtitle">
              Real-time greenhouse monitoring and smart agriculture.
            </p>
          </div>

          <div className="gm-header-actions">
            <span className="gm-demo-status">
              <i />
              {deviceOnline ? "LIVE DATA" : "DEVICE OFFLINE"}
            </span>

            <button
              className="gm-theme-button"
              onClick={() => {
                const current =
                  document.documentElement.dataset.theme;
                const next = current === "dark" ? "light" : "dark";

                document.documentElement.dataset.theme = next;
                localStorage.setItem("greenmind-theme", next);
              }}
            >
              ☀️ Theme
            </button>
          </div>
        </header>

        <section className="gm-welcome">
          <div>
            <span className="gm-welcome-eyebrow">
              SMART AGRICULTURE SYSTEM
            </span>
            <h2>Welcome to your Greenhouse 🌱</h2>
            <p>
              Monitor actual sensor readings and greenhouse equipment.
            </p>
          </div>
          <span className="gm-welcome-decoration">🌿</span>
        </section>

        <div className="gm-sensor-heading">
          <h2>Live Greenhouse Sensors</h2>
          <span>
            {loading
              ? "Connecting..."
              : deviceOnline
              ? "● ESP32 connected"
              : "● Waiting for ESP32 data"}
          </span>
        </div>

        {error && (
          <div className="gm-error">
            Unable to load sensor data: {error}
          </div>
        )}

        <section className="gm-sensor-grid">
          {sensorCards.map((sensor) => (
            <article className="gm-sensor-card" key={sensor.title}>
              <div className="gm-sensor-top">
                <span className={`gm-sensor-icon ${sensor.color}`}>
                  {sensor.icon}
                </span>
                <span className="gm-card-menu">•••</span>
              </div>

              <p>{sensor.title}</p>

              <h2>
                {sensor.value === null
                  ? "--"
                  : Number(sensor.value).toFixed(1)}
                {sensor.value !== null && (
                  <small>{sensor.unit}</small>
                )}
              </h2>

              <span className="gm-sensor-status">
                ● {sensor.status}
              </span>
            </article>
          ))}
        </section>

        <p className="gm-last-update">
          {loading
            ? "Connecting to Supabase..."
            : data
            ? `Last sensor update: ${formatTimestamp(data.created_at)}`
            : "Waiting for ESP32 sensor data..."}
        </p>

        <section className="gm-overview-grid">
          <article className="gm-panel gm-health-panel">
            <div className="gm-panel-heading">
              <div>
                <h2>Environmental Health Indicator</h2>
                <p>Estimated from available sensor readings</p>
              </div>
              <span>🌿</span>
            </div>

            <div className="gm-health-content">
              <div className="gm-health-ring">
                <div>
                  <strong>
                    {estimatedScore === null
                      ? "--"
                      : `${estimatedScore}%`}
                  </strong>
                  <span>{healthLabel}</span>
                </div>
              </div>

              <div>
                <h3>
                  {estimatedScore === null
                    ? "Waiting for sensor readings"
                    : healthLabel}
                </h3>

                <p>
                  This is an environmental indicator, not an actual
                  plant disease or leaf-health diagnosis.
                </p>

                <Link href="/plant-health" className="gm-small-link">
                  View full plant health →
                </Link>
              </div>
            </div>

            <div className="gm-health-footer">
              <span>Available sensor readings</span>
              <strong>{healthInputs.length} / 3</strong>
            </div>
          </article>

          <article className="gm-panel gm-activity-panel">
            <div className="gm-panel-heading">
              <div>
                <h2>Recent Soil Moisture</h2>
                <p>Latest saved ESP32 readings</p>
              </div>
              <span>🌱</span>
            </div>

            {latestReadings.length > 0 ? (
              <div className="gm-chart">
                {latestReadings.map((item, index) => {
                  const value = item.soil_moisture_percent ?? 0;
                  const height = Math.max(
                    2,
                    (value / chartMaximum) * 100
                  );

                  return (
                    <div
                      className="gm-chart-column"
                      key={`${item.created_at}-${index}`}
                    >
                      <div className="gm-chart-track">
                        <div style={{ height: `${height}%` }} />
                      </div>
                      <span>
                        {new Date(item.created_at).toLocaleTimeString(
                          "en-IN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>No historical readings available yet.</p>
            )}
          </article>
        </section>

        <section className="gm-device-section">
          <div className="gm-section-heading">
            <div>
              <h2>Device Status</h2>
              <p>
                Actual equipment states reported by your ESP32-S3.
              </p>
            </div>
            <span className="gm-manual-label">HARDWARE STATUS</span>
          </div>

          <div className="gm-device-grid">
            {[
              {
                name: "Water Pump",
                description: "Irrigation system",
                icon: "🚿",
                value: data?.pump_on,
              },
              {
                name: "Cooling Fan",
                description: "Temperature control",
                icon: "🌀",
                value: data?.fan_on,
              },
              {
                name: "Grow Light",
                description: "Artificial lighting",
                icon: "💡",
                value: data?.grow_light_on,
              },
            ].map((device) => (
              <article className="gm-device-card" key={device.name}>
                <span className="gm-device-icon">{device.icon}</span>

                <div className="gm-device-info">
                  <strong>{device.name}</strong>
                  <small>{device.description}</small>
                  <span>
                    {!deviceOnline || device.value === undefined
                      ? "UNKNOWN"
                      : device.value
                      ? "ON"
                      : "OFF"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="gm-overview-grid">
          <article className="gm-panel">
            <h2>Device Connectivity</h2>
            <p>
              ESP32-S3:{" "}
              <strong>
                {deviceOnline ? "Connected" : "Offline"}
              </strong>
            </p>
            <p>
              Wi-Fi signal:{" "}
              {deviceOnline && data?.wifi_rssi != null
                ? `${data.wifi_rssi} dBm`
                : "--"}
            </p>
            <p>
              Battery:{" "}
              {deviceOnline &&
              data?.battery_voltage != null &&
              data.battery_voltage > 0
                ? `${data.battery_voltage.toFixed(2)} V`
                : "Sensor not configured"}
            </p>
            <p>
              Last checked:{" "}
              {lastChecked
                ? lastChecked.toLocaleTimeString()
                : "--"}
            </p>
            <button
              className="gm-theme-button"
              onClick={() => void loadTelemetry()}
              disabled={loading}
            >
              ↻ Refresh readings
            </button>
          </article>

          <article className="gm-panel">
            <h2>Greenhouse Alerts</h2>

            {temperature !== null && temperature >= 35 && (
              <p>⚠️ High temperature detected.</p>
            )}

            {soil !== null && soil < 30 && (
              <p>💧 Soil moisture is low. Irrigation may be needed.</p>
            )}

            {humidity !== null && humidity > 80 && (
              <p>⚠️ Humidity is high. Check ventilation.</p>
            )}

            {!deviceOnline && (
              <p>📡 ESP32 data is not arriving. Check the device.</p>
            )}

            {deviceOnline &&
              (temperature === null || temperature < 35) &&
              (soil === null || soil >= 30) &&
              (humidity === null || humidity <= 80) && (
                <p>✓ No configured sensor warnings at this time.</p>
              )}
          </article>
        </section>

        <section className="gm-bottom-grid">
          <article className="gm-ai-card">
            <span className="gm-ai-icon">🤖</span>
            <div>
              <span className="gm-welcome-eyebrow">
                AI FARMER ASSISTANT
              </span>
              <h2>Your smart farming assistant</h2>
              <p>
                Ask questions about watering, plant health and
                greenhouse management.
              </p>
            </div>
          </article>

          <article className="gm-hardware-card">
            <h3>Hardware Connection</h3>
            <p>
              <span className="gm-hardware-dot" /> ESP32-S3
            </p>
            <small>
              {deviceOnline
                ? "Receiving sensor telemetry from Supabase."
                : "Waiting for new ESP32 telemetry."}
            </small>
          </article>
        </section>

        <footer className="gm-footer">
          <strong>🌱 GREENMIND SMART GREENHOUSE</strong>
          <p>
            Real-time monitoring · AI plant health · Sustainable agriculture
          </p>
        </footer>
      </main>
    </div>
  );
}
