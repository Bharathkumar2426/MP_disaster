import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";
import "../styles/login.css";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
function Login() {
  

  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const handleChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value,
    });
  };
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await loginUser(loginData);

      localStorage.setItem("user", JSON.stringify(response.data));

      alert(response.data.message);
      setLoading(false);
      navigate("/");
    } catch {
      setLoading(false);

      alert("Invalid Email or Password");
    }
  };
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>⚡ Disaster Management System</h1>

          <p>Secure Disaster Response Platform</p>

          <h4>Welcome Back 👋</h4>
        </div>

        <div className="login-body">
          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label>Email</label>

              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />

                <input
                  type="email"
                  className="form-control login-input"
                  placeholder="Enter Email"
                  name="email"
                  value={loginData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="mb-4">
              <label>Password</label>

              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />

                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control login-input"
                  placeholder="Enter Password"
                  name="password"
                  value={loginData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" />

                <span>Remember Me</span>
              </label>

              <button type="button" className="forgot-btn">
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Logging in..." : "Login →"}
            </button>

            <hr />

            <p className="text-center mb-0">
              Don't have an account?
              <Link to="/register" className="ms-2">
                Register
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
