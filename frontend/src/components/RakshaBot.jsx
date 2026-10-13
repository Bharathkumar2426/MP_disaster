import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  MessageSquare,
  Send,
  X,
  Minus,
  Maximize2,
  RefreshCw,
  AlertTriangle,
  PhoneCall,
  Sparkles,
  Trash2,
  Loader2,
  ChevronRight,
  Shield,
  HelpCircle,
} from "lucide-react";
import { sendRakshaBotMessage } from "../services/rakshabotService";

const INITIAL_SUGGESTIONS = [
  "What disasters are happening right now?",
  "Are there active floods near Kochi?",
  "What are the latest incidents in India?",
  "What training programs are available for floods?",
  "What is the weather and flood risk in Kochi?",
  "What essential items go into a 72-hour emergency kit?",
];

const EMERGENCY_HOTLINES = [
  { name: "All Emergency", number: "112" },
  { name: "NDRF", number: "1077" },
  { name: "Ambulance", number: "108" },
  { name: "Fire", number: "101" },
];

export default function RakshaBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem("rakshabot_session_history");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [];
  });
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState(INITIAL_SUGGESTIONS);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sync session messages to sessionStorage
  useEffect(() => {
    try {
      if (messages.length > 0) {
        sessionStorage.setItem("rakshabot_session_history", JSON.stringify(messages));
      }
    } catch (e) {
      // ignore
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen, isMinimized]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputMessage || "").trim();
    if (!query || isLoading) return;

    setErrorMessage(null);
    setInputMessage("");

    const userMsg = { role: "user", content: query, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Format history for API (last 6 previous messages)
      const apiHistory = messages.slice(-6).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        content: m.content,
      }));

      const data = await sendRakshaBotMessage(query, apiHistory);

      const botReply = {
        role: "model",
        content: data.response,
        disclaimer: data.disclaimer,
        model: data.model,
        dataSource: data.dataSource,
        dataTimestamp: data.dataTimestamp,
        liveDataIncluded: data.liveDataIncluded,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botReply]);
      if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
        setSuggestedQuestions(data.suggestedQuestions);
      }
    } catch (err) {
      console.error("RakshaBot query failed:", err);
      let errText = "Unable to reach RakshaBot AI right now. Please check your connection and retry.";
      if (err.code === "ECONNABORTED" || (err.message && err.message.toLowerCase().includes("timeout"))) {
        errText = "RakshaBot query timed out (25s limit). Please check your connection and retry.";
      } else if (err.response?.data?.detail) {
        errText = err.response.data.detail;
      }
      setErrorMessage(errText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Clear this RakshaBot chat session?")) {
      setMessages([]);
      setErrorMessage(null);
      setSuggestedQuestions(INITIAL_SUGGESTIONS);
      try {
        sessionStorage.removeItem("rakshabot_session_history");
      } catch (e) {
        // ignore
      }
    }
  };

  // Simple formatter for bullet points, bold text, and numbered items
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;
    const lines = rawText.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} style={{ height: "6px" }} />;

      // Header or bold emphasis
      let formatted = line;
      // Replace **text** with <strong>
      const parts = formatted.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} style={{ color: "#38bdf8", fontWeight: 700 }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
        return (
          <div key={idx} style={{ display: "flex", gap: "6px", margin: "3px 0", paddingLeft: "4px" }}>
            <span style={{ color: "#38bdf8", flexShrink: 0 }}>•</span>
            <span style={{ flex: 1 }}>{renderedParts}</span>
          </div>
        );
      }

      if (/^\d+\.\s/.test(trimmed)) {
        return (
          <div key={idx} style={{ display: "flex", gap: "6px", margin: "4px 0", paddingLeft: "4px" }}>
            <span style={{ color: "#34d399", fontWeight: 700, flexShrink: 0 }}>{trimmed.match(/^\d+\./)[0]}</span>
            <span style={{ flex: 1 }}>{renderedParts}</span>
          </div>
        );
      }

      return (
        <div key={idx} style={{ margin: "2px 0" }}>
          {renderedParts}
        </div>
      );
    });
  };

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. FLOATING LAUNCHER BUTTON (Bottom-Right Corner)
          ───────────────────────────────────────────────────────────── */}
      {!isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 1050,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {/* Subtle invitation chip */}
          <div
            onClick={() => setIsOpen(true)}
            style={{
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(56, 189, 248, 0.35)",
              color: "#f8fafc",
              padding: "7px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
              boxShadow: "0 4px 18px rgba(0, 0, 0, 0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backdropFilter: "blur(8px)",
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <Sparkles size={14} color="#38bdf8" />
            <span>Need Help? Ask RakshaBot</span>
          </div>

          {/* Main Floating Icon */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            aria-label="Open RakshaBot AI Disaster Assistant"
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              border: "2px solid #38bdf8",
              boxShadow: "0 6px 20px rgba(2, 132, 199, 0.5), 0 0 12px rgba(56, 189, 248, 0.4)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.08)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(2, 132, 199, 0.7), 0 0 16px rgba(56, 189, 248, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(2, 132, 199, 0.5), 0 0 12px rgba(56, 189, 248, 0.4)";
            }}
            title="Open RakshaBot AI Disaster Safety Assistant"
          >
            <Bot size={28} />
            {/* Active pulse dot */}
            <span
              style={{
                position: "absolute",
                top: "2px",
                right: "2px",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#10b981",
                border: "2px solid #090d16",
              }}
            />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. RAKSHABOT CHAT WINDOW
          ───────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 1050,
            width: "390px",
            maxWidth: "calc(100vw - 32px)",
            height: isMinimized ? "58px" : "580px",
            maxHeight: "calc(100vh - 48px)",
            backgroundColor: "#090d16",
            border: "1px solid #1e293b",
            borderRadius: "16px",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.65), 0 0 20px rgba(56, 189, 248, 0.15)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            transition: "height 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {/* ── Top Header ── */}
          <div
            style={{
              padding: "12px 16px",
              background: "linear-gradient(90deg, #0f172a 0%, #1e293b 100%)",
              borderBottom: "1px solid #334155",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: isMinimized ? "pointer" : "default",
            }}
            onClick={() => isMinimized && setIsMinimized(false)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                  border: "1.5px solid #38bdf8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  flexShrink: 0,
                }}
              >
                <Bot size={18} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc" }}>
                    RakshaBot <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: 500 }}>रक्षाBot</span>
                  </span>
                  <span
                    style={{
                      fontSize: "9.5px",
                      background: "rgba(16, 185, 129, 0.2)",
                      color: "#34d399",
                      padding: "1px 6px",
                      borderRadius: "10px",
                      fontWeight: 700,
                    }}
                  >
                    AI SAFETY
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                  24/7 Disaster Preparedness &amp; Guidance
                </div>
              </div>
            </div>

            {/* Window Action Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }} onClick={(e) => e.stopPropagation()}>
              {messages.length > 0 && !isMinimized && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear Chat History"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    padding: "6px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand" : "Minimize"}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  padding: "6px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f8fafc")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minus size={15} />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close RakshaBot"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  padding: "6px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── Chat Body (When Not Minimized) ── */}
          {!isMinimized && (
            <>
              {/* Emergency Hotline Alert Strip */}
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  borderBottom: "1px solid rgba(239, 68, 68, 0.25)",
                  padding: "7px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "#fca5a5",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertTriangle size={13} color="#ef4444" style={{ flexShrink: 0 }} />
                  <span>Immediate Danger? Call emergency hotlines:</span>
                </div>
                <div style={{ display: "flex", gap: "6px", fontWeight: 700 }}>
                  <span style={{ color: "#ffffff", background: "#b91c1c", padding: "1px 6px", borderRadius: "3px" }}>
                    112
                  </span>
                  <span style={{ color: "#ffffff", background: "#b91c1c", padding: "1px 6px", borderRadius: "3px" }}>
                    1077
                  </span>
                </div>
              </div>

              {/* Message History Container */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  backgroundColor: "#090d16",
                }}
              >
                {/* Welcome Message (Shown when no messages yet) */}
                {messages.length === 0 && (
                  <div
                    style={{
                      background: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid #1e293b",
                      borderRadius: "12px",
                      padding: "14px",
                      color: "#e2e8f0",
                      fontSize: "12.5px",
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <Shield size={16} color="#38bdf8" />
                      <strong style={{ color: "#f8fafc" }}>Welcome to RakshaBot!</strong>
                    </div>
                    <p style={{ margin: "0 0 10px 0", color: "#94a3b8", fontSize: "12px" }}>
                      I am your real-time AI Disaster Safety Assistant. Ask me about survival precautions, emergency go-bags, evacuation procedures, first aid basics, or recovery steps.
                    </p>
                    <div style={{ fontSize: "11px", color: "#64748b", borderTop: "1px solid #1e293b", paddingTop: "8px" }}>
                      💡 <em>Tip: Tap a suggested topic below or type your own question.</em>
                    </div>
                  </div>
                )}

                {/* Render All Messages in Current Session */}
                {messages.map((m, idx) => {
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isUser ? "flex-end" : "flex-start",
                        maxWidth: "100%",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "88%",
                          padding: "10px 14px",
                          borderRadius: isUser ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                          backgroundColor: isUser ? "#0284c7" : "#0f172a",
                          border: isUser ? "1px solid #0ea5e9" : "1px solid #1e293b",
                          color: "#f8fafc",
                          fontSize: "12.5px",
                          lineHeight: 1.48,
                          wordBreak: "break-word",
                          boxShadow: isUser ? "0 2px 8px rgba(2, 132, 199, 0.3)" : "none",
                        }}
                      >
                        {isUser ? m.content : renderFormattedText(m.content)}
                      </div>

                      {/* Telemetry Grounding Badge */}
                      {!isUser && m.liveDataIncluded && (
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#38bdf8",
                            backgroundColor: "rgba(56, 189, 248, 0.08)",
                            border: "1px solid rgba(56, 189, 248, 0.2)",
                            borderRadius: "5px",
                            marginTop: "4px",
                            padding: "3px 8px",
                            maxWidth: "88%",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            lineHeight: 1.3,
                          }}
                        >
                          <Sparkles size={11} color="#38bdf8" />
                          <span>
                            <strong>Data Grounding:</strong> {m.dataSource || "Application Telemetry"}
                            {m.dataTimestamp ? ` • ${new Date(m.dataTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ""}
                          </span>
                        </div>
                      )}

                      {/* Bot Disclaimer Footer */}
                      {!isUser && m.disclaimer && (
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#64748b",
                            marginTop: "4px",
                            maxWidth: "88%",
                            paddingLeft: "4px",
                            lineHeight: 1.3,
                          }}
                        >
                          ⚖️ {m.disclaimer}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Loading / Generating Indicator */}
                {isLoading && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94a3b8", fontSize: "12px", padding: "6px 8px" }}>
                    <Loader2 size={16} className="spin-animation" color="#38bdf8" />
                    <span>RakshaBot is analyzing safety guidance...</span>
                  </div>
                )}

                {/* Error Banner with Retry */}
                {errorMessage && (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.12)",
                      border: "1px solid rgba(239, 68, 68, 0.35)",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      color: "#f87171",
                      fontSize: "12px",
                      lineHeight: 1.4,
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
                      <span>{errorMessage}</span>
                    </div>
                    {messages.length > 0 && messages[messages.length - 1].role === "user" && (
                      <button
                        type="button"
                        onClick={() => handleSendMessage(messages[messages.length - 1].content)}
                        style={{
                          alignSelf: "flex-start",
                          background: "rgba(239, 68, 68, 0.2)",
                          border: "1px solid rgba(239, 68, 68, 0.5)",
                          color: "#fca5a5",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <RefreshCw size={11} /> Retry Question
                      </button>
                    )}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* ── Suggested Questions Chips ── */}
              {suggestedQuestions.length > 0 && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "#0b1222",
                    borderTop: "1px solid #1e293b",
                    display: "flex",
                    gap: "6px",
                    overflowX: "auto",
                    whiteSpace: "nowrap",
                    scrollbarWidth: "none",
                  }}
                >
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSendMessage(q)}
                      style={{
                        background: "rgba(15, 23, 42, 0.8)",
                        border: "1px solid rgba(56, 189, 248, 0.25)",
                        borderRadius: "12px",
                        color: "#94a3b8",
                        padding: "4px 10px",
                        fontSize: "11px",
                        cursor: isLoading ? "wait" : "pointer",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#38bdf8";
                        e.currentTarget.style.borderColor = "#38bdf8";
                        e.currentTarget.style.background = "rgba(56, 189, 248, 0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#94a3b8";
                        e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.25)";
                        e.currentTarget.style.background = "rgba(15, 23, 42, 0.8)";
                      }}
                    >
                      <ChevronRight size={11} />
                      {q.length > 36 ? `${q.slice(0, 36)}...` : q}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Bottom Input Bar ── */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                style={{
                  padding: "10px 12px",
                  background: "#0f172a",
                  borderTop: "1px solid #1e293b",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask RakshaBot a safety or preparedness question..."
                  value={inputMessage}
                  maxLength={1000}
                  disabled={isLoading}
                  onChange={(e) => setInputMessage(e.target.value)}
                  style={{
                    flex: 1,
                    background: "#090d16",
                    border: "1px solid #334155",
                    color: "#f1f5f9",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#38bdf8")}
                  onBlur={(e) => (e.target.style.borderColor = "#334155")}
                />

                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  style={{
                    background: inputMessage.trim() && !isLoading ? "#0284c7" : "#1e293b",
                    border: "none",
                    color: inputMessage.trim() && !isLoading ? "#ffffff" : "#64748b",
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: inputMessage.trim() && !isLoading ? "pointer" : "default",
                    flexShrink: 0,
                    transition: "background 0.2s ease",
                  }}
                  title="Send message"
                >
                  {isLoading ? <Loader2 size={16} className="spin-animation" /> : <Send size={16} />}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
