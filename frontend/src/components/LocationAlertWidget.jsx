import { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Crosshair,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  RefreshCw,
  Search,
  Check,
  X,
  Compass,
  Radio,
  Globe,
  Satellite,
  HelpCircle,
  LocateFixed,
} from "lucide-react";
import {
  getLocationPreferences,
  updateLocationPreferences,
  getNearbyIncidents,
  syncNotifications,
} from "../services/notificationService";

function LocationAlertWidget({ onFocusIncident, onLocationChange }) {
  const [prefs, setPrefs] = useState({
    locationName: "",
    latitude: null,
    longitude: null,
    radiusKm: 50,
    configured: false,
  });

  const [nearbyIncidents, setNearbyIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState("GPS"); // "GPS" | "MANUAL"
  const [manualMode, setManualMode] = useState("PLACE"); // "PLACE" | "COORDS"

  // Form Fields inside Modal
  const [manualPlace, setManualPlace] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [modalRadius, setModalRadius] = useState(50);

  // GPS Detection State
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [gpsSuccess, setGpsSuccess] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences and nearby incidents from database
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const prefData = await getLocationPreferences();
      setPrefs(prefData);
      setManualPlace(prefData.locationName && !prefData.locationName.toLowerCase().includes("gps") ? prefData.locationName : "");
      if (prefData.latitude != null) setManualLat(String(prefData.latitude));
      if (prefData.longitude != null) setManualLon(String(prefData.longitude));
      setModalRadius(prefData.radiusKm || 50);

      if (prefData.configured) {
        const incidents = await getNearbyIncidents(prefData.radiusKm);
        setNearbyIncidents(Array.isArray(incidents) ? incidents : []);
        if (onLocationChange) {
          onLocationChange(prefData);
        }
      } else {
        setNearbyIncidents([]);
      }
    } catch (err) {
      console.error("Failed to load location preferences:", err);
    } finally {
      setLoading(false);
    }
  }, [onLocationChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open the configuration modal and initialize state
  const handleOpenModal = () => {
    setModalError(null);
    setGpsError(null);
    setGpsSuccess(null);
    setModalRadius(prefs.radiusKm || 50);

    const isCurrentGps = Boolean(prefs.locationName && prefs.locationName.toLowerCase().includes("gps"));
    if (isCurrentGps) {
      setModalTab("GPS");
      if (prefs.latitude != null && prefs.longitude != null) {
        setGpsCoords({ latitude: prefs.latitude, longitude: prefs.longitude });
        setGpsSuccess(`Saved GPS Coordinates: ${prefs.latitude.toFixed(4)}°, ${prefs.longitude.toFixed(4)}°`);
      }
    } else {
      setModalTab("MANUAL");
      setManualPlace(prefs.locationName || "");
      if (prefs.latitude != null) setManualLat(String(prefs.latitude));
      if (prefs.longitude != null) setManualLon(String(prefs.longitude));
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalError(null);
    setGpsLoading(false);
  };

  // Request browser GPS (one-time manual retrieval with explicit user click)
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("Browser geolocation is not supported on this device. Please use manual location entry.");
      setGpsSuccess(null);
      return;
    }

    setGpsLoading(true);
    setGpsError(null);
    setGpsSuccess(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lon = parseFloat(pos.coords.longitude.toFixed(4));

        // Validate geographical bounds: -90 <= lat <= 90 and -180 <= lon <= 180
        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          setGpsCoords(null);
          setGpsError("Retrieved GPS coordinates are outside valid geographical bounds (-90 to 90 lat, -180 to 180 lon).");
          return;
        }

        const accuracy = pos.coords.accuracy ? ` (accuracy ~${Math.round(pos.coords.accuracy)}m)` : "";
        setGpsCoords({ latitude: lat, longitude: lon });
        setGpsSuccess(`Fresh GPS coordinates verified: ${lat}°, ${lon}°${accuracy}`);
      },
      (err) => {
        setGpsLoading(false);
        setGpsCoords(null);
        let msg = "GPS location access denied or unavailable.";
        if (err.code === 1) {
          msg = "GPS permission was denied by browser. Please enable location access or use manual location entry.";
        } else if (err.code === 2) {
          msg = "Position unavailable. Device was unable to determine a GPS fix. Please enter your location manually.";
        } else if (err.code === 3) {
          msg = "GPS request timed out. Please retry or enter your location manually.";
        }
        setGpsError(msg);
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  // Save location preferences (both GPS and Manual)
  const handleSaveLocation = async (e) => {
    if (e) e.preventDefault();
    setModalError(null);

    // Validate radius: supported range 25-200 km
    const rad = Number(modalRadius);
    if (isNaN(rad) || rad < 25 || rad > 200) {
      setModalError("Alert radius must be between 25 km and 200 km.");
      return;
    }

    let payload = { radiusKm: rad };

    if (modalTab === "GPS") {
      if (!gpsCoords || gpsCoords.latitude == null || gpsCoords.longitude == null) {
        setModalError("Please click 'Detect Current GPS' to obtain fresh coordinates before saving.");
        return;
      }
      payload.latitude = gpsCoords.latitude;
      payload.longitude = gpsCoords.longitude;
      payload.locationName = "Current GPS Location";
    } else {
      // Manual tab
      if (manualMode === "PLACE") {
        const place = manualPlace.trim();
        if (!place) {
          setModalError("Please enter a city, town, or district name.");
          return;
        }
        payload.locationName = place;
      } else {
        // Manual coordinates
        const lat = parseFloat(manualLat);
        const lon = parseFloat(manualLon);

        if (isNaN(lat) || isNaN(lon)) {
          setModalError("Please enter valid numerical latitude and longitude.");
          return;
        }
        if (lat < -90 || lat > 90) {
          setModalError("Latitude must be between -90.0 and +90.0.");
          return;
        }
        if (lon < -180 || lon > 180) {
          setModalError("Longitude must be between -180.0 and +180.0.");
          return;
        }

        payload.latitude = lat;
        payload.longitude = lon;
        payload.locationName = `Manual (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`;
      }
    }

    try {
      setIsSaving(true);
      const updated = await updateLocationPreferences(payload);

      setPrefs(updated);
      setShowModal(false);
      setStatusMessage({
        type: "success",
        text: `Alert zone saved: ${updated.locationName} (${updated.radiusKm} km radius).`,
      });

      // Refresh nearby incidents in the updated zone
      const incidents = await getNearbyIncidents(updated.radiusKm);
      setNearbyIncidents(Array.isArray(incidents) ? incidents : []);

      // Synchronize in-app notifications
      await syncNotifications().catch(() => {});

      if (onLocationChange) {
        onLocationChange(updated);
      }

      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      console.error("Error saving location preferences:", err);
      const detail = err.response?.data?.detail || "Could not resolve or save location. Please verify details.";
      setModalError(detail);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to determine if saved location is GPS-derived
  const isGpsDerived = Boolean(
    prefs.configured &&
    prefs.locationName &&
    prefs.locationName.toLowerCase().includes("gps")
  );

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0b1329 0%, #0f172a 100%)",
        border: "1px solid #1e293b",
        borderRadius: "14px",
        padding: "18px 20px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
        marginBottom: "20px",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          borderBottom: "1px solid #1e293b",
          paddingBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: isGpsDerived ? "rgba(56, 189, 248, 0.15)" : "rgba(168, 85, 247, 0.15)",
              border: `1px solid ${isGpsDerived ? "rgba(56, 189, 248, 0.35)" : "rgba(168, 85, 247, 0.35)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isGpsDerived ? "#38bdf8" : "#c084fc",
            }}
          >
            {isGpsDerived ? <Satellite size={22} /> : <MapPin size={22} />}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc", margin: 0 }}>
                Personal Alert Zone
              </h3>

              {prefs.configured ? (
                <>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#34d399",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      padding: "2px 8px",
                      borderRadius: "100px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Check size={11} /> ACTIVE
                  </span>

                  {/* Clear distinction: GPS vs Manual */}
                  {isGpsDerived ? (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        background: "rgba(56, 189, 248, 0.15)",
                        color: "#38bdf8",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        padding: "2px 8px",
                        borderRadius: "100px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Crosshair size={10} /> GPS-DERIVED
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        background: "rgba(168, 85, 247, 0.15)",
                        color: "#c084fc",
                        border: "1px solid rgba(168, 85, 247, 0.3)",
                        padding: "2px 8px",
                        borderRadius: "100px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <MapPin size={10} /> MANUAL ENTRY
                    </span>
                  )}
                </>
              ) : (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "#fbbf24",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    padding: "2px 8px",
                    borderRadius: "100px",
                  }}
                >
                  NOT CONFIGURED
                </span>
              )}
            </div>

            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "2px 0 0" }}>
              Proximity-filtered disaster alerts &amp; intelligent recommendations tailored to your coordinates
            </p>
          </div>
        </div>

        {/* Location Info & Working Change Location Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {prefs.configured && (
            <div
              style={{
                fontSize: "13px",
                color: "#cbd5e1",
                background: "#1e293b",
                padding: "6px 14px",
                borderRadius: "8px",
                border: "1px solid #334155",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontWeight: "600", color: "#f8fafc" }}>
                {prefs.locationName}
              </span>
              {prefs.latitude != null && prefs.longitude != null && (
                <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                  ({prefs.latitude.toFixed(4)}°, {prefs.longitude.toFixed(4)}°)
                </span>
              )}
              <span style={{ color: "#64748b" }}>•</span>
              <span style={{ color: "#38bdf8", fontWeight: "700" }}>
                {prefs.radiusKm} km radius
              </span>
            </div>
          )}

          <button
            id="change-location-btn"
            onClick={handleOpenModal}
            style={{
              background: "rgba(56, 189, 248, 0.15)",
              color: "#38bdf8",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              transition: "all 0.15s ease",
            }}
          >
            <Sliders size={14} />
            {prefs.configured ? "Change Location" : "Set Alert Location"}
          </button>
        </div>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          style={{
            marginTop: "12px",
            padding: "8px 14px",
            borderRadius: "8px",
            fontSize: "12.5px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background:
              statusMessage.type === "error"
                ? "rgba(239, 68, 68, 0.15)"
                : "rgba(16, 185, 129, 0.15)",
            border: `1px solid ${
              statusMessage.type === "error"
                ? "rgba(239, 68, 68, 0.35)"
                : "rgba(16, 185, 129, 0.35)"
            }`,
            color: statusMessage.type === "error" ? "#fca5a5" : "#6ee7b7",
          }}
        >
          {statusMessage.type === "error" ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* =======================================================
          WORKING CHANGE LOCATION MODAL (High z-index Dialog)
          ======================================================= */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(10, 15, 30, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "16px",
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "14px",
              maxWidth: "540px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                background: "#1e293b",
                borderBottom: "1px solid #334155",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Sliders size={18} color="#38bdf8" />
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
                  Configure Personal Alert Location
                </h4>
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs: [Use Current GPS] vs [Enter Location Manually] */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                background: "#090d1a",
                borderBottom: "1px solid #1e293b",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setModalTab("GPS");
                  setModalError(null);
                }}
                style={{
                  padding: "12px",
                  background: modalTab === "GPS" ? "rgba(56, 189, 248, 0.12)" : "transparent",
                  border: "none",
                  borderBottom: modalTab === "GPS" ? "2px solid #38bdf8" : "2px solid transparent",
                  color: modalTab === "GPS" ? "#38bdf8" : "#94a3b8",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.15s ease",
                }}
              >
                <Crosshair size={15} />
                Use Current GPS
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalTab("MANUAL");
                  setModalError(null);
                }}
                style={{
                  padding: "12px",
                  background: modalTab === "MANUAL" ? "rgba(168, 85, 247, 0.12)" : "transparent",
                  border: "none",
                  borderBottom: modalTab === "MANUAL" ? "2px solid #c084fc" : "2px solid transparent",
                  color: modalTab === "MANUAL" ? "#c084fc" : "#94a3b8",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.15s ease",
                }}
              >
                <MapPin size={15} />
                Enter Location Manually
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveLocation} style={{ padding: "20px" }}>
              {/* TAB 1: USE CURRENT GPS */}
              {modalTab === "GPS" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div
                    style={{
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid #1e293b",
                      borderRadius: "10px",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#cbd5e1" }}>
                      Click below to request your browser's current GPS coordinates.
                    </p>

                    <button
                      type="button"
                      onClick={handleDetectGPS}
                      disabled={gpsLoading}
                      style={{
                        background: "rgba(56, 189, 248, 0.2)",
                        color: "#38bdf8",
                        border: "1px solid rgba(56, 189, 248, 0.4)",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: "700",
                        cursor: gpsLoading ? "wait" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <LocateFixed size={16} />
                      {gpsLoading ? "Detecting GPS Position..." : "Detect Current GPS"}
                    </button>

                    <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "10px" }}>
                      🔒 One-time retrieval upon explicit click. No continuous background tracking.
                    </div>
                  </div>

                  {/* GPS Success Notice */}
                  {gpsSuccess && (
                    <div
                      style={{
                        background: "rgba(16, 185, 129, 0.12)",
                        border: "1px solid rgba(16, 185, 129, 0.35)",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        fontSize: "12.5px",
                        color: "#34d399",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>{gpsSuccess}</span>
                    </div>
                  )}

                  {/* GPS Error Notice */}
                  {gpsError && (
                    <div
                      style={{
                        background: "rgba(239, 68, 68, 0.12)",
                        border: "1px solid rgba(239, 68, 68, 0.35)",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        fontSize: "12px",
                        color: "#f87171",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <AlertTriangle size={16} />
                      <span>{gpsError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ENTER LOCATION MANUALLY */}
              {modalTab === "MANUAL" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {/* Sub-mode selector */}
                  <div style={{ display: "flex", gap: "16px", marginBottom: "4px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#e2e8f0", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="manualMode"
                        checked={manualMode === "PLACE"}
                        onChange={() => setManualMode("PLACE")}
                      />
                      <span>City / District Name</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#e2e8f0", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="manualMode"
                        checked={manualMode === "COORDS"}
                        onChange={() => setManualMode("COORDS")}
                      />
                      <span>Coordinates (Lat &amp; Lon)</span>
                    </label>
                  </div>

                  {manualMode === "PLACE" ? (
                    <div>
                      <label
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#94a3b8",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          display: "block",
                          marginBottom: "6px",
                        }}
                      >
                        City, District, or Town
                      </label>
                      <div style={{ position: "relative" }}>
                        <Search
                          size={15}
                          color="#64748b"
                          style={{ position: "absolute", left: "12px", top: "11px" }}
                        />
                        <input
                          type="text"
                          placeholder="e.g. Kochi, Shimla, Chennai, Mumbai, Kullu, Dehradun..."
                          value={manualPlace}
                          onChange={(e) => setManualPlace(e.target.value)}
                          style={{
                            width: "100%",
                            background: "#090d1a",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            padding: "9px 12px 9px 36px",
                            color: "#f8fafc",
                            fontSize: "13px",
                            outline: "none",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "11px", color: "#64748b", display: "block", marginTop: "4px" }}>
                        Resolved automatically via our verified GIS registry &amp; Open-Meteo geocoding.
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <label
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#94a3b8",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            display: "block",
                            marginBottom: "6px",
                          }}
                        >
                          Latitude (-90 to +90)
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 9.9312"
                          value={manualLat}
                          onChange={(e) => setManualLat(e.target.value)}
                          style={{
                            width: "100%",
                            background: "#090d1a",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            padding: "9px 12px",
                            color: "#f8fafc",
                            fontSize: "13px",
                            outline: "none",
                          }}
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#94a3b8",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            display: "block",
                            marginBottom: "6px",
                          }}
                        >
                          Longitude (-180 to +180)
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 76.2673"
                          value={manualLon}
                          onChange={(e) => setManualLon(e.target.value)}
                          style={{
                            width: "100%",
                            background: "#090d1a",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            padding: "9px 12px",
                            color: "#f8fafc",
                            fontSize: "13px",
                            outline: "none",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SHARED: ALERT RADIUS CONTROL (25 to 200 km) */}
              <div style={{ marginTop: "18px", borderTop: "1px solid #1e293b", paddingTop: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#94a3b8",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      margin: 0,
                    }}
                  >
                    Alert Radius (Supported Range: 25 – 200 km)
                  </label>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#38bdf8" }}>
                    {modalRadius} km
                  </span>
                </div>

                {/* Preset Radius Buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginBottom: "12px" }}>
                  {[25, 50, 100, 200].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setModalRadius(r)}
                      style={{
                        padding: "6px 8px",
                        borderRadius: "6px",
                        fontSize: "11.5px",
                        fontWeight: modalRadius === r ? "700" : "500",
                        background: modalRadius === r ? "rgba(56, 189, 248, 0.2)" : "#1e293b",
                        color: modalRadius === r ? "#38bdf8" : "#cbd5e1",
                        border: `1px solid ${modalRadius === r ? "#38bdf8" : "#334155"}`,
                        cursor: "pointer",
                      }}
                    >
                      {r} km {r === 25 ? "(District)" : r === 50 ? "(Standard)" : r === 100 ? "(Regional)" : "(Wide)"}
                    </button>
                  ))}
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min={25}
                  max={200}
                  step={5}
                  value={modalRadius}
                  onChange={(e) => setModalRadius(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
                />
              </div>

              {/* Error in Modal */}
              {modalError && (
                <div
                  style={{
                    marginTop: "14px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    color: "#fca5a5",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertTriangle size={15} />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Action Buttons: Save & Cancel */}
              <div
                style={{
                  marginTop: "20px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  borderTop: "1px solid #1e293b",
                  paddingTop: "16px",
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    color: "#94a3b8",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    background: "#2563eb",
                    border: "none",
                    color: "#ffffff",
                    padding: "8px 20px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: isSaving ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {isSaving ? "Saving..." : "Save Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================
          NEARBY INCIDENTS FEED
          ======================================================= */}
      <div style={{ marginTop: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", letterSpacing: "0.03em" }}>
            NEARBY INCIDENTS IN YOUR ALERT ZONE ({nearbyIncidents.length})
          </div>
          {prefs.configured && (
            <button
              onClick={loadData}
              disabled={loading}
              style={{
                background: "none",
                border: "none",
                color: "#60a5fa",
                fontSize: "11px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <RefreshCw size={11} style={{ animation: loading ? "mapSpin 0.8s linear infinite" : "none" }} />
              Refresh
            </button>
          )}
        </div>

        {!prefs.configured ? (
          <div
            style={{
              padding: "18px",
              background: "rgba(15, 23, 42, 0.6)",
              borderRadius: "10px",
              border: "1px dashed #334155",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "13px",
            }}
          >
            <p style={{ margin: 0, color: "#cbd5e1", fontWeight: "600" }}>
              Location alerts are not currently active.
            </p>
            <p style={{ margin: "4px 0 12px", fontSize: "12px", color: "#64748b" }}>
              Set your city or detect GPS above to receive automatic distance calculation and notifications for emergencies near you.
            </p>
            <button
              onClick={handleOpenModal}
              style={{
                background: "#2563eb",
                border: "none",
                color: "#fff",
                padding: "7px 16px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Set Alert Location Now
            </button>
          </div>
        ) : nearbyIncidents.length === 0 ? (
          <div
            style={{
              padding: "16px 18px",
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <CheckCircle2 size={20} color="#10b981" />
            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#34d399" }}>
                Clear Zone — No Active Emergencies in Range
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                No active disaster incidents recorded within {prefs.radiusKm} km of{" "}
                <span style={{ color: "#e2e8f0", fontWeight: "600" }}>{prefs.locationName}</span>.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
            {nearbyIncidents.map((inc) => {
              const isHigh = inc.severity === "HIGH";
              const isGdacs = inc.source === "GDACS";

              return (
                <div
                  key={inc.id}
                  style={{
                    background: isHigh ? "rgba(239, 68, 68, 0.07)" : "#0f172a",
                    border: isHigh ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid #1e293b",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "8px",
                    transition: "border-color 0.2s",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "700",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: isHigh ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
                          color: isHigh ? "#f87171" : "#fbbf24",
                          border: `1px solid ${isHigh ? "rgba(239, 68, 68, 0.4)" : "rgba(245, 158, 11, 0.4)"}`,
                        }}
                      >
                        {inc.severity} SEVERITY
                      </span>

                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#38bdf8",
                          background: "rgba(56, 189, 248, 0.12)",
                          border: "1px solid rgba(56, 189, 248, 0.3)",
                          padding: "2px 7px",
                          borderRadius: "4px",
                        }}
                      >
                        {inc.distanceKm} km away
                      </span>
                    </div>

                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#f8fafc", marginTop: "6px" }}>
                      {inc.disasterName}
                    </div>

                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px", display: "flex", gap: "6px", alignItems: "center" }}>
                      <span>{inc.disasterType} • {inc.district}</span>
                      {isGdacs ? (
                        <span style={{ fontSize: "9px", padding: "1px 4px", borderRadius: "3px", background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", fontWeight: "700" }}>
                          GDACS
                        </span>
                      ) : (
                        <span style={{ fontSize: "9px", padding: "1px 4px", borderRadius: "3px", background: "rgba(100, 116, 139, 0.2)", color: "#94a3b8", fontWeight: "600" }}>
                          MANUAL
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px", borderTop: "1px solid #1e293b", paddingTop: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      Status: {inc.status}
                    </span>

                    {onFocusIncident && (
                      <button
                        onClick={() => onFocusIncident(inc.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#60a5fa",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                          padding: 0,
                        }}
                      >
                        <Navigation size={11} /> Locate on Map
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default LocationAlertWidget;
