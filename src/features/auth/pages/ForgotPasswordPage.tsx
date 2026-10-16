
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

    // Validate the email address.
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      setStatus(null);
      return;
    }

    setError(null);
    setStatus(null);
    setIsSubmitting(true);

    try {
      // Your API currently returns { requested: boolean }.
      await requestPasswordReset(trimmedEmail);

      setStatus(
        "If an account exists for this email, a secure password reset link has been sent.",
      );
    } catch (caughtError: unknown) {
      let errorMessage =
        "Unable to process your password reset request. Please try again later.";

      if (typeof caughtError === "object" && caughtError !== null) {
        const apiError = caughtError as {
          message?: string;
          response?: {
            data?: {
              message?: string;
            };
          };
        };

        // Prefer the specific error returned by the backend.
        errorMessage =
          apiError.response?.data?.message ||
          apiError.message ||
          errorMessage;
      } else if (caughtError instanceof Error) {
        errorMessage = caughtError.message || errorMessage;
      }

      setError(errorMessage);
      setStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section
        className="auth-panel auth-panel--narrow"
        aria-labelledby="reset-password-heading"
      >
        <div className="auth-branding">
          <div className="auth-logo" aria-hidden="true">
            R
          </div>

          <div>
            <p className="auth-kicker">Rockstar CRM</p>
            <h1 id="reset-password-heading">Reset password</h1>
          </div>
        </div>

        <p>
          Enter your registered email address to request a password reset
          link.
        </p>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <label htmlFor="email">Email ID</label>

          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);

              // Clear old messages when the email changes.
              setError(null);
              setStatus(null);
            }}
            autoComplete="email"
            placeholder="you@company.com"
            disabled={isSubmitting}
            required
            aria-invalid={Boolean(error)}
            aria-describedby={
              error
                ? "reset-error"
                : status
                  ? "reset-success"
                  : undefined
            }
          />

          {error && (
            <div
              id="reset-error"
              className="auth-error"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          {status && (
            <div
              id="reset-success"
              className="auth-success"
              role="status"
              aria-live="polite"
            >
              {status}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={isSubmitting}
          >
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