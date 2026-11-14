
"use client";

import { useEffect, useState } from "react";

const CHECK_INTERVAL = 60000;

export default function EmailAlertMonitor() {
  const [status, setStatus] = useState("Waiting to check email alerts...");
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function checkEmailAlerts() {
    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch("/api/email-alerts", {
        method: "POST",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Email check failed.");
      }

      if (result.mode === "waiting") {
        setStatus("Waiting for actual ESP32 readings. No email sent.");
      } else if (result.mode === "normal") {
        setStatus("No active email alert conditions.");
      } else {
        const sent = result.results?.filter(
          (item: { result: string }) => item.result === "sent"
        ).length ?? 0;

        const cooldown = result.results?.filter(
          (item: { result: string }) => item.result === "cooldown"
        ).length ?? 0;

        setStatus(
          `${sent} email(s) sent. ${cooldown} alert(s) within cooldown.`
        );
      }

      setLastChecked(new Date().toLocaleTimeString());
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Email check failed."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void checkEmailAlerts();

    const interval = window.setInterval(() => {
      void checkEmailAlerts();
    }, CHECK_INTERVAL);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section
      style={{
        padding: 22,
        margin: "20px 0",
        border: "1px solid var(--border, #ddd)",
        borderRadius: 16,
        background: "var(--card, #fff)",
        color: "var(--foreground, #171717)",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Automated Email Alerts</h2>

      <p>
        Receive email alerts for critical soil moisture, high temperature
        and ESP32 disconnection.
      </p>

      <p aria-live="polite">{status}</p>

      <button
        type="button"
        onClick={() => void checkEmailAlerts()}
        disabled={loading}
        style={{
          padding: "10px 16px",
          border: 0,
          borderRadius: 8,
          background: "#166534",
          color: "#fff",
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Checking..." : "Check Email Alerts"}
      </button>

      <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 0 }}>
        Automatic check interval: 60 seconds.
        {lastChecked ? ` Last checked: ${lastChecked}` : ""}
      </p>
    </section>
  );
}
