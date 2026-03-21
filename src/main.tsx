import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import App from "./app/App.tsx";
import PrivacyPolicy from "./app/components/PrivacyPolicy";
import TermsOfService from "./app/components/TermsOfService";
import { AuthProvider } from "./app/components/AuthProvider";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);
  