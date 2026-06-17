import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "fitlook_wardrobe";

function loadWardrobe() {
  try { const data = localStorage.getItem(STORAGE_KEY); return data ? JSON.parse(data) : []; }
  catch { return []; }
}

function saveWardrobe(items) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
  catch (e) { console.error(e); }
}

async function fetchWeatherByCoords(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m&timezone=auto`;
  const r = await fetch(url); const d = await r.json();
  return { temp: Math.round(d.current.temperature_2m), code: d.current.weathercode, wind: Math.round(d.current.windspeed_10m) };
}

async function fetchWeatherByCity(city) {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`;
  const geoR = await fetch(geoUrl); const geoD = await geoR.json();
  if (!geoD.results?.length) throw new Error("Cidade não encontrada");
  const { latitude, longitude, name, country } = geoD.results[0];
  const w = await fetchWeatherByCoords(latitude, longitude);
  return { ...w, cityName: `${name}, ${country}` };
}

function weatherDesc(code) {
  if (code === 0) return { label: "Céu limpo", icon: "☀️" };
  if (code <= 3) return { label: "Parcialmente nublado", icon: "⛅" };
  if (code <= 49) return { label: "Nevoeiro", icon: "🌫️" };
  if (code <= 67) return { label: "Chuva", icon: "🌧️" };
  if (code <= 77) return { label: "Neve", icon: "❄️" };
  if (code <= 82) return { label: "Chuva forte", icon: "⛈️" };
  return { label: "Tempestade", icon: "🌩️" };
}

function tempLabel(temp) {
  if (temp < 15) return "Frio";
  if (temp < 20) return "Fresco";
  if (temp < 26) return "Agradável";
  return "Quente";
}

const CATEGORIES = [
  { id: "tenis", label: "Tênis", icon: "👟" },
  { id: "camiseta", label: "Camiseta / Regata", icon: "👕" },
  { id: "shorts", label: "Shorts", icon: "🩳" },
  { id: "calca", label: "Calça", icon: "👖" },
  { id: "casaco", label: "Casaco / Moletom", icon: "🧥" },
  { id: "meia", label: "Meia", icon: "🧦" },
];

const WORKOUT_TYPES = [
  "Musculação", "Cardio / Zona 2", "HIIT / Crossfit",
  "Corrida ao ar livre", "Futebol", "Aquecimento / Mobilidade",
];

const MANUAL_CONDITIONS = [
  { value: "0", label: "☀️ Sol" },
  { value: "2", label: "⛅ Nublado" },
  { value: "51", label: "🌧️ Chuva" },
  { value: "95", label: "⛈️ Tempestade" },
];

async function generateOutfits({ wardrobe, workout, weather }) {
  const byCategory = {};
  CATEGORIES.forEach(c => { byCategory[c.id] = wardrobe.filter(i => i.category === c.id); });
  const wardrobeDesc = CATEGORIES.map(c => {
    const items = byCategory[c.id];
    if (!items.length) return null;
    return `${c.label}:\n` + items.map(i => `  - [ID:${i.id}] ${i.name} (${i.description})`).join("\n");
  }).filter(Boolean).join("\n\n");

  const prompt = `Você é um consultor de moda esportiva. Com base no guarda-roupa abaixo, clima e tipo de treino, sugira 3 looks completos.

CLIMA: ${weather.temp}°C, ${weather.desc.label}, vento ${weather.wind}km/h (${tempLabel(weather.temp)})
TREINO: ${workout}

GUARDA-ROUPA:
${wardrobeDesc}

REGRAS:
- Cada look deve ter: camiseta/regata, parte de baixo (shorts ou calça), tênis e meia. Adicione casaco se frio (abaixo de 20°C) ou chuva.
- Varie os estilos: ofereça looks monocromáticos/tonal, coloridos e um intermediário.
- Considere harmonia de cores e tendências do streetwear esportivo atual.
- O usuário é eclético, não tem medo de chamar atenção.
- Para corrida/cardio ao ar livre: prefira tênis de corrida. Para musculação: tênis de treino.

Responda APENAS em JSON válido, sem markdown:
{"looks":[{"title":"nome criativo","style":"Monocromático|Colorido|Color Block|Tonal|Statement","description":"frase sobre a estética","items":{"camiseta":"ID ou null","shorts":"ID ou null","calca":"ID ou null","casaco":"ID ou null","tenis":"ID ou null","meia":"ID ou null"}}]}`;

  const response = await fetch("/api/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await response.json();
  const text = data.content?.find(b => b.type === "text")?.text || "{}";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

const S = {
  app: { fontFamily: "'Inter', sans-serif", background: "#0A0A0A", color: "#F5F5F5", minHeight: "100vh", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 88 },
  header: { padding: "20px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: "-0.5px", color: "#fff" },
  logoAccent: { color: "#FF5C00" },
  weatherPanel: { margin: "16px 20px 0", background: "#1A1A1A", borderRadius: 16, padding: "18px 20px" },
  weatherRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  weatherTemp: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 52, fontWeight: 700, lineHeight: 1, color: "#fff" },
  weatherCity: { fontSize: 12, color: "#888" },
  weatherCond: { fontSize: 13, color: "#aaa", marginTop: 2 },
  weatherBadge: { fontSize: 12, color: "#FF5C00", fontWeight: 600, marginTop: 4 },
  weatherIcon: { fontSize: 44 },
  weatherInputRow: { display: "flex", gap: 8, alignItems: "center" },
  weatherInput: { flex: 1, background: "#111", border: "1px solid #2A2A2A", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none" },
  weatherSmallBtn: { background: "#FF5C00", border: "none", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  weatherGeoBtn: { background: "#1E1E1E", border: "1px solid #2A2A2A", borderRadius: 10, padding: "10px 12px", color: "#888", fontSize: 16, cursor: "pointer" },
  manualLabel: { fontSize: 11, color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" },
  divider: { display: "flex", alignItems: "center", gap: 8, margin: "12px 0" },
  dividerLine: { flex: 1, height: 1, background: "#2A2A2A" },
  dividerText: { fontSize: 11, color: "#444" },
  section: { padding: "20px 20px 0" },
  sectionTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#555", marginBottom: 10 },
  workoutGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  workoutBtn: (a) => ({ background: a ? "#FF5C00" : "#1A1A1A", border: "none", borderRadius: 12, padding: "12px 14px", color: a ? "#fff" : "#aaa", fontSize: 13, fontWeight: a ? 600 : 400, cursor: "pointer", textAlign: "left" }),
  generateBtn: (d) => ({ width: "100%", marginTop: 16, padding: "16px", background: d ? "#1A1A1A" : "#FF5C00", border: "none", borderRadius: 14, color: d ? "#333" : "#fff", fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, cursor: d ? "not-allowed" : "pointer" }),
  lookCard: { background: "#1A1A1A", borderRadius: 16, overflow: "hidden", marginBottom: 14 },
  lookHeader: { padding: "14px 18px", borderBottom: "1px solid #252525" },
  lookBadge: { display: "inline-block", background: "#FF5C0018", color: "#FF5C00", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 },
  lookTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 4 },
  lookDesc: { fontSize: 12, color: "#666", lineHeight: 1.5 },
  lookItems: { padding: "14px 18px" },
  lookItem: { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 },
  lookItemImg: { width: 52, height: 52, borderRadius: 10, objectFit: "cover", background: "#252525", flexShrink: 0 },
  lookItemPlaceholder: { width: 52, height: 52, borderRadius: 10, background: "#252525", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 },
  lookItemCat: { fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em" },
  lookItemName: { fontSize: 13, color: "#ccc", marginTop: 2, fontWeight: 500 },
  tabBar: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#0D0D0D", borderTop: "1px solid #1A1A1A", display: "flex", padding: "10px 0 22px" },
  tab: (a) => ({ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", color: a ? "#FF5C00" : "#444", fontSize: 10, fontWeight: a ? 600 : 400, border: "none", background: "none", letterSpacing: "0.04em" }),
  tabIcon: { fontSize: 20 },
  catTabs: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" },
  catTab: (a) => ({ flexShrink: 0, background: a ? "#FF5C00" : "#1A1A1A", border: "none", borderRadius: 20, padding: "8px 14px", color: a ? "#fff" : "#777", fontSize: 12, fontWeight: a ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap" }),
  clothingGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 },
  clothingCard: { background: "#1A1A1A", borderRadius: 12, overflow: "hidden" },
  clothingImg: { width: "100%", aspectRatio: "1", objectFit: "cover", background: "#252525" },
  clothingImgPlaceholder: { width: "100%", aspectRatio: "1", background: "#252525", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 },
  clothingInfo: { padding: "10px 12px" },
  clothingName: { fontSize: 12, fontWeight: 600, color: "#ccc", marginBottom: 2 },
  clothingDesc: { fontSize: 10, color: "#555", lineHeight: 1.4 },
  clothingActions: { display: "flex", gap: 8, marginTop: 6 },
  editBtn: { background: "none", border: "none", color: "#FF5C00", fontSize: 11, cursor: "pointer", padding: 0, fontWeight: 600 },
  deleteBtn: { background: "none", border: "none", color: "#FF5C0044", fontSize: 11, cursor: "pointer", padding: 0 },
  fabRow: { position: "fixed", bottom: 96, right: 20, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" },
  fabBtn: (secondary) => ({ width: 50, height: 50, borderRadius: "50%", background: secondary ? "#1A1A1A" : "#FF5C00", border: secondary ? "1px solid #2A2A2A" : "none", color: secondary ? "#888" : "#fff", fontSize: secondary ? 20 : 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: secondary ? "none" : "0 4px 20px #FF5C0055" }),
  overlay: { position: "fixed", inset: 0, background: "#000000cc", zIndex: 100, display: "flex", alignItems: "flex-end" },
  modal: { background: "#141414", borderRadius: "20px 20px 0 0", padding: "0 20px 44px", width: "100%", maxHeight: "92vh", overflowY: "auto" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 16px", position: "sticky", top: 0, background: "#141414", zIndex: 1 },
  modalTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#fff" },
  modalCloseBtn: { width: 36, height: 36, borderRadius: "50%", background: "#2A2A2A", border: "none", color: "#aaa", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  input: { width: "100%", background: "#1A1A1A", border: "1px solid #252525", borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: 15, marginBottom: 12, boxSizing: "border-box", outline: "none" },
  textarea: { width: "100%", background: "#1A1A1A", border: "1px solid #252525", borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: 15, marginBottom: 12, boxSizing: "border-box", outline: "none", resize: "none", minHeight: 72 },
  label: { fontSize: 11, color: "#555", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.06em" },
  catSelectGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 },
  catSelectBtn: (a) => ({ background: a ? "#FF5C00" : "#1A1A1A", border: "none", borderRadius: 10, padding: "10px 4px", color: a ? "#fff" : "#777", fontSize: 10, fontWeight: a ? 600 : 400, cursor: "pointer", textAlign: "center" }),
  photoUpload: { width: "100%", aspectRatio: "1.6", background: "#1A1A1A", borderRadius: 12, border: "2px dashed #2A2A2A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: 14, overflow: "hidden" },
  saveBtn: { width: "100%", padding: "15px", background: "#FF5C00", border: "none", borderRadius: 14, color: "#fff", fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, cursor: "pointer" },
  hint: { fontSize: 12, color: "#444", textAlign: "center", marginTop: 8 },
  errorBox: { background: "#1E0F0F", border: "1px solid #FF5C0030", borderRadius: 12, padding: "12px 16px", color: "#FF7A50", fontSize: 13, margin: "12px 20px 0" },
  dot: (i) => ({ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#FF5C00", animation: `pulse 1s ${i * 0.2}s infinite` }),
};

export default function App() {
  const [tab, setTab] = useState("suggest");
  const [wardrobe, setWardrobe] = useState([]);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [cityInput, setCityInput] = useState("");
  const [manualTemp, setManualTemp] = useState("");
  const [manualCond, setManualCond] = useState("0");
  const [workout, setWorkout] = useState(null);
  const [looks, setLooks] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null = new, item = editing
  const [activeCat, setActiveCat] = useState("tenis");
  const [form, setForm] = useState({ name: "", description: "", category: "tenis", photo: null });
  const fileRef = useRef();
  const importRef = useRef();

  useEffect(() => { setWardrobe(loadWardrobe()); }, []);
  useEffect(() => { tryGeo(); }, []);

  async function tryGeo() {
    if (!navigator.geolocation) return;
    setWeatherLoading(true);
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 })
      );
      const w = await fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      w.desc = weatherDesc(w.code); w.cityName = "Sua localização";
      setWeather(w);
    } catch { /* silent */ }
    setWeatherLoading(false);
  }

  async function handleCitySearch() {
    if (!cityInput.trim()) return;
    setWeatherLoading(true); setWeatherError(null);
    try {
      const w = await fetchWeatherByCity(cityInput.trim());
      w.desc = weatherDesc(w.code); setWeather(w); setCityInput("");
    } catch (e) { setWeatherError(e.message || "Cidade não encontrada."); }
    setWeatherLoading(false);
  }

  function handleManualWeather() {
    const temp = parseInt(manualTemp); if (isNaN(temp)) return;
    setWeather({ temp, code: parseInt(manualCond), wind: 0, desc: weatherDesc(parseInt(manualCond)), cityName: "Manual" });
  }

  async function handleGenerate() {
    if (!workout || wardrobe.length < 3 || !weather) return;
    setGenerating(true); setGenError(null); setLooks([]);
    try {
      const result = await generateOutfits({ wardrobe, workout, weather });
      setLooks(result.looks || []);
    } catch { setGenError("Erro ao gerar looks. Tente novamente."); }
    setGenerating(false);
  }

  function getItem(id) { return wardrobe.find(i => i.id === id); }
  function getCatIcon(id) { return CATEGORIES.find(c => c.id === id)?.icon || "👕"; }
  function getCatLabel(id) { return CATEGORIES.find(c => c.id === id)?.label || id; }

  const filteredWardrobe = wardrobe.filter(i => i.category === activeCat);

  function openAddModal() {
    setEditingItem(null);
    setForm({ name: "", description: "", category: activeCat, photo: null });
    setShowModal(true);
  }

  function openEditModal(item) {
    setEditingItem(item);
    setForm({ name: item.name, description: item.description, category: item.category, photo: item.photo || null });
    setShowModal(true);
  }

  function closeModal() { setShowModal(false); setEditingItem(null); }

  function handlePhoto(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, photo: ev.target.result }));
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!form.name) return;
    let updated;
    if (editingItem) {
      updated = wardrobe.map(i => i.id === editingItem.id ? { ...i, name: form.name, description: form.description, category: form.category, photo: form.photo } : i);
    } else {
      const item = { id: Date.now().toString(), name: form.name, description: form.description, category: form.category, photo: form.photo };
      updated = [...wardrobe, item];
    }
    setWardrobe(updated); saveWardrobe(updated); closeModal();
  }

  function handleDelete(id) {
    if (!window.confirm("Remover esta peça?")) return;
    const updated = wardrobe.filter(i => i.id !== id);
    setWardrobe(updated); saveWardrobe(updated);
  }

  function handleImportJSON(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const items = JSON.parse(ev.target.result);
        const updated = [...wardrobe, ...items.filter(i => !wardrobe.find(w => w.id === i.id))];
        setWardrobe(updated); saveWardrobe(updated);
        alert(`${items.length} peças importadas com sucesso!`);
      } catch { alert("Erro ao importar. Verifique o arquivo JSON."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleExportJSON() {
    const data = JSON.stringify(wardrobe, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `fitlook-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const canGenerate = workout && wardrobe.length >= 3 && weather && !generating;

  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
        input::placeholder, textarea::placeholder { color: #444; }
        select { appearance: none; -webkit-appearance: none; }
      `}</style>

      <div style={S.header}>
        <div style={S.logo}>fit<span style={S.logoAccent}>look</span></div>
        <div style={{ fontSize: 11, color: "#444" }}>{wardrobe.length} peças</div>
      </div>

      {/* ── SUGGEST ── */}
      {tab === "suggest" && (
        <>
          <div style={S.section}>
            <div style={S.sectionTitle}>Clima</div>
            <div style={S.weatherPanel}>
              {weather && (
                <div style={S.weatherRow}>
                  <div>
                    <div style={S.weatherTemp}>{weather.temp}°</div>
                    <div style={S.weatherCity}>{weather.cityName}</div>
                    <div style={S.weatherCond}>{weather.desc.label}{weather.wind > 0 ? ` · ${weather.wind} km/h` : ""}</div>
                    <div style={S.weatherBadge}>{tempLabel(weather.temp)}</div>
                  </div>
                  <div style={S.weatherIcon}>{weather.desc.icon}</div>
                </div>
              )}
              {weatherLoading && (
                <div style={{ color: "#555", fontSize: 13, marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 4 }}>{[0,1,2].map(i => <div key={i} style={S.dot(i)} />)}</div>
                  Obtendo clima...
                </div>
              )}
              {weatherError && <div style={{ color: "#FF7A50", fontSize: 12, marginBottom: 10 }}>{weatherError}</div>}
              <div style={{ ...S.manualLabel, marginBottom: 6 }}>Buscar por cidade</div>
              <div style={S.weatherInputRow}>
                <input style={S.weatherInput} placeholder="Ex: São Paulo..." value={cityInput}
                  onChange={e => setCityInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCitySearch()} />
                <button style={S.weatherSmallBtn} onClick={handleCitySearch}>{weatherLoading ? "..." : "Buscar"}</button>
                <button style={S.weatherGeoBtn} onClick={tryGeo}>📍</button>
              </div>
              <div style={S.divider}>
                <div style={S.dividerLine} /><div style={S.dividerText}>ou insira manualmente</div><div style={S.dividerLine} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={S.manualLabel}>Temperatura (°C)</div>
                  <input style={{ ...S.weatherInput, width: "100%" }} type="number" placeholder="Ex: 22"
                    value={manualTemp} onChange={e => setManualTemp(e.target.value)} />
                </div>
                <div>
                  <div style={S.manualLabel}>Condição</div>
                  <select style={{ ...S.weatherInput, width: "100%", cursor: "pointer" }}
                    value={manualCond} onChange={e => setManualCond(e.target.value)}>
                    {MANUAL_CONDITIONS.map(c => <option key={c.value} value={c.value} style={{ background: "#111" }}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <button style={{ ...S.weatherSmallBtn, width: "100%", marginTop: 10, padding: "11px" }}
                onClick={handleManualWeather} disabled={!manualTemp}>Usar clima manual</button>
            </div>
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}>Tipo de treino</div>
            <div style={S.workoutGrid}>
              {WORKOUT_TYPES.map(w => (
                <button key={w} style={S.workoutBtn(workout === w)} onClick={() => setWorkout(w)}>{w}</button>
              ))}
            </div>
          </div>

          <div style={{ padding: "0 20px" }}>
            <button style={S.generateBtn(!canGenerate)} onClick={handleGenerate} disabled={!canGenerate}>
              {generating ? "Criando looks..." : "✦ Sugerir looks"}
            </button>
            {!weather && <div style={S.hint}>Informe o clima acima</div>}
            {!workout && weather && <div style={S.hint}>Selecione um tipo de treino</div>}
            {wardrobe.length < 3 && <div style={S.hint}>Adicione pelo menos 3 peças no guarda-roupa</div>}
          </div>

          {genError && <div style={S.errorBox}>{genError}</div>}

          {generating && (
            <div style={{ textAlign: "center", padding: "36px 20px", color: "#555" }}>
              <div style={{ fontSize: 13, marginBottom: 10 }}>Montando seus looks...</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>{[0,1,2].map(i => <div key={i} style={S.dot(i)} />)}</div>
            </div>
          )}

          {looks.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionTitle}>{looks.length} looks para hoje</div>
              {looks.map((look, i) => (
                <div key={i} style={S.lookCard}>
                  <div style={S.lookHeader}>
                    <div style={S.lookBadge}>{look.style}</div>
                    <div style={S.lookTitle}>{look.title}</div>
                    <div style={S.lookDesc}>{look.description}</div>
                  </div>
                  <div style={S.lookItems}>
                    {Object.entries(look.items).map(([slot, itemId]) => {
                      if (!itemId) return null;
                      const item = getItem(itemId);
                      if (!item) return null;
                      return (
                        <div key={slot} style={S.lookItem}>
                          {item.photo ? <img src={item.photo} style={S.lookItemImg} alt={item.name} />
                            : <div style={S.lookItemPlaceholder}>{getCatIcon(item.category)}</div>}
                          <div>
                            <div style={S.lookItemCat}>{getCatLabel(slot)}</div>
                            <div style={S.lookItemName}>{item.name}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── WARDROBE ── */}
      {tab === "wardrobe" && (
        <>
          <div style={S.section}>
            <div style={S.catTabs}>
              {CATEGORIES.map(c => (
                <button key={c.id} style={S.catTab(activeCat === c.id)} onClick={() => setActiveCat(c.id)}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
            {filteredWardrobe.length === 0 ? (
              <div style={{ textAlign: "center", padding: "56px 20px" }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>{CATEGORIES.find(c => c.id === activeCat)?.icon}</div>
                <div style={{ fontSize: 14, color: "#444" }}>Nenhuma peça aqui ainda</div>
                <div style={{ fontSize: 12, color: "#333", marginTop: 6 }}>Toque em + para adicionar</div>
              </div>
            ) : (
              <div style={S.clothingGrid}>
                {filteredWardrobe.map(item => (
                  <div key={item.id} style={S.clothingCard}>
                    {item.photo ? <img src={item.photo} style={S.clothingImg} alt={item.name} />
                      : <div style={S.clothingImgPlaceholder}>{getCatIcon(item.category)}</div>}
                    <div style={S.clothingInfo}>
                      <div style={S.clothingName}>{item.name}</div>
                      <div style={S.clothingDesc}>{item.description}</div>
                      <div style={S.clothingActions}>
                        <button style={S.editBtn} onClick={() => openEditModal(item)}>✏️ Editar</button>
                        <button style={S.deleteBtn} onClick={() => handleDelete(item.id)}>Remover</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FAB buttons */}
          <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImportJSON} />
          <div style={S.fabRow}>
            <button style={S.fabBtn(false)} onClick={openAddModal} title="Adicionar peça">+</button>
            <button style={S.fabBtn(true)} onClick={() => importRef.current.click()} title="Importar backup">📥</button>
            <button style={S.fabBtn(true)} onClick={handleExportJSON} title="Exportar backup">📤</button>
          </div>
        </>
      )}

      {/* Tab bar */}
      <div style={S.tabBar}>
        <button style={S.tab(tab === "suggest")} onClick={() => setTab("suggest")}>
          <span style={S.tabIcon}>✦</span>SUGERIR
        </button>
        <button style={S.tab(tab === "wardrobe")} onClick={() => setTab("wardrobe")}>
          <span style={S.tabIcon}>👗</span>GUARDA-ROUPA
        </button>
      </div>

      {/* Modal — Add / Edit */}
      {showModal && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <div style={S.modalTitle}>{editingItem ? "Editar peça" : "Adicionar peça"}</div>
              <button style={S.modalCloseBtn} onClick={closeModal}>✕</button>
            </div>

            <label style={S.label}>Categoria</label>
            <div style={S.catSelectGrid}>
              {CATEGORIES.map(c => (
                <button key={c.id} style={S.catSelectBtn(form.category === c.id)}
                  onClick={() => setForm(f => ({ ...f, category: c.id }))}>
                  {c.icon}<br />{c.label}
                </button>
              ))}
            </div>

            <label style={S.label}>Foto</label>
            <div style={S.photoUpload} onClick={() => fileRef.current.click()}>
              {form.photo ? <img src={form.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="preview" />
                : <><div style={{ fontSize: 30, marginBottom: 6 }}>📷</div><div style={{ fontSize: 12, color: "#444" }}>Toque para {editingItem?.photo ? "trocar" : "adicionar"} foto</div></>}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
            </div>

            {form.photo && (
              <button onClick={() => setForm(f => ({ ...f, photo: null }))}
                style={{ background: "none", border: "none", color: "#FF5C0088", fontSize: 12, cursor: "pointer", marginBottom: 12, padding: 0 }}>
                Remover foto
              </button>
            )}

            <label style={S.label}>Nome da peça</label>
            <input style={S.input} placeholder="Ex: Nike Air Zoom Pegasus" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

            <label style={S.label}>Descrição (cores, detalhes)</label>
            <textarea style={S.textarea} placeholder="Ex: Cinza claro com detalhes azul marinho" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

            <button style={{ ...S.saveBtn, opacity: form.name ? 1 : 0.4 }} onClick={handleSave} disabled={!form.name}>
              {editingItem ? "Salvar alterações" : "Salvar peça"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
