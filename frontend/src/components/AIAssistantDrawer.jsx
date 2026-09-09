import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { sendAssistantMessage } from "../services/api";
import "../styles/aiAssistant.css";

const DEFAULT_CHIPS = {
  patient: ["➕ Add Paracetamol 500mg morning", "📋 Today's schedule", "📊 My adherence"],
  caregiver: ["👥 List assigned patients", "⚠️ Check missed dose alerts"],
  admin: ["📊 System status report", "➕ Add Ibuprofen to database", "🏷️ Low stock alert"]
};

const AIAssistantDrawer = () => {
  const { user } = useAuth();
  const role = (user?.role || "patient").toLowerCase();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "assistant",
      text: `Hello ${user?.full_name?.split(" ")[0] || ""}! I'm your PillSync AI Assistant 💊.\nHow can I help you today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [suggestions, setSuggestions] = useState(DEFAULT_CHIPS[role] || DEFAULT_CHIPS.patient);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setSuggestions(DEFAULT_CHIPS[role] || DEFAULT_CHIPS.patient);
  }, [role]);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = {
      sender: "user",
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      // Build history payload
      const historyPayload = messages.slice(-6).map((m) => ({
        sender: m.sender,
        message: m.text,
        pending_intent: m.pending_intent
      }));

      const res = await sendAssistantMessage(query, historyPayload);

      const assistantMsg = {
        sender: "assistant",
        text: res.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pending_intent: res.pending_intent
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (res.suggestions && res.suggestions.length > 0) {
        setSuggestions(res.suggestions);
      } else {
        setSuggestions(DEFAULT_CHIPS[role] || DEFAULT_CHIPS.patient);
      }

      // If action was executed, broadcast refresh event for UI sync!
      if (res.action_executed === "REFRESH_SCHEDULE") {
        window.dispatchEvent(new Event("pillsync-schedule-updated"));
      } else if (res.action_executed === "REFRESH_MEDICINES") {
        window.dispatchEvent(new Event("pillsync-medicines-updated"));
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: `⚠️ Error: ${err.message || "Could not process request."}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating launcher button */}
      <button
        className="ai-assistant-fab"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open AI Assistant"
      >
        <span style={{ fontSize: 18 }}>🤖</span>
        <span>AI Assistant</span>
        <span className="ai-assistant-fab__badge" />
      </button>

      {/* Floating chat drawer */}
      {isOpen && (
        <div className="ai-drawer">
          <div className="ai-drawer__header">
            <div>
              <div className="ai-drawer__title">
                <span>💊 PillSync AI</span>
                <span style={{ fontSize: 10, background: "var(--blue-600)", padding: "2px 8px", borderRadius: 99, textTransform: "capitalize" }}>
                  {role} Mode
                </span>
              </div>
              <p className="ai-drawer__subtitle">Always online to assist you</p>
            </div>
            <button className="ai-drawer__close" onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>

          <div className="ai-drawer__messages">
            {messages.map((m, idx) => (
              <div key={idx} className={`ai-msg ai-msg--${m.sender}`}>
                <div className="ai-msg__bubble">
                  {m.text.split("\n").map((line, i) => (
                    <span key={i}>
                      {line}
                      <br />
                    </span>
                  ))}
                </div>
                <span className="ai-msg__time">{m.time}</span>
              </div>
            ))}
            {loading && (
              <div className="ai-msg ai-msg--assistant">
                <div className="ai-msg__bubble" style={{ color: "var(--muted)", fontStyle: "italic" }}>
                  Thinking & checking data…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          {suggestions.length > 0 && (
            <div className="ai-drawer__suggestions">
              {suggestions.map((chip, idx) => (
                <button
                  key={idx}
                  className="ai-chip"
                  onClick={() => handleSend(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <form
            className="ai-drawer__footer"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              className="ai-drawer__input"
              placeholder={`Ask AI (${role} mode)…`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="ai-drawer__send" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AIAssistantDrawer;
