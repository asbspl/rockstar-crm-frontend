import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../api/auth.api";
import "../styles/auth.css";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    setError(null);
    setStatus(null);
    setIsSubmitting(true);

    try {
      await requestPasswordReset(trimmedEmail);
      setStatus("If an account exists for this email, a secure password reset link has been sent.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to request a password reset right now.",
      );
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
            <h1>Reset password</h1>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Email ID</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@company.com"
            disabled={isSubmitting}
            aria-invalid={Boolean(error)}
          />

          {error ? <div className="auth-error" role="alert">{error}</div> : null}
          {status ? <div className="auth-success">{status}</div> : null}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>

          <div className="auth-footer">
            <Link to="/login">Back to sign in</Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default ForgotPasswordPage;
