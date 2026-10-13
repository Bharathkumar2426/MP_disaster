import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  LocateFixed,
  Route,
  Navigation,
  Send,
  Loader2,
  Trash2,
  ShieldAlert,
  Info,
  Building2,
  Sparkles,
  ExternalLink,
  PlusCircle,
  X,
  Compass,
  Search,
} from "lucide-react";

import {
  createCommunityReport,
  getCommunityReports,
  updateCommunityReportStatus,
  deleteCommunityReport,
} from "../services/communityReportService";
import { calculateSafeRoute, geocodePlaceName } from "../services/routeService";
import { getLocationPreferences } from "../services/notificationService";
import { getTrainingCenters } from "../services/trainingCenterService";
import { getDisasters } from "../services/disasterService";

// Helper: Haversine distance in kilometers
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const l1 = parseFloat(lat1);
  const ln1 = parseFloat(lon1);
  const l2 = parseFloat(lat2);
  const ln2 = parseFloat(lon2);
  if (isNaN(l1) || isNaN(ln1) || isNaN(l2) || isNaN(ln2)) return null;
  const R = 6371.0;
  const dLat = (l2 - l1) * (Math.PI / 180.0);
  const dLon = (ln2 - ln1) * (Math.PI / 180.0);
  const a =
    Math.sin(dLat / 2.0) ** 2 +
    Math.cos(l1 * (Math.PI / 180.0)) *
      Math.cos(l2 * (Math.PI / 180.0)) *
      Math.sin(dLon / 2.0) ** 2;
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0.0, 1.0 - a)));
  return Math.round(R * c * 10) / 10;
}

// Controller component to fit bounds of calculated route
function RouteBoundsFitter({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points && Array.isArray(points) && points.length > 1) {
      try {
        const bounds = L.latLngBounds(points);
        if (bounds && typeof bounds.isValid === "function" && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }
      } catch (e) {
        // ignore
      }
    }
  }, [map, points]);
  return null;
}

// Controller component for destination selection modal map
function ModalMapController({ center, zoom, selectedCoords }) {
  const map = useMap();

  useEffect(() => {
    // Invalidate map size so Leaflet recalculates dimensions when modal opens
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {
        // ignore
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (
      selectedCoords &&
      selectedCoords[0] != null &&
      selectedCoords[1] != null &&
      !isNaN(Number(selectedCoords[0])) &&
      !isNaN(Number(selectedCoords[1]))
    ) {
      try {
        map.flyTo([Number(selectedCoords[0]), Number(selectedCoords[1])], 13, { duration: 0.6 });
      } catch (e) {
        // ignore
      }
    } else if (
      center &&
      center[0] != null &&
      center[1] != null &&
      !isNaN(Number(center[0])) &&
      !isNaN(Number(center[1]))
    ) {
      try {
        map.setView([Number(center[0]), Number(center[1])], zoom || 10);
      } catch (e) {
        // ignore
      }
    }
  }, [map, center, zoom, selectedCoords]);
  return null;
}

// Severity Badge Styling
const getSeverityStyle = (sev) => {
  switch ((sev || "").toUpperCase()) {
    case "CRITICAL":
      return { bg: "rgba(239,68,68,0.2)", color: "#f87171", border: "rgba(239,68,68,0.4)" };
    case "HIGH":
      return { bg: "rgba(239,68,68,0.15)", color: "#f87171", border: "rgba(239,68,68,0.3)" };
    case "MEDIUM":
      return { bg: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "rgba(245,158,11,0.3)" };
    default:
      return { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.3)" };
  }
};

// Status Badge Styling
const getStatusStyle = (status) => {
  switch ((status || "").toUpperCase()) {
    case "VERIFIED":
      return { bg: "rgba(16,185,129,0.18)", color: "#34d399", border: "rgba(16,185,129,0.4)", label: "VERIFIED ✓" };
    case "REJECTED":
      return { bg: "rgba(239,68,68,0.18)", color: "#f87171", border: "rgba(239,68,68,0.4)", label: "REJECTED ✗" };
    default:
      return { bg: "rgba(245,158,11,0.18)", color: "#fbbf24", border: "rgba(245,158,11,0.4)", label: "PENDING REVIEW ⏳" };
  }
};

function CommunityRoutes() {
  const [activeTab, setActiveTab] = useState("REPORTS"); // "REPORTS" | "ROUTING"

  // User Profile & Role
  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem("user") || "null");
  } catch (e) {
    currentUser = null;
  }
  const isResponderOrAdmin = ["ADMIN", "TRAINER"].includes((currentUser?.role || "").toUpperCase());

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 1: COMMUNITY DISASTER REPORTS STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [reportsData, setReportsData] = useState({
    totalCount: 0,
    pendingCount: 0,
    verifiedCount: 0,
    rejectedCount: 0,
    reports: [],
  });
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL"); // ALL, PENDING, VERIFIED, REJECTED, MY_REPORTS
  const [actionSuccess, setActionSuccess] = useState(null);

  // New Report Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDisasterType, setCreateDisasterType] = useState("Flash Flood");
  const [createLocationName, setCreateLocationName] = useState("");
  const [createDistrict, setCreateDistrict] = useState("");
  const [createLat, setCreateLat] = useState("");
  const [createLon, setCreateLon] = useState("");
  const [createSeverity, setCreateSeverity] = useState("MEDIUM");
  const [createDescription, setCreateDescription] = useState("");
  const [createImageUrl, setCreateImageUrl] = useState("");
  const [createGpsLoading, setCreateGpsLoading] = useState(false);
  const [createModalError, setCreateModalError] = useState(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Verification Notes Prompt Modal
  const [verifyModalTarget, setVerifyModalTarget] = useState(null); // { report, targetStatus }
  const [verificationNotesInput, setVerificationNotesInput] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Load Reports
  const loadReportsList = async (statusKey = filterStatus) => {
    try {
      setLoadingReports(true);
      setReportsError(null);
      const params = {};
      if (statusKey === "MY_REPORTS") {
        params.my_reports_only = true;
      } else if (statusKey !== "ALL") {
        params.status = statusKey;
      }
      const data = await getCommunityReports(params);
      setReportsData(data);
    } catch (err) {
      console.error("Failed to load community reports:", err);
      setReportsError(err.response?.data?.detail || "Could not retrieve community incident reports.");
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    loadReportsList(filterStatus);
  }, [filterStatus]);

  // GPS Detection for Report Creation
  const handleDetectGPSForReport = () => {
    if (!navigator.geolocation) {
      setCreateModalError("Geolocation is not supported on this browser.");
      return;
    }
    setCreateGpsLoading(true);
    setCreateModalError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCreateGpsLoading(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lon = parseFloat(pos.coords.longitude.toFixed(4));
        setCreateLat(String(lat));
        setCreateLon(String(lon));
        if (!createLocationName) {
          setCreateLocationName("GPS Field Observation");
        }
      },
      (err) => {
        setCreateGpsLoading(false);
        let msg = "Could not obtain GPS location.";
        if (err.code === 1) msg = "Location permission denied. Please enter coordinates manually.";
        else if (err.code === 2) msg = "Device location unavailable. Please enter coordinates manually.";
        else if (err.code === 3) msg = "GPS request timed out. Please enter coordinates manually.";
        setCreateModalError(msg);
      },
      { timeout: 6000, enableHighAccuracy: false, maximumAge: 300000 }
    );
  };

  // Submit Community Report
  const handleSubmitNewReport = async (e) => {
    if (e) e.preventDefault();
    setCreateModalError(null);

    const lat = parseFloat(createLat);
    const lon = parseFloat(createLon);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setCreateModalError("Please provide valid coordinates (-90 to 90 lat, -180 to 180 lon) or click Detect GPS.");
      return;
    }
    if (!createLocationName.trim()) {
      setCreateModalError("Location name is required.");
      return;
    }
    if (!createDescription.trim()) {
      setCreateModalError("Please provide a description of the observed hazard.");
      return;
    }

    try {
      setIsSubmittingReport(true);
      await createCommunityReport({
        disasterType: createDisasterType,
        locationName: createLocationName.trim(),
        district: createDistrict.trim() || createLocationName.trim(),
        latitude: lat,
        longitude: lon,
        severity: createSeverity,
        description: createDescription.trim(),
        imageUrl: createImageUrl.trim() || null,
      });

      setShowCreateModal(false);
      // Reset form
      setCreateDescription("");
      setCreateImageUrl("");
      setActionSuccess("Your incident report has been submitted for responder verification.");
      setTimeout(() => setActionSuccess(null), 6000);
      loadReportsList(filterStatus);
    } catch (err) {
      console.error("Failed to submit community report:", err);
      setCreateModalError(err.response?.data?.detail || "Could not submit report. Please check required fields.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Execute Status Update (Verify / Reject)
  const handleConfirmStatusUpdate = async () => {
    if (!verifyModalTarget) return;
    try {
      setIsUpdatingStatus(true);
      await updateCommunityReportStatus(verifyModalTarget.report.id, {
        status: verifyModalTarget.targetStatus,
        verificationNotes: verificationNotesInput.trim() || null,
      });
      setVerifyModalTarget(null);
      setVerificationNotesInput("");
      setActionSuccess(`Report #${verifyModalTarget.report.id} successfully marked as ${verifyModalTarget.targetStatus}.`);
      setTimeout(() => setActionSuccess(null), 5000);
      loadReportsList(filterStatus);
    } catch (err) {
      console.error("Failed to update report status:", err);
      alert(err.response?.data?.detail || "Failed to update verification status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete Report
  const handleDeleteReport = async (reportId) => {
    if (!window.confirm(`Are you sure you want to delete incident report #${reportId}?`)) return;
    try {
      await deleteCommunityReport(reportId);
      setActionSuccess(`Report #${reportId} deleted.`);
      setTimeout(() => setActionSuccess(null), 4000);
      loadReportsList(filterStatus);
    } catch (err) {
      console.error("Failed to delete report:", err);
      alert(err.response?.data?.detail || "Could not delete report.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 2: SAFE-ROUTE GUIDANCE STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [originName, setOriginName] = useState("Origin");
  const [originLat, setOriginLat] = useState("");
  const [originLon, setOriginLon] = useState("");

  const [destName, setDestName] = useState("Destination");
  const [destLat, setDestLat] = useState("");
  const [destLon, setDestLon] = useState("");

  const [corridorBufferKm, setCorridorBufferKm] = useState(20);
  const [trainingCentersList, setTrainingCentersList] = useState([]);
  const [activeHazardsList, setActiveHazardsList] = useState([]);

  const [routeResult, setRouteResult] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState(null);

  // Geocoding states
  const [isGeocodingOrigin, setIsGeocodingOrigin] = useState(false);
  const [isGeocodingDest, setIsGeocodingDest] = useState(false);

  // Destination Selection Modal State
  const [showDestPickerModal, setShowDestPickerModal] = useState(false);
  const [destPickerCenter, setDestPickerCenter] = useState([10.8505, 76.2711]);
  const [destPickerZoom, setDestPickerZoom] = useState(10);
  const [destPickerSearch, setDestPickerSearch] = useState("");
  const [destPickerRadius, setDestPickerRadius] = useState(0); // 0 = All
  const [destPickerGpsLoading, setDestPickerGpsLoading] = useState(false);
  const [destPickerError, setDestPickerError] = useState(null);
  const [selectedCenterForModal, setSelectedCenterForModal] = useState(null);

  // Prefill Origin from Saved Alert Zone, load Relief Centers & Active Hazards
  useEffect(() => {
    async function initRoutingDefaults() {
      try {
        const pref = await getLocationPreferences();
        if (pref && pref.latitude != null && pref.longitude != null) {
          setOriginLat(String(pref.latitude));
          setOriginLon(String(pref.longitude));
          setOriginName(pref.locationName || "Saved Alert Zone");
        }
      } catch (e) {
        // ignore
      }

      try {
        const centersRes = await getTrainingCenters();
        if (centersRes?.data && Array.isArray(centersRes.data)) {
          setTrainingCentersList(centersRes.data);
          // Set first active center as default destination if available
          const activeCenter = centersRes.data.find((c) => c.latitude && c.longitude);
          if (activeCenter) {
            setDestName(`Relief: ${activeCenter.centerName}`);
            setDestLat(String(activeCenter.latitude));
            setDestLon(String(activeCenter.longitude));
          }
        }
      } catch (e) {
        // ignore
      }

      try {
        const disRes = await getDisasters();
        if (disRes?.data && Array.isArray(disRes.data)) {
          setActiveHazardsList(
            disRes.data.filter(
              (d) => (d.status || "").toUpperCase() !== "RESOLVED" && d.latitude != null && d.longitude != null
            )
          );
        }
      } catch (e) {
        // ignore
      }
    }
    initRoutingDefaults();
  }, []);

  const handleUseMySavedLocationForOrigin = async () => {
    try {
      const pref = await getLocationPreferences();
      if (pref && pref.latitude != null && pref.longitude != null) {
        setOriginLat(String(pref.latitude));
        setOriginLon(String(pref.longitude));
        setOriginName(pref.locationName || "Saved Alert Zone");
        setRouteError(null);
      } else {
        alert("No saved alert zone found. Please set your alert location on the Dashboard or Safety page.");
      }
    } catch (e) {
      alert("Could not load saved alert zone.");
    }
  };

  const handleDetectGPSForOrigin = () => {
    if (!navigator.geolocation) {
      alert("Browser geolocation not supported.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lon = parseFloat(pos.coords.longitude.toFixed(4));
        setOriginLat(String(lat));
        setOriginLon(String(lon));
        setOriginName("Current Device GPS");
        setRouteError(null);
      },
      () => {
        alert("GPS location unavailable. Please enter coordinates manually.");
      },
      { timeout: 6000, enableHighAccuracy: false, maximumAge: 300000 }
    );
  };

  const handleResolveOrigin = async () => {
    const q = (originName || "").trim();
    if (!q || q.toLowerCase() === "origin") {
      setRouteError("Please enter a specific place or city name in Origin to resolve.");
      return;
    }
    try {
      setIsGeocodingOrigin(true);
      setRouteError(null);
      const res = await geocodePlaceName(q);
      setOriginLat(String(res.latitude));
      setOriginLon(String(res.longitude));
      setOriginName(res.displayName || q);
    } catch (err) {
      setRouteError(err.response?.data?.detail || `Could not resolve coordinates for '${q}'. Please enter latitude and longitude directly.`);
    } finally {
      setIsGeocodingOrigin(false);
    }
  };

  const handleResolveDestination = async () => {
    const q = (destName || "").trim();
    if (!q || q.toLowerCase() === "destination") {
      setRouteError("Please enter a specific place or city name in Destination to resolve.");
      return;
    }
    try {
      setIsGeocodingDest(true);
      setRouteError(null);
      const res = await geocodePlaceName(q);
      setDestLat(String(res.latitude));
      setDestLon(String(res.longitude));
      setDestName(res.displayName || q);
    } catch (err) {
      setRouteError(err.response?.data?.detail || `Could not resolve coordinates for '${q}'. Please enter latitude and longitude directly or choose on map.`);
    } finally {
      setIsGeocodingDest(false);
    }
  };

  const handleSelectReliefCenter = (center) => {
    if (center.latitude != null && center.longitude != null) {
      setDestName(`Relief: ${center.centerName}`);
      setDestLat(String(center.latitude));
      setDestLon(String(center.longitude));
      setRouteError(null);
    }
  };

  const handleOpenDestPicker = () => {
    let initCenter = [10.8505, 76.2711];
    const oLat = parseFloat(originLat);
    const oLon = parseFloat(originLon);
    if (!isNaN(oLat) && !isNaN(oLon) && oLat >= -90 && oLat <= 90 && oLon >= -180 && oLon <= 180) {
      initCenter = [oLat, oLon];
    } else {
      const firstValid = trainingCentersList.find((c) => c.latitude != null && c.longitude != null);
      if (firstValid) {
        initCenter = [firstValid.latitude, firstValid.longitude];
      }
    }
    setDestPickerCenter(initCenter);
    setDestPickerZoom(10);
    setDestPickerSearch("");
    setDestPickerRadius(0);
    setDestPickerError(null);
    setSelectedCenterForModal(null);
    setShowDestPickerModal(true);
  };

  const handleModalUseCurrentGps = () => {
    if (!navigator.geolocation) {
      setDestPickerError("Browser geolocation is not supported on this device.");
      return;
    }
    setDestPickerGpsLoading(true);
    setDestPickerError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lon = parseFloat(pos.coords.longitude.toFixed(4));
        setDestPickerCenter([lat, lon]);
        setDestPickerZoom(12);
        // Synchronize origin coordinates as well so distances reflect live location
        setOriginLat(String(lat));
        setOriginLon(String(lon));
        setOriginName("Current Device GPS");
        setDestPickerGpsLoading(false);
      },
      (err) => {
        setDestPickerGpsLoading(false);
        if (err.code === 1) {
          setDestPickerError("Location permission denied. Please allow GPS access in your browser or pick a center directly on the map.");
        } else {
          setDestPickerError("GPS location request timed out or device coordinates are unavailable.");
        }
      },
      { timeout: 7000, enableHighAccuracy: false, maximumAge: 60000 }
    );
  };

  const handleConfirmCenterAsDestination = (center) => {
    if (center.latitude != null && center.longitude != null) {
      setDestName(center.centerName);
      setDestLat(String(center.latitude));
      setDestLon(String(center.longitude));
      setShowDestPickerModal(false);
      setRouteError(null);
    }
  };

  const handleCalculateRoute = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (isCalculatingRoute) return; // Prevent duplicate submissions while in progress

    setRouteError(null);
    setIsCalculatingRoute(true);

    try {
      let curOriginLat = (originLat || "").trim();
      let curOriginLon = (originLon || "").trim();
      let curOriginName = (originName || "Origin").trim();

      // Auto-resolve origin if coordinates are missing but place name is given
      if ((!curOriginLat || !curOriginLon) && curOriginName && curOriginName.toLowerCase() !== "origin") {
        try {
          const res = await geocodePlaceName(curOriginName);
          curOriginLat = String(res.latitude);
          curOriginLon = String(res.longitude);
          curOriginName = res.displayName || curOriginName;
          setOriginLat(curOriginLat);
          setOriginLon(curOriginLon);
          setOriginName(curOriginName);
        } catch (err) {
          setRouteError(err.response?.data?.detail || `Unable to resolve coordinates for origin '${curOriginName}'. Please enter coordinates manually or choose on map.`);
          return;
        }
      }

      let curDestLat = (destLat || "").trim();
      let curDestLon = (destLon || "").trim();
      let curDestName = (destName || "Destination").trim();

      // Auto-resolve destination if coordinates are missing but place name is given
      if ((!curDestLat || !curDestLon) && curDestName && curDestName.toLowerCase() !== "destination") {
        try {
          const res = await geocodePlaceName(curDestName);
          curDestLat = String(res.latitude);
          curDestLon = String(res.longitude);
          curDestName = res.displayName || curDestName;
          setDestLat(curDestLat);
          setDestLon(curDestLon);
          setDestName(curDestName);
        } catch (err) {
          setRouteError(err.response?.data?.detail || `Unable to resolve coordinates for destination '${curDestName}'. Please enter coordinates manually or choose on map.`);
          return;
        }
      }

      const oLat = parseFloat(curOriginLat);
      const oLon = parseFloat(curOriginLon);
      const dLat = parseFloat(curDestLat);
      const dLon = parseFloat(curDestLon);

      if (isNaN(oLat) || isNaN(oLon) || oLat < -90 || oLat > 90 || oLon < -180 || oLon > 180) {
        setRouteError("Please enter valid origin coordinates (-90 to 90 lat, -180 to 180 lon).");
        return;
      }
      if (isNaN(dLat) || isNaN(dLon) || dLat < -90 || dLat > 90 || dLon < -180 || dLon > 180) {
        setRouteError("Please enter valid destination coordinates (-90 to 90 lat, -180 to 180 lon).");
        return;
      }

      const res = await calculateSafeRoute({
        originLat: oLat,
        originLon: oLon,
        originName: curOriginName,
        destinationLat: dLat,
        destinationLon: dLon,
        destinationName: curDestName,
        corridorBufferKm: Number(corridorBufferKm) || 20,
      });

      setRouteResult(res);
    } catch (err) {
      console.error("Safe route calculation error:", err);
      let errorMsg = "Failed to calculate safe route guidance.";
      if (err.code === "ECONNABORTED" || (err.message && err.message.toLowerCase().includes("timeout"))) {
        errorMsg = "Route calculation request timed out (25s limit). The routing service took too long to respond. Please check your connection and retry.";
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else if (err.message) {
        errorMsg = err.message;
      }
      setRouteError(errorMsg);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Helper icons for route map
  const originPinIcon = L.divIcon({
    className: "",
    html: `
      <div style="width:24px;height:24px;border-radius:50%;background:#10b981;border:2.5px solid #ffffff;box-shadow:0 0 10px rgba(16,185,129,0.8);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:11px;font-weight:bold;">
        A
      </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const destPinIcon = L.divIcon({
    className: "",
    html: `
      <div style="width:24px;height:24px;border-radius:50%;background:#38bdf8;border:2.5px solid #ffffff;box-shadow:0 0 10px rgba(56,189,248,0.8);display:flex;align-items:center;justify-content:center;color:#090d16;font-size:11px;font-weight:bold;">
        B
      </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const hazardPinIcon = (h) => {
    const isCritical = h.proximityCategory === "CRITICAL_PROXIMITY";
    return L.divIcon({
      className: "",
      html: `
        <div style="width:22px;height:22px;border-radius:50%;background:${isCritical ? "#ef4444" : "#f59e0b"};border:2px solid #ffffff;box-shadow:0 0 8px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;font-size:11px;">
          ⚠
        </div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  };

  const modalCenterPinIcon = (isSelected) =>
    L.divIcon({
      className: "",
      html: `
        <div style="background:${isSelected ? "#0284c7" : "#059669"};border:2px solid #ffffff;border-radius:6px;padding:3px 8px;color:#ffffff;font-size:11px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;gap:4px;white-space:nowrap;cursor:pointer;">
          🏢 Relief
        </div>`,
      iconSize: [68, 24],
      iconAnchor: [34, 12],
    });

  const modalHazardPinIcon = (h) =>
    L.divIcon({
      className: "",
      html: `
        <div style="width:22px;height:22px;border-radius:50%;background:#ef4444;border:2px solid #ffffff;box-shadow:0 0 8px rgba(239,68,68,0.7);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:11px;font-weight:bold;">
          ⚠
        </div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", color: "#f8fafc" }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "rgba(168,85,247,0.18)",
              border: "1px solid rgba(168,85,247,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#c084fc",
            }}
          >
            <ShieldAlert size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#f8fafc" }}>
              Community Disaster Reporting &amp; Safe-Route Guidance
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "13.5px", color: "#94a3b8" }}>
              Citizen Incident Verification Network • Field Response Coordination • Evacuation Corridor Routing
            </p>
          </div>
        </div>
      </div>

      {/* ── Success Toast Alert ── */}
      {actionSuccess && (
        <div
          style={{
            background: "rgba(16,185,129,0.15)",
            border: "1px solid rgba(16,185,129,0.35)",
            color: "#34d399",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "20px",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* ── Top Tabs Selector ── */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          borderBottom: "1px solid #1e293b",
          marginBottom: "24px",
        }}
      >
        <button
          onClick={() => setActiveTab("REPORTS")}
          style={{
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "REPORTS" ? "2px solid #c084fc" : "2px solid transparent",
            color: activeTab === "REPORTS" ? "#f8fafc" : "#94a3b8",
            padding: "10px 16px",
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>📢</span> Community Disaster Reports
          <span
            style={{
              background: activeTab === "REPORTS" ? "rgba(168,85,247,0.25)" : "rgba(100,116,139,0.2)",
              color: activeTab === "REPORTS" ? "#c084fc" : "#94a3b8",
              padding: "2px 8px",
              borderRadius: "10px",
              fontSize: "11px",
            }}
          >
            {reportsData.totalCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("ROUTING")}
          style={{
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "ROUTING" ? "2px solid #38bdf8" : "2px solid transparent",
            color: activeTab === "ROUTING" ? "#f8fafc" : "#94a3b8",
            padding: "10px 16px",
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Route size={16} color={activeTab === "ROUTING" ? "#38bdf8" : "#94a3b8"} /> Safe-Route Guidance
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: COMMUNITY DISASTER REPORTS */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "REPORTS" && (
        <div>
          {/* Metrics & Action Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
              marginBottom: "20px",
            }}
          >
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", padding: "14px 18px" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Total Reports</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#f8fafc", marginTop: "4px" }}>{reportsData.totalCount}</div>
            </div>

            <div style={{ background: "#0f172a", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "10px", padding: "14px 18px" }}>
              <div style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 700, textTransform: "uppercase" }}>Pending Verification</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#fbbf24", marginTop: "4px" }}>{reportsData.pendingCount}</div>
            </div>

            <div style={{ background: "#0f172a", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "10px", padding: "14px 18px" }}>
              <div style={{ fontSize: "11px", color: "#34d399", fontWeight: 700, textTransform: "uppercase" }}>Verified Field Incidents</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#34d399", marginTop: "4px" }}>{reportsData.verifiedCount}</div>
            </div>

            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", padding: "14px 18px" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Rejected / False Reports</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#94a3b8", marginTop: "4px" }}>{reportsData.rejectedCount}</div>
            </div>
          </div>

          {/* Controls Bar: Filters & Report Incident Button */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "10px",
              padding: "12px 18px",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[
                { key: "ALL", label: "All Reports" },
                { key: "PENDING", label: `Pending (${reportsData.pendingCount})` },
                { key: "VERIFIED", label: `Verified (${reportsData.verifiedCount})` },
                { key: "REJECTED", label: `Rejected (${reportsData.rejectedCount})` },
                { key: "MY_REPORTS", label: "My Submissions" },
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => setFilterStatus(btn.key)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: filterStatus === btn.key ? "rgba(168,85,247,0.2)" : "transparent",
                    color: filterStatus === btn.key ? "#c084fc" : "#94a3b8",
                    border: filterStatus === btn.key ? "1px solid rgba(168,85,247,0.4)" : "1px solid #334155",
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowCreateModal(true);
                setCreateModalError(null);
              }}
              style={{
                background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                border: "none",
                borderRadius: "8px",
                color: "#ffffff",
                padding: "8px 18px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 4px 14px rgba(168,85,247,0.3)",
              }}
            >
              <PlusCircle size={15} /> Report a Disaster Incident
            </button>
          </div>

          {/* Loading / Error States */}
          {loadingReports && (
            <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
              <Loader2 size={24} className="spin-animation" style={{ display: "inline-block", marginBottom: "8px" }} />
              <div>Loading community disaster reports...</div>
            </div>
          )}

          {reportsError && (
            <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", padding: "16px", borderRadius: "8px", color: "#f87171" }}>
              {reportsError}
            </div>
          )}

          {/* Empty State */}
          {!loadingReports && !reportsError && reportsData.reports.length === 0 && (
            <div style={{ background: "#0f172a", border: "1px dashed #334155", borderRadius: "12px", padding: "40px", textAlign: "center", color: "#94a3b8" }}>
              <ShieldCheck size={36} color="#64748b" style={{ marginBottom: "12px" }} />
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#cbd5e1" }}>No Incident Reports in this View</div>
              <p style={{ fontSize: "13px", margin: "6px 0 16px 0" }}>
                {filterStatus === "PENDING"
                  ? "All reported incidents have been reviewed by dispatch responders."
                  : "No community reports matching the active criteria."}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  color: "#cbd5e1",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  cursor: "pointer",
                }}
              >
                + Submit a Community Observation
              </button>
            </div>
          )}

          {/* Reports Grid */}
          {!loadingReports && reportsData.reports.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "16px" }}>
              {reportsData.reports.map((r) => {
                const sevStyle = getSeverityStyle(r.severity);
                const staStyle = getStatusStyle(r.status);
                const isAuthor = currentUser?.id === r.userId;
                const canDelete = isAuthor || (currentUser?.role || "").toUpperCase() === "ADMIN";

                return (
                  <div
                    key={r.id}
                    style={{
                      background: "#0f172a",
                      border: `1px solid ${r.status === "VERIFIED" ? "rgba(16,185,129,0.35)" : r.status === "REJECTED" ? "rgba(100,116,139,0.25)" : "#1e293b"}`,
                      borderRadius: "12px",
                      padding: "18px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "12px",
                      position: "relative",
                    }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: staStyle.bg,
                            color: staStyle.color,
                            border: `1px solid ${staStyle.border}`,
                          }}
                        >
                          {staStyle.label}
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: sevStyle.bg,
                              color: sevStyle.color,
                              border: `1px solid ${sevStyle.border}`,
                            }}
                          >
                            {r.severity}
                          </span>
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteReport(r.id)}
                              title="Delete report"
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#64748b",
                                cursor: "pointer",
                                padding: "2px",
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Incident Title & Location */}
                      <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 700, color: "#f8fafc" }}>
                        {r.disasterType}
                      </h4>
                      <div style={{ fontSize: "12.5px", color: "#38bdf8", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                        <MapPin size={13} />
                        <span>{r.locationName} {r.district ? `• ${r.district}` : ""}</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "10px" }}>
                        Coordinates: {r.latitude.toFixed(4)}°, {r.longitude.toFixed(4)}°
                      </div>

                      {/* Description */}
                      <p style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.5, margin: "0 0 10px 0" }}>
                        {r.description}
                      </p>

                      {/* Attached Image if present */}
                      {r.imageUrl && (
                        <div style={{ marginBottom: "12px" }}>
                          <img
                            src={r.imageUrl}
                            alt="Incident field observation"
                            style={{
                              width: "100%",
                              maxHeight: "160px",
                              objectFit: "cover",
                              borderRadius: "8px",
                              border: "1px solid #1e293b",
                            }}
                          />
                        </div>
                      )}

                      {/* Verification Notes */}
                      {r.verificationNotes && (
                        <div
                          style={{
                            background: r.status === "VERIFIED" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                            border: `1px solid ${r.status === "VERIFIED" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                            borderRadius: "6px",
                            padding: "8px 10px",
                            fontSize: "12px",
                            color: r.status === "VERIFIED" ? "#34d399" : "#fca5a5",
                            marginBottom: "10px",
                          }}
                        >
                          <strong>Responder Note:</strong> {r.verificationNotes}
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Metadata and Responder Controls */}
                    <div style={{ borderTop: "1px solid #1e293b", paddingTop: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#64748b", marginBottom: "8px" }}>
                        <span>Reported by: <strong style={{ color: "#94a3b8" }}>{r.userName || `User #${r.userId}`}</strong></span>
                        <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* Response Coordination Actions for Admins / Responders */}
                      {isResponderOrAdmin && (
                        <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                          <button
                            onClick={() => {
                              setVerifyModalTarget({ report: r, targetStatus: "VERIFIED" });
                              setVerificationNotesInput(r.verificationNotes || "Field inspection confirmed.");
                            }}
                            disabled={r.status === "VERIFIED"}
                            style={{
                              flex: 1,
                              background: r.status === "VERIFIED" ? "#1e293b" : "rgba(16,185,129,0.18)",
                              color: r.status === "VERIFIED" ? "#64748b" : "#34d399",
                              border: `1px solid ${r.status === "VERIFIED" ? "#334155" : "rgba(16,185,129,0.4)"}`,
                              padding: "6px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: r.status === "VERIFIED" ? "default" : "pointer",
                            }}
                          >
                            Verify Incident ✓
                          </button>
                          <button
                            onClick={() => {
                              setVerifyModalTarget({ report: r, targetStatus: "REJECTED" });
                              setVerificationNotesInput(r.verificationNotes || "Unverified or invalid report.");
                            }}
                            disabled={r.status === "REJECTED"}
                            style={{
                              flex: 1,
                              background: r.status === "REJECTED" ? "#1e293b" : "rgba(239,68,68,0.15)",
                              color: r.status === "REJECTED" ? "#64748b" : "#f87171",
                              border: `1px solid ${r.status === "REJECTED" ? "#334155" : "rgba(239,68,68,0.4)"}`,
                              padding: "6px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: r.status === "REJECTED" ? "default" : "pointer",
                            }}
                          >
                            Reject ✗
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: SAFE-ROUTE GUIDANCE */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "ROUTING" && (
        <div>
          {/* Routing Query Panel */}
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "14px",
              padding: "20px",
              marginBottom: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <Navigation size={18} color="#38bdf8" />
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#f8fafc" }}>
                Evacuation &amp; Transit Corridor Hazard Assessment
              </h3>
            </div>

            <form onSubmit={handleCalculateRoute}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "16px" }}>
                {/* Origin Setup */}
                <div style={{ background: "#090d16", border: "1px solid #1e293b", borderRadius: "10px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#10b981" }}>🟢 Point A: Origin Location</div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={handleResolveOrigin}
                        disabled={isGeocodingOrigin}
                        style={{
                          background: "rgba(16,185,129,0.12)",
                          border: "1px solid rgba(16,185,129,0.3)",
                          color: "#34d399",
                          fontSize: "11px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        title="Resolve city or place name to coordinates"
                      >
                        {isGeocodingOrigin ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={11} />}
                        Resolve Place
                      </button>
                      <button
                        type="button"
                        onClick={handleUseMySavedLocationForOrigin}
                        style={{
                          background: "rgba(56,189,248,0.12)",
                          border: "1px solid rgba(56,189,248,0.3)",
                          color: "#38bdf8",
                          fontSize: "11px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Saved Zone
                      </button>
                      <button
                        type="button"
                        onClick={handleDetectGPSForOrigin}
                        style={{
                          background: "rgba(16,185,129,0.12)",
                          border: "1px solid rgba(16,185,129,0.3)",
                          color: "#34d399",
                          fontSize: "11px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Device GPS
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Origin Name or City (e.g. Kochi or Ernakulam)"
                    value={originName}
                    onChange={(e) => setOriginName(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#0f172a",
                      border: "1px solid #334155",
                      color: "#f1f5f9",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      marginBottom: "10px",
                      outline: "none",
                    }}
                  />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <input
                      type="number"
                      step="any"
                      placeholder="Latitude (e.g. 9.9312)"
                      value={originLat}
                      onChange={(e) => setOriginLat(e.target.value)}
                      style={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                        color: "#f1f5f9",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        fontSize: "12.5px",
                        outline: "none",
                      }}
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="Longitude (e.g. 76.2673)"
                      value={originLon}
                      onChange={(e) => setOriginLon(e.target.value)}
                      style={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                        color: "#f1f5f9",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        fontSize: "12.5px",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                {/* Destination Setup */}
                <div style={{ background: "#090d16", border: "1px solid #1e293b", borderRadius: "10px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#38bdf8" }}>🏁 Point B: Destination (Relief Center / Safe Haven)</div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={handleResolveDestination}
                        disabled={isGeocodingDest}
                        style={{
                          background: "rgba(56,189,248,0.12)",
                          border: "1px solid rgba(56,189,248,0.3)",
                          color: "#38bdf8",
                          fontSize: "11px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        title="Resolve city or place name to coordinates"
                      >
                        {isGeocodingDest ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={11} />}
                        Resolve Place
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenDestPicker}
                        style={{
                          background: "#0284c7",
                          border: "1px solid #38bdf8",
                          color: "#ffffff",
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "3px 9px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Compass size={12} />
                        Choose Destination on Map
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Destination Name or City (e.g. Thrissur Relief Camp)"
                    value={destName}
                    onChange={(e) => setDestName(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#0f172a",
                      border: "1px solid #334155",
                      color: "#f1f5f9",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      marginBottom: "10px",
                      outline: "none",
                    }}
                  />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <input
                      type="number"
                      step="any"
                      placeholder="Latitude (e.g. 10.5276)"
                      value={destLat}
                      onChange={(e) => setDestLat(e.target.value)}
                      style={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                        color: "#f1f5f9",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        fontSize: "12.5px",
                        outline: "none",
                      }}
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="Longitude (e.g. 76.2144)"
                      value={destLon}
                      onChange={(e) => setDestLon(e.target.value)}
                      style={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                        color: "#f1f5f9",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        fontSize: "12.5px",
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Quick Pick Relief Centers */}
                  {trainingCentersList.length > 0 && (
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                      <span style={{ marginRight: "6px" }}>Pick Relief Center:</span>
                      {trainingCentersList.slice(0, 3).map((c) => {
                        const dist = calculateHaversineDistance(originLat, originLon, c.latitude, c.longitude);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectReliefCenter(c)}
                            style={{
                              background: "rgba(59,130,246,0.1)",
                              border: "1px solid rgba(59,130,246,0.25)",
                              color: "#60a5fa",
                              fontSize: "10.5px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              cursor: "pointer",
                              marginRight: "4px",
                              marginBottom: "2px",
                            }}
                          >
                            {c.centerName.slice(0, 18)}...
                            {dist != null ? ` (${dist}km)` : ""}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Corridor Buffer Slider & Action */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px",
                  borderTop: "1px solid #1e293b",
                  paddingTop: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "12.5px", color: "#94a3b8" }}>Corridor Hazard Scan Buffer:</span>
                  <input
                    type="range"
                    min="5"
                    max="35"
                    step="5"
                    value={corridorBufferKm}
                    onChange={(e) => setCorridorBufferKm(Number(e.target.value))}
                    style={{ accentColor: "#38bdf8", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#38bdf8" }}>{corridorBufferKm} km</span>
                </div>

                <button
                  type="submit"
                  disabled={isCalculatingRoute}
                  style={{
                    background: "#0284c7",
                    border: "none",
                    borderRadius: "8px",
                    color: "#ffffff",
                    padding: "10px 24px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: isCalculatingRoute ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {isCalculatingRoute ? (
                    <>
                      <Loader2 size={16} className="spin-animation" />
                      Scanning Corridor Hazards...
                    </>
                  ) : (
                    <>
                      <Navigation size={16} /> Calculate Safe Route &amp; Scan Hazards
                    </>
                  )}
                </button>
              </div>

              {routeError && (
                <div
                  style={{
                    marginTop: "14px",
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.35)",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#f87171", fontSize: "13px", lineHeight: 1.4, flex: 1 }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0, color: "#ef4444" }} />
                    <span>{routeError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleCalculateRoute(e)}
                    disabled={isCalculatingRoute}
                    style={{
                      background: "rgba(239,68,68,0.2)",
                      border: "1px solid rgba(239,68,68,0.5)",
                      borderRadius: "6px",
                      color: "#fca5a5",
                      padding: "6px 14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: isCalculatingRoute ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Navigation size={13} />
                    Retry Calculation
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Route Assessment Results Display */}
          {routeResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Safety Status Banner */}
              <div
                style={{
                  background: routeResult.safetyStatus === "HIGH_RISK"
                    ? "rgba(239,68,68,0.15)"
                    : routeResult.safetyStatus === "CAUTION"
                    ? "rgba(245,158,11,0.15)"
                    : "rgba(16,185,129,0.15)",
                  border: `1px solid ${
                    routeResult.safetyStatus === "HIGH_RISK"
                      ? "rgba(239,68,68,0.4)"
                      : routeResult.safetyStatus === "CAUTION"
                      ? "rgba(245,158,11,0.4)"
                      : "rgba(16,185,129,0.4)"
                  }`,
                  borderRadius: "12px",
                  padding: "16px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <AlertTriangle
                    size={20}
                    color={
                      routeResult.safetyStatus === "HIGH_RISK"
                        ? "#ef4444"
                        : routeResult.safetyStatus === "CAUTION"
                        ? "#f59e0b"
                        : "#10b981"
                    }
                  />
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "15px",
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      color:
                        routeResult.safetyStatus === "HIGH_RISK"
                          ? "#f87171"
                          : routeResult.safetyStatus === "CAUTION"
                          ? "#fbbf24"
                          : "#34d399",
                    }}
                  >
                    STATUS: {routeResult.safetyStatus}
                  </h4>
                  <span style={{ fontSize: "11px", color: "#94a3b8", background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: "4px" }}>
                    Routing Engine: {routeResult.routingEngine}
                  </span>
                </div>
                <div style={{ fontSize: "13px", color: "#f1f5f9", lineHeight: 1.5 }}>
                  {routeResult.safetyAdvisory}
                </div>
              </div>

              {/* Fallback Straight-Line Corridor Alert Banner */}
              {!routeResult.isRoadRoute && (
                <div
                  style={{
                    background: "rgba(245,158,11,0.12)",
                    border: "1px solid rgba(245,158,11,0.35)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    color: "#fbbf24",
                    fontSize: "13px",
                    lineHeight: 1.45,
                  }}
                >
                  <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Approximate Straight-Line Corridor:</strong> The driving routing network service is currently unreachable or could not identify a valid roadway transit path. The path below is an <strong>approximate straight-line geodesic buffer corridor</strong> for evaluating hazard proximity only, <strong>NOT a drivable navigation route</strong>. Road driving distance and travel times cannot be reliably determined.
                  </div>
                </div>
              )}

              {/* Metrics Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", padding: "14px 18px" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
                    {routeResult.isRoadRoute ? "Road Route Distance" : "Straight-Line Distance (Approx.)"}
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#38bdf8", marginTop: "4px" }}>
                    {routeResult.totalDistanceKm} km
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    {routeResult.isRoadRoute ? "Drivable road network" : "Geodesic straight-line corridor"}
                  </div>
                </div>

                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", padding: "14px 18px" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
                    {routeResult.isRoadRoute ? "Estimated Driving Time" : "Road Transit Time"}
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#f8fafc", marginTop: "4px" }}>
                    {routeResult.isRoadRoute && routeResult.estimatedDurationMinutes != null ? (
                      `${routeResult.estimatedDurationMinutes} min`
                    ) : (
                      <span style={{ fontSize: "13.5px", color: "#f59e0b", fontWeight: 600 }}>
                        Unavailable (Straight-line corridor)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    {routeResult.isRoadRoute ? "Standard transit estimate" : "Cannot calculate for straight line"}
                  </div>
                </div>

                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", padding: "14px 18px" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Hazards in Scan Corridor</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: routeResult.hazardsNearRoute.length > 0 ? "#f87171" : "#34d399", marginTop: "4px" }}>
                    {routeResult.hazardsNearRoute.length} incident(s)
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    Within {corridorBufferKm} km corridor buffer
                  </div>
                </div>
              </div>

              {/* Interactive Route Map */}
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "12px",
                  overflow: "hidden",
                  height: "460px",
                  position: "relative",
                }}
              >
                {routeResult.routeGeometry?.length > 1 && (
                  <MapContainer
                    key={`route-map-${routeResult.origin?.latitude}-${routeResult.origin?.longitude}-${routeResult.destination?.latitude}-${routeResult.destination?.longitude}`}
                    center={routeResult.routeGeometry[0]}
                    zoom={9}
                    scrollWheelZoom={true}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      maxZoom={19}
                    />

                    {/* Auto-fit map bounds to entire route corridor */}
                    <RouteBoundsFitter points={routeResult.routeGeometry} />

                    {/* Origin Marker */}
                    <Marker
                      position={[routeResult.origin.latitude, routeResult.origin.longitude]}
                      icon={originPinIcon}
                    >
                      <Popup>
                        <div style={{ fontFamily: "Inter, sans-serif" }}>
                          <strong>Origin (Point A):</strong><br />
                          {routeResult.origin.name}
                        </div>
                      </Popup>
                    </Marker>

                    {/* Destination Marker */}
                    <Marker
                      position={[routeResult.destination.latitude, routeResult.destination.longitude]}
                      icon={destPinIcon}
                    >
                      <Popup>
                        <div style={{ fontFamily: "Inter, sans-serif" }}>
                          <strong>Destination (Point B):</strong><br />
                          {routeResult.destination.name}
                        </div>
                      </Popup>
                    </Marker>

                    {/* Route Polyline with safety-coded color */}
                    <Polyline
                      positions={routeResult.routeGeometry}
                      pathOptions={{
                        color: routeResult.safetyStatus === "HIGH_RISK"
                          ? "#ef4444"
                          : routeResult.safetyStatus === "CAUTION"
                          ? "#f59e0b"
                          : "#10b981",
                        weight: 5,
                        opacity: 0.85,
                      }}
                    />

                    {/* Hazards Along Route */}
                    {routeResult.hazardsNearRoute.map((h, i) => (
                      <Marker
                        key={`haz-${h.id}-${i}`}
                        position={[h.latitude, h.longitude]}
                        icon={hazardPinIcon(h)}
                      >
                        <Popup minWidth={220}>
                          <div style={{ fontFamily: "Inter, sans-serif" }}>
                            <div style={{ color: h.proximityCategory === "CRITICAL_PROXIMITY" ? "#ef4444" : "#f59e0b", fontWeight: 800, fontSize: "11px" }}>
                              ⚠ {h.proximityCategory.replace("_", " ")}
                            </div>
                            <strong style={{ fontSize: "13px" }}>{h.name}</strong>
                            <div style={{ fontSize: "11px", color: "#64748b", margin: "4px 0" }}>
                              {h.hazardType} • {h.severity} • {h.source}
                            </div>
                            <div style={{ fontSize: "11px", color: "#0f172a" }}>
                              Distance to corridor: <strong>{h.distanceToRouteKm} km</strong>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                )}
              </div>

              {/* Detected Hazards List */}
              {routeResult.hazardsNearRoute.length > 0 && (
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", padding: "16px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 12px 0", color: "#f8fafc" }}>
                    Identified Hazards in Travel Corridor
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" }}>
                    {routeResult.hazardsNearRoute.map((h, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "#090d16",
                          border: `1px solid ${h.proximityCategory === "CRITICAL_PROXIMITY" ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.3)"}`,
                          borderRadius: "8px",
                          padding: "10px 14px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#f8fafc" }}>{h.name}</span>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: h.proximityCategory === "CRITICAL_PROXIMITY" ? "#f87171" : "#fbbf24" }}>
                            {h.distanceToRouteKm} km away
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>
                          Type: {h.hazardType} • Severity: {h.severity} • Source: {h.source}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Official Safety Disclaimer */}
              <div
                style={{
                  background: "rgba(15,23,42,0.9)",
                  border: "1px solid #1e293b",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  fontSize: "12px",
                  color: "#94a3b8",
                  lineHeight: 1.5,
                }}
              >
                <strong>Civil Defense Advisory Disclaimer:</strong> {routeResult.disclaimer}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: REPORT A DISASTER INCIDENT */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {showCreateModal && (
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
            zIndex: 1100,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "14px",
              maxWidth: "540px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 45px rgba(0,0,0,0.6)",
            }}
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
              <div className="d-flex align-items-center gap-2">
                <ShieldAlert size={20} color="#c084fc" />
                <h4 style={{ margin: 0, fontSize: "16px", color: "#f8fafc", fontWeight: 700 }}>
                  Report a Community Disaster Incident
                </h4>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitNewReport} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {createModalError && (
                <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", padding: "10px 14px", borderRadius: "8px", fontSize: "12.5px" }}>
                  {createModalError}
                </div>
              )}

              {/* Hazard Type */}
              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px", display: "block" }}>Disaster Hazard Category *</label>
                <select
                  value={createDisasterType}
                  onChange={(e) => setCreateDisasterType(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#090d16",
                    border: "1px solid #334155",
                    color: "#f1f5f9",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    outline: "none",
                  }}
                >
                  <option value="Flash Flood">Flash Flood / Inundation</option>
                  <option value="River Inundation">River Overflow</option>
                  <option value="Wildfire">Wildfire / Forest Fire</option>
                  <option value="Structural Fire">Structural Fire</option>
                  <option value="Severe Cyclone">Severe Storm / Cyclone</option>
                  <option value="Earthquake Damage">Earthquake Damage</option>
                  <option value="Landslide / Mudflow">Landslide / Mudflow</option>
                  <option value="Road Washout">Road Washout / Bridge Collapse</option>
                  <option value="Other Emergency">Other Emergency</option>
                </select>
              </div>

              {/* Severity */}
              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px", display: "block" }}>Estimated Incident Severity *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px" }}>
                  {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setCreateSeverity(sev)}
                      style={{
                        padding: "6px",
                        fontSize: "12px",
                        fontWeight: 700,
                        borderRadius: "6px",
                        cursor: "pointer",
                        background: createSeverity === sev ? "rgba(168,85,247,0.25)" : "#090d16",
                        color: createSeverity === sev ? "#c084fc" : "#94a3b8",
                        border: createSeverity === sev ? "1px solid #a855f7" : "1px solid #334155",
                      }}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Name & District */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px", display: "block" }}>Location Name / Landmark *</label>
                  <input
                    type="text"
                    placeholder="e.g. Aluva River Bridge"
                    value={createLocationName}
                    onChange={(e) => setCreateLocationName(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#090d16",
                      border: "1px solid #334155",
                      color: "#f1f5f9",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px", display: "block" }}>District / City</label>
                  <input
                    type="text"
                    placeholder="e.g. Ernakulam"
                    value={createDistrict}
                    onChange={(e) => setCreateDistrict(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#090d16",
                      border: "1px solid #334155",
                      color: "#f1f5f9",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Coordinates & GPS */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>Coordinates (Lat, Lon) *</label>
                  <button
                    type="button"
                    onClick={handleDetectGPSForReport}
                    disabled={createGpsLoading}
                    style={{
                      background: "rgba(56,189,248,0.12)",
                      border: "1px solid rgba(56,189,248,0.3)",
                      color: "#38bdf8",
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      cursor: createGpsLoading ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <LocateFixed size={12} /> {createGpsLoading ? "Locating..." : "Use Current GPS"}
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude (-90 to 90)"
                    value={createLat}
                    onChange={(e) => setCreateLat(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#090d16",
                      border: "1px solid #334155",
                      color: "#f1f5f9",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      outline: "none",
                    }}
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude (-180 to 180)"
                    value={createLon}
                    onChange={(e) => setCreateLon(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#090d16",
                      border: "1px solid #334155",
                      color: "#f1f5f9",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px", display: "block" }}>Observation Description *</label>
                <textarea
                  rows={3}
                  placeholder="Detail observed conditions, impassable roads, structural failure, or assistance needed..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#090d16",
                    border: "1px solid #334155",
                    color: "#f1f5f9",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    outline: "none",
                  }}
                />
              </div>

              {/* Image URL */}
              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px", display: "block" }}>Optional Image Attachment URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={createImageUrl}
                  onChange={(e) => setCreateImageUrl(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#090d16",
                    border: "1px solid #334155",
                    color: "#f1f5f9",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    outline: "none",
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: "#334155",
                    border: "none",
                    color: "#cbd5e1",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  style={{
                    background: "#a855f7",
                    border: "none",
                    color: "#ffffff",
                    padding: "8px 20px",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: isSubmittingReport ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {isSubmittingReport ? (
                    <>
                      <Loader2 size={15} className="spin-animation" /> Submitting...
                    </>
                  ) : (
                    "Submit for Verification"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: VERIFICATION NOTES PROMPT MODAL (FOR RESPONDERS) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {verifyModalTarget && (
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
            zIndex: 1100,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setVerifyModalTarget(null);
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "14px",
              maxWidth: "480px",
              width: "100%",
              padding: "20px",
            }}
          >
            <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 700, color: "#f8fafc" }}>
              Update Verification Status: {verifyModalTarget.targetStatus}
            </h4>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 14px 0" }}>
              Incident: <strong>{verifyModalTarget.report.disasterType}</strong> at {verifyModalTarget.report.locationName}
            </p>

            <label style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px", display: "block" }}>
              Responder Operational Notes / Dispatch Directives
            </label>
            <textarea
              rows={3}
              value={verificationNotesInput}
              onChange={(e) => setVerificationNotesInput(e.target.value)}
              placeholder="e.g. Field inspection completed. Unit #4 dispatched. Road confirmed closed."
              style={{
                width: "100%",
                background: "#090d16",
                border: "1px solid #334155",
                color: "#f1f5f9",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "12.5px",
                marginBottom: "16px",
                outline: "none",
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setVerifyModalTarget(null)}
                style={{
                  background: "#334155",
                  border: "none",
                  color: "#cbd5e1",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusUpdate}
                disabled={isUpdatingStatus}
                style={{
                  background: verifyModalTarget.targetStatus === "VERIFIED" ? "#10b981" : "#ef4444",
                  border: "none",
                  color: "#ffffff",
                  padding: "8px 20px",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: isUpdatingStatus ? "wait" : "pointer",
                }}
              >
                {isUpdatingStatus ? "Saving..." : `Confirm ${verifyModalTarget.targetStatus}`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Choose Destination on Map Modal (Phase 7 Interactive Selection) ── */}
      {showDestPickerModal && (() => {
        // Filter & calculate distances for relief centers
        const validCenters = trainingCentersList.filter(
          (c) => c.latitude != null && c.longitude != null && !isNaN(parseFloat(c.latitude)) && !isNaN(parseFloat(c.longitude))
        );

        const centersWithDist = validCenters.map((c) => {
          const d = calculateHaversineDistance(originLat, originLon, c.latitude, c.longitude);
          return { ...c, distanceKm: d };
        });

        const filteredCenters = centersWithDist.filter((c) => {
          // Search filter
          if (destPickerSearch.trim()) {
            const q = destPickerSearch.toLowerCase();
            const matchName = (c.centerName || "").toLowerCase().includes(q);
            const matchDist = (c.district || "").toLowerCase().includes(q);
            const matchAddr = (c.address || "").toLowerCase().includes(q);
            if (!matchName && !matchDist && !matchAddr) return false;
          }
          // Radius filter (straight-line distance)
          if (destPickerRadius > 0) {
            if (c.distanceKm == null || c.distanceKm > destPickerRadius) return false;
          }
          return true;
        });

        // Sort: by distance if available, else by name
        filteredCenters.sort((a, b) => {
          if (a.distanceKm != null && b.distanceKm != null) {
            return a.distanceKm - b.distanceKm;
          }
          if (a.distanceKm != null) return -1;
          if (b.distanceKm != null) return 1;
          return (a.centerName || "").localeCompare(b.centerName || "");
        });

        const hasValidOrigin = !isNaN(parseFloat(originLat)) && !isNaN(parseFloat(originLon));

        return (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0, 0, 0, 0.82)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}
          >
            <div
              style={{
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "14px",
                width: "100%",
                maxWidth: "1100px",
                height: "90vh",
                maxHeight: "860px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #1e293b",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#090d16",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Compass size={18} color="#38bdf8" />
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#f8fafc" }}>
                      Choose Destination Relief Center on Map
                    </h3>
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
                    Select an official relief camp or training sanctuary. Straight-line distances are computed from your origin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDestPickerModal(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Toolbar & Filters */}
              <div
                style={{
                  padding: "12px 20px",
                  borderBottom: "1px solid #1e293b",
                  background: "#0d1322",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "12px",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1 }}>
                  {/* Use Current GPS Button */}
                  <button
                    type="button"
                    onClick={handleModalUseCurrentGps}
                    disabled={destPickerGpsLoading}
                    style={{
                      background: "rgba(16,185,129,0.15)",
                      border: "1px solid rgba(16,185,129,0.35)",
                      color: "#34d399",
                      fontSize: "12px",
                      fontWeight: 600,
                      padding: "6px 12px",
                      borderRadius: "6px",
                      cursor: destPickerGpsLoading ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {destPickerGpsLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <LocateFixed size={13} />}
                    Use Current GPS
                  </button>

                  {/* Search input */}
                  <div style={{ position: "relative", minWidth: "200px", flex: "1 1 200px" }}>
                    <Search size={13} color="#64748b" style={{ position: "absolute", left: "10px", top: "10px" }} />
                    <input
                      type="text"
                      placeholder="Filter by name, district, or address..."
                      value={destPickerSearch}
                      onChange={(e) => setDestPickerSearch(e.target.value)}
                      style={{
                        width: "100%",
                        background: "#090d16",
                        border: "1px solid #334155",
                        color: "#f1f5f9",
                        padding: "6px 10px 6px 30px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Radius selector */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>Search Radius:</span>
                    <select
                      value={destPickerRadius}
                      onChange={(e) => setDestPickerRadius(Number(e.target.value))}
                      style={{
                        background: "#090d16",
                        border: "1px solid #334155",
                        color: "#f1f5f9",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        outline: "none",
                      }}
                    >
                      <option value={0}>All Distances</option>
                      <option value={25}>Within 25 km</option>
                      <option value={50}>Within 50 km</option>
                      <option value={100}>Within 100 km</option>
                    </select>
                  </div>
                </div>

                {/* Origin reference pill */}
                <div style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>Origin:</span>
                  <span
                    style={{
                      background: hasValidOrigin ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.12)",
                      color: hasValidOrigin ? "#34d399" : "#94a3b8",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontWeight: 600,
                    }}
                  >
                    {hasValidOrigin ? `${originName} (${parseFloat(originLat).toFixed(3)}, ${parseFloat(originLon).toFixed(3)})` : "Not set (set origin to see distances)"}
                  </span>
                </div>
              </div>

              {/* Error banner if GPS fails */}
              {destPickerError && (
                <div
                  style={{
                    background: "rgba(239,68,68,0.12)",
                    borderBottom: "1px solid rgba(239,68,68,0.25)",
                    padding: "8px 20px",
                    color: "#f87171",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertTriangle size={14} />
                  <span>{destPickerError}</span>
                </div>
              )}

              {/* Main Body: 2-column layout (Map 65% + Centers List 35%) */}
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 340px", overflow: "hidden" }}>
                {/* Left Map View */}
                <div style={{ position: "relative", height: "100%", width: "100%", background: "#090d16" }}>
                  <MapContainer
                    center={
                      Array.isArray(destPickerCenter) &&
                      !isNaN(parseFloat(destPickerCenter[0])) &&
                      !isNaN(parseFloat(destPickerCenter[1]))
                        ? [parseFloat(destPickerCenter[0]), parseFloat(destPickerCenter[1])]
                        : [10.8505, 76.2711]
                    }
                    zoom={destPickerZoom || 10}
                    scrollWheelZoom={true}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      maxZoom={19}
                    />

                    {/* Controller to handle flyTo and map sizing when user selects a center */}
                    <ModalMapController
                      center={destPickerCenter}
                      zoom={destPickerZoom}
                      selectedCoords={
                        selectedCenterForModal &&
                        selectedCenterForModal.latitude != null &&
                        selectedCenterForModal.longitude != null &&
                        !isNaN(parseFloat(selectedCenterForModal.latitude)) &&
                        !isNaN(parseFloat(selectedCenterForModal.longitude))
                          ? [parseFloat(selectedCenterForModal.latitude), parseFloat(selectedCenterForModal.longitude)]
                          : null
                      }
                    />

                    {/* Origin Marker (Point A) */}
                    {hasValidOrigin && (
                      <Marker
                        position={[parseFloat(originLat), parseFloat(originLon)]}
                        icon={originPinIcon}
                      >
                        <Popup>
                          <div style={{ fontFamily: "Inter, sans-serif" }}>
                            <strong style={{ color: "#10b981" }}>🟢 Point A: Origin</strong>
                            <div style={{ fontSize: "12px", marginTop: "4px" }}>{originName}</div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              {parseFloat(originLat).toFixed(4)}, {parseFloat(originLon).toFixed(4)}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {/* Relief Center Markers */}
                    {filteredCenters.map((c) => {
                      const cLat = parseFloat(c.latitude);
                      const cLon = parseFloat(c.longitude);
                      if (isNaN(cLat) || isNaN(cLon)) return null;

                      const isSelected = selectedCenterForModal && selectedCenterForModal.id === c.id;
                      return (
                        <Marker
                          key={`pc-${c.id}`}
                          position={[cLat, cLon]}
                          icon={modalCenterPinIcon(isSelected)}
                          eventHandlers={{
                            click: () => setSelectedCenterForModal(c),
                          }}
                        >
                          <Popup minWidth={220}>
                            <div style={{ fontFamily: "Inter, sans-serif", width: "220px" }}>
                              <div style={{ fontSize: "10px", fontWeight: 700, color: "#059669", letterSpacing: "0.06em", marginBottom: "2px" }}>
                                🏢 RELIEF / TRAINING CENTER
                              </div>
                              <strong style={{ fontSize: "13px", color: "#0f172a" }}>{c.centerName}</strong>
                              <div style={{ fontSize: "11.5px", color: "#475569", margin: "4px 0" }}>
                                📍 {c.district} {c.address ? `• ${c.address}` : ""}
                              </div>
                              <div style={{ fontSize: "11px", color: "#475569", marginBottom: "8px" }}>
                                Capacity: {c.capacity ? `${c.capacity} pax` : "—"} • Contact: {c.contactNumber || "—"}
                              </div>
                              {c.distanceKm != null && (
                                <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0284c7", background: "rgba(2,132,199,0.1)", padding: "4px 8px", borderRadius: "4px", marginBottom: "10px" }}>
                                  Distance: {c.distanceKm} km (straight-line)
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => handleConfirmCenterAsDestination(c)}
                                style={{
                                  width: "100%",
                                  background: "#0284c7",
                                  border: "none",
                                  color: "#ffffff",
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                Use This Center (Point B)
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}

                    {/* Active Hazard Markers (for environmental awareness) */}
                    {activeHazardsList.slice(0, 15).map((h, i) => {
                      const hLat = parseFloat(h.latitude);
                      const hLon = parseFloat(h.longitude);
                      if (isNaN(hLat) || isNaN(hLon)) return null;

                      return (
                        <Marker
                          key={`haz-m-${h.id || i}`}
                          position={[hLat, hLon]}
                          icon={modalHazardPinIcon(h)}
                        >
                          <Popup minWidth={180}>
                            <div style={{ fontFamily: "Inter, sans-serif" }}>
                              <div style={{ color: "#ef4444", fontWeight: 800, fontSize: "11px" }}>⚠ ACTIVE HAZARD</div>
                              <strong>{h.disasterType || h.name}</strong>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>
                                Severity: {h.severity} • {h.locationName || h.district || "Active zone"}
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                </div>

                {/* Right Scrollable List of Relief Centers */}
                <div
                  style={{
                    background: "#090d16",
                    borderLeft: "1px solid #1e293b",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #1e293b",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#94a3b8",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>AVAILABLE RELIEF CENTERS</span>
                    <span style={{ color: "#38bdf8" }}>{filteredCenters.length} found</span>
                  </div>

                  <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
                    {filteredCenters.length === 0 ? (
                      <div style={{ padding: "30px 16px", textAlign: "center", color: "#64748b" }}>
                        <Building2 size={32} style={{ margin: "0 auto 10px auto", opacity: 0.4 }} />
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>No Relief Centers Found</div>
                        <p style={{ fontSize: "11.5px", margin: "6px 0 0 0" }}>
                          No centers match the current search or radius. Try setting radius to "All Distances" or clearing filters.
                        </p>
                      </div>
                    ) : (
                      filteredCenters.map((c) => {
                        const isSelected = selectedCenterForModal && selectedCenterForModal.id === c.id;
                        return (
                          <div
                            key={`list-c-${c.id}`}
                            onClick={() => {
                              setSelectedCenterForModal(c);
                              setDestPickerCenter([c.latitude, c.longitude]);
                            }}
                            style={{
                              background: isSelected ? "rgba(2,132,199,0.18)" : "#0f172a",
                              border: `1px solid ${isSelected ? "#0284c7" : "#1e293b"}`,
                              borderRadius: "8px",
                              padding: "10px 12px",
                              marginBottom: "8px",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <span style={{ fontSize: "12.5px", fontWeight: 700, color: isSelected ? "#38bdf8" : "#f1f5f9" }}>
                                {c.centerName}
                              </span>
                              {c.distanceKm != null ? (
                                <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#38bdf8", background: "rgba(56,189,248,0.12)", padding: "2px 6px", borderRadius: "4px", whiteSpace: "nowrap" }}>
                                  {c.distanceKm} km
                                </span>
                              ) : null}
                            </div>
                            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>
                              📍 {c.district} {c.address ? `• ${c.address}` : ""}
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                              <span style={{ fontSize: "10px", color: "#64748b" }}>
                                Capacity: {c.capacity ? `${c.capacity} pax` : "—"}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmCenterAsDestination(c);
                                }}
                                style={{
                                  background: "#0284c7",
                                  border: "none",
                                  color: "#ffffff",
                                  fontSize: "10.5px",
                                  fontWeight: 600,
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                              >
                                Select Destination
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: "12px 20px",
                  borderTop: "1px solid #1e293b",
                  background: "#090d16",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                  {selectedCenterForModal ? (
                    <span>
                      Selected: <strong style={{ color: "#38bdf8" }}>{selectedCenterForModal.centerName}</strong> (
                      {selectedCenterForModal.district})
                      {selectedCenterForModal.distanceKm != null && ` • ${selectedCenterForModal.distanceKm} km straight-line`}
                    </span>
                  ) : (
                    <span>Click any relief center on the map or list to select it as Destination (Point B).</span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setShowDestPickerModal(false)}
                    style={{
                      background: "#334155",
                      border: "none",
                      color: "#cbd5e1",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  {selectedCenterForModal && (
                    <button
                      type="button"
                      onClick={() => handleConfirmCenterAsDestination(selectedCenterForModal)}
                      style={{
                        background: "#0284c7",
                        border: "none",
                        color: "#ffffff",
                        padding: "8px 18px",
                        borderRadius: "6px",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Use Selected Center
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default CommunityRoutes;
