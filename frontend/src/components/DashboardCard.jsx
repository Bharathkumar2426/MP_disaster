import Counter from "./Counter";
import { TrendingUp } from "lucide-react";

function DashboardCard({ icon, title, value, subtitle, trend = "+12% this month" }) {
  return (
    <div className="stat-card">
      <div className="card-top">
        <div className="card-icon">{icon}</div>
        <span className="card-top-tag">Active</span>
      </div>

      <div className="card-middle">
        <h6>{title}</h6>
        <h2>
          <Counter end={value} />
        </h2>
      </div>

      <div className="card-bottom">
        <small>{subtitle}</small>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11.5px", color: "#38bdf8", fontWeight: "600" }}>
          <TrendingUp size={12} /> Live
        </div>
      </div>
    </div>
  );
}

export default DashboardCard;
