import { useState, useRef, useEffect } from "react";
import { Bell, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

function NotificationDropdown({ notifications = [], onClear, onSelect }) {
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

  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length;

  const handleNotificationClick = (notif) => {
    if (onSelect) {
      onSelect(notif);
    }
    if (notif.link) {
      navigate(notif.link);
    } else if (notif.disasterId) {
      navigate(`/?focus=${notif.disasterId}`);
    }
    setIsOpen(false);
  };

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
        title="Incident Notifications"
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
            width: "340px",
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
              {unreadCount > 0 && (
                <span
                  style={{
                    marginLeft: "6px",
                    fontSize: "0.7rem",
                    padding: "1px 6px",
                    borderRadius: "100px",
                    background: "rgba(239, 68, 68, 0.2)",
                    color: "#f87171",
                    fontWeight: "700",
                  }}
                >
                  {unreadCount} new
                </span>
              )}
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
                  fontWeight: "600",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: "320px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "#64748b", fontSize: "0.8rem" }}>
                No active notifications
              </div>
            ) : (
              notifications.map((notif, idx) => {
                const isRead = notif.read || notif.isRead;
                const isHigh =
                  (notif.severity || notif.type || "").toUpperCase() === "HIGH";

                return (
                  <div
                    key={notif.id || idx}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: "11px 14px",
                      borderBottom: "1px solid #1e293b",
                      background: isRead
                        ? "transparent"
                        : isHigh
                        ? "rgba(239, 68, 68, 0.08)"
                        : "rgba(37, 99, 235, 0.06)",
                      borderLeft: !isRead
                        ? isHigh
                          ? "3px solid #ef4444"
                          : "3px solid #3b82f6"
                        : "3px solid transparent",
                      cursor: "pointer",
                      display: "flex",
                      gap: "10px",
                      alignItems: "flex-start",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#1e293b")}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = isRead
                        ? "transparent"
                        : isHigh
                        ? "rgba(239, 68, 68, 0.08)"
                        : "rgba(37, 99, 235, 0.06)")
                    }
                  >
                    <div style={{ marginTop: "2px", flexShrink: 0 }}>
                      {isHigh ? (
                        <AlertTriangle size={15} color="#ef4444" />
                      ) : notif.type === "SUCCESS" ? (
                        <CheckCircle size={15} color="#10b981" />
                      ) : (
                        <Info size={15} color="#3b82f6" />
                      )}
                    </div>
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          color: isHigh ? "#fca5a5" : "#e2e8f0",
                          marginBottom: "2px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "4px",
                        }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {notif.title}
                        </span>
                        {notif.distanceKm !== undefined && notif.distanceKm !== null && (
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: "700",
                              color: "#38bdf8",
                              background: "rgba(56, 189, 248, 0.12)",
                              border: "1px solid rgba(56, 189, 248, 0.3)",
                              padding: "1px 5px",
                              borderRadius: "4px",
                              flexShrink: 0,
                            }}
                          >
                            {notif.distanceKm} km
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "#94a3b8", lineHeight: "1.3" }}>
                        {notif.message}
                      </div>
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "#64748b",
                          marginTop: "4px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>{notif.time || (notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Active")}</span>
                        <span style={{ color: "#60a5fa", fontSize: "0.68rem", fontWeight: "600" }}>
                          View on Map →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
