import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../services/authService";
import "../styles/register.css";
import {
  FiUser,
  FiMail,
  FiLock,
  FiPhone,
  FiEye,
  FiEyeOff,
  FiShield
} from "react-icons/fi";
function Register() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phoneNumber: "",
    role: "PARTICIPANT",
  });
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      await registerUser(formData);

      alert("Registration Successful");
      navigate("/login");
    } catch (error) {
      alert("Registration Failed");

      console.error(error);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-header">

          <div className="register-logo">
            ⚡ Disaster Management
          </div>

          <h2>Create Your Account</h2>

          <p>
            Join the Disaster Response Platform
          </p>

        </div>

        <div className="card-body p-4">
          <form onSubmit={handleRegister}>
            <div className="row">
              <div className="col-md-6 mb-3">

                <label>Full Name</label>

                <div className="register-input">

                  <FiUser className="input-icon" />

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Full Name"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                  />

                </div>

              </div>

              <div className="col-md-6 mb-3">

                <label>Email</label>

                <div className="register-input">

                  <FiMail className="input-icon" />

                  <input
                    type="email"
                    className="form-control"
                    placeholder="Enter Email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  />

                </div>

              </div>

              <div className="col-md-6 mb-3">
                <label>Password</label>
                <div className="register-input">

                  <FiLock className="input-icon" />

                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    placeholder="Create Password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                  />

                  <span
                    className="eye-icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </span>

                </div>
              </div>

              <div className="col-md-6 mb-3">

                <label>Phone Number</label>

                <div className="register-input">

                  <FiPhone className="input-icon" />

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Phone Number"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                  />

                </div>

              </div>

              <div className="col-12 mb-3">

                <label>Role</label>

                <div className="register-input">

                  <FiShield className="input-icon" />

                  <select
                    className="form-select"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="TRAINER">Trainer</option>
                    <option value="PARTICIPANT">Participant</option>
                  </select>

                </div>

              </div>
            </div>

            <button type="submit" className="btn btn-success w-100">
              Register
            </button>

            <hr />

            <p className="text-center mb-0">
              Already have an account?
              <Link to="/login" className="ms-2">
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Register;
