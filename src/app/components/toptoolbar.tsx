
"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement: new (
          options: {
            pageLanguage: string;
            includedLanguages: string;
            autoDisplay: boolean;
          },
          elementId: string
        ) => unknown;
      };
    };
  }
}

const languages = [
  { name: "English", code: "en", voice: "en-IN" },
  { name: "Kannada", code: "kn", voice: "kn-IN" },
  { name: "Hindi", code: "hi", voice: "hi-IN" },
  { name: "Tamil", code: "ta", voice: "ta-IN" },
  { name: "Telugu", code: "te", voice: "te-IN" },
];

export default function TopToolbar() {
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState("en");
  const [voiceOn, setVoiceOn] = useState(false);
  const [translatorReady, setTranslatorReady] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("gm-theme");
    const savedLanguage = localStorage.getItem("gm-language");

    const isDark = savedTheme !== "light";
    setDarkMode(isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";

    if (savedLanguage && languages.some((item) => item.code === savedLanguage)) {
      setLanguage(savedLanguage);
    }

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;

      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "en,kn,hi,ta,te",
          autoDisplay: false,
        },
        "google_translate_element"
      );

      setTranslatorReady(true);
    };

    const scriptId = "google-translate-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src =
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else if (document.querySelector(".goog-te-combo")) {
      setTranslatorReady(true);
    }

    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  function toggleTheme() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("gm-theme", next ? "dark" : "light");
  }

  function translateWebsite() {
    if (!translatorReady) {
      alert("Translator is loading. Please wait a few seconds and try again.");
      return;
    }

    const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");

    if (!combo) {
      alert("Google Translate is unavailable. Check your internet connection.");
      return;
    }

    combo.value = language;
    combo.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function changeLanguage(value: string) {
    setLanguage(value);
    localStorage.setItem("gm-language", value);
  }

  function toggleVoice() {
    if (!("speechSynthesis" in window)) {
      alert("Voice assistance is not supported in this browser.");
      return;
    }

    if (voiceOn) {
      window.speechSynthesis.cancel();
      setVoiceOn(false);
      return;
    }

    const selectedText = window.getSelection()?.toString().trim();
    const pageText =
      document.querySelector("main")?.innerText || document.body.innerText;

    const textToRead = (selectedText || pageText)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12000);

    if (!textToRead) {
      alert("No text available to read.");
      return;
    }

    const selectedLanguage = languages.find(
      (item) => item.code === language
    );

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = selectedLanguage?.voice || "en-IN";
    utterance.rate = 0.9;

    utterance.onend = () => setVoiceOn(false);
    utterance.onerror = () => setVoiceOn(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setVoiceOn(true);
  }

  return (
    <>
      <header className="gm-toolbar">
        <div className="gm-toolbar-inner">
          <button
            className="gm-toolbar-button"
            onClick={toggleTheme}
            type="button"
          >
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>

          <select
            className="gm-language-select"
            value={language}
            onChange={(event) => changeLanguage(event.target.value)}
            aria-label="Select language"
          >
            {languages.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>

          <button
            className="gm-translate-button"
            onClick={translateWebsite}
            type="button"
          >
            🌐 Translate Website
          </button>

          <button
            className="gm-toolbar-button"
            onClick={toggleVoice}
            type="button"
          >
            {voiceOn ? "🔊 Voice ON" : "🔇 Voice OFF"}
          </button>
        </div>
      </header>

      <div id="google_translate_element" aria-hidden="true" />
    </>
  );
}
