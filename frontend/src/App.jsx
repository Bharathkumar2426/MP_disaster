import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Disasters from "./pages/Disasters";
import TrainingCenters from "./pages/TrainingCenters";
import TrainingPrograms from "./pages/TrainingPrograms";
import SafetyPreparedness from "./pages/SafetyPreparedness";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/safety"
          element={
            <ProtectedRoute>
              <MainLayout>
                <SafetyPreparedness />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <Users />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/disasters"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Disasters />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/training-centers"
          element={
            <ProtectedRoute>
              <MainLayout>
                <TrainingCenters />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/training-programs"
          element={
            <ProtectedRoute>
              <MainLayout>
                <TrainingPrograms />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
