import app from "./api/index.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[MittiSeva Backend] Secure proxy server running locally on http://localhost:${PORT}`);
});
