
"use client";

import Link from "next/link";
import { useState } from "react";

export default function DiseaseDetectionPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  function chooseImage(selected: File | undefined) {
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setMessage("Please select an image file.");
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setMessage("Image ready. AI model connection is required for diagnosis.");
  }

  return (
    <main style={{
      minHeight: "100vh",
      padding: 35,
      background: "#0b172b",
      color: "#eef5ff",
      fontFamily: "Arial, sans-serif"
    }}>
      <Link href="/" style={{ color: "#54d6a0" }}>← Back to Dashboard</Link>

      <h1 style={{ marginTop: 25 }}>🔬 AI Plant Disease Detection</h1>
      <p style={{ color: "#a7b8d0" }}>
        Capture or upload a leaf image for disease analysis.
      </p>

      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
        gap: 22,
        marginTop: 30
      }}>
        <article style={card}>
          <h2>Upload or Capture Leaf</h2>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => chooseImage(e.target.files?.[0])}
          />

          <div style={{
            marginTop: 20,
            minHeight: 260,
            border: "1px dashed #54718f",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}>
            {preview ? (
              <img
                src={preview}
                alt="Selected leaf"
                style={{ maxWidth: "100%", maxHeight: 350, objectFit: "contain" }}
              />
            ) : (
              <p style={{ color: "#9aacc4", padding: 20, textAlign: "center" }}>
                Your leaf image preview will appear here.
              </p>
            )}
          </div>

          <button
            disabled={!file}
            onClick={() => setMessage(
              "Image selected successfully. Connect your trained YOLOv8 model to perform a real disease diagnosis."
            )}
            style={{
              marginTop: 20,
              padding: "13px 20px",
              border: 0,
              borderRadius: 10,
              background: "#5968ee",
              color: "white",
              cursor: file ? "pointer" : "not-allowed"
            }}
          >
            Capture & Analyse
          </button>

          {message && <p style={{ color: "#54d6a0" }}>{message}</p>}
        </article>

        <article style={card}>
          <h2>Diagnosis & Care</h2>
          <p style={{ color: "#a7b8d0" }}>
            Your AI diagnosis will appear here after connecting the YOLOv8 model.
          </p>

          <div style={{
            padding: 20,
            marginTop: 20,
            background: "#1a304b",
            borderRadius: 12
          }}>
            <h3>🌿 Disease identification</h3>
            <p>Waiting for image analysis</p>
          </div>

          <div style={{
            padding: 20,
            marginTop: 15,
            background: "#1a304b",
            borderRadius: 12
          }}>
            <h3>Plant health percentage</h3>
            <p>Will be calculated from model results.</p>
          </div>

          <div style={{
            padding: 20,
            marginTop: 15,
            background: "#1a304b",
            borderRadius: 12
          }}>
            <h3>Recommended treatment</h3>
            <p>
              Treatment, prevention steps and suitable medicine suggestions
              will appear after diagnosis.
            </p>
          </div>
        </article>
      </section>

      <p style={{ color: "#91a4bd", marginTop: 25 }}>
        Image upload and preview are working independently. A trained AI
        model is still required for genuine disease detection.
      </p>
    </main>
  );
}

const card: React.CSSProperties = {
  background: "#12233c",
  border: "1px solid #294362",
  borderRadius: 16,
  padding: 22
};
