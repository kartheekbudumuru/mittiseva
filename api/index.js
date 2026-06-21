import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "MittiSeva secure proxy is running." });
});

// Proxy endpoint for streaming
app.post("/api/chat/stream", async (req, res) => {
  const model = req.query.model || "gemini-2.0-flash";
  const apiKey = process.env.GEMINI_API_KEY;
  console.log(`[MittiSeva Backend] POST /api/chat/stream?model=${model} - Starting proxy request.`);

  if (!apiKey) {
    console.error("[MittiSeva Backend] GEMINI_API_KEY is not configured.");
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    console.log(`[MittiSeva Backend] Gemini API response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[MittiSeva Backend] Gemini API returned error: ${errorText}`);
      return res.status(response.status).send(errorText);
    }

    // Set headers for Server-Sent Events (SSE)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Pipe response body to express response stream
    if (typeof response.body.getReader === "function") {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } else {
      // Node.js Readable Stream fallback
      for await (const chunk of response.body) {
        res.write(chunk);
      }
    }
    res.end();
    console.log("[MittiSeva Backend] Successfully proxied all stream chunks.");
  } catch (error) {
    console.error("Error proxying stream to Gemini:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Non-streaming endpoint (optional fallback/direct use)
app.post("/api/chat", async (req, res) => {
  const model = req.query.model || "gemini-2.0-flash";
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Error proxying request to Gemini:", error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
