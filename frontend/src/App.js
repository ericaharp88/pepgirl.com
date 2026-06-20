import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./lib/auth";
import Blank from "./pages/Blank";
import Login from "./pages/Login";
import Admin from "./pages/Admin";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Admin stays accessible so the owner can come back later */}
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<Admin />} />
            {/* Everything else (incl. home, vendors, calculator, etc.) is blank */}
            <Route path="*" element={<Blank />} />
          </Routes>
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
