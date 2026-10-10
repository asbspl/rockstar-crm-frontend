
import { useEffect, useState } from "react";
import api from "./services/api";

type ConnectionStatus = {
  status: string;
  database: string;
};

function App() {
  const [backend, setBackend] = useState("Checking...");
  const [database, setDatabase] = useState("Checking...");

  useEffect(() => {
    api
      .get<ConnectionStatus>("/health/db")
      .then((response) => {
        setBackend("Connected");
        setDatabase(response.data.database);
      })
      .catch((error) => {
        console.error("Connection error:", error);
        setBackend("Connection failed");
        setDatabase("Unavailable");
      });
  }, []);

  return (
    <main className="container py-5">
      <h1>Rockstar CRM</h1>
      <p>System connection test</p>

      <div className="card p-4">
        <p><strong>Frontend:</strong> Running</p>
        <p><strong>Backend API:</strong> {backend}</p>
        <p><strong>PostgreSQL:</strong> {database}</p>
      </div>
    </main>
  );
}

export default App;
