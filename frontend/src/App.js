import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./lib/auth";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Vendors from "./pages/Vendors";
import Calculator from "./pages/Calculator";
import Compare from "./pages/Compare";
import Resources from "./pages/Resources";
import Login from "./pages/Login";
import Admin from "./pages/Admin";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/calculator" element={<Calculator />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </Layout>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: { borderRadius: 0, border: "1px solid #0A0A0A", fontFamily: "JetBrains Mono, monospace", fontSize: "12px" },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
