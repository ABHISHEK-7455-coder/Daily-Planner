import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// import { supabase } from "./supabase";
import { useAuth } from "../context/AuthContext";
import "./Login.css";
import { supabase } from "../Supabase";

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");

      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        });
        if (error) throw error;
        setSuccess("Account created! Check your email to verify, then log in.");
        setMode("login");

      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSuccess("Reset link sent! Check your inbox.");
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setError(error.message);
  };

  const titles = {
    login:  { heading: "Welcome back", sub: "Your cozy planner is waiting ☕" },
    signup: { heading: "Start fresh", sub: "Create your cozy planning space 🌱" },
    forgot: { heading: "Reset password", sub: "We'll send a magic link to your inbox ✉️" },
  };

  return (
    <div className="login-page">
      {/* Decorative blobs */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <i className="fa-solid fa-calendar-check" />
          </div>
          <span>Cozy Space</span>
        </div>

        {/* Heading */}
        <div className="login-heading">
          <h1>{titles[mode].heading}</h1>
          <p>{titles[mode].sub}</p>
        </div>

        {/* Mode tabs */}
        {mode !== "forgot" && (
          <div className="login-tabs">
            <button
              className={`login-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
            >
              Log in
            </button>
            <button
              className={`login-tab ${mode === "signup" ? "active" : ""}`}
              onClick={() => { setMode("signup"); setError(""); setSuccess(""); }}
            >
              Sign up
            </button>
          </div>
        )}

        {/* Alerts */}
        {error   && <div className="login-alert login-alert-error">⚠️ {error}</div>}
        {success && <div className="login-alert login-alert-success">✅ {success}</div>}

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="login-field">
              <label>Your name</label>
              <div className="login-input-wrap">
                <i className="fa-solid fa-user" />
                <input
                  type="text"
                  placeholder="Arjun, Priya, ..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div className="login-field">
            <label>Email address</label>
            <div className="login-input-wrap">
              <i className="fa-solid fa-envelope" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div className="login-field">
              <label>Password</label>
              <div className="login-input-wrap">
                <i className="fa-solid fa-lock" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPassword(p => !p)}
                  tabIndex={-1}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
              {mode === "login" && (
                <button
                  type="button"
                  className="login-forgot-link"
                  onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                >
                  Forgot password?
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            className={`login-submit ${loading ? "loading" : ""}`}
            disabled={loading}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : mode === "login" ? (
              <><i className="fa-solid fa-arrow-right-to-bracket" /> Log in</>
            ) : mode === "signup" ? (
              <><i className="fa-solid fa-seedling" /> Create account</>
            ) : (
              <><i className="fa-solid fa-paper-plane" /> Send reset link</>
            )}
          </button>
        </form>

        {/* Divider + Google */}
        {mode !== "forgot" && (
          <>
            <div className="login-divider">
              <span>or continue with</span>
            </div>

            <button className="login-google" onClick={handleGoogleLogin}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>
          </>
        )}

        {/* Back link for forgot */}
        {mode === "forgot" && (
          <button
            className="login-back"
            onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
          >
            ← Back to log in
          </button>
        )}

        {/* Footer illustration text */}
        <p className="login-tagline">Plan calmly. Live fully. 🌿</p>
      </div>
    </div>
  );
}