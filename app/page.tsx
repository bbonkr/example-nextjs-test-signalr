"use client";

import { useRef, useState } from "react";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";

type ConnectionStatus = "idle" | "connecting" | "connected" | "failed";

interface InvokeResult {
  id: number;
  name: string;
  status: "pending" | "success" | "error";
  result?: unknown;
  error?: string;
}

function parseParams(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return [];
  }
  return trimmed.split(",").map((p) => p.trim());
}

interface HubFunctionInput {
  id: number;
  name: string;
  params: string;
}

let nextFunctionId = 1;

function createFunctionInput(): HubFunctionInput {
  return { id: nextFunctionId++, name: "", params: "" };
}

export default function Home() {
  const [accessToken, setAccessToken] = useState("");
  const [hubUrl, setHubUrl] = useState("");
  const [functions, setFunctions] = useState<HubFunctionInput[]>([
    createFunctionInput(),
  ]);

  const updateFunction = (
    id: number,
    field: "name" | "params",
    value: string
  ) => {
    setFunctions((prev) =>
      prev.map((fn) => (fn.id === id ? { ...fn, [field]: value } : fn))
    );
  };

  const addFunction = () => {
    setFunctions((prev) => [...prev, createFunctionInput()]);
  };

  const removeFunction = (id: number) => {
    setFunctions((prev) => prev.filter((fn) => fn.id !== id));
  };

  const canConnect =
    accessToken.trim() !== "" &&
    hubUrl.trim() !== "" &&
    functions.length > 0 &&
    functions.every((fn) => fn.name.trim() !== "");

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const connectionRef = useRef<HubConnection | null>(null);
  const [invokeResults, setInvokeResults] = useState<InvokeResult[]>([]);

  const invokeFunctions = async (connection: HubConnection) => {
    const snapshot = functions;
    setInvokeResults(
      snapshot.map((fn) => ({ id: fn.id, name: fn.name, status: "pending" }))
    );

    for (const fn of snapshot) {
      const params = parseParams(fn.params);
      try {
        const result = await connection.invoke(fn.name, ...params);
        setInvokeResults((prev) =>
          prev.map((r) =>
            r.id === fn.id ? { ...r, status: "success", result } : r
          )
        );
      } catch (err) {
        setInvokeResults((prev) =>
          prev.map((r) =>
            r.id === fn.id
              ? {
                  ...r,
                  status: "error",
                  error: err instanceof Error ? err.message : String(err),
                }
              : r
          )
        );
      }
    }
  };

  const handleConnect = async () => {
    if (connectionRef.current) {
      await connectionRef.current.stop();
      connectionRef.current = null;
    }

    setConnectionStatus("connecting");
    setConnectionError(null);
    setInvokeResults([]);

    const connection: HubConnection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => accessToken,
        withCredentials: false,
      })
      .build();

    try {
      await connection.start();
      connectionRef.current = connection;
      setConnectionStatus("connected");
      await invokeFunctions(connection);
    } catch (err) {
      connectionRef.current = null;
      setConnectionStatus("failed");
      setConnectionError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>SignalR Hub Tester</h1>

      <section>
        <label htmlFor="accessToken">Access Token</label>
        <br />
        <input
          id="accessToken"
          type="password"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          style={{ width: "100%" }}
        />
      </section>

      <section style={{ marginTop: 16 }}>
        <label htmlFor="hubUrl">Hub URL</label>
        <br />
        <input
          id="hubUrl"
          type="text"
          value={hubUrl}
          onChange={(e) => setHubUrl(e.target.value)}
          style={{ width: "100%" }}
        />
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Hub Functions</h2>
        {functions.map((fn) => (
          <div key={fn.id} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              placeholder="function name"
              value={fn.name}
              onChange={(e) => updateFunction(fn.id, "name", e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              type="text"
              placeholder="params (comma separated)"
              value={fn.params}
              onChange={(e) => updateFunction(fn.id, "params", e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={() => removeFunction(fn.id)}
              disabled={functions.length <= 1}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={addFunction}>
          Add Function
        </button>
      </section>

      <section style={{ marginTop: 24 }}>
        <button
          type="button"
          disabled={
            !canConnect ||
            connectionStatus === "connecting" ||
            connectionStatus === "connected"
          }
          onClick={handleConnect}
        >
          Connect
        </button>
        {connectionStatus === "connecting" && <p>Connecting...</p>}
        {connectionStatus === "connected" && (
          <p style={{ color: "green" }}>Connected</p>
        )}
        {connectionStatus === "failed" && (
          <div
            style={{
              marginTop: 8,
              padding: 8,
              border: "1px solid #b00020",
              background: "#fdecea",
              color: "#b00020",
            }}
          >
            Connection failed: {connectionError}
          </div>
        )}
      </section>

      {invokeResults.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2>Function Results</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {invokeResults.map((r) => (
              <li
                key={r.id}
                style={{
                  padding: 8,
                  marginBottom: 4,
                  border: "1px solid #ccc",
                  background:
                    r.status === "error"
                      ? "#fff4e5"
                      : r.status === "success"
                        ? "#eaf7ea"
                        : "transparent",
                }}
              >
                <strong>{r.name}</strong>:{" "}
                {r.status === "pending" && "pending..."}
                {r.status === "success" && (
                  <span style={{ color: "green" }}>
                    success — {JSON.stringify(r.result)}
                  </span>
                )}
                {r.status === "error" && (
                  <span style={{ color: "#a35a00" }}>
                    hub exception — {r.error}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
