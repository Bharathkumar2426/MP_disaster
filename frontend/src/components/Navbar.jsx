import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, PhoneCall, Radio } from "lucide-react";
import NotificationDropdown from "./NotificationDropdown";
import SOSModal from "./SOSModal";
import api from "../services/api";

import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notificationService";

function Navbar() {
  const navigate = useNavigate();
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch (e) {
    user = null;
  }

  // Load real in-app user notifications with 30s polling
  useEffect(() => {
    let isMounted = true;
    async function loadUserNotifications() {
      try {
        const data = await getNotifications();
        if (isMounted && data && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      } catch (err) {
        // Fallback to high severity disasters if offline
        try {
          const res = await api.get("/disasters");
          if (isMounted && Array.isArray(res.data)) {
            const highSev = res.data
              .filter(
                (d) =>
                  d.severity?.toUpperCase() === "HIGH" ||
                  d.status?.toUpperCase() === "ACTIVE"
              )
              .slice(0, 5)
              .map((d) => ({
                id: d.id,
                disasterId: d.id,
                type: d.severity?.toUpperCase() === "HIGH" ? "HIGH" : "INFO",
                severity: d.severity,
                title: d.disasterName || "Emergency Alert",
                message: `Active incident in ${d.district || "district"}. Status: ${d.status || "ACTIVE"}`,
                link: `/?focus=${d.id}`,
                isRead: false,
              }));
            setNotifications(highSev);
          }
        } catch (e) {
          // ignore
        }
      }
    }

    loadUserNotifications();
    const interval = setInterval(loadUserNotifications, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  async function handleClearNotifications() {
    try {
      await markAllNotificationsAsRead();
    } catch (e) {
      console.warn("Error marking all read:", e);
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
  }

  async function handleSelectNotification(notif) {
    if (notif?.id && !notif.isRead && !notif.read) {
      try {
        await markNotificationAsRead(notif.id);
      } catch (e) {
        console.warn("Error marking read:", e);
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true, isRead: true } : n))
      );
    }
  }

  function logout() {
    localStorage.removeItem("user");
    navigate("/login");
  }

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case "ADMIN":
        return { background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)" };
      case "TRAINER":
        return { background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.3)" };
      default:
        return { background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" };
    }
  };

  return (
    <>
      <nav className="top-navbar">
        {/* Left: Title & Live Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div>
            <h3>Disaster Operations Command</h3>
            <p>Incident Monitoring & Response Grid</p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              padding: "3px 8px",
              borderRadius: "100px",
              fontSize: "0.72rem",
              color: "#34d399",
              fontWeight: "600",
            }}
          >
            <Radio size={12} className="pulse" />
            LIVE SYSTEM
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Quick SOS Trigger Button */}
          <button className="nav-sos-btn" onClick={() => setIsSosOpen(true)}>
            <PhoneCall size={14} />
            SOS Helplines
          </button>

          {/* Notifications Dropdown */}
          <NotificationDropdown
            notifications={notifications}
            onClear={handleClearNotifications}
            onSelect={handleSelectNotification}
          />

          {/* User Profile */}
          {user && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "4px 10px",
                background: "#111827",
                border: "1px solid #1e293b",
                borderRadius: "8px",
              }}
            >
              <div style={{ textAlign: "right", lineHeight: "1.2" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: "600", color: "#f8fafc" }}>
                  {user.fullName || "User"}
                </div>
                <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                  {user.email || ""}
                </div>
              </div>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: "700",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  ...getRoleBadgeStyle(user.role),
                }}
              >
                {user.role}
              </span>
            </div>
          )}

          {/* Logout Button */}
          <button className="logout-btn" onClick={logout}>
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </nav>

      {/* SOS Modal */}
      <SOSModal isOpen={isSosOpen} onClose={() => setIsSosOpen(false)} />
    </>
  );
}

export default Navbar;