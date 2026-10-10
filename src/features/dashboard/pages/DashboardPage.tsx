import { useEffect, useState } from "react";
import { testApiConnection } from "../api/health.api";

function DashboardPage() {
  const [backend, setBackend] = useState("Checking...");

  useEffect(() => {
    testApiConnection()
      .then(() => setBackend("Connected"))
      .catch((error) => {
        console.error("API connection error:", error);
        setBackend("Connection failed");
      });
  }, []);

  return (
    <main className="container py-5">
      <h1>Rockstar CRM</h1>
      <p>System connection test</p>

      <div className="card p-4">
        <p><strong>Frontend:</strong> Running</p>
        <p><strong>Backend API:</strong> {backend}</p>
      </div>
    </main>
  );
}

export default DashboardPage;