
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
const DEVICE_ID = "greenhouse-esp32-s3-01";
const CHECK_INTERVAL = 10000;
const ONLINE_TIMEOUT = 30000;

type Reading = {
  temperature_c: number | null;
  soil_moisture_percent: number | null;
  humidity_percent: number | null;
  created_at: string;
};

type AlertItem = {
  id: string;
  title: string;
  message: string;
};

export default function BrowserNotifications() {
  const [permission, setPermission] =
    useState<NotificationPermission | "unsupported">("default");
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("Notifications are disabled.");

  const previousAlerts = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      setStatus("This browser does not support notifications.");
      return;
    }

    setPermission(Notification.permission);
    setEnabled(Notification.permission === "granted");
  }, []);

  const enableNotifications = useCallback(async () => {
    if (!("Notification" in window)) {
      setStatus("Browser notifications are not supported.");
      return;
    }

    const result = await Notification.requestPermission();

    setPermission(result);
    setEnabled(result === "granted");

    if (result === "granted") {
      setStatus("Browser notifications enabled.");
      new Notification("GreenMind Smart Agriculture", {
        body: "You will receive greenhouse alerts in this browser.",
      });
    } else {
      setStatus("Notification permission was not granted.");
    }
  }, []);

  const checkAlerts = useCallback(async () => {
    if (
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) return;

    const { data, error } = await supabase
      .from("greenhouse_telemetry")
      .select(
        "temperature_c, soil_moisture_percent, humidity_percent, created_at"
      )
      .eq("device_id", DEVICE_ID)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setStatus("Unable to check greenhouse readings.");
      return;
    }

    const alerts: AlertItem[] = [];

    if (!data) {
      alerts.push({
        id: "waiting",
        title: "Greenhouse data unavailable",
        message: "Waiting for the first ESP32 sensor reading.",
      });
    } else {
      const reading = data as Reading;
      const age = Date.now() - new Date(reading.created_at).getTime();

      if (age < 0 || age > ONLINE_TIMEOUT) {
        alerts.push({
          id: "offline",
          title: "ESP32 disconnected",
          message: "No recent greenhouse sensor reading was received.",
        });
      } else {
        const soil = reading.soil_moisture_percent;
        const temperature = reading.temperature_c;
        const humidity = reading.humidity_percent;

        if (soil !== null && soil <= 20) {
          alerts.push({
            id: "soil-critical",
            title: "Critical soil moisture",
            message: `Soil moisture is ${soil}%. Check irrigation.`,
          });
        } else if (soil !== null && soil <= 30) {
          alerts.push({
            id: "soil-low",
            title: "Low soil moisture",
            message: `Soil moisture is ${soil}%.`,
          });
        }

        if (temperature !== null && temperature >= 35) {
          alerts.push({
            id: "high-temperature",
            title: "High greenhouse temperature",
            message: `Temperature is ${temperature}°C.`,
          });
        }

        if (humidity !== null && humidity > 80) {
          alerts.push({
            id: "high-humidity",
            title: "High greenhouse humidity",
            message: `Humidity is ${humidity}%.`,
          });
        }
      }
    }

    const currentIds = new Set(alerts.map((alert) => alert.id));

    if (initialized.current) {
      alerts.forEach((alert) => {
        if (!previousAlerts.current.has(alert.id)) {
          new Notification(alert.title, {
            body: alert.message,
            tag: alert.id,
          });
        }
      });
    }

    previousAlerts.current = currentIds;
    initialized.current = true;
    setStatus("Greenhouse alerts checked successfully.");
  }, []);

  useEffect(() => {
    if (!enabled) return;

    void checkAlerts();

    const interval = window.setInterval(() => {
      void checkAlerts();
    }, CHECK_INTERVAL);

    return () => window.clearInterval(interval);
  }, [enabled, checkAlerts]);

  return (
    <section className="browser-notification-card">
      <div className="browser-notification-heading">
        <div>
          <h2>Browser Notifications</h2>
          <p>Receive alerts from your greenhouse in this browser.</p>
        </div>

        <span className={
          enabled
            ? "browser-notification-status active"
            : "browser-notification-status"
        }>
          {enabled ? "ENABLED" : "DISABLED"}
        </span>
      </div>

      <p className="browser-notification-message">{status}</p>

      {permission === "unsupported" ? (
        <p>This browser does not support notifications.</p>
      ) : permission === "denied" ? (
        <p>Enable notifications in your browser site settings.</p>
      ) : (
        <button
          type="button"
          onClick={enableNotifications}
          disabled={enabled}
          className="browser-notification-button"
        >
          {enabled ? "Notifications Enabled" : "Enable Notifications"}
        </button>
      )}

      <p className="browser-notification-note">
        Notifications use actual Supabase sensor readings. No simulated
        readings are generated.
      </p>
    </section>
  );
}
