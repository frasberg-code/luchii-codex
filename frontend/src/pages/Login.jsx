import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Home from "./Home";
import AuthModal from "../components/AuthModal";
import { useAuth } from "../context/AuthContext";

export default function Login({ mode = "login" }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const next = params.get("next")?.startsWith("/") ? params.get("next") : "/";

  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true });
  }, [loading, user, next, navigate]);

  return (
    <>
      <Home />
      <AuthModal open={!loading && !user} defaultMode={mode}
        onOpenChange={(o) => { if (!o) navigate(next, { replace: true }); }} />
    </>
  );
}
