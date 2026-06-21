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
  const apiKey = process.env.OPENROUTER_API_KEY;
  console.log(`[MittiSeva Backend] POST /api/chat/stream - Starting proxy request.`);

  if (!apiKey) {
    console.error("[MittiSeva Backend] OPENROUTER_API_KEY is not configured.");
    return res.status(500).json({ error: "OPENROUTER_API_KEY is not configured on the server." });
  }

  const models = [
    "deepseek/deepseek-chat-v3-0324:free",
    "qwen/qwen3-32b:free",
    "meta-llama/llama-3.3-70b-instruct:free"
  ];

  let response = null;
  let lastError = null;
  let activeModel = "";

  for (const model of models) {
    try {
      console.log(`[MittiSeva Backend] Attempting OpenRouter stream completion with model: ${model}`);
      activeModel = model;
      
      const body = {
        ...req.body,
        model: model,
        stream: true
      };

      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://mittiseva.vercel.app",
          "X-Title": "MittiSeva"
        },
        body: JSON.stringify(body),
      });

      console.log(`[MittiSeva Backend] OpenRouter stream response status for ${model}: ${response.status} ${response.statusText}`);

      if (response.ok) {
        break; // Got a valid stream response
      } else {
        const errorText = await response.text();
        lastError = new Error(`Model ${model} returned status ${response.status}: ${errorText}`);
        console.warn(`[MittiSeva Backend] OpenRouter model ${model} failed: ${errorText}`);
      }
    } catch (error) {
      lastError = error;
      console.error(`[MittiSeva Backend] Fetch error for model ${model}:`, error);
    }
  }

  if (!response || !response.ok) {
    const finalErrorMessage = lastError ? lastError.message : "All OpenRouter models failed.";
    return res.status(502).json({ error: finalErrorMessage });
  }

  // Set headers for Server-Sent Events (SSE)
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
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
    console.log(`[MittiSeva Backend] Successfully proxied all stream chunks for model ${activeModel}.`);
  } catch (error) {
    console.error("Error piping stream from OpenRouter:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Non-streaming endpoint (optional fallback/direct use)
app.post("/api/chat", async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  console.log(`[MittiSeva Backend] POST /api/chat - Starting proxy request.`);

  if (!apiKey) {
    return res.status(500).json({ error: "OPENROUTER_API_KEY is not configured on the server." });
  }

  const models = [
    "deepseek/deepseek-chat-v3-0324:free",
    "qwen/qwen3-32b:free",
    "meta-llama/llama-3.3-70b-instruct:free"
  ];

  let response = null;
  let lastError = null;
  let activeModel = "";

  for (const model of models) {
    try {
      console.log(`[MittiSeva Backend] Attempting OpenRouter completion with model: ${model}`);
      activeModel = model;
      
      const body = {
        ...req.body,
        model: model
      };

      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://mittiseva.vercel.app",
          "X-Title": "MittiSeva"
        },
        body: JSON.stringify(body),
      });

      console.log(`[MittiSeva Backend] OpenRouter response status for ${model}: ${response.status} ${response.statusText}`);

      if (response.ok) {
        break;
      } else {
        const errorText = await response.text();
        lastError = new Error(`Model ${model} returned status ${response.status}: ${errorText}`);
        console.warn(`[MittiSeva Backend] OpenRouter model ${model} failed: ${errorText}`);
      }
    } catch (error) {
      lastError = error;
      console.error(`[MittiSeva Backend] Fetch error for model ${model}:`, error);
    }
  }

  if (!response || !response.ok) {
    const finalErrorMessage = lastError ? lastError.message : "All OpenRouter models failed.";
    return res.status(502).json({ error: finalErrorMessage });
  }

  try {
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Error parsing response from OpenRouter:", error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
