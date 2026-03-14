// ─────────────────────────────────────────────────────────────
// useWebSocketSync.js — Real-time WebSocket sync layer
//
// ARCHITECTURE:
// ┌──────────┐   WS broadcast   ┌──────────────────────────────┐
// │  Tab A   │ ──────────────▶ │  Express + ws server :3001   │
// │ (device1)│ ◀────────────── │  fans out to all other       │
// └──────────┘  SYNC_EVENT     │  connected tabs / devices    │
//                               └──────────────────────────────┘
//                                        │  fan-out
//                               ┌────────┴──────────┐
//                          ┌────┴────┐         ┌────┴────┐
//                          │  Tab B  │         │  Tab C  │
//                          │ (same   │         │ (phone) │
//                          │  device)│         │         │
//                          └─────────┘         └─────────┘
//
// TWO-LAYER SYNC:
// 1. BroadcastChannel  → same-origin, same-device tabs (instant, no server)
// 2. WebSocket         → cross-device + cross-network (requires server round-trip)
//
// Both layers fire independently. The dedup key prevents double-applying
// a change that came in via BOTH channels.
//
// USAGE:
// ──────
//   // In Today.jsx (inside <TabSyncProvider>):
//   const { wsStatus, sendWsEvent } = useWebSocketSync({
//     tabId,
//     currentDate,
//     onSyncEvent: ({ changeType, payload, fromTabId }) => {
//       // re-read localStorage or update state
//     }
//   });
//
// EXPORTED:
//   useWebSocketSync(options) → { wsStatus, sendWsEvent, wsClientCount }
//   WS_STATUS: "connecting" | "open" | "closed" | "error"
// ─────────────────────────────────────────────────────────────

// import { useEffect, useRef, useState, useCallback } from "react";

// const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3001";

// // Dedup window in ms — ignore the same event if seen via both channels
// const DEDUP_TTL = 2000;

// // ─────────────────────────────────────────────────────────────
// // useWebSocketSync
// // ─────────────────────────────────────────────────────────────
// export function useWebSocketSync({ tabId, currentDate, onSyncEvent }) {
//   const wsRef           = useRef(null);
//   const reconnectTimer  = useRef(null);
//   const reconnectCount  = useRef(0);
//   const seenEvents      = useRef(new Map()); // eventKey → timestamp, for dedup
//   const onSyncRef       = useRef(onSyncEvent);

//   const [wsStatus,      setWsStatus]      = useState("connecting");
//   const [wsClientCount, setWsClientCount] = useState(0);

//   // Keep callback ref current without re-triggering effects
//   useEffect(() => { onSyncRef.current = onSyncEvent; }, [onSyncEvent]);

//   // ── Dedup helper ─────────────────────────────────────────
//   // Returns true if this event is a duplicate (already seen recently)
//   const isDuplicate = useCallback((key) => {
//     const now = Date.now();
//     // Prune stale entries
//     for (const [k, ts] of seenEvents.current) {
//       if (now - ts > DEDUP_TTL) seenEvents.current.delete(k);
//     }
//     if (seenEvents.current.has(key)) return true;
//     seenEvents.current.set(key, now);
//     return false;
//   }, []);

//   // ── Connect ───────────────────────────────────────────────
//   const connect = useCallback(() => {
//     if (wsRef.current?.readyState === WebSocket.OPEN) return;

//     console.log(`[${tabId}] 🔌 WS connecting...`);
//     setWsStatus("connecting");

//     let ws;
//     try {
//       ws = new WebSocket(WS_URL);
//     } catch (e) {
//       console.error("WS constructor failed:", e);
//       setWsStatus("error");
//       scheduleReconnect();
//       return;
//     }
//     wsRef.current = ws;

//     ws.onopen = () => {
//       console.log(`[${tabId}] ✅ WS connected`);
//       setWsStatus("open");
//       reconnectCount.current = 0;

//       // Register this tab with the server
//       send({ type: "REGISTER", tabId, date: currentDate });
//     };

//     ws.onmessage = (event) => {
//       let msg;
//       try { msg = JSON.parse(event.data); } catch { return; }

//       switch (msg.type) {
//         case "REGISTERED":
//           console.log(`[${tabId}] 📋 Server confirmed registration at ${new Date(msg.serverTime).toLocaleTimeString()}`);
//           break;

//         case "PONG":
//           // Server heartbeat reply — connection healthy
//           break;

//         case "SYNC_EVENT": {
//           // Build a dedup key from changeType + a stable payload hash
//           const dedupKey = `${msg.changeType}-${msg.fromTabId}-${stableHash(msg.payload)}`;
//           if (isDuplicate(dedupKey)) {
//             console.log(`[${tabId}] ⏭ Dedup skip (WS): ${msg.changeType}`);
//             return;
//           }
//           console.log(`[${tabId}] 📥 WS sync event: ${msg.changeType} from ${msg.fromTabId}`);
//           onSyncRef.current?.({
//             changeType:  msg.changeType,
//             payload:     msg.payload,
//             fromTabId:   msg.fromTabId,
//             serverTime:  msg.serverTime,
//             source:      "websocket",
//           });
//           break;
//         }

//         default:
//           break;
//       }
//     };

//     ws.onerror = (e) => {
//       console.error(`[${tabId}] WS error`, e);
//       setWsStatus("error");
//     };

//     ws.onclose = (e) => {
//       console.log(`[${tabId}] 🔴 WS closed (code ${e.code})`);
//       setWsStatus("closed");
//       wsRef.current = null;
//       // Don't reconnect on intentional close (code 1000)
//       if (e.code !== 1000) scheduleReconnect();
//     };
//   }, [tabId, currentDate, isDuplicate]);

//   // ── Reconnect with exponential back-off (max 30s) ────────
//   const scheduleReconnect = useCallback(() => {
//     if (reconnectTimer.current) return;
//     const delay = Math.min(1000 * 2 ** reconnectCount.current, 30_000);
//     reconnectCount.current++;
//     console.log(`[${tabId}] 🔄 Reconnecting in ${delay}ms (attempt ${reconnectCount.current})`);
//     reconnectTimer.current = setTimeout(() => {
//       reconnectTimer.current = null;
//       connect();
//     }, delay);
//   }, [connect, tabId]);

//   // ── Mount / unmount ───────────────────────────────────────
//   useEffect(() => {
//     connect();
//     return () => {
//       clearTimeout(reconnectTimer.current);
//       wsRef.current?.close(1000, "unmount");
//     };
//   }, [connect]);

//   // ── Notify server when date changes ──────────────────────
//   useEffect(() => {
//     if (wsRef.current?.readyState === WebSocket.OPEN) {
//       send({ type: "DATE_CHANGE", tabId, date: currentDate });
//     }
//   }, [currentDate, tabId]);

//   // ── Keep-alive ping every 25s ─────────────────────────────
//   useEffect(() => {
//     const iv = setInterval(() => {
//       if (wsRef.current?.readyState === WebSocket.OPEN) {
//         send({ type: "PING" });
//       }
//     }, 25_000);
//     return () => clearInterval(iv);
//   }, []);

//   // ── Send helper ───────────────────────────────────────────
//   function send(data) {
//     if (wsRef.current?.readyState === WebSocket.OPEN) {
//       wsRef.current.send(JSON.stringify(data));
//     }
//   }

//   // ── Public: broadcast a change event to all other tabs ───
//   // Also marks it as seen locally to prevent self-echo
//   const sendWsEvent = useCallback((changeType, payload = {}) => {
//     const dedupKey = `${changeType}-${tabId}-${stableHash(payload)}`;
//     // Mark as seen so WE don't re-apply our own event if server echoes
//     seenEvents.current.set(dedupKey, Date.now());

//     send({ type: "BROADCAST", tabId, changeType, payload });
//     console.log(`[${tabId}] 📤 WS broadcast: ${changeType}`);
//   }, [tabId]);

//   return { wsStatus, sendWsEvent, wsClientCount };
// }

// // ─────────────────────────────────────────────────────────────
// // Stable hash — tiny deterministic fingerprint for dedup
// // Not cryptographic, just collision-resistant enough for a 2s window
// // ─────────────────────────────────────────────────────────────
// function stableHash(obj) {
//   if (!obj) return "0";
//   const str = JSON.stringify(obj, Object.keys(obj).sort());
//   let h = 0;
//   for (let i = 0; i < str.length; i++) {
//     h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
//   }
//   return String(h >>> 0);
// }

// // ─────────────────────────────────────────────────────────────
// // WsStatusBadge — optional debug UI component
// // Drop anywhere to see connection status:
// //   <WsStatusBadge status={wsStatus} />
// // ─────────────────────────────────────────────────────────────
// export function WsStatusBadge({ status }) {
//   const colors = {
//     connecting: "#fdcb6e",
//     open:       "#00b894",
//     closed:     "#b2bec3",
//     error:      "#d63031",
//   };
//   const labels = {
//     connecting: "⟳ Connecting",
//     open:       "● Live",
//     closed:     "○ Offline",
//     error:      "✕ Error",
//   };
//   return (
//     <span style={{
//       display:      "inline-flex",
//       alignItems:   "center",
//       gap:          "4px",
//       fontSize:     "11px",
//       fontFamily:   "monospace",
//       padding:      "2px 8px",
//       borderRadius: "999px",
//       background:   colors[status] + "22",
//       color:        colors[status],
//       border:       `1px solid ${colors[status]}55`,
//       userSelect:   "none",
//     }}>
//       {labels[status] || status}
//     </span>
//   );
// }
import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL =  import.meta.env.VITE_WS_URL || "ws://localhost:3001"  ;
const DEDUP_TTL = 2000;

export function useWebSocketSync({ tabId, currentDate, onSyncEvent }) {
  const wsRef          = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectCount = useRef(0);
  const seenEvents     = useRef(new Map());
  const onSyncRef      = useRef(onSyncEvent);
  const isMounted      = useRef(false);          // ← FIX: tracks real mount state

  const [wsStatus,      setWsStatus]      = useState("connecting");
  const [wsClientCount, setWsClientCount] = useState(0);

  useEffect(() => { onSyncRef.current = onSyncEvent; }, [onSyncEvent]);

  const isDuplicate = useCallback((key) => {
    const now = Date.now();
    for (const [k, ts] of seenEvents.current) {
      if (now - ts > DEDUP_TTL) seenEvents.current.delete(k);
    }
    if (seenEvents.current.has(key)) return true;
    seenEvents.current.set(key, now);
    return false;
  }, []);

  const connect = useCallback(() => {
    // ← FIX: don't connect if unmounted (Strict Mode double-invoke guard)
    if (!isMounted.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    console.log(`[${tabId}] 🔌 WS connecting...`);
    setWsStatus("connecting");

    let ws;
    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      console.error("WS constructor failed:", e);
      setWsStatus("error");
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) { ws.close(1000, "unmounted"); return; }  // ← FIX
      console.log(`[${tabId}] ✅ WS connected`);
      setWsStatus("open");
      reconnectCount.current = 0;
      send({ type: "REGISTER", tabId, date: currentDate });
    };

    ws.onmessage = (event) => {
      if (!isMounted.current) return;                                    // ← FIX
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      switch (msg.type) {
        case "REGISTERED":
          console.log(`[${tabId}] 📋 Registered at ${new Date(msg.serverTime).toLocaleTimeString()}`);
          break;
        case "PONG":
          break;
        case "SYNC_EVENT": {
          const dedupKey = `${msg.changeType}-${msg.fromTabId}-${stableHash(msg.payload)}`;
          if (isDuplicate(dedupKey)) {
            console.log(`[${tabId}] ⏭ Dedup skip: ${msg.changeType}`);
            return;
          }
          console.log(`[${tabId}] 📥 WS sync: ${msg.changeType} from ${msg.fromTabId}`);
          onSyncRef.current?.({ changeType: msg.changeType, payload: msg.payload, fromTabId: msg.fromTabId, serverTime: msg.serverTime, source: "websocket" });
          break;
        }
        default:
          break;
      }
    };

    ws.onerror = () => {
      if (!isMounted.current) return;                                    // ← FIX
      setWsStatus("error");
    };

    ws.onclose = (e) => {
      if (!isMounted.current) return;                                    // ← FIX
      console.log(`[${tabId}] 🔴 WS closed (code ${e.code})`);
      setWsStatus("closed");
      wsRef.current = null;
      if (e.code !== 1000) scheduleReconnect();
    };
  }, [tabId, currentDate, isDuplicate]);

  const scheduleReconnect = useCallback(() => {
    if (!isMounted.current || reconnectTimer.current) return;            // ← FIX
    const delay = Math.min(1000 * 2 ** reconnectCount.current, 30_000);
    reconnectCount.current++;
    console.log(`[${tabId}] 🔄 Reconnecting in ${delay}ms (attempt ${reconnectCount.current})`);
    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      connect();
    }, delay);
  }, [connect, tabId]);

  // ── Mount / unmount — isMounted guards all async callbacks ──
  useEffect(() => {
    isMounted.current = true;                                            // ← FIX
    connect();

    return () => {
      isMounted.current = false;                                         // ← FIX: set FIRST
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
      if (wsRef.current) {
        wsRef.current.close(1000, "unmount");
        wsRef.current = null;
      }
    };
  }, [connect]);

  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      send({ type: "DATE_CHANGE", tabId, date: currentDate });
    }
  }, [currentDate, tabId]);

  useEffect(() => {
    const iv = setInterval(() => {
      if (isMounted.current && wsRef.current?.readyState === WebSocket.OPEN) {
        send({ type: "PING" });
      }
    }, 25_000);
    return () => clearInterval(iv);
  }, []);

  function send(data) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }

  const sendWsEvent = useCallback((changeType, payload = {}) => {
    const dedupKey = `${changeType}-${tabId}-${stableHash(payload)}`;
    seenEvents.current.set(dedupKey, Date.now());
    send({ type: "BROADCAST", tabId, changeType, payload });
    console.log(`[${tabId}] 📤 WS broadcast: ${changeType}`);
  }, [tabId]);

  return { wsStatus, sendWsEvent, wsClientCount };
}

function stableHash(obj) {
  if (!obj) return "0";
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

export function WsStatusBadge({ status }) {
  const colors = { connecting: "#fdcb6e", open: "#00b894", closed: "#b2bec3", error: "#d63031" };
  const labels = { connecting: "⟳ Connecting", open: "● Live", closed: "○ Offline", error: "✕ Error" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      fontSize: "11px", fontFamily: "monospace", padding: "2px 8px",
      borderRadius: "999px", background: (colors[status] || "#888") + "22",
      color: colors[status] || "#888", border: `1px solid ${colors[status] || "#888"}55`,
      userSelect: "none",
    }}>
      {labels[status] || status}
    </span>
  );
}