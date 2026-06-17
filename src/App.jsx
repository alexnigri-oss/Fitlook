import { useState, useEffect, useRef } from "react";

// ── Storage helpers ──────────────────────────────────────────────
const STORAGE_KEY = "fitlook_wardrobe";

async function loadWardrobe() {
  try {
    const r = await window.storage.get(STORAGE_KEY);
    return r ? JSON.parse(r.value) : [];
  } catch { return []; }
}

async function saveWardrobe(items) {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(items));
  } catch (e) { console.error(e); }
}

// ── Weather ──────────────────────────────────────────────────────
async function fetchWeatherByCoords(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m&timezone=auto`;
  const r = await fetch(url);
  const d = await r.json();
  return { temp: Math.round(d.current.temperature_2m), code: d.current.weathercode, wind: Math.round(d.current.windspeed_10m) };
}

async function fetchWeatherByCity(city) {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`;
  const geoR = await fetch(geoUrl);
  const geoD = await geoR.json();
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
