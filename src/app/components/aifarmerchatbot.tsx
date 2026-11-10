
"use client";

import { useState, useRef, useEffect } from "react";

const suggestions = [
  "Why is my plant turning yellow?",
  "When should I water my plants?",
  "What is the current greenhouse temperature?",
  "How can I control plant diseases?",
];

type Message = {
  role: "bot" | "user";
  text: string;
};

export default function AIFarmerChatbot() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Hello! 🌱 Welcome to GreenMind AI Farmer Assistant. How can I help your plants today?",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function reply(question: string) {
    const q = question.toLowerCase();

    if (q.includes("yellow")) {
      return "🌱 Yellow leaves can be caused by overwatering, underwatering, nutrient deficiency or pests. Check the soil moisture and inspect the leaves for spots or insects.";
    }

    if (q.includes("water") || q.includes("irrigation")) {
      return "💧 Check the soil near the roots before watering. Water when the root zone begins to dry, and avoid waterlogging.";
    }

    if (q.includes("temperature")) {
      return "🌡️ Live greenhouse temperature will be available when your ESP32 sensor is connected and sending readings to Supabase.";
    }

    if (q.includes("disease") || q.includes("spot")) {
      return "🔬 Inspect leaves for spots, mould and yellow patches. Remove badly affected leaves and improve airflow. You can upload a leaf image on the Disease Detection page for analysis.";
    }

    if (q.includes("humidity")) {
      return "💧 Humidity affects plant growth and disease risk. Monitor your greenhouse humidity and maintain a suitable range for your crop.";
    }

    if (q.includes("soil")) {
      return "🌱 Check soil moisture near the plant roots. Avoid both very dry soil and waterlogging.";
    }

    if (q.includes("battery") || q.includes("solar")) {
      return "☀️ Solar and battery status will be displayed after the corresponding hardware sensors are connected.";
    }

    return "🌿 I can help with plant health, watering, temperature, humidity, soil moisture and plant diseases. Please describe your farming problem in more detail.";
  }

  function send(text = message) {
    const question = text.trim();

    if (!question) return;

    setMessages((old) => [
      ...old,
      { role: "user", text: question },
      { role: "bot", text: reply(question) },
    ]);

    setMessage("");
  }

  return (
    <div className="ai-chatbot">
      {open && (
        <section
          className="ai-chat-window"
          aria-label="AI Farmer Assistant chat"
        >
          <header className="ai-chat-header">
            <div className="ai-chat-avatar">🌱</div>

            <div className="ai-chat-title">
              <strong>GreenMind AI Farmer</strong>
              <span>● Farming Assistant</span>
            </div>

            <button
              type="button"
              className="ai-chat-close"
              onClick={() => setOpen(false)}
              aria-label="Close chatbot"
            >
              ×
            </button>
          </header>

          <div className="ai-chat-messages">
            {messages.map((item, index) => (
              <div
                key={index}
                className={
                  item.role === "user"
                    ? "ai-message ai-user-message"
                    : "ai-message ai-bot-message"
                }
              >
                {item.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="ai-suggestions">
              <span>Suggested questions</span>

              {suggestions.map((question) => (
                <button
                  type="button"
                  key={question}
                  onClick={() => send(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          <form
            className="ai-chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask your farming question..."
              aria-label="Type your farming question"
            />

            <button type="submit" disabled={!message.trim()}>
              ➤
            </button>
          </form>

          <p className="ai-chat-disclaimer">
            GreenMind farming assistant · Responses are guidance, not a diagnosis.
          </p>
        </section>
      )}

      <button
        type="button"
        className="ai-chat-launcher"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close AI Farmer" : "Open AI Farmer"}
      >
        {open ? "✕ Close" : "🤖 Ask AI Farmer"}
      </button>
    </div>
  );
}
