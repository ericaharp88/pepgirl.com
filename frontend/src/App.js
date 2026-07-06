import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./lib/auth";
import { SettingsProvider, useSettings } from "./lib/settings";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Vendors from "./pages/Vendors";
import Calculator from "./pages/Calculator";
import Compare from "./pages/Compare";
import Resources from "./pages/Resources";
import Login from "./pages/Login";
import Admin from "./pages/Admin";

/* /compare is behind a feature flag — if disabled we redirect to home */
function GatedCompare() {
  const { settings } = useSettings();
  if (settings?.price_tool_enabled === false) return <Navigate to="/" replace />;
  return <Compare />;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <SettingsProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/vendors" element={<Vendors />} />
                <Route path="/calculator" element={<Calculator />} />
                <Route path="/compare" element={<GatedCompare />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </Layout>
            <Toaster richColors position="top-right" />
          </BrowserRouter>
        </SettingsProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
