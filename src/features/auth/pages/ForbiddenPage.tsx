function ForbiddenPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel auth-panel--narrow">
        <div className="auth-branding">
          <div className="auth-logo">!</div>
          <div>
            <p className="auth-kicker">Access denied</p>
            <h1>Forbidden</h1>
          </div>
        </div>

        <div className="auth-copy">
          <p>You do not have permission to view this section of Rockstar CRM.</p>
        </div>

        <a className="auth-submit auth-submit--secondary" href="/dashboard">
          Return to dashboard
        </a>
      </section>
    </main>
  );
}

export default ForbiddenPage;
