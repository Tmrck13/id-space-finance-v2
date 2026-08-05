import { createFileRoute } from "@tanstack/react-router";

/** Exposes only NON-SECRET Pi runtime config to the client (e.g. sandbox flag). */
export const Route = createFileRoute("/api/pi-config")({
  server: {
    handlers: {
      GET: async () => {
        const sandbox = String(process.env.PI_SANDBOX ?? "true").toLowerCase() === "true";
        return Response.json({ sandbox, version: "2.0" });
      },
    },
  },
});