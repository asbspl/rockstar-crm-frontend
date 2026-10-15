import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { appConfig } from "../../../config/app.config";
import { useAuthContext } from "../../../contexts/useAuthContext";
import "../styles/auth.css";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, authState, hasPermission } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (authState === "pending") {
        navigate("/registration-status", { replace: true });
        return;
      }

      if (hasPermission("dashboard.read")) {
        navigate(redirectTo, { replace: true });
        return;
      }

      navigate("/forbidden", { replace: true });
    }
  }, [authState, hasPermission, isAuthenticated, isLoading, navigate, redirectTo]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const currentUser = await login(normalizedEmail, password);
      const nextRoute =
        (currentUser.status ?? "active").toLowerCase() === "pending" ||
        (currentUser.status ?? "active").toLowerCase() === "pending_approval"
          ? "/registration-status"
          : (currentUser.permissions ?? []).some((permission) => permission.toLowerCase() === "dashboard.read")
            ? redirectTo
            : "/forbidden";

      navigate(nextRoute, { replace: true });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to sign in with the provided credentials.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="auth-loading">Initializing secure session...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to={authState === "pending" ? "/registration-status" : hasPermission("dashboard.read") ? redirectTo : "/forbidden"} replace />;
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

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Email ID</label>
          <input
            id="email"
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@company.com"
            disabled={isSubmitting}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
          />

          <label htmlFor="password">Password</label>
          <div className="password-input">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
              disabled={isSubmitting}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error ? (
            <div id="login-error" className="auth-error" role="alert">
              {error}
            </div>
          ) : null}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Login"}
          </button>

          <div className="auth-footer">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <p className="auth-signup-text">
            Don&apos;t have an account? <Link to="/register">Sign up</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
