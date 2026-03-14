// src/services/convexApi.js
// DROP-IN REPLACEMENT for Mongoapi.js
// Same exported function names: loadDay, saveDay, loadAllDays, loadNote, saveNote, appendNote, loadAlarms, saveAlarms
// Just delete Mongoapi.js and rename all imports from "Mongoapi" → "convexApi"

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

// @convex-dev/auth stores the JWT in localStorage under this key automatically
function setAuth() {
  const token = localStorage.getItem("_convexAuthJWT");
  if (token) convex.setAuth(token);
  return convex;
}

// ── DAYS ─────────────────────────────────────────────────────

export const loadAllDays = async () => {
  try { return await setAuth().query(api.days.getAllDays); }
  catch (e) { console.error("loadAllDays failed:", e); return {}; }
};

export const loadDay = async (dateKey) => {
  try { return await setAuth().query(api.days.getDay, { date: dateKey }); }
  catch (e) { console.error("loadDay failed:", e); return { date: dateKey, tasks: [], reflection: null }; }
};

export const saveDay = async (dateKey, { tasks, reflection }) => {
  try { return await setAuth().mutation(api.days.saveDay, { date: dateKey, tasks: tasks || [], reflection: reflection ?? null }); }
  catch (e) { console.error("saveDay failed:", e); }
};

// ── NOTES ────────────────────────────────────────────────────

export const loadNote = async (dateKey) => {
  try {
    const result = await setAuth().query(api.notes.getNote, { date: dateKey });
    return result?.content || "";
  } catch (e) { return ""; }
};

export const saveNote = async (dateKey, content) => {
  try { return await setAuth().mutation(api.notes.saveNote, { date: dateKey, content }); }
  catch (e) { console.error("saveNote failed:", e); }
};

export const appendNote = async (dateKey, content) => {
  try { return await setAuth().mutation(api.notes.appendNote, { date: dateKey, content }); }
  catch (e) { console.error("appendNote failed:", e); }
};

// ── ALARMS ───────────────────────────────────────────────────

export const loadAlarms = async () => {
  try { return await setAuth().query(api.alarms.getAlarms); }
  catch (e) { return []; }
};

export const saveAlarms = async (alarms) => {
  try { return await setAuth().mutation(api.alarms.saveAlarms, { alarms }); }
  catch (e) { console.error("saveAlarms failed:", e); }
};