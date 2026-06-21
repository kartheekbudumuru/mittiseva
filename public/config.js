// ==========================================
// MITTISEVA SUPABASE CONFIGURATION
// ==========================================
// Get your credentials from: Supabase Dashboard → Project Settings → API
// You need: Project URL and the "anon / public" key (starts with eyJ...)
// ==========================================

const SUPABASE_URL = window.env?.SUPABASE_URL || "https://sqdrqpkcwfapxajztiwz.supabase.co";

// IMPORTANT: Use the "anon public" JWT key (starts with eyJ...), NOT the publishable key
const SUPABASE_ANON_KEY = window.env?.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZHJxcGtjd2ZhcHhhanp0aXd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NTg2OTgsImV4cCI6MjA5NzUzNDY5OH0.LJDn02ixvFFS0OCKipDiiNXs27aKR0m3qop2FMsb68M";

// Initialize Supabase Client
if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
  try {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[MittiSeva] Supabase client initialized successfully.');
  } catch (e) {
    console.error('[MittiSeva] Failed to initialize Supabase client:', e.message);
    window.supabase = null;
  }
} else {
  console.warn('[MittiSeva] Supabase SDK not loaded. Running in offline/demo mode.');
  window.supabase = null;
}
// ==========================================
// KRISHI AI CONFIGURATION
// ==========================================
// MittiSeva now uses OpenRouter AI.
// The API key is securely managed on the backend server.
// ==========================================
