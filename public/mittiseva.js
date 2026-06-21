// Global Supabase client reference
var supabase = window.supabase;

// ══ State ══
let currentLang = 'en';
let soilValues = {ph:6.5, n:220, p:30, k:160, moisture:50, oc:0.6};
let analysisResult = null;
let chatOpen = false;
let trendChartInstance = null;
let currentUser = null;
let currentProfile = null;

const HISTORY = [];

const PARAMS = [
  {key:'ph',  label:'pH Level',          min:0, max:14,  step:0.1,  hint:'Ideal: 6.0 – 7.5'},
  {key:'n',   label:'Nitrogen (N) kg/ha',min:0, max:600, step:5,    hint:'Ideal: 280 – 560 kg/ha'},
  {key:'p',   label:'Phosphorus (P) kg/ha',min:0,max:120,step:1,   hint:'Ideal: 25 – 50 kg/ha'},
  {key:'k',   label:'Potassium (K) kg/ha',min:0, max:400,step:5,   hint:'Ideal: 108 – 280 kg/ha'},
  {key:'moisture',label:'Moisture (%)',  min:0, max:100, step:1,    hint:'Ideal: 40 – 70%'},
  {key:'oc',  label:'Organic Carbon (%)',min:0, max:3,   step:0.05, hint:'Ideal: above 0.75%'},
];

// ── Expose live state to ai_engine.js ──
// ai_engine.js reads these via window.* to build personalized Gemini prompts
Object.defineProperty(window, 'currentLang',    { get: () => currentLang });
Object.defineProperty(window, 'currentProfile', { get: () => currentProfile });
Object.defineProperty(window, 'currentUser',    { get: () => currentUser });
Object.defineProperty(window, 'HISTORY',        { get: () => HISTORY });
Object.defineProperty(window, 'soilValues',     { get: () => soilValues });



// ══ Multi-Language Translation Dictionary ══
const TRANSLATIONS = {
  en: {
    'hero-tag': '🇮🇳 Free Government Service · AP & Telangana',
    'hero-title': 'Know Your <span class="accent">Soil.</span><br>Grow Your Future.',
    'hero-sub': 'Free soil testing and crop advice for every farmer in Andhra Pradesh & Telangana. Results in minutes, not weeks.',
    'btn-analyse': '🔬 Analyse My Soil',
    'btn-hero-login': 'Login / Register',
    'what-you-get': 'What you get',
    'feature-title': 'Everything a farmer needs',
    'feat-soil-title': 'Soil Analysis',
    'feat-soil-desc': 'Check pH, N, P, K, moisture and organic carbon',
    'feat-fert-title': 'Fertilizer Tips',
    'feat-fert-desc': 'Right fertilizer, right dose, right time',
    'feat-crop-title': 'Crop Guide',
    'feat-crop-desc': 'Best crops suited to your exact soil',
    'feat-rep-title': 'Health Report',
    'feat-rep-desc': 'Download & share with your agriculture officer',
    'test-title': '2.4 lakh+ farmers trust MittiSeva',
    'test-sub': 'Across 13 districts in AP & Telangana',
    'test-body': '"After testing my soil, I switched to groundnut from cotton. My income went up by 40% this season."<br><strong>— Ramaiah, Kurnool</strong>',
    'btn-start-test': '🔬 Start Soil Analysis',
    'btn-view-past': 'View My Past Tests',
    'btn-chat-home-lbl': 'Krishi AI',
    'btn-login-reg': 'Login',
    'authTitle': 'Welcome Back',
    'authSub': 'Enter your details to continue.',
    'label-name': 'Full Name',
    'label-phone': 'Phone Number',
    'label-village': 'Village / Location',
    'label-pass': 'Password',
    'btn-auth-submit': 'Login →',
    'auth-switch-text': 'New here? Register',
    'form-title': 'Enter Your Soil Details',
    'form-sub': 'Move the sliders or type values from your soil test report.',
    'btn-run-analysis': '🔬 Analyse Soil',
    'results-title': 'Your Soil Results',
    'results-sub': 'Here\'s what your soil is telling you.',
    'res-nut-title': 'Nutrient Status',
    'res-nut-sub': 'Based on your readings',
    'res-fert-title': '🌱 Fertilizer Recommendations',
    'res-crop-title': '🌾 Crop Recommendations',
    'btn-gen-report': '📋 Generate Report',
    'btn-retest': 'Re-test with new values',
    'report-title': 'Soil Health Report',
    'report-sub': 'Ready to download and share with your agriculture officer.',
    'rep-cert': 'SOIL TEST CERTIFICATE',
    'rep-gov': 'Government of Andhra Pradesh · Agriculture Dept.',
    'rep-sec-farmer': 'Farmer Details',
    'rep-label-name': 'Name',
    'rep-label-village': 'Village',
    'rep-label-date': 'Test Date',
    'rep-sec-score': 'Health Score',
    'rep-lbl-score': 'Out of 100 points',
    'rep-sec-readings': 'Soil Readings',
    'rep-sec-recs': 'Recommendations',
    'btn-print': '⬇ Download / Print Report',
    'btn-share': '📤 Share Report',
    'btn-view-hist': 'View my soil history →',
    'history-title': 'My Soil History',
    'history-sub': 'Your past soil tests, all in one place.',
    'hist-chart-title': 'Health Score Over Time',
    'hist-lbl-latest': 'Latest Score',
    'hist-lbl-imp': 'Improvement',
    'hist-lbl-tests': 'Tests Done',
    'hist-tbl-title': 'All Test Records',
    'hist-th-date': 'Date',
    'hist-th-ph': 'pH',
    'hist-th-n': 'N (kg/ha)',
    'hist-th-score': 'Score',
    'btn-quick-retest': '🔬 Quick Re-test',
    'sb-lbl-home': 'Home',
    'sb-lbl-profile': 'Profile',
    'sb-lbl-analyse': 'Analyse Soil',
    'sb-lbl-results': 'Results',
    'sb-lbl-report': 'Report',
    'sb-lbl-history': 'History',
    'sb-lbl-chat': 'Krishi AI',
    'sb-lbl-logout': 'Logout',
    'btnLogout': 'Logout',
    'sidebar-sub': 'Soil Integrity',
    'chat-title-full': 'Krishi AI Assistant',
    'chat-sub-full': 'Ask me anything about soil health, crops, or fertilizers.',
    'bn-lbl-home': 'Home',
    'bn-lbl-analyse': 'Analyse',
    'bn-lbl-results': 'Results',
    'bn-lbl-history': 'History',
    'chat-title-mobile': '🌿 Krishi AI Assistant',
    'chat-welcome-mobile': 'Namaste! I\'m Krishi AI. Ask me anything about soil, crops, or fertilizers. I\'m here to help! 🌿',
    'chat-fab-lbl': 'Ask Krishi AI'
  },
  te: {
    'hero-tag': '🇮🇳 ఉచిత ప్రభుత్వ సేవ · ఆంధ్రప్రదేశ్ & తెలంగాణ',
    'hero-title': 'మీ మట్టిని తెలుసుకోండి.<br>మీ భవిష్యత్తును పండించండి.',
    'hero-sub': 'ఆంధ్రప్రదేశ్ & తెలంగాణలోని ప్రతి రైతుకు ఉచిత మట్టి పరీక్ష మరియు పంట సలహా. వారాలు కాదు, నిమిషాల్లో ఫలితాలు.',
    'btn-analyse': '🔬 నా మట్టిని పరీక్షించండి',
    'btn-hero-login': 'లాగిన్ / రిజిస్ట్రేషన్',
    'what-you-get': 'మీకు లభించేవి',
    'feature-title': 'రైతుకు కావలసినవన్నీ',
    'feat-soil-title': 'మట్టి విశ్లేషణ',
    'feat-soil-desc': 'pH, N, P, K, తేమ మరియు సేంద్రీయ కర్బనాన్ని తనిఖీ చేయండి',
    'feat-fert-title': 'ఎరువుల చిట్కాలు',
    'feat-fert-desc': 'సరైన ఎరువులు, సరైన మోతాదు, సరైన సమయం',
    'feat-crop-title': 'పంటల గైడ్',
    'feat-crop-desc': 'మీ మట్టికి సరిపోయే ఉత్తమ పంటలు',
    'feat-rep-title': 'ఆరోగ్య నివేదిక',
    'feat-rep-desc': 'డౌన్‌లోడ్ చేసి వ్యవసాయ అధికారితో పంచుకోండి',
    'test-title': '2.4 లక్షలకు పైగా నమ్మకమైన రైతులు',
    'test-sub': 'ఆంధ్రప్రదేశ్ & తెలంగాణలోని 13 జిల్లాల్లో',
    'test-body': '"నా మట్టిని పరీక్షించిన తర్వాత, నేను పత్తి నుండి వేరుశనగకు మారాను. ఈ సీజన్‌లో నా ఆదాయం 40% పెరిగింది."<br><strong>— రామయ్య, కర్నూలు</strong>',
    'btn-start-test': '🔬 మట్టి పరీక్షను ప్రారంభించండి',
    'btn-view-past': 'నా పాత పరీక్షలు చూడండి',
    'btn-chat-home-lbl': 'కృషి AI',
    'btn-login-reg': 'లాగిన్',
    'authTitle': 'తిరిగి స్వాగతం',
    'authSub': 'కొనసాగించడానికి మీ వివరాలను నమోదు చేయండి.',
    'label-name': 'పూర్తి పేరు',
    'label-phone': 'ఫోన్ నంబర్',
    'label-village': 'గ్రామం / ప్రదేశం',
    'label-pass': 'పాస్‌వర్డ్',
    'btn-auth-submit': 'లాగిన్ →',
    'auth-switch-text': 'నమోదు చేసుకోండి',
    'form-title': 'మీ మట్టి వివరాలు నమోదు చేయండి',
    'form-sub': 'మట్టి పరీక్ష నివేదిక నుండి స్లైడర్‌లను జరపండి లేదా విలువలను టైప్ చేయండి.',
    'btn-run-analysis': '🔬 విశ్లేషించండి',
    'results-title': 'మీ మట్టి పరీక్ష ఫలితాలు',
    'results-sub': 'మీ మట్టి ఆరోగ్య నివేదిక ఇక్కడ చూడండి.',
    'res-nut-title': 'పోషకాల స్థితి',
    'res-nut-sub': 'నమోదు చేసిన రీడింగ్ల ప్రకారం',
    'res-fert-title': '🌱 ఎరువుల సిఫార్సులు',
    'res-crop-title': '🌾 పంట సిఫార్సులు',
    'btn-gen-report': '📋 నివేదికను రూపొందించండి',
    'btn-retest': 'కొత్త విలువలతో మళ్లీ పరీక్షించండి',
    'report-title': 'మట్టి ఆరోగ్య నివేదిక',
    'report-sub': 'డౌన్‌లోడ్ చేయడానికి మరియు మీ వ్యవసాయ అధికారితో పంచుకోవడానికి సిద్ధంగా ఉంది.',
    'rep-cert': 'మట్టి పరీక్ష ధృవీకరణ పత్రం',
    'rep-gov': 'ఆంధ్రప్రదేశ్ ప్రభుత్వం · వ్యవసాయ శాఖ',
    'rep-sec-farmer': 'రైతు వివరాలు',
    'rep-label-name': 'పేరు',
    'rep-label-village': 'గ్రామం',
    'rep-label-date': 'పరీక్ష తేదీ',
    'rep-sec-score': 'ఆరోగ్య స్కోర్',
    'rep-lbl-score': '100 పాయింట్లకు గాను',
    'rep-sec-readings': 'మట్టి విలువలు',
    'rep-sec-recs': 'సిఫార్సులు',
    'btn-print': '⬇ నివేదికను డౌన్‌లోడ్ / ప్రింట్ చేయండి',
    'btn-share': '📤 నివేదికను పంచుకోండి',
    'btn-view-hist': 'నా మట్టి చరిత్రను చూడండి →',
    'history-title': 'నా మట్టి చరిత్ర',
    'history-sub': 'మీ పాత మట్టి పరీక్షలు, అన్నీ ఒకే చోట.',
    'hist-chart-title': 'ఆరోగ్య స్కోర్ మార్పులు',
    'hist-lbl-latest': 'తాజా స్కోర్',
    'hist-lbl-imp': 'మెరుగుదల',
    'hist-lbl-tests': 'చేసిన పరీక్షలు',
    'hist-tbl-title': 'అన్ని పరీక్షల వివరాలు',
    'hist-th-date': 'తేదీ',
    'hist-th-ph': 'pH విలువ',
    'hist-th-n': 'నత్రజని (కిలో/హెక్టార్)',
    'hist-th-score': 'స్కోరు',
    'btn-quick-retest': '🔬 త్వరిత పునఃపరీక్ష',
    'sb-lbl-home': 'హోమ్',
    'sb-lbl-profile': 'ప్రొఫైల్',
    'sb-lbl-analyse': 'మట్టి విశ్లేషణ',
    'sb-lbl-results': 'ఫలితాలు',
    'sb-lbl-report': 'నివేదిక',
    'sb-lbl-history': 'చరిత్ర',
    'sb-lbl-chat': 'కృషి AI',
    'sb-lbl-logout': 'లాగౌట్',
    'btnLogout': 'లాగౌట్',
    'sidebar-sub': 'మట్టి సమగ్రత',
    'chat-title-full': 'కృషి AI అసిస్టెంట్',
    'chat-sub-full': 'మట్టి ఆరోగ్యం, పంటలు లేదా ఎరువుల గురించి నన్ను ఏదైనా అడగండి.',
    'bn-lbl-home': 'హోమ్',
    'bn-lbl-analyse': 'విశ్లేషించండి',
    'bn-lbl-results': 'ఫలితాలు',
    'bn-lbl-history': 'చరిత్ర',
    'chat-title-mobile': '🌿 కృషి AI అసిస్టెంట్',
    'chat-welcome-mobile': 'నమస్తే! నేను కృషి AI. మట్టి, పంటలు లేదా ఎరువుల గురించి నన్ను ఏదైనా అడగండి. నేను మీకు సహాయం చేయడానికి ఇక్కడ ఉన్నాను! 🌿',
    'chat-fab-lbl': 'కృషి AIని అడగండి'
  },
  hi: {
    'hero-tag': '🇮🇳 मुफ़्त सरकारी सेवा · आंध्र प्रदेश और तेलंगाना',
    'hero-title': 'अपनी मिट्टी जानें।<br>अपना भविष्य उगाएं।',
    'hero-sub': 'आंध्र प्रदेश और तेलंगाना के हर किसान के लिए मुफ़्त मिट्टी परीक्षण और फसल सलाह। हफ्तों नहीं, मिनटों में परिणाम।',
    'btn-analyse': '🔬 मेरी मिट्टी का परीक्षण करें',
    'btn-hero-login': 'लॉगिन / पंजीकरण',
    'what-you-get': 'आपको क्या मिलेगा',
    'feature-title': 'किसान की हर ज़रूरत',
    'feat-soil-title': 'मिट्टी विश्लेषण',
    'feat-soil-desc': 'pH, N, P, K, नमी और जैविक कार्बन की जाँच करें',
    'feat-fert-title': 'उर्वरक सुझाव',
    'feat-fert-desc': 'सही उर्वरक, सही मात्रा, सही समय',
    'feat-crop-title': 'फसल गाइड',
    'feat-crop-desc': 'आपकी मिट्टी के लिए सर्वोत्तम फसलें',
    'feat-rep-title': 'स्वास्थ्य रिपोर्ट',
    'feat-rep-desc': 'डाउनलोड करें और कृषि अधिकारी से साझा करें',
    'test-title': '2.4 लाख+ किसानों का भरोसा',
    'test-sub': 'AP और तेलंगाना के 13 जिलों में',
    'test-body': '"मिट्टी परीक्षण के बाद मैंने कपास छोड़ मूंगफली लगाई। इस सीज़न में आमदनी 40% बढ़ी।"<br><strong>— रमैया, कुर्नूल</strong>',
    'btn-start-test': '🔬 मिट्टी परीक्षण शुरू करें',
    'btn-view-past': 'मेरे पुराने परीक्षण देखें',
    'btn-chat-home-lbl': 'कृषि AI',
    'btn-login-reg': 'लॉगिन',
    'authTitle': 'वापस स्वागत है',
    'authSub': 'जारी रखने के लिए अपना विवरण दर्ज करें।',
    'label-name': 'पूरा नाम',
    'label-phone': 'फ़ोन नंबर',
    'label-village': 'गाँव / स्थान',
    'label-pass': 'पासवर्ड',
    'btn-auth-submit': 'लॉगिन →',
    'auth-switch-text': 'नए हैं? पंजीकरण करें',
    'form-title': 'अपनी मिट्टी का विवरण दर्ज करें',
    'form-sub': 'स्लाइडर्स को हिलाएं या मिट्टी परीक्षण रिपोर्ट से मान टाइप करें।',
    'btn-run-analysis': '🔬 मिट्टी विश्लेषण करें',
    'results-title': 'आपके मिट्टी के परिणाम',
    'results-sub': 'आपकी मिट्टी आपसे यह कह रही है।',
    'res-nut-title': 'पोषक तत्व स्थिति',
    'res-nut-sub': 'आपके रीडिंग के आधार पर',
    'res-fert-title': '🌱 उर्वरक सिफारिशें',
    'res-crop-title': '🌾 फसल सिफारिशें',
    'btn-gen-report': '📋 रिपोर्ट बनाएं',
    'btn-retest': 'नए मानों के साथ फिर से परीक्षण करें',
    'report-title': 'मिट्टी स्वास्थ्य रिपोर्ट',
    'report-sub': 'डाउनलोड करने और कृषि अधिकारी से साझा करने के लिए तैयार।',
    'rep-cert': 'मिट्टी परीक्षण प्रमाण पत्र',
    'rep-gov': 'आंध्र प्रदेश सरकार · कृषि विभाग',
    'rep-sec-farmer': 'किसान विवरण',
    'rep-label-name': 'नाम',
    'rep-label-village': 'गाँव',
    'rep-label-date': 'परीक्षण तिथि',
    'rep-sec-score': 'स्वास्थ्य स्कोर',
    'rep-lbl-score': '100 अंकों में से',
    'rep-sec-readings': 'मिट्टी रीडिंग',
    'rep-sec-recs': 'सिफारिशें',
    'btn-print': '⬇ रिपोर्ट डाउनलोड / प्रिंट करें',
    'btn-share': '📤 रिपोर्ट साझा करें',
    'btn-view-hist': 'मेरा मिट्टी इतिहास देखें →',
    'history-title': 'मेरा मिट्टी इतिहास',
    'history-sub': 'आपके सभी पुराने मिट्टी परीक्षण एक जगह।',
    'hist-chart-title': 'समय के साथ स्वास्थ्य स्कोर',
    'hist-lbl-latest': 'नवीनतम स्कोर',
    'hist-lbl-imp': 'सुधार',
    'hist-lbl-tests': 'किए गए परीक्षण',
    'hist-tbl-title': 'सभी परीक्षण रिकॉर्ड',
    'hist-th-date': 'तारीख',
    'hist-th-ph': 'pH',
    'hist-th-n': 'N (kg/ha)',
    'hist-th-score': 'स्कोर',
    'btn-quick-retest': '🔬 त्वरित पुनः परीक्षण',
    'sb-lbl-home': 'होम',
    'sb-lbl-profile': 'प्रोफाइल',
    'sb-lbl-analyse': 'मिट्टी परीक्षण',
    'sb-lbl-results': 'परिणाम',
    'sb-lbl-report': 'रिपोर्ट',
    'sb-lbl-history': 'इतिहास',
    'sb-lbl-chat': 'कृषि AI',
    'sb-lbl-logout': 'लॉगआउट',
    'btnLogout': 'लॉगआउट',
    'sidebar-sub': 'मिट्टी सत्यनिष्ठा',
    'chat-title-full': 'कृषि AI सहायक',
    'chat-sub-full': 'मिट्टी स्वास्थ्य, फसलों या उर्वरकों के बारे में कुछ भी पूछें।',
    'bn-lbl-home': 'होम',
    'bn-lbl-analyse': 'विश्लेषण',
    'bn-lbl-results': 'परिणाम',
    'bn-lbl-history': 'इतिहास',
    'chat-title-mobile': '🌿 कृषि AI सहायक',
    'chat-welcome-mobile': 'नमस्ते! मैं कृषि AI हूँ। मिट्टी, फसलों या उर्वरकों के बारे में कुछ भी पूछें। मैं आपकी मदद के लिए यहाँ हूँ! 🌿',
    'chat-fab-lbl': 'कृषि AI से पूछें'
  }
};

// ══ Translation Render ══
function translateUI() {
  const dict = TRANSLATIONS[currentLang];
  for (const id in dict) {
    const el = document.getElementById(id);
    if (el) {
      if (id === 'hero-title' || id === 'test-body') {
        el.innerHTML = dict[id];
      } else {
        el.textContent = dict[id];
      }
    }
  }
}

// ══ Navigation ══
function showPage(id) {
  // Route Guard
  const protectedPages = ['results', 'report', 'dashboard', 'chat', 'form'];
  if (protectedPages.includes(id) && (!supabase || !currentUser)) {
    alert(
      currentLang === 'en' ? 'Please Login or Register to access this feature.' :
      currentLang === 'te' ? 'దయచేసి ఈ సేవను ఉపయోగించడానికి లాగిన్ లేదా రిజిస్టర్ అవ్వండి.' :
      'कृपया इस सुविधा का उपयोग करने के लिए लॉगिन या पंजीकरण करें।'
    );
    showPage('auth');
    return;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageElem = document.getElementById('page-' + id);
  if (pageElem) pageElem.classList.add('active');

  // Update bottom nav bar active states
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
  const bn = document.getElementById('bn-' + id);
  if (bn) bn.classList.add('active');

  // Update sidebar active states
  document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
  const sb = document.getElementById('sb-' + id);
  if (sb) sb.classList.add('active');

  // Update top header page title
  const titleMap = {
    'landing':   currentLang === 'en' ? 'Home Explorer'          : currentLang === 'te' ? 'హోమ్ ఎక్స్‌ప్లోరర్'      : 'होम',
    'auth':      currentLang === 'en' ? 'Farmer Profile'         : currentLang === 'te' ? 'రైతు ప్రొఫైల్'           : 'किसान प्रोफाइल',
    'form':      currentLang === 'en' ? 'Soil Health Analysis'   : currentLang === 'te' ? 'మట్టి పరీక్ష విశ్లేషణ'     : 'मिट्टी परीक्षण',
    'results':   currentLang === 'en' ? 'Analysis Results'       : currentLang === 'te' ? 'పరీక్ష ఫలితాలు'          : 'विश्लेषण परिणाम',
    'report':    currentLang === 'en' ? 'Soil Health Report'     : currentLang === 'te' ? 'మట్టి ఆరోగ్య నివేదిక'     : 'मिट्टी रिपोर्ट',
    'dashboard': currentLang === 'en' ? 'Soil History Dashboard' : currentLang === 'te' ? 'మట్టి చరిత్ర డ్యాష్‌బోర్డ్' : 'मिट्टी इतिहास',
    'chat':      currentLang === 'en' ? 'Krishi AI Assistant'    : currentLang === 'te' ? 'కృషి AI అసిస్టెంట్'       : 'कृषि AI सहायक'
  };
  const headerTitle = document.getElementById('header-page-title');
  if (headerTitle) {
    headerTitle.textContent = titleMap[id] || 'MittiSeva';
  }

  translateUI();

  window.scrollTo(0,0);
  if (id === 'dashboard') initDashboard();
  if (id === 'report') initReport();
  if (id === 'form') initForm();
  if (id === 'chat') {
     const msgs = document.getElementById('chatMsgsFull');
     if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }
}

// ══ Language ══
function setLang(lang) {
  currentLang = lang;
  // Update active pill highlights
  ['en','te','hi'].forEach(l => {
    const btn = document.getElementById('lang-pill-' + l);
    if (btn) btn.classList.toggle('active', l === lang);
  });
  translateUI();
  // Re-render current page title
  const activePage = document.querySelector('.page.active');
  if (activePage) {
    const pageId = activePage.id.replace('page-', '');
    const titleMap = {
      'landing':   lang === 'en' ? 'Home Explorer'         : lang === 'te' ? 'హోమ్ ఎక్స్‌ప్లోరర్'      : 'होम',
      'auth':      lang === 'en' ? 'Farmer Profile'        : lang === 'te' ? 'రైతు ప్రొఫైల్'           : 'किसान प्रोफाइल',
      'form':      lang === 'en' ? 'Soil Health Analysis'  : lang === 'te' ? 'మట్టి పరీక్ష విశ్లేషణ'     : 'मिट्टी परीक्षण',
      'results':   lang === 'en' ? 'Analysis Results'      : lang === 'te' ? 'పరీక్ష ఫలితాలు'          : 'विश्लेषण परिणाम',
      'report':    lang === 'en' ? 'Soil Health Report'    : lang === 'te' ? 'మట్టి ఆరోగ్య నివేదిక'     : 'मिट्टी रिपोर्ट',
      'dashboard': lang === 'en' ? 'Soil History Dashboard': lang === 'te' ? 'మట్టి చరిత్ర డ్యాష్‌బోర్డ్' : 'मिट्टी इतिहास',
      'chat':      lang === 'en' ? 'Krishi AI Assistant'   : lang === 'te' ? 'కృషి AI అసిస్టెంట్'       : 'कृषि AI सहायक'
    };
    const ht = document.getElementById('header-page-title');
    if (ht) ht.textContent = titleMap[pageId] || 'MittiSeva';
  }
}

// ══ Auth ══
let authMode = 'login';
function switchAuth(mode) {
  authMode = mode;
  document.getElementById('tabLogin').classList.toggle('active', mode==='login');
  document.getElementById('tabReg').classList.toggle('active', mode==='register');
  document.getElementById('fieldName').style.display = mode==='register' ? 'block' : 'none';
  document.getElementById('fieldVillage').style.display = mode==='register' ? 'block' : 'none';
  document.getElementById('authTitle').textContent = mode==='login' ? 'Welcome Back' : 'Create Account';
  document.getElementById('authSub').textContent = mode==='login' ? 'Enter your details to continue.' : 'Join thousands of farmers getting free soil advice.';
  document.getElementById('btn-auth-submit').textContent = mode==='login' ? 'Login →' : 'Register →';
  document.getElementById('auth-switch-text').textContent = mode==='login' ? 'New here? Register' : 'Already have an account? Login';
}
async function submitAuth() {
  let ok = true;
  const nameVal = document.getElementById('inpName').value.trim();
  const villageVal = document.getElementById('inpVillage').value.trim();
  const phone = document.getElementById('inpPhone').value.trim();
  const pass = document.getElementById('inpPassword').value;

  if (authMode==='register' && !nameVal) {
    document.getElementById('errName').classList.add('show'); ok=false;
  } else document.getElementById('errName').classList.remove('show');
  if (!/^[6-9]\d{9}$/.test(phone)) {
    document.getElementById('errPhone').classList.add('show'); ok=false;
  } else document.getElementById('errPhone').classList.remove('show');
  if (authMode==='register' && !villageVal) {
    document.getElementById('errVillage').classList.add('show'); ok=false;
  } else document.getElementById('errVillage').classList.remove('show');
  if (pass.length < 6) {
    document.getElementById('errPass').classList.add('show'); ok=false;
  } else document.getElementById('errPass').classList.remove('show');
  
  if (!ok) return;

  const btnSubmit = document.getElementById('btn-auth-submit');
  const originalText = btnSubmit.textContent;
  btnSubmit.disabled = true;
  btnSubmit.textContent = currentLang === 'en' ? 'Processing...' : 'ప్రాసెస్ అవుతోంది...';

  // Supabase validates email domains via MX records; use gmail.com as virtual domain
  const virtualEmail = `ms.farmer.${phone}@gmail.com`;

  try {
    if (!supabase) throw new Error(currentLang === 'en'
      ? 'App not connected to database. Please refresh the page.'
      : 'యాప్ డేటాబేస్‌కు కనెక్ట్ కాలేదు. దయచేసి పేజీని రిఫ్రెష్ చేయండి.');

    if (authMode === 'register') {
      const { data, error } = await supabase.auth.signUp({
        email: virtualEmail,
        password: pass,
        options: { data: { phone, full_name: nameVal, village: villageVal } }
      });

      if (error) throw error;

      // Detect duplicate registration: Supabase returns user but with empty identities
      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        alert(currentLang === 'en'
          ? 'This phone number is already registered. Please use Login instead.'
          : 'ఈ ఫోన్ నంబర్ ఇప్పటికే నమోదు చేయబడింది. దయచేసి లాగిన్‌ని ఉపయోగించండి.');
        switchAuth('login');
        return;
      }

      // Detect email confirmation still required
      if (data?.user && !data?.session) {
        alert(currentLang === 'en'
          ? 'Registration submitted! If prompted, check your email. Otherwise try Logging in now.'
          : 'నమోదు చేయబడింది! ఇప్పుడు లాగిన్ చేయడానికి ప్రయత్నించండి.');
        switchAuth('login');
        return;
      }

      alert(currentLang === 'en' ? '✅ Registration successful! Welcome to MittiSeva.' : '✅ నమోదు విజయవంతమైంది! MittiSevaకు స్వాగతం.');
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password: pass
      });
      if (error) throw error;
    }

    await checkAuthSession();
    // After auth, go to the form if not already logged-in view
    if (currentUser) showPage('form');

  } catch (e) {
    // Safely extract error message from any format (string, Error obj, Supabase AuthError, etc.)
    const msg = (typeof e?.message === 'string' && e.message)
      ? e.message
      : (typeof e === 'string' ? e : JSON.stringify(e));

    // Map common Supabase error messages to user-friendly text
    const friendlyMsg = msg.includes('Invalid login credentials')
      ? (currentLang === 'en' ? 'Incorrect phone number or password. Please try again.' : 'తప్పు ఫోన్ నంబర్ లేదా పాస్‌వర్డ్. దయచేసి మళ్ళీ ప్రయత్నించండి.')
      : msg.includes('already registered') || msg.includes('already exists')
      ? (currentLang === 'en' ? 'Phone already registered. Please Login.' : 'ఫోన్ ఇప్పటికే నమోదు చేయబడింది. లాగిన్ చేయండి.')
      : msg.includes('not connected') || msg.includes('config')
      ? msg
      : (currentLang === 'en' ? `Error: ${msg}` : `లోపం: ${msg}`);

    alert(friendlyMsg);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = originalText;
  }
}

// ══ Soil Form ══
let activeParam = 'ph';

function initForm() {
  const c = document.getElementById('paramsContainer');
  if (!c) return;
  c.innerHTML = '';
  
  const icons = {
    ph: '🧪',
    n: '🌿',
    p: '🧪',
    k: '💊',
    moisture: '💧',
    oc: '🍂'
  };

  PARAMS.forEach(p => {
    const isExpanded = p.key === activeParam;
    const div = document.createElement('div');
    div.className = `param-card ${isExpanded ? 'expanded' : ''}`;
    div.id = `param-card-${p.key}`;
    
    div.innerHTML = `
      <div class="param-card-header" onclick="toggleParam('${p.key}')">
        <div class="param-card-header-left">
          <div class="param-card-icon-circle">${icons[p.key] || '🌿'}</div>
          <div>
            <div class="param-name">${p.label}</div>
            <div class="param-hint">${p.hint}</div>
          </div>
        </div>
        <div class="param-card-header-right">
          <span class="param-badge" id="badge_${p.key}">${soilValues[p.key]}</span>
          <span class="param-chevron" id="chev_${p.key}">${isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>
      <div class="param-card-body" id="body_${p.key}" style="display: ${isExpanded ? 'block' : 'none'}">
        <div class="slider-row">
          <span class="slider-minmax">${p.min}</span>
          <input type="range" id="sl_${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${soilValues[p.key]}" oninput="syncInput('${p.key}',this.value)">
          <span class="slider-minmax" style="text-align:right">${p.max}</span>
          <input class="param-input" type="number" id="inp_${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${soilValues[p.key]}" oninput="syncSlider('${p.key}',this.value)">
        </div>
      </div>
    `;
    c.appendChild(div);
  });
}

function toggleParam(key) {
  activeParam = activeParam === key ? null : key;
  initForm();
}

function syncSlider(k, v) { 
  soilValues[k]=parseFloat(v)||0; 
  const s=document.getElementById('sl_'+k); 
  if(s) s.value=v; 
  const b=document.getElementById('badge_'+k);
  if(b) b.textContent=v;
}

function syncInput(k, v)  { 
  soilValues[k]=parseFloat(v)||0; 
  const i=document.getElementById('inp_'+k); 
  if(i) i.value=v; 
  const b=document.getElementById('badge_'+k);
  if(b) b.textContent=v;
}

// ══ Analysis Engine ══
function analyseSoil(d) {
  let score=0;
  const nS = d.n<140?'low':d.n<280?'medium':d.n<=560?'optimal':'high';
  const pS = d.p<11 ?'low':d.p<25 ?'medium':d.p<=50 ?'optimal':'high';
  const kS = d.k<108?'low':d.k<=280?'optimal':'high';
  const phS= d.ph>=6&&d.ph<=7.5?'optimal':d.ph<6?'low':'high';

  if(d.ph>=6&&d.ph<=7.5) score+=20; else if(d.ph>=5.5||d.ph<=8) score+=12; else score+=5;
  score += nS==='optimal'?20:nS==='medium'||nS==='high'?12:5;
  score += pS==='optimal'?20:pS==='medium'||pS==='high'?12:5;
  score += kS==='optimal'?20:kS==='high'?15:5;
  score += d.moisture>=40&&d.moisture<=70?10:5;
  score += d.oc>=0.75?10:d.oc>=0.5?6:3;
  score = Math.min(100, score);

  const ferts=[];
  if(nS==='low') ferts.push({icon:'🌿',name:'Urea (46-0-0)',dose:'100–120 kg/acre'});
  if(nS==='medium') ferts.push({icon:'🌿',name:'DAP (18-46-0)',dose:'50 kg/acre'});
  if(pS==='low') ferts.push({icon:'🧪',name:'Single Super Phosphate',dose:'80–100 kg/acre'});
  if(kS==='low') ferts.push({icon:'💊',name:'Muriate of Potash (MOP)',dose:'40–50 kg/acre'});
  if(d.oc<0.75) ferts.push({icon:'🍂',name:'Farmyard Manure / Compost',dose:'3–4 tonnes/acre'});
  if(!ferts.length) ferts.push({icon:'✅',name:'NPK 19-19-19 (Maintenance)',dose:'25 kg/acre'});

  let crops;
  if(d.ph>=5.5&&d.ph<=7.5&&nS!=='low') {
    crops=[{icon:'🌾',name:'Paddy (Rice)',season:'Kharif'},{icon:'🥜',name:'Groundnut',season:'Kharif / Rabi'},{icon:'☁️',name:'Cotton',season:'Kharif'}];
  } else if(d.ph>7.0) {
    crops=[{icon:'🌾',name:'Wheat',season:'Rabi'},{icon:'🌼',name:'Mustard',season:'Rabi'},{icon:'🫘',name:'Chickpea',season:'Rabi'}];
  } else {
    crops=[{icon:'🌱',name:'Sorghum (Jowar)',season:'Kharif'},{icon:'🌽',name:'Maize',season:'Kharif / Rabi'},{icon:'🫛',name:'Green Gram',season:'Kharif'}];
  }

  return {score, nS, pS, kS, phS, ferts, crops};
}

function scoreColor(s){ return s>=75?'#2D7A1C':s>=50?'#E8A020':'#C0392B'; }
function scoreLabel(s){ return s>=75?'Good':s>=50?'Fair':'Poor'; }

// Calculations badge correction
function badgeHTML(st){ 
  const cls=st==='optimal'?'badge-optimal':st==='low'?'badge-low':'badge-high';
  const lbl=st==='optimal'?'Optimal':st==='low'?'Low':st==='medium'?'Medium':'High';
  return `<span class="badge ${cls}">${lbl}</span>`;
}

async function runAnalysis() {
  analysisResult = analyseSoil(soilValues);
  const r = analysisResult;
  const col = scoreColor(r.score);
  const circ = Math.PI*80;
  const dash = (r.score/100)*circ;

  // gauge
  document.getElementById('gaugeFill').style.stroke = col;
  document.getElementById('gaugeFill').setAttribute('stroke-dasharray', `${dash} ${circ}`);
  document.getElementById('gaugeScore').textContent = r.score;
  document.getElementById('gaugeScore').setAttribute('fill', col);
  document.getElementById('gaugeLabel').textContent = scoreLabel(r.score)+' Soil Health';
  document.getElementById('scoreMsg').textContent =
    r.score>=75 ? "Your soil is in good shape! A few tweaks will make it even better." :
    r.score>=50 ? "Your soil needs some attention. Follow the tips below." :
    "Your soil needs care. Start with the fertilizer recommendations below.";

  // nutrients
  const nutData = [
    {label:'Nitrogen (N)', val:`${soilValues.n} kg/ha`, st:r.nS},
    {label:'Phosphorus (P)', val:`${soilValues.p} kg/ha`, st:r.pS},
    {label:'Potassium (K)', val:`${soilValues.k} kg/ha`, st:r.kS},
    {label:'pH Level', val:`${soilValues.ph}`, st:r.phS},
  ];
  document.getElementById('nutrientRows').innerHTML = nutData.map(n=>`
    <div class="nutrient-row">
      <div><div class="nutrient-name">${n.label}</div><div class="nutrient-val">${n.val}</div></div>
      ${badgeHTML(n.st)}
    </div>`).join('');

  // fertilizers
  document.getElementById('fertRows').innerHTML = r.ferts.map(f=>`
    <div class="rec-item">
      <div class="rec-icon">${f.icon}</div>
      <div><div class="rec-name">${f.name}</div><div class="rec-dose">Apply: ${f.dose}</div></div>
    </div>`).join('');

  // crops
  document.getElementById('cropRows').innerHTML = r.crops.map(c=>`
    <div class="rec-item">
      <div class="rec-icon">${c.icon}</div>
      <div><div class="rec-name">${c.name}</div><div class="rec-dose">Season: ${c.season}</div></div>
    </div>`).join('');

  // DB Save logic
  if (supabase && currentUser) {
    const btnRun = document.getElementById('btn-run-analysis');
    const originalText = btnRun.textContent;
    btnRun.disabled = true;
    btnRun.textContent = currentLang === 'en' ? 'Saving Analysis...' : 'విశ్లేషణను సేవ్ చేస్తోంది...';
    
    try {
      const { error } = await supabase.from('soil_tests').insert({
        farmer_id: currentUser.id,
        ph: soilValues.ph,
        n: soilValues.n,
        p: soilValues.p,
        k: soilValues.k,
        moisture: soilValues.moisture,
        oc: soilValues.oc,
        score: r.score
      });
      if (error) throw error;
      await loadSoilHistory();
    } catch (e) {
      console.error("Saving soil test failed:", e);
      alert("Could not save test to database: " + e.message);
    } finally {
      btnRun.disabled = false;
      btnRun.textContent = originalText;
    }
  } else {
    // Local fallback logic
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d = new Date();
    const dateStr = months[d.getMonth()] + ' ' + d.getFullYear();
    const lastHistory = HISTORY[HISTORY.length - 1];
    if (!lastHistory || lastHistory.score !== r.score || lastHistory.ph !== soilValues.ph || lastHistory.n !== soilValues.n) {
      HISTORY.push({
        date: dateStr,
        score: r.score,
        ph: soilValues.ph,
        n: soilValues.n,
        p: soilValues.p,
        k: soilValues.k
      });
    }
  }

  showPage('results');
}

// ══ Report ══
function initReport() {
  const r = analysisResult || analyseSoil(soilValues);
  const col = scoreColor(r.score);
  document.getElementById('reportDate').textContent = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
  document.getElementById('reportScoreBadge').textContent = r.score;
  document.getElementById('reportScoreBadge').style.background = col;
  document.getElementById('reportScoreLabel').textContent = scoreLabel(r.score)+' Soil Health';
  document.getElementById('reportReadings').innerHTML = [
    ['pH', soilValues.ph],['Nitrogen', soilValues.n+' kg/ha'],
    ['Phosphorus', soilValues.p+' kg/ha'],['Potassium', soilValues.k+' kg/ha'],
    ['Moisture', soilValues.moisture+'%'],['Organic Carbon', soilValues.oc+'%'],
  ].map(([l,v])=>`<div class="report-row"><span class="report-label">${l}</span><span class="report-val">${v}</span></div>`).join('');
  document.getElementById('reportRecs').innerHTML =
    r.ferts.map(f=>`<div style="font-size:13px;padding:3px 0">• ${f.name} — ${f.dose}</div>`).join('') +
    r.crops.map(c=>`<div style="font-size:13px;padding:3px 0">• ${c.icon} ${c.name} (${c.season})</div>`).join('');
}

function downloadReport() {
  const r = analysisResult || analyseSoil(soilValues);
  const col = scoreColor(r.score);
  const name    = (currentProfile && currentProfile.full_name) || document.getElementById('reportFarmerName')?.textContent || 'Farmer';
  const village = (currentProfile && currentProfile.village)   || document.getElementById('reportFarmerVillage')?.textContent || '—';
  const date    = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
  const scoreText = scoreLabel(r.score) + ' Soil Health';

  const readingsRows = [
    ['pH',             soilValues.ph],
    ['Nitrogen',       soilValues.n   + ' kg/ha'],
    ['Phosphorus',     soilValues.p   + ' kg/ha'],
    ['Potassium',      soilValues.k   + ' kg/ha'],
    ['Moisture',       soilValues.moisture + '%'],
    ['Organic Carbon', soilValues.oc  + '%'],
  ].map(([l,v]) => `
    <tr>
      <td style="padding:9px 0;color:#4a7c2f;font-weight:500;font-size:13.5px;border-bottom:1px solid #f0ebe4;">${l}</td>
      <td style="padding:9px 0;text-align:right;font-weight:700;font-size:13.5px;color:#2d1b0e;border-bottom:1px solid #f0ebe4;">${v}</td>
    </tr>`).join('');

  const fertRows = r.ferts.map(f =>
    `<li style="margin-bottom:5px;font-size:13.5px;color:#2d1b0e;">
       <span style="color:#4a7c2f;font-weight:600;">${f.name}</span> — ${f.dose}
     </li>`).join('');
  const cropRows = r.crops.map(c =>
    `<li style="margin-bottom:5px;font-size:13.5px;color:#2d1b0e;">
       ${c.icon} <span style="color:#4a7c2f;font-weight:600;">${c.name}</span> (${c.season})
     </li>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>MittiSeva Soil Test Certificate</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Inter',sans-serif;background:#f5f0e8;display:flex;justify-content:center;align-items:flex-start;min-height:100vh;padding:32px 16px;}
  .certificate{background:#fff;width:680px;border-radius:18px;overflow:hidden;box-shadow:0 8px 48px rgba(45,27,14,.18);}
  .cert-header{background:linear-gradient(135deg,#2d5016 0%,#3d6b1e 60%,#4a7c2f 100%);padding:32px 36px 28px;position:relative;overflow:hidden;}
  .cert-header::before{content:'';position:absolute;top:-40px;right:-40px;width:200px;height:200px;background:rgba(255,255,255,.04);border-radius:50%;}
  .cert-header::after{content:'';position:absolute;bottom:-60px;left:-20px;width:160px;height:160px;background:rgba(255,255,255,.03);border-radius:50%;}
  .cert-tag{color:#c9a84c;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;}
  .cert-title{color:#fff;font-family:'Playfair Display',serif;font-size:28px;font-weight:700;margin-bottom:6px;}
  .cert-gov{color:rgba(245,240,232,.72);font-size:12.5px;}
  .cert-body{padding:32px 36px;}
  .section{margin-bottom:26px;}
  .sec-label{font-size:10.5px;font-weight:700;letter-spacing:1.2px;color:#8b6a3a;text-transform:uppercase;margin-bottom:12px;padding-bottom:4px;border-bottom:1.5px solid #f0ebe4;}
  table{width:100%;border-collapse:collapse;}
  td{vertical-align:middle;}
  .score-wrap{display:flex;align-items:center;gap:18px;}
  .score-circle{width:64px;height:64px;border-radius:50%;background:${col};display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Playfair Display',serif;font-size:24px;font-weight:700;flex-shrink:0;box-shadow:0 4px 16px ${col}55;}
  .score-label{font-weight:700;font-size:17px;color:#2d1b0e;margin-bottom:3px;}
  .score-sub{font-size:12px;color:#8b6a3a;}
  ul{list-style:none;padding:0;}
  .stamp-wrap{display:flex;justify-content:flex-end;margin-top:24px;padding-top:20px;border-top:1.5px solid #f0ebe4;}
  .stamp{position:relative;width:130px;height:130px;display:flex;align-items:center;justify-content:center;}
  .stamp-circle{position:absolute;inset:0;border-radius:50%;border:3px solid #2d5016;opacity:.85;}
  .stamp-inner{position:absolute;inset:10px;border-radius:50%;border:1.5px dashed #4a7c2f;opacity:.6;}
  .stamp-content{text-align:center;z-index:1;}
  .stamp-icon{font-size:28px;display:block;margin-bottom:2px;}
  .stamp-approved{font-size:9px;font-weight:700;letter-spacing:1.5px;color:#2d5016;text-transform:uppercase;line-height:1.4;}
  .stamp-brand{font-family:'Playfair Display',serif;font-size:13px;font-weight:700;color:#2d5016;line-height:1.3;}
  .stamp-rotate{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transform:rotate(-15deg);opacity:.08;font-size:11px;font-weight:700;color:#2d5016;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;}
  .footer{background:#f7f3ec;padding:14px 36px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e8e0d0;}
  .footer-left{font-size:11px;color:#8b6a3a;}
  .footer-right{font-size:11px;color:#4a7c2f;font-weight:600;}
  @media print{
    body{background:none;padding:0;}
    .certificate{box-shadow:none;border-radius:0;width:100%;}
    .no-print{display:none!important;}
  }
</style>
</head>
<body>
<div class="certificate">

  <!-- Header -->
  <div class="cert-header">
    <div class="cert-tag">🇮🇳 Soil Test Certificate</div>
    <div class="cert-title">MittiSeva · మిట్టిసేవ</div>
    <div class="cert-gov">Government of Andhra Pradesh · Agriculture Dept.</div>
  </div>

  <!-- Body -->
  <div class="cert-body">

    <!-- Farmer Details -->
    <div class="section">
      <div class="sec-label">Farmer Details</div>
      <table>
        <tr>
          <td style="padding:8px 0;color:#8b6a3a;font-size:13.5px;border-bottom:1px solid #f0ebe4;">Name</td>
          <td style="padding:8px 0;text-align:right;font-weight:700;font-size:13.5px;color:#2d1b0e;border-bottom:1px solid #f0ebe4;">${name}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#8b6a3a;font-size:13.5px;border-bottom:1px solid #f0ebe4;">Village</td>
          <td style="padding:8px 0;text-align:right;font-weight:700;font-size:13.5px;color:#2d1b0e;border-bottom:1px solid #f0ebe4;">${village}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#8b6a3a;font-size:13.5px;">Test Date</td>
          <td style="padding:8px 0;text-align:right;font-weight:700;font-size:13.5px;color:#2d1b0e;">${date}</td>
        </tr>
      </table>
    </div>

    <!-- Health Score -->
    <div class="section">
      <div class="sec-label">Health Score</div>
      <div class="score-wrap">
        <div class="score-circle">${r.score}</div>
        <div>
          <div class="score-label">${scoreText}</div>
          <div class="score-sub">Out of 100 points</div>
        </div>
      </div>
    </div>

    <!-- Soil Readings -->
    <div class="section">
      <div class="sec-label">Soil Readings</div>
      <table>${readingsRows}</table>
    </div>

    <!-- Recommendations -->
    <div class="section">
      <div class="sec-label">Recommendations</div>
      <ul>${fertRows}${cropRows}</ul>
    </div>

    <!-- Approved Stamp -->
    <div class="stamp-wrap">
      <div class="stamp">
        <div class="stamp-circle"></div>
        <div class="stamp-inner"></div>
        <div class="stamp-rotate">MittiSeva · Approved · Certified ·</div>
        <div class="stamp-content">
          <span class="stamp-icon">🌱</span>
          <div class="stamp-approved">Approved by</div>
          <div class="stamp-brand">MittiSeva</div>
          <div class="stamp-approved" style="margin-top:2px;font-size:8px;opacity:.7;">మిట్టిసేవ</div>
        </div>
      </div>
    </div>

  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">Generated by MittiSeva · soilhealth-analysis.vercel.app</div>
    <div class="footer-right">✓ Certified Analysis</div>
  </div>

</div>

<div class="no-print" style="text-align:center;margin-top:22px;">
  <button onclick="window.print()" style="background:#2d5016;color:#fff;border:none;padding:13px 36px;border-radius:10px;font-size:15px;font-family:'Inter',sans-serif;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(45,80,22,.3);">
    ⬇ Save as PDF / Print
  </button>
</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=760,height=920,scrollbars=yes');
  win.document.write(html);
  win.document.close();
}

function shareReport() {
  const r = analysisResult || analyseSoil(soilValues);
  if(navigator.share) navigator.share({title:'My Soil Report — MittiSeva',text:`Soil Health Score: ${r.score}/100\nVisit MittiSeva for full analysis.`});
  else alert('Report link copied! Share with your agriculture officer.');
}

// ══ Dashboard ══
function initDashboard() {
  const latest = HISTORY[HISTORY.length - 1] || {score: 79, ph: 7.0, n: 255};
  const baseline = HISTORY[0] || {score: 52};
  const diff = latest.score - baseline.score;
  const sign = diff >= 0 ? '+' : '';
  
  document.getElementById('latestScore').textContent = latest.score;
  document.getElementById('latestImprovement').textContent = sign + diff;
  document.getElementById('totalTests').textContent = HISTORY.length;

  // table
  document.getElementById('historyBody').innerHTML = HISTORY.map(r=>{
    const c=scoreColor(r.score);
    const deleteBtn = (supabase && currentUser && r.id) 
      ? `<button onclick="deleteSoilRecord('${r.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--red);padding:2px 8px" title="Delete record">🗑️</button>` 
      : '';
    return `<tr>
      <td>${r.date}</td><td>${r.ph}</td><td>${r.n}</td>
      <td>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span class="score-pill" style="background:${c}22;color:${c}">${r.score}</span>
          ${deleteBtn}
        </div>
      </td>
    </tr>`;
  }).join('');

  // chart
  if(trendChartInstance) trendChartInstance.destroy();
  const ctx = document.getElementById('trendChart').getContext('2d');
  trendChartInstance = new Chart(ctx, {
    type:'line',
    data:{
      labels: HISTORY.map(r=>r.date),
      datasets:[{
        label:'Health Score',
        data: HISTORY.map(r=>r.score),
        borderColor:'#2D5016', backgroundColor:'rgba(45,80,22,.08)',
        borderWidth:2.5, pointRadius:5, pointBackgroundColor:'#2D5016',
        fill:true, tension:0.3
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        x:{ticks:{font:{size:10},color:'#7A6452'},grid:{color:'rgba(139,94,60,.08)'}},
        y:{min:40,max:100,ticks:{font:{size:10},color:'#7A6452'},grid:{color:'rgba(139,94,60,.08)'}}
      }
    }
  });
}

// ══ Chat AI (Offline Mock Engine to Prevent CORS) ══
function getKrishiResponse(userMsg) {
  const msg = userMsg.toLowerCase();
  if (msg.includes('ph')) return getRandom(KRISHI_RESPONSES.ph);
  if (msg.includes('nitrogen') || msg.includes(' n ') || msg.includes(' urea')) return getRandom(KRISHI_RESPONSES.nitrogen);
  if (msg.includes('phosphorus') || msg.includes(' p ') || msg.includes(' dap') || msg.includes('ssp')) return getRandom(KRISHI_RESPONSES.phosphorus);
  if (msg.includes('potassium') || msg.includes(' k ') || msg.includes(' mop') || msg.includes('potash')) return getRandom(KRISHI_RESPONSES.potassium);
  if (msg.includes('moisture') || msg.includes('water') || msg.includes('irrigation')) return getRandom(KRISHI_RESPONSES.moisture);
  if (msg.includes('organic') || msg.includes('carbon') || msg.includes(' manure') || msg.includes('compost')) return getRandom(KRISHI_RESPONSES.organic);
  if (msg.includes('crop') || msg.includes('sow') || msg.includes('paddy') || msg.includes('rice') || msg.includes('cotton') || msg.includes('groundnut')) return getRandom(KRISHI_RESPONSES.crop);
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('namaste')) return getRandom(KRISHI_RESPONSES.hello);
  
  return getRandom(DEFAULT_AI);
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById('chatPanel').classList.toggle('open', chatOpen);
}

async function sendChat() {
  const inp = document.getElementById('chatInput');
  const msg = inp.value.trim();
  if(!msg) return;
  inp.value = '';
  
  appendMsg('user', msg);
  if (supabase && currentUser) {
    await saveChatMessage('user', msg);
  }
  
  appendTyping();
  
  setTimeout(async () => {
    removeTyping();
    const reply = getKrishiResponse(msg);
    appendMsg('ai', reply);
    if (supabase && currentUser) {
      await saveChatMessage('ai', reply);
    }
  }, 750);
}

function appendMsg(role, text) {
  const div = document.createElement('div');
  div.className = role==='ai'?'msg-ai':'msg-user';
  div.textContent = text;
  const msgs = document.getElementById('chatMsgs');
  if (msgs) {
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }
}

function appendTyping() {
  const div = document.createElement('div');
  div.className = 'msg-ai'; div.id = 'typing';
  div.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  const msgs = document.getElementById('chatMsgs');
  if (msgs) {
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }
}

function removeTyping() {
  const t = document.getElementById('typing');
  if(t) t.remove();
}

async function sendChatFull() {
  const inp = document.getElementById('chatInputFull');
  const msg = inp.value.trim();
  if(!msg) return;
  inp.value = '';
  
  appendMsgFull('user', msg);
  if (supabase && currentUser) {
    await saveChatMessage('user', msg);
  }
  
  appendTypingFull();
  
  setTimeout(async () => {
    removeTypingFull();
    const reply = getKrishiResponse(msg);
    appendMsgFull('ai', reply);
    if (supabase && currentUser) {
      await saveChatMessage('ai', reply);
    }
  }, 750);
}

function appendMsgFull(role, text) {
  const div = document.createElement('div');
  div.className = role==='ai'?'msg-ai':'msg-user';
  div.textContent = text;
  const msgs = document.getElementById('chatMsgsFull');
  if (msgs) {
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }
}

function appendTypingFull() {
  const div = document.createElement('div');
  div.className = 'msg-ai'; div.id = 'typingFull';
  div.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  const msgs = document.getElementById('chatMsgsFull');
  if (msgs) {
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }
}

function removeTypingFull() {
  const t = document.getElementById('typingFull');
  if(t) t.remove();
}

// ── Helper DB Functions ──
async function checkAuthSession() {
  if (!supabase) return;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (session) {
      currentUser = session.user;
      await loadUserProfile();
      toggleAuthUI(true);
      await loadSoilHistory();
      await loadChatHistory();
    } else {
      currentUser = null;
      currentProfile = null;
      toggleAuthUI(false);
      resetHistoryData();
    }
  } catch (e) {
    console.error("Auth session check failed:", e);
  }
}

async function loadUserProfile() {
  if (!supabase || !currentUser) return;
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    if (error) throw error;
    currentProfile = data;
    if (currentProfile) {
      document.getElementById('reportFarmerName').textContent = currentProfile.full_name || 'Farmer';
      document.getElementById('reportFarmerVillage').textContent = currentProfile.village || '';
      const initials = (currentProfile.full_name || 'VR').split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase();
      const headerAvatar = document.getElementById('headerAvatar');
      if (headerAvatar) headerAvatar.textContent = initials || 'VR';
      
      // Update sidebar profile elements
      const sidebarAvatar = document.getElementById('sidebarAvatar');
      if (sidebarAvatar) sidebarAvatar.textContent = initials || 'VR';
      const sidebarFarmerName = document.getElementById('sidebarFarmerName');
      if (sidebarFarmerName) sidebarFarmerName.textContent = currentProfile.full_name || 'Farmer';
      const sidebarFarmerVillage = document.getElementById('sidebarFarmerVillage');
      if (sidebarFarmerVillage) sidebarFarmerVillage.textContent = currentProfile.village || '';
    }
  } catch (e) {
    console.error("Loading profile failed:", e);
  }
}

function toggleAuthUI(isLoggedIn) {
  const sbLogout = document.getElementById('sb-logout');
  const authProfileView = document.getElementById('authProfileView');
  const authFormArea = document.getElementById('authFormArea');
  const authTitle = document.getElementById('authTitle');
  const authSub = document.getElementById('authSub');

  // Sidebar profile section elements
  const sbProfileLoggedOut = document.getElementById('sbProfileLoggedOut');
  const sbProfileLoggedIn  = document.getElementById('sbProfileLoggedIn');

  // Hide old sidebar logout item (now handled in profile section)
  if (sbLogout) sbLogout.style.display = 'none';

  // Toggle sidebar profile display
  if (sbProfileLoggedOut) sbProfileLoggedOut.style.display = isLoggedIn ? 'none' : 'block';
  if (sbProfileLoggedIn)  sbProfileLoggedIn.style.display  = isLoggedIn ? 'flex'  : 'none';

  if (isLoggedIn) {
    if (authProfileView) authProfileView.style.display = 'block';
    if (authFormArea)    authFormArea.style.display    = 'none';
    if (authTitle) authTitle.textContent = currentLang === 'en' ? 'My Profile' : 'నా ప్రొఫైల్';
    if (authSub)   authSub.textContent   = currentLang === 'en' ? 'Manage your farm details.' : 'మీ వ్యవసాయ వివరాలను నిర్వహించండి.';

    if (currentProfile) {
      const initials = (currentProfile.full_name || 'VR').split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase();

      const pName   = document.getElementById('profileName');
      const pVillage= document.getElementById('profileVillage');
      const pPhone  = document.getElementById('profilePhone');
      const pAvatar = document.getElementById('profileAvatarBig');
      const sbAvatar= document.getElementById('sidebarAvatar');
      const sbName  = document.getElementById('sidebarFarmerName');
      const sbVill  = document.getElementById('sidebarFarmerVillage');

      if (pName)    pName.textContent    = currentProfile.full_name || '';
      if (pVillage) pVillage.textContent = currentProfile.village   || '';
      if (pPhone)   pPhone.textContent   = currentProfile.phone     || '';
      if (pAvatar)  pAvatar.textContent  = initials || 'VR';
      if (sbAvatar) sbAvatar.textContent = initials || 'VR';
      if (sbName)   sbName.textContent   = currentProfile.full_name || 'Farmer';
      if (sbVill)   sbVill.textContent   = currentProfile.village   || '';
    }
  } else {
    if (authProfileView) authProfileView.style.display = 'none';
    if (authFormArea)    authFormArea.style.display    = 'block';
    if (authTitle) {
      authTitle.textContent = authMode === 'login'
        ? (currentLang === 'en' ? 'Welcome Back' : 'తిరిగి స్వాగతం')
        : (currentLang === 'en' ? 'Create Account' : 'ఖాతాను సృష్టించండి');
    }
    if (authSub) {
      authSub.textContent = authMode === 'login'
        ? (currentLang === 'en' ? 'Enter your details to continue.' : 'కొనసాగించడానికి మీ వివరాలను నమోదు చేయండి.')
        : (currentLang === 'en' ? 'Join thousands of farmers getting free soil advice.' : 'ఉచిత మట్టి సలహా పొందుతున్న వేలాది మంది రైతులతో చేరండి.');
    }
  }

  TRANSLATIONS.en['sb-lbl-profile'] = isLoggedIn ? 'Profile' : 'Login';
  TRANSLATIONS.te['sb-lbl-profile'] = isLoggedIn ? 'ప్రొఫైల్' : 'లాగిన్';
  TRANSLATIONS.hi['sb-lbl-profile'] = isLoggedIn ? 'प्रोफाइल' : 'लॉगिन';
  translateUI();
}

async function logoutUser() {
  if (!supabase) return;
  const confirmLogout = confirm(currentLang === 'en' ? "Are you sure you want to logout?" : "మీరు నిష్క్రమించాలనుకుంటున్నారా?");
  if (!confirmLogout) return;
  try {
    await supabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    toggleAuthUI(false);
    resetHistoryData();
    showPage('landing');
  } catch (e) {
    console.error("Logout failed:", e);
  }
}

function resetHistoryData() {
  HISTORY.length = 0;
  const tbody = document.getElementById('historyBody');
  if (tbody) tbody.innerHTML = '';
  if (trendChartInstance) {
    trendChartInstance.destroy();
    trendChartInstance = null;
  }
}

async function loadSoilHistory() {
  if (!supabase || !currentUser) return;
  try {
    const { data, error } = await supabase
      .from('soil_tests')
      .select('*')
      .order('test_date', { ascending: true });
    if (error) throw error;
    
    HISTORY.length = 0;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    data.forEach(item => {
      const d = new Date(item.test_date);
      const dateStr = months[d.getMonth()] + ' ' + d.getFullYear();
      HISTORY.push({
        id: item.id,
        date: dateStr,
        score: item.score,
        ph: parseFloat(item.ph),
        n: item.n,
        p: item.p,
        k: item.k
      });
    });
    
    if (document.getElementById('page-dashboard').classList.contains('active')) {
      initDashboard();
    }
  } catch (e) {
    console.error("Loading soil history failed:", e);
  }
}

async function deleteSoilRecord(id) {
  if (!supabase || !currentUser) return;
  const confirmDelete = confirm(currentLang === 'en' ? "Are you sure you want to delete this record?" : "ఈ రికార్డును తొలగించాలనుకుంటున్నారా?");
  if (!confirmDelete) return;
  try {
    const { error } = await supabase.from('soil_tests').delete().eq('id', id);
    if (error) throw error;
    await loadSoilHistory();
    initDashboard();
  } catch (e) {
    console.error("Deleting soil record failed:", e);
    alert("Error deleting record: " + e.message);
  }
}

async function loadChatHistory() {
  if (!supabase || !currentUser) return;
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20); // only load last 20 messages
    if (error) throw error;

    // Detect and skip old static responses from keyword engine
    const OLD_STATIC_SNIPPETS = [
      'Balanced NPK application based on soil tests saves',
      'Test your soil every 2 years at your nearest Rythu',
      'Using biofertilizers like Azospirillum along with compost',
      'Soil pH determines how well plants absorb nutrients',
      'Nitrogen (N) stimulates healthy leafy growth',
      'Potassium (K) builds pest resistance'
    ];
    const isStale = (msg) => OLD_STATIC_SNIPPETS.some(s => msg.includes(s));

    // Reverse to chronological order after limiting
    const messages = (data || []).reverse().filter(item => !isStale(item.message));

    const msgsMobile = document.getElementById('chatMsgs');
    const msgsFull   = document.getElementById('chatMsgsFull');
    const welcomeEn  = "Namaste! I'm Krishi AI. Ask me anything about soil, crops, or fertilizers. I'm here to help! 🌿";
    const welcomeTe  = "నమస్తే! నేను కృషి AI. మట్టి, పంటలు లేదా ఎరువుల గురించి నన్ను ఏదైనా అడగండి! 🌿";
    const welcome    = currentLang === 'en' ? welcomeEn : welcomeTe;

    if (msgsMobile) msgsMobile.innerHTML = `<div class="msg-ai" id="chat-welcome-mobile">${welcome}</div>`;
    if (msgsFull)   msgsFull.innerHTML   = `<div class="msg-ai" id="chat-welcome-full">${welcome}</div>`;

    // Sync to ai_engine chat history for multi-turn context
    if (typeof chatHistory !== 'undefined') {
      chatHistory.full   = [];
      chatHistory.mobile = [];
    }

    messages.forEach(item => {
      appendMsgUI(item.sender, item.message, 'chatMsgs');
      appendMsgUI(item.sender, item.message, 'chatMsgsFull');
      // Also push into ai_engine memory so Krishi AI has context
      const role = item.sender === 'ai' ? 'assistant' : 'user';
      const part = { role, content: item.message };
      if (typeof chatHistory !== 'undefined') {
        chatHistory.full.push(part);
        chatHistory.mobile.push(part);
      }
    });

    // Re-inject suggestion chips after history loads
    if (typeof injectQuickSuggestions === 'function') {
      setTimeout(() => {
        injectQuickSuggestions('chatMsgsFull', 'chatInputFull');
        injectQuickSuggestions('chatMsgs', 'chatInput');
      }, 300);
    }
  } catch (e) {
    console.error('Loading chat history failed:', e);
  }
}

async function clearChatHistory() {
  if (!supabase || !currentUser) return;
  if (!confirm('Clear all chat history?')) return;
  try {
    await supabase.from('chat_messages').delete().eq('farmer_id', currentUser.id);
    if (typeof resetChatHistory === 'function') resetChatHistory();
    await loadChatHistory();
  } catch (e) {
    console.error('Clearing chat history failed:', e);
  }
}

function appendMsgUI(role, text, containerId) {
  const div = document.createElement('div');
  div.className = role==='ai'?'msg-ai':'msg-user';
  div.textContent = text;
  const msgs = document.getElementById(containerId);
  if (msgs) {
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }
}

async function saveChatMessage(sender, message) {
  if (!supabase || !currentUser) return;
  try {
    await supabase.from('chat_messages').insert({
      farmer_id: currentUser.id,
      message: message,
      sender: sender
    });
  } catch (e) {
    console.error("Saving chat message failed:", e);
  }
}

// ── Boot ──
async function initApp() {
  initForm();
  showPage('landing');
  await checkAuthSession();
  translateUI();
}
initApp();
