
"use client";

import BrowserNotifications from "../components/BrowserNotifications";
import "../components/browser-notifications.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./notifications.css";
import EmailAlertMonitor from "../components/EmailAlertMonitor";

type Telemetry = {
  device_id: string;
  temperature_c: number | null;
  humidity_percent: number | null;
  soil_moisture_percent: number | null;
  battery_voltage: number | null;
  created_at: string;
};

type Alert = {
  id: string;
  title: string;
  message: string;
  level: "critical" | "warning" | "info" | "success";
  time: string;
};

const DEVICE_ID = "greenhouse-esp32-s3-01";
const ONLINE_TIMEOUT_MS = 30000;

export default function NotificationsPage() {
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());
  const [filter, setFilter] = useState("all");
  const [readAlerts, setReadAlerts] = useState<string[]>([]);

  const loadTelemetry = useCallback(async () => {
    try {
      const { data, error: queryError } = await supabase
        .from("greenhouse_telemetry")
        .select(
          "device_id, temperature_c, humidity_percent, soil_moisture_percent, battery_voltage, created_at"
        )
        .eq("device_id", DEVICE_ID)
        .order("created_at", { ascending: false })
        .limit(1);

      if (queryError) throw queryError;

      setTelemetry((data?.[0] as Telemetry) ?? null);
      setError("");
      setLastChecked(new Date());
    } catch (err) {
      console.error("Notification telemetry error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load greenhouse readings."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTelemetry();

    const refresh = window.setInterval(() => {
      void loadTelemetry();
    }, 5000);

    const clock = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, [loadTelemetry]);

  const ageSeconds = telemetry?.created_at
    ? Math.floor(
        (now - new Date(telemetry.created_at).getTime()) / 1000
      )
    : null;

  const deviceOnline =
    ageSeconds !== null &&
    ageSeconds >= 0 &&
    ageSeconds <= ONLINE_TIMEOUT_MS / 1000;

  const alerts = useMemo<Alert[]>(() => {
    const result: Alert[] = [];

    if (!telemetry) {
      result.push({
        id: "waiting-for-data",
        title: "Waiting for sensor data",
        message:
          "No greenhouse telemetry has been received yet. Connect the ESP32 and check its data transmission.",
        level: "info",
        time: "Waiting",
      });

      return result;
    }

    if (!deviceOnline) {
      result.push({
        id: `offline-${telemetry.created_at}`,
        title: "ESP32 device offline",
        message:
          "No fresh telemetry has arrived within the 30-second online window. Check the ESP32, Wi-Fi and Supabase connection.",
        level: "critical",
        time: new Date(telemetry.created_at).toLocaleString(),
      });
    }

    const soil = telemetry.soil_moisture_percent;
    const temperature = telemetry.temperature_c;
    const humidity = telemetry.humidity_percent;

    if (deviceOnline && soil !== null && Number.isFinite(Number(soil))) {
      const value = Number(soil);

      if (value <= 20) {
        result.push({
          id: `soil-critical-${telemetry.created_at}`,
          title: "Critical soil moisture",
          message: `Soil moisture is ${value.toFixed(1)}%. Inspect the soil and plant immediately. Watering may be required.`,
          level: "critical",
          time: new Date(telemetry.created_at).toLocaleString(),
        });
      } else if (value <= 30) {
        result.push({
          id: `soil-warning-${telemetry.created_at}`,
          title: "Low soil moisture",
          message: `Soil moisture is ${value.toFixed(1)}%. Check the soil and consider watering if needed.`,
          level: "warning",
          time: new Date(telemetry.created_at).toLocaleString(),
        });
      }
    }

    if (
      deviceOnline &&
      temperature !== null &&
      Number.isFinite(Number(temperature)) &&
      Number(temperature) >= 35
    ) {
      result.push({
        id: `temperature-${telemetry.created_at}`,
        title: "High greenhouse temperature",
        message: `Temperature is ${Number(temperature).toFixed(1)}°C. Check ventilation and plant condition.`,
        level: "warning",
        time: new Date(telemetry.created_at).toLocaleString(),
      });
    }

    if (
      deviceOnline &&
      humidity !== null &&
      Number.isFinite(Number(humidity)) &&
      Number(humidity) > 80
    ) {
      result.push({
        id: `humidity-${telemetry.created_at}`,
        title: "High greenhouse humidity",
        message: `Humidity is ${Number(humidity).toFixed(1)}%. Check ventilation and monitor plant leaves for moisture-related problems.`,
        level: "warning",
        time: new Date(telemetry.created_at).toLocaleString(),
      });
    }

    if (result.length === 0) {
      result.push({
        id: `normal-${telemetry.created_at}`,
        title: "No active sensor alerts",
        message:
          "No configured temperature or soil-moisture warning thresholds have been crossed in the latest fresh reading.",
        level: "success",
        time: new Date(telemetry.created_at).toLocaleString(),
      });
    }

    return result;
  }, [telemetry, deviceOnline]);

  const visibleAlerts = alerts.filter((alert) => {
    if (filter === "all") return true;
    return alert.level === filter;
  });

  const criticalCount = alerts.filter(
    (item) => item.level === "critical"
  ).length;

  const warningCount = alerts.filter(
    (item) => item.level === "warning"
  ).length;

  const unreadCount = alerts.filter(
    (item) => !readAlerts.includes(item.id)
  ).length;

  function markAllRead() {
    setReadAlerts((previous) => [
      ...new Set([...previous, ...alerts.map((item) => item.id)]),
    ]);
  }

  function markRead(id: string) {
    setReadAlerts((previous) =>
      previous.includes(id) ? previous : [...previous, id]
    );
  }

  return (
    <main className="notification-page">
      <header className="notification-header">
        <div>
          <span className="notification-brand">
            GREENMIND SMART AGRICULTURE
          </span>
          <h1>Notification Center</h1>
          <p>
            Monitor greenhouse warnings, device status and sensor alerts.
          </p>
        </div>

        <button
          className="notification-refresh"
          onClick={() => void loadTelemetry()}
        >
          ↻ Refresh
        </button>
            </header>

      <BrowserNotifications />
      <EmailAlertMonitor />

      <section className="notification-status">
        <div>
          <span className="notification-eyebrow">DEVICE STATUS</span>
          <strong className={deviceOnline ? "status-online" : "status-offline"}>
            ● {deviceOnline ? "ESP32 ONLINE" : "ESP32 OFFLINE / WAITING"}
          </strong>
        </div>

        <div>
          <span className="notification-eyebrow">LAST SENSOR UPDATE</span>
          <strong>
            {telemetry?.created_at
              ? new Date(telemetry.created_at).toLocaleString()
              : "No readings received"}
          </strong>
        </div>
      </section>

      {error && (
        <div className="notification-error">
          <strong>Unable to load alerts</strong>
          <p>{error}</p>
        </div>
      )}

      <section className="notification-stats">
        <article>
          <span>Total notifications</span>
          <strong>{alerts.length}</strong>
        </article>
        <article>
          <span>Critical alerts</span>
          <strong className="critical-number">{criticalCount}</strong>
        </article>
        <article>
          <span>Warnings</span>
          <strong className="warning-number">{warningCount}</strong>
        </article>
        <article>
          <span>Unread</span>
          <strong>{unreadCount}</strong>
        </article>
      </section>

      <section className="notification-panel">
        <div className="notification-panel-heading">
          <div>
            <span className="notification-eyebrow">
              GREENHOUSE MONITORING
            </span>
            <h2>Recent Notifications</h2>
            <p>Alerts are calculated from the latest available telemetry.</p>
          </div>

          <button
            className="notification-read-button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            ✓ Mark all as read
          </button>
        </div>

        <div className="notification-filters">
          {["all", "critical", "warning", "info", "success"].map(
            (item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={filter === item ? "active" : ""}
              >
                {item === "all"
                  ? "All"
                  : item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            )
          )}
        </div>

        {loading ? (
          <div className="notification-empty">
            Loading greenhouse notifications...
          </div>
        ) : visibleAlerts.length === 0 ? (
          <div className="notification-empty">
            No notifications in this category.
          </div>
        ) : (
          <div className="notification-list">
            {visibleAlerts.map((alert) => {
              const isRead = readAlerts.includes(alert.id);

              return (
                <article
                  key={alert.id}
                  className={`notification-item ${alert.level} ${
                    isRead ? "is-read" : ""
                  }`}
                >
                  <div className="notification-icon">
                    {alert.level === "critical"
                      ? "🚨"
                      : alert.level === "warning"
                      ? "⚠️"
                      : alert.level === "success"
                      ? "✓"
                      : "ℹ️"}
                  </div>

                  <div className="notification-content">
                    <div className="notification-title-row">
                      <h3>{alert.title}</h3>
                      <span className={`alert-label ${alert.level}`}>
                        {alert.level.toUpperCase()}
                      </span>
                    </div>

                    <p>{alert.message}</p>
                    <time>{alert.time}</time>
                  </div>

                  <button
                    className="notification-mark-button"
                    onClick={() => markRead(alert.id)}
                    disabled={isRead}
                  >
                    {isRead ? "Read" : "Mark read"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="notification-note">
        <strong>Notification information</strong>
        <p>
          This page checks the latest greenhouse telemetry every five
          seconds. Read status is kept in page memory and resets when
          the page is refreshed. Browser push notifications and SMS
          alerts are not enabled in this version.
        </p>
        <p>
          Battery voltage is displayed below when available, but a
          low-battery alert requires a verified battery threshold.
        </p>
        <div className="notification-battery">
          <span>Latest battery voltage</span>
          <strong>
            {telemetry?.battery_voltage != null
              ? `${Number(telemetry.battery_voltage).toFixed(2)} V`
              : "--"}
          </strong>
        </div>
        <small>
          {lastChecked
            ? `Last checked: ${lastChecked.toLocaleTimeString()}`
            : "Not checked yet"}
        </small>
      </section>
    </main>
  );
}
