import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import "./i18n.ts";
import SignIn from "./pages/Signin.tsx";
import AdminApplicationsPage from "./pages/Application.tsx";
import Header from "./components/Header.tsx";
import NotFound from "./pages/NotFound.tsx";
import Home from "./pages/Home.tsx";
import LogsPage from "./pages/Logs.tsx";
import AdminActivityPage from "./pages/Activity.tsx";
import Documentation from "./pages/docs/Documentation.tsx";
import { useAuthStore } from "./stores/authStore";
import MePage from "./pages/Me.tsx";

function Root() {
  const { isAuthenticated, hydrateFromServer } = useAuthStore();

  React.useEffect(() => {
    hydrateFromServer();
  }, [hydrateFromServer]);

  return (
    <>
      <Header isAuthenticated={isAuthenticated} />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/me" element={<MePage />} />
          <Route path="/activity" element={<AdminActivityPage />} />
          <Route path="/applications" element={<AdminApplicationsPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/docs" element={<Documentation />} />
          <Route path="/*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
