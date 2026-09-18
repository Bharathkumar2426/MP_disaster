import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users as UsersIcon, Flame, Building2, GraduationCap, ShieldAlert, ShieldCheck } from "lucide-react";

function Sidebar() {
  const location = useLocation();

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch (e) {
    user = null;
  }

  const role = user?.role || "PARTICIPANT";

  // Menu items with role-based visibility using clean Lucide icons
  const allMenuItems = [
    {
      icon: <LayoutDashboard size={18} />,
      name: "Dashboard",
      path: "/",
      roles: ["ADMIN", "TRAINER", "PARTICIPANT"],
    },
    {
      icon: <ShieldCheck size={18} />,
      name: "Safety & Preparedness",
      path: "/safety",
      roles: ["ADMIN", "TRAINER", "PARTICIPANT"],
    },
    {
      icon: <UsersIcon size={18} />,
      name: "Users",
      path: "/users",
      roles: ["ADMIN"],
    },
    {
      icon: <Flame size={18} />,
      name: "Disasters",
      path: "/disasters",
      roles: ["ADMIN", "TRAINER", "PARTICIPANT"],
    },
    {
      icon: <Building2 size={18} />,
      name: "Training Centers",
      path: "/training-centers",
      roles: ["ADMIN", "TRAINER", "PARTICIPANT"],
    },
    {
      icon: <GraduationCap size={18} />,
      name: "Training Programs",
      path: "/training-programs",
      roles: ["ADMIN", "TRAINER", "PARTICIPANT"],
    },
  ];

  const visibleMenuItems = allMenuItems.filter((item) =>
    item.roles.includes(role)
  );

  const getRoleBadgeStyle = () => {
    switch (role) {
      case "ADMIN":
        return { background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" };
      case "TRAINER":
        return { background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" };
      default:
        return { background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" };
    }
  };

  return (
    <div className="sidebar">
      <div>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h2>Disaster Center</h2>
            <p>Operations Portal</p>
          </div>
        </div>

        <div className="sidebar-menu">
          {visibleMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={isActive ? "nav-link active" : "nav-link"}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {user && (
        <div className="sidebar-user">
          <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user.fullName || "User"}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: "700",
                padding: "2px 6px",
                borderRadius: "4px",
                ...getRoleBadgeStyle(),
              }}
            >
              {role}
            </span>
            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Active</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;