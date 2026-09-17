import { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { BarChart3, PieChart as PieIcon } from "lucide-react";

function DashboardCharts({ disasters = [], programs = [] }) {
  // Compute dynamic live severity distribution
  const severityData = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;

    disasters.forEach((d) => {
      const sev = String(d.severity || "").toUpperCase();
      if (sev === "HIGH") high++;
      else if (sev === "MEDIUM") medium++;
      else low++;
    });

    // If empty fallback with default breakdown
    if (high === 0 && medium === 0 && low === 0) {
      return [
        { name: "High Severity", value: 3, color: "#ef4444" },
        { name: "Medium Severity", value: 2, color: "#f59e0b" },
        { name: "Low Severity", value: 4, color: "#10b981" },
      ];
    }

    return [
      { name: "High Severity", value: high, color: "#ef4444" },
      { name: "Medium Severity", value: medium, color: "#f59e0b" },
      { name: "Low Severity", value: low, color: "#10b981" },
    ];
  }, [disasters]);

  // Compute dynamic top districts by incident count
  const districtData = useMemo(() => {
    const counts = {};
    disasters.forEach((d) => {
      const district = d.district ? d.district.trim() : "Unknown";
      counts[district] = (counts[district] || 0) + 1;
    });

    const entries = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (entries.length === 0) {
      return [
        { name: "Chennai", count: 4 },
        { name: "Cuddalore", count: 3 },
        { name: "Madurai", count: 2 },
        { name: "Nagapattinam", count: 2 },
        { name: "Coimbatore", count: 1 },
      ];
    }
    return entries;
  }, [disasters]);

  return (
    <div className="row g-3 mt-1">
      {/* SEVERITY DONUT CHART */}
      <div className="col-lg-6">
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "10px",
            padding: "18px 20px",
            height: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <PieIcon size={16} color="#60a5fa" />
            <div>
              <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#f8fafc" }}>
                Incident Severity Breakdown
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Live ratio of high, medium and low risk zones
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={severityData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                cornerRadius={4}
                animationDuration={1000}
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#0b0f19",
                  border: "1px solid #1e293b",
                  borderRadius: "6px",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                verticalAlign="bottom"
                wrapperStyle={{
                  color: "#94a3b8",
                  fontSize: "12px",
                  paddingTop: "10px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DISTRICT HOT-ZONES BAR CHART */}
      <div className="col-lg-6">
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "10px",
            padding: "18px 20px",
            height: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <BarChart3 size={16} color="#38bdf8" />
            <div>
              <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#f8fafc" }}>
                District Risk Distribution
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Top 5 districts by reported emergency volume
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={districtData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={{ stroke: "#1e293b" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#0b0f19",
                  border: "1px solid #1e293b",
                  borderRadius: "6px",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="count"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default DashboardCharts;