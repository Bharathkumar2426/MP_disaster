import { useState, useRef, useEffect } from "react";
import { Bell, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

function NotificationDropdown({ notifications = [], onClear }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "relative",
          background: isOpen ? "#1e293b" : "transparent",
          border: "1px solid #334155",
          borderRadius: "8px",
          width: "36px",
          height: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#cbd5e1",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              background: "#ef4444",
              color: "#fff",
              fontSize: "0.68rem",
              fontWeight: "700",
              borderRadius: "50%",
              width: "18px",
              height: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #0b0f17",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "44px",
            right: "0",
            width: "320px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "10px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            zIndex: 1050,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #1e293b",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#111827",
            }}
          >
            <div style={{ fontWeight: "600", fontSize: "0.85rem", color: "#f8fafc" }}>
              Incident Notifications
            </div>
            {notifications.length > 0 && (
              <button
                onClick={onClear}
                style={{
                  background: "none",
                  border: "none",
                  color: "#60a5fa",
                  fontSize: "0.72rem",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "#64748b", fontSize: "0.8rem" }}>
                No active notifications
              </div>
            ) : (
              notifications.map((notif, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (notif.link) navigate(notif.link);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid #1e293b",
                    background: notif.read ? "transparent" : "rgba(37, 99, 235, 0.06)",
                    cursor: "pointer",
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1e293b")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = notif.read ? "transparent" : "rgba(37, 99, 235, 0.06)")
                  }
                >
                  <div style={{ marginTop: "2px", flexShrink: 0 }}>
                    {notif.type === "HIGH" ? (
                      <AlertTriangle size={15} color="#ef4444" />
                    ) : notif.type === "SUCCESS" ? (
                      <CheckCircle size={15} color="#10b981" />
                    ) : (
                      <Info size={15} color="#3b82f6" />
                    )}
                  </div>
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: "600", color: "#e2e8f0", marginBottom: "2px" }}>
                      {notif.title}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "#94a3b8", lineHeight: "1.3" }}>
                      {notif.message}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "4px" }}>
                      {notif.time || "Just now"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
