"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGreenhouseMode } from "./GreenhouseModeProvider";

type EmailStatus = "idle" | "checking" | "success" | "error";

type EmailApiResponse = {
  success?: boolean;
  mode?: string;
  message?: string;
  results?: Array<{
    alert: string;
    result: string;
  }>;
};

const CHECK_INTERVAL = 2 * 60 * 1000;

export default function EmailAlertMonitor() {
  const { simulationMode } = useGreenhouseMode();

  const [status, setStatus] = useState<EmailStatus>("idle");
  const [message, setMessage] = useState(
    "Gmail monitoring is ready."
  );
  const [lastChecked, setLastChecked] = useState("Not checked yet");

  const requestRunning = useRef(false);

  const checkEmailAlerts = useCallback(async () => {
    if (simulationMode || requestRunning.current) return;

    requestRunning.current = true;
    setStatus("checking");
    setMessage("Checking greenhouse conditions...");

    try {
      const response = await fetch("/api/email-alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const data = (await response.json()) as EmailApiResponse;

      setLastChecked(new Date().toLocaleString());

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Gmail alert check failed.");
      }

      if (data.mode === "waiting") {
        setMessage(
          "Waiting for the first ESP32 reading. No Gmail alert sent."
        );
      } else if (data.mode === "normal") {
        setMessage(
          "Greenhouse conditions are normal. No Gmail alert required."
        );
      } else if (data.results?.length) {
        const sent = data.results.filter(
          (item) => item.result === "sent"
        ).length;

        const cooldown = data.results.filter(
          (item) => item.result === "cooldown"
        ).length;

        setMessage(
          `Alert check completed. ${sent} Gmail alert(s) sent; ${cooldown} alert(s) are within cooldown.`
        );
      } else {
        setMessage(data.message || "Gmail alert check completed.");
      }

      setStatus("success");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to check Gmail alerts."
      );
    } finally {
      requestRunning.current = false;
    }
  }, [simulationMode]);

  useEffect(() => {
    if (simulationMode) {
      setStatus("idle");
      setMessage(
        "Simulation Mode: Gmail sending is disabled. Switch to real ESP32 mode to monitor Gmail alerts."
      );
      return;
    }

    // Check immediately when real mode starts.
    void checkEmailAlerts();

    // Then check every 2 minutes.
    const interval = window.setInterval(() => {
      void checkEmailAlerts();
    }, CHECK_INTERVAL);

    return () => window.clearInterval(interval);
  }, [simulationMode, checkEmailAlerts]);

  return (
    <section className="gm-email-monitor">
      <div className="gm-email-monitor-heading">
        <div>
          <span className="gm-email-monitor-icon">✉️</span>

          <div>
            <strong>Gmail Alert Monitoring</strong>
            <p>Automatic greenhouse Gmail notifications</p>
          </div>
        </div>

        <span className={`gm-email-status ${status}`}>
          {simulationMode
            ? "SIMULATION"
            : status === "checking"
              ? "CHECKING"
              : status === "error"
                ? "ERROR"
                : status === "success"
                  ? "ACTIVE"
                  : "READY"}
        </span>
      </div>

      <p className="gm-email-message">{message}</p>

      <div className="gm-email-footer">
        <span>Last check: {lastChecked}</span>

        {!simulationMode && (
          <button
            type="button"
            onClick={() => void checkEmailAlerts()}
            disabled={status === "checking"}
          >
            {status === "checking" ? "Checking..." : "Check Now"}
          </button>
        )}
      </div>

      {!simulationMode && (
        <p className="gm-email-interval">
          Automatic monitoring: Every 2 minutes
        </p>
      )}
    </section>
  );
}