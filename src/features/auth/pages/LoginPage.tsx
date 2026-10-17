import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { appConfig } from "../../../config/app.config";
import { useAuthContext } from "../../../contexts/useAuthContext";

import "../styles/auth.css";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, isLoading } = useAuthContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore the originally requested page after a successful login.
  // Only accept local application paths, never external URLs.
  const requestedPath = (
    location.state as { from?: unknown } | null
  )?.from;

  const redirectTo =
    typeof requestedPath === "string" &&
    requestedPath.startsWith("/") &&
    !requestedPath.startsWith("//") &&
    !requestedPath.startsWith("/login") &&
    !requestedPath.startsWith("/forgot-password") &&
    !requestedPath.startsWith("/reset-password") &&
    !requestedPath.startsWith("/register")
      ? requestedPath
      : "/dashboard";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || isLoading) {
      return;
    }

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Authenticate with the backend and load the verified user profile.
      const currentUser = await login(normalizedEmail, password);

      const status = (currentUser.status ?? "active")
        .trim()
        .toLowerCase();

      if (status === "pending" || status === "pending_approval") {
        navigate("/registration-status", { replace: true });
        return;
      }

      if (status === "rejected" || status === "suspended") {
        setError(
          status === "rejected"
            ? "Your registration has been rejected. Please contact your administrator."
            : "Your account is suspended. Please contact your administrator.",
        );
        return;
      }

      const permissions = (currentUser.permissions ?? []).map(
        (permission) => permission.trim().toLowerCase(),
      );

      // Redirect only when the verified user has the required permission.
      if (permissions.includes("dashboard.read")) {
        navigate(redirectTo, { replace: true });
        return;
      }

      // Authenticated users without dashboard access must not enter it.
      navigate("/forbidden", { replace: true });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to sign in. Please check your credentials and try again.";

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-branding">
          <div className="auth-logo">R</div>

          <div>
            <p className="auth-kicker">Rockstar CRM</p>
            <h1>{appConfig.name}</h1>
          </div>
        </div>

        <div className="auth-copy">
          <h2>Welcome back</h2>
          <p>Sign in to continue managing your business operations.</p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <label htmlFor="email">Email ID</label>

          <input
            id="email"
            type="email"
            name="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
            autoComplete="username"
            placeholder="you@company.com"
            disabled={isSubmitting || isLoading}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
            required
          />

          <label htmlFor="password">Password</label>

          <div className="password-input">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              autoComplete="current-password"
              placeholder="Enter your password"
              disabled={isSubmitting || isLoading}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
              required
            />

            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={isSubmitting}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && (
            <div
              id="login-error"
              className="auth-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting
              ? "Signing in..."
              : isLoading
                ? "Checking session..."
                : "Login"}
          </button>

          <div className="auth-footer">
            <Link to="/forgot-password">
              Forgot password?
            </Link>
          </div>

          <p className="auth-signup-text">
            Don&apos;t have an account?{" "}
            <Link to="/register">Sign up</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;