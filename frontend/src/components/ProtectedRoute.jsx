import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles }) {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(storedUser);

    // If allowedRoles is specified, check if user's role is permitted
    if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.role)) {
        return (
          <div className="container mt-5 text-center text-light">
            <div className="card bg-dark border-danger p-5 shadow-lg mx-auto" style={{ maxWidth: "600px" }}>
              <div className="mb-3 text-danger" style={{ fontSize: "3rem" }}>🚫</div>
              <h2 className="text-danger mb-3">Access Restricted</h2>
              <p className="text-secondary mb-4">
                Your role (<strong>{user.role}</strong>) does not have permission to view this section.
              </p>
              <a href="/" className="btn btn-primary px-4 py-2">
                Return to Dashboard
              </a>
            </div>
          </div>
        );
      }
    }
  } catch (e) {
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;