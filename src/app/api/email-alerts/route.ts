import { NextResponse } from "next/server";
import * as nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEVICE_ID = "greenhouse-esp32-s3-01";
const COOLDOWN_MINUTES = 60;
const ONLINE_TIMEOUT_SECONDS = 30;

type Telemetry = {
  temperature_c: number | null;
  humidity_percent: number | null;
  soil_moisture_percent: number | null;
  created_at: string;
};

type Alert = {
  key: string;
  subject: string;
  message: string;
};

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  const to = process.env.ALERT_TO_EMAIL || gmailUser;

  if (!url || !serviceKey || !gmailUser || !gmailPassword || !to) {
    throw new Error(
      "Missing configuration. Check Supabase and Gmail environment variables."
    );
  }

  return {
    url: url.replace(/\/$/, ""),
    serviceKey,
    gmailUser,
    gmailPassword,
    to,
  };
}

async function supabaseRequest(
  path: string,
  config: ReturnType<typeof getConfig>,
  options: RequestInit = {}
) {
  return fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
  });
}

async function sendAlert(
  alert: Alert,
  config: ReturnType<typeof getConfig>
) {
  // Check the existing 60-minute cooldown.
  const stateResponse = await supabaseRequest(
    `greenhouse_email_alert_state?select=last_sent_at&alert_key=eq.${encodeURIComponent(
      alert.key
    )}&limit=1`,
    config
  );

  if (!stateResponse.ok) {
    throw new Error("Could not check Gmail alert cooldown.");
  }

  const states = (await stateResponse.json()) as Array<{
    last_sent_at: string;
  }>;

  const lastSent = states[0]?.last_sent_at
    ? new Date(states[0].last_sent_at).getTime()
    : 0;

  const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;

  if (Date.now() - lastSent < cooldownMs) {
    return "cooldown";
  }

  // Gmail SMTP connection.
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: config.gmailUser,
      pass: config.gmailPassword,
    },
  });

  const timestamp = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });

  await transporter.sendMail({
    from: `"GreenMind Smart Agriculture" <${config.gmailUser}>`,
    to: config.to,
    subject: alert.subject,
    text: [
      "GREENMIND SMART AGRICULTURE",
      "",
      alert.message,
      "",
      `Time: ${timestamp}`,
      "",
      "This alert was generated automatically from greenhouse telemetry.",
    ].join("\n"),
  });

  // Save cooldown only after Gmail successfully sends the message.
  const saveResponse = await supabaseRequest(
    "greenhouse_email_alert_state?on_conflict=alert_key",
    config,
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        alert_key: alert.key,
        last_sent_at: new Date().toISOString(),
      }),
    }
  );

  if (!saveResponse.ok) {
    throw new Error(
      "Gmail sent the alert, but the cooldown state could not be saved."
    );
  }

  return "sent";
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "GreenMind Gmail alert API is ready.",
    monitoringInterval: "2 minutes",
    alertCooldown: "60 minutes",
  });
}

export async function POST() {
  try {
    const config = getConfig();

    // Get the latest real ESP32 reading.
    const telemetryResponse = await supabaseRequest(
      `greenhouse_telemetry?select=temperature_c,humidity_percent,soil_moisture_percent,created_at&device_id=eq.${encodeURIComponent(
        DEVICE_ID
      )}&order=created_at.desc&limit=1`,
      config
    );

    if (!telemetryResponse.ok) {
      const detail = await telemetryResponse.text();
      throw new Error(`Supabase telemetry error: ${detail}`);
    }

    const rows = (await telemetryResponse.json()) as Telemetry[];
    const reading = rows[0];

    if (!reading) {
      return NextResponse.json({
        success: true,
        mode: "waiting",
        message: "Waiting for the first ESP32 reading. No Gmail alert sent.",
      });
    }

    const ageSeconds = Math.floor(
      (Date.now() - new Date(reading.created_at).getTime()) / 1000
    );

    const alerts: Alert[] = [];

    // Alert if the ESP32 has stopped sending fresh readings.
    if (ageSeconds < 0 || ageSeconds > ONLINE_TIMEOUT_SECONDS) {
      alerts.push({
        key: "esp32-offline",
        subject: "GreenMind: ESP32 disconnected",
        message:
          `No fresh ESP32 reading has been received for ${Math.max(
            ageSeconds,
            0
          )} seconds. Check the ESP32 device, Wi-Fi and Supabase connection.`,
      });
    } else {
      const soil = Number(reading.soil_moisture_percent);
      const temperature = Number(reading.temperature_c);
      const humidity = Number(reading.humidity_percent);

      // 1. Critical soil moisture: 20% or below.
      if (
        reading.soil_moisture_percent !== null &&
        Number.isFinite(soil) &&
        soil <= 20
      ) {
        alerts.push({
          key: "critical-soil-moisture",
          subject: "GreenMind: Critical soil moisture",
          message: `Soil moisture is ${soil}%. Immediate attention is required. Check the soil and watering system.`,
        });
      }
      // 2. Low soil moisture: above 20% and 30% or below.
      else if (
        reading.soil_moisture_percent !== null &&
        Number.isFinite(soil) &&
        soil <= 30
      ) {
        alerts.push({
          key: "low-soil-moisture",
          subject: "GreenMind: Low soil moisture",
          message: `Soil moisture is ${soil}%. Check whether the plants need watering.`,
        });
      }

      // 3. High temperature: 35°C or above.
      if (
        reading.temperature_c !== null &&
        Number.isFinite(temperature) &&
        temperature >= 35
      ) {
        alerts.push({
          key: "high-temperature",
          subject: "GreenMind: High greenhouse temperature",
          message: `Greenhouse temperature is ${temperature}°C. Check ventilation and plant condition.`,
        });
      }

      // 4. High humidity: above 80%.
      if (
        reading.humidity_percent !== null &&
        Number.isFinite(humidity) &&
        humidity > 80
      ) {
        alerts.push({
          key: "high-humidity",
          subject: "GreenMind: High greenhouse humidity",
          message: `Greenhouse humidity is ${humidity}%. Check ventilation and monitor the plants for fungal disease risk.`,
        });
      }
    }

    if (alerts.length === 0) {
      return NextResponse.json({
        success: true,
        mode: "normal",
        message: "Greenhouse conditions are normal. No Gmail alert required.",
      });
    }

    const results: Array<{ alert: string; result: string }> = [];

    for (const alert of alerts) {
      const result = await sendAlert(alert, config);

      results.push({
        alert: alert.key,
        result,
      });
    }

    return NextResponse.json({
      success: true,
      mode: "checked",
      results,
    });
  } catch (error) {
    console.error("GreenMind Gmail alert error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to process Gmail alerts.",
      },
      { status: 500 }
    );
  }
}