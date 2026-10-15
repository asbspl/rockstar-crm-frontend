import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth.api";
import { getPasswordStrength } from "../schemas/registration.schema";
import "../styles/auth.css";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = getPasswordStrength(password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Reset token is missing or expired. Use the link from the email you received.");
      return;
    }

    if (password.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (!strength.valid) {
      setError("Choose a stronger password with letters, numbers, and symbols.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setStatus(null);
    setIsSubmitting(true);

    try {
      await resetPassword(token, password);
      setStatus("Your password has been reset successfully. You can now sign in with your new password.");
      setPassword("");
      setConfirmPassword("");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Unable to reset your password.";
      setError(message.includes("expired") || message.includes("invalid") || message.includes("token")
        ? "This reset link is invalid or has expired. Please request a new password reset link."
        : message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel auth-panel--narrow">
        <div className="auth-branding">
          <div className="auth-logo">R</div>
          <div>
            <p className="auth-kicker">Rockstar CRM</p>
            <h1>Set new password</h1>
          </div>
        </div>

        {error ? <div className="auth-error" role="alert">{error}</div> : null}
        {status ? <div className="auth-success">{status}</div> : null}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="password">New password</label>
          <div className="password-input">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              disabled={isSubmitting}
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
          {password ? (
            <div className="password-strength" aria-live="polite">
              <span>Password strength:</span>
              <strong>{strength.label}</strong>
            </div>
          ) : null}

          <label htmlFor="confirmPassword">Confirm new password</label>
          <div className="password-input">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowConfirmPassword((value) => !value)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button type="submit" className="auth-submit" disabled={isSubmitting || !token}>
            {isSubmitting ? "Saving..." : "Update password"}
          </button>

          <div className="auth-footer">
            <Link to="/login">Return to sign in</Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default ResetPasswordPage;
