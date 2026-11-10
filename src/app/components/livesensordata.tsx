
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Reading = {
  temperature_c: number | null;
  humidity_percent: number | null;
  soil_moisture_percent: number | null;
  light_percent: number | null;
  created_at: string;
};

export default function LiveSensorData() {
  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReading() {
      const { data, error } = await supabase
        .from("greenhouse_telemetry")
        .select("temperature_c, humidity_percent, soil_moisture_percent, light_percent, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setError(error.message);
      } else {
        setError("");
        setReading(data);
      }

      setLoading(false);
    }

    loadReading();
    const timer = setInterval(loadReading, 5000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  if (loading) return <p>Loading sensor data...</p>;
  if (error) return <p>Database error: {error}</p>;

  if (!reading) {
    return <p>Waiting for ESP32 sensor data...</p>;
  }

  return (
    <section>
      <h2>Live Greenhouse Readings</h2>
      <p>Temperature: {reading.temperature_c ?? "--"} °C</p>
      <p>Humidity: {reading.humidity_percent ?? "--"} %</p>
      <p>Soil Moisture: {reading.soil_moisture_percent ?? "--"} %</p>
      <p>Light: {reading.light_percent ?? "--"} %</p>
      <small>
        Last updated: {new Date(reading.created_at).toLocaleString()}
      </small>
    </section>
  );
}
