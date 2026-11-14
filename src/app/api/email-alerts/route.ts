
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEVICE_ID = "greenhouse-esp32-s3-01";
const COOLDOWN_MINUTES = 60;
const ONLINE_TIMEOUT_SECONDS = 30;

type Telemetry = {
  temperature_c: number | null;
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
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;
  const to = process.env.ALERT_TO_EMAIL;

  if (!url || !serviceKey || !resendKey || !from || !to) {
    throw new Error("Email alert environment variables are missing.");
  }

  return {
    url: url.replace(/\/$/, ""),
    serviceKey,
    resendKey,
    from,
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
  const stateResponse = await supabaseRequest(
    `greenhouse_email_alert_state?select=last_sent_at&alert_key=eq.${encodeURIComponent(alert.key)}&limit=1`,
    config
  );

  if (!stateResponse.ok) {
    throw new Error("Could not check email alert cooldown.");
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

  const emailResponse = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [config.to],
        subject: alert.subject,
        text: [
          "GREENMIND SMART AGRICULTURE",
          "",
          alert.message,
          "",
          `Time: ${new Date().toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })}`,
          "",
          "This alert was generated from greenhouse telemetry.",
        ].join("\n"),
      }),
    }
  );

  if (!emailResponse.ok) {
    const detail = await emailResponse.text();
    throw new Error(`Email provider error: ${detail}`);
  }

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
      "Email sent, but cooldown state could not be saved."
    );
  }

  return "sent";
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Greenhouse email alert API is ready.",
  });
}

export async function POST() {
  try {
    const config = getConfig();

    const telemetryResponse = await supabaseRequest(
      `greenhouse_telemetry?select=temperature_c,soil_moisture_percent,created_at&device_id=eq.${encodeURIComponent(DEVICE_ID)}&order=created_at.desc&limit=1`,
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
        message: "Waiting for the first ESP32 reading. No email sent.",
      });
    }

    const ageSeconds = Math.floor(
      (Date.now() - new Date(reading.created_at).getTime()) / 1000
    );

    const alerts: Alert[] = [];

    if (ageSeconds < 0 || ageSeconds > ONLINE_TIMEOUT_SECONDS) {
      alerts.push({
        key: "esp32-offline",
        subject: "GreenMind: ESP32 offline",
        message:
          "The greenhouse has not received a fresh ESP32 reading within 30 seconds. Check the device, Wi-Fi and Supabase connection.",
      });
    } else {
      const soil = reading.soil_moisture_percent;
      const temperature = reading.temperature_c;

      if (
        soil !== null &&
        Number.isFinite(Number(soil)) &&
        soil <= 20
      ) {
        alerts.push({
          key: "critical-soil-moisture",
          subject: "GreenMind: Critical soil moisture",
          message: `Soil moisture is ${soil}%. Inspect the soil and check whether watering is required.`,
        });
      }

      if (
        temperature !== null &&
        Number.isFinite(Number(temperature)) &&
        temperature >= 35
      ) {
        alerts.push({
          key: "high-temperature",
          subject: "GreenMind: High greenhouse temperature",
          message: `Greenhouse temperature is ${temperature}°C. Check ventilation and plant condition.`,
        });
      }
    }

    if (alerts.length === 0) {
      return NextResponse.json({
        success: true,
        mode: "normal",
        message: "No configured email alert conditions detected.",
      });
    }

    const results = [];

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
    console.error("Greenhouse email alert error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to process email alerts.",
      },
      { status: 500 }
    );
  }
}
