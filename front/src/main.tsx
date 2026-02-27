import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import "./i18n.ts";
import SignIn from "./pages/Signin.tsx";
import SignUp from "./pages/Signup.tsx";
import ConfirmEmail from "./pages/ConfirmEmail.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import ConfirmPasswordChange from "./pages/ConfirmPasswordChange.tsx";
import AdminApplicationsPage from "./pages/Application.tsx";
import ApplicationSettingsPage from "./pages/ApplicationSettings.tsx";
import Header from "./components/Header.tsx";
import NotFound from "./pages/NotFound.tsx";
import Home from "./pages/Home.tsx";
import LogsPage from "./pages/Logs.tsx";
import MailsPage from "./pages/Mails.tsx";
import AdminActivityPage from "./pages/Activity.tsx";
import Documentation from "./pages/docs/Documentation.tsx";
import { useAuthStore } from "./stores/authStore";
import { useThemeStore } from "./stores/themeStore";
import { Toaster } from "sonner";
import MePage from "./pages/Me.tsx";
import TermsPage from "./pages/Terms.tsx";
import AboutPage from "./pages/About.tsx";

function Root() {
  const { isAuthenticated, hydrateFromServer } = useAuthStore();

  React.useEffect(() => {
    hydrateFromServer();
    useThemeStore.getState().initTheme();
  }, [hydrateFromServer]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toaster position="top-right" richColors />
      <Header isAuthenticated={isAuthenticated} />
      <BrowserRouter>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/confirm-email" element={<ConfirmEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/confirm-password-change" element={<ConfirmPasswordChange />} />
          <Route path="/me" element={<MePage />} />
          <Route path="/activity" element={<AdminActivityPage />} />
          <Route path="/applications" element={<AdminApplicationsPage />} />
          <Route path="/applications/:id/settings" element={<ApplicationSettingsPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/mails" element={<MailsPage />} />
          <Route path="/docs" element={<Documentation />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/*" element={<NotFound />} />
        </Routes>
        </div>
      </BrowserRouter>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
