import { useEffect, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";
import {
  clearFlexCalibrationStorage,
  defaultBent,
  defaultStraight,
  loadFlexCalibrationWithDefaults,
  rawToBendNormalized,
  saveFlexCalibration,
} from "../lib/flexCalibrationStorage";
import { useSensor } from "../context/SensorContext";

const FINGER_NAMES = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
const FINGER_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#e0d9ff"];

export default function HandVisualizer() {
  const { fingers, connected, status, connect, fingersRef } = useSensor();
  const [smooth, setSmooth] = useState<number[]>([0, 0, 0, 0, 0]);
  const [detectedGesture, setDetectedGesture] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [calibStraight, setCalibStraight] = useState<number[]>(() =>
    defaultStraight()
  );
  const [calibBent, setCalibBent] = useState<number[]>(() => defaultBent());
  const [calibHint, setCalibHint] = useState<string | null>(null);
  const calibStraightRef = useRef<number[]>(defaultStraight());
  const calibBentRef = useRef<number[]>(defaultBent());
  const smoothRef = useRef<number[]>([0, 0, 0, 0, 0]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const c = loadFlexCalibrationWithDefaults();
    setCalibStraight(c.straight);
    setCalibBent(c.bent);
    calibStraightRef.current = c.straight;
    calibBentRef.current = c.bent;
  }, []);

  useEffect(() => {
    calibStraightRef.current = calibStraight;
  }, [calibStraight]);

  useEffect(() => {
    calibBentRef.current = calibBent;
  }, [calibBent]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("DEMO").select("*");
      if (data) setProfiles(data.filter((p: any) => p.Finger1 !== null));
    }
    load();
  }, []);

  useEffect(() => {
    function loop() {
      animRef.current = requestAnimationFrame(loop);
      const target = fingersRef.current;
      const curr = smoothRef.current;
      const next = curr.map((c, i) => c + (target[i] - c) * 0.1);
      smoothRef.current = next;
      setSmooth([...next]);
    }
    loop();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => {
    if (profiles.length === 0 || !connected) return;
    const THRESHOLD = 300;
    let bestMatch = null;
    let bestScore = Infinity;
    for (const p of profiles) {
      const score =
        Math.abs(p.Finger1 - fingers[0]) +
        Math.abs(p.Finger2 - fingers[1]) +
        Math.abs(p.Finger3 - fingers[2]) +
        Math.abs(p.Finger4 - fingers[3]) +
        Math.abs(p.Finger5 - fingers[4]);
      if (score < bestScore) { bestScore = score; bestMatch = p; }
    }
    setDetectedGesture(bestScore < THRESHOLD ? bestMatch?.Label : null);
  }, [fingers, profiles, connected]);

  function captureStraight() {
    const v = [...fingersRef.current];
    calibStraightRef.current = v;
    setCalibStraight(v);
    saveFlexCalibration(v, calibBentRef.current);
    setCalibHint("Straight pose saved — now curl fingers and tap Set bent.");
  }

  function captureBent() {
    const v = [...fingersRef.current];
    calibBentRef.current = v;
    setCalibBent(v);
    saveFlexCalibration(calibStraightRef.current, v);
    setCalibHint("Bent pose saved. Hand model will track between these ranges.");
  }

  function resetCalibration() {
    const s = defaultStraight();
    const b = defaultBent();
    calibStraightRef.current = s;
    calibBentRef.current = b;
    setCalibStraight(s);
    setCalibBent(b);
    clearFlexCalibrationStorage();
    setCalibHint("Calibration reset to defaults (0 → 4095).");
  }

  // Per-finger bend 0–1 from calibration
  const bends = smooth.map((r, i) =>
    rawToBendNormalized(r, calibStraight[i], calibBent[i])
  );

  // Finger joint positions in the SVG coordinate space (viewBox 0 0 200 260)
  // Each finger: [knuckle, mid-joint, tip] as {x, y}
  // These are the STRAIGHT positions — we'll rotate from knuckle
  const fingerDefs = [
    // Thumb — 2 joints, starts from side of palm
    {
      joints: [{ x: 52, y: 148 }, { x: 34, y: 118 }, { x: 22, y: 94 }],
      color: FINGER_COLORS[0],
      width: 14,
    },
    // Index
    {
      joints: [{ x: 72, y: 78 }, { x: 72, y: 52 }, { x: 72, y: 32 }, { x: 72, y: 16 }],
      color: FINGER_COLORS[1],
      width: 13,
    },
    // Middle — tallest
    {
      joints: [{ x: 98, y: 74 }, { x: 98, y: 46 }, { x: 98, y: 24 }, { x: 98, y: 6 }],
      color: FINGER_COLORS[2],
      width: 14,
    },
    // Ring
    {
      joints: [{ x: 124, y: 76 }, { x: 124, y: 50 }, { x: 124, y: 30 }, { x: 124, y: 14 }],
      color: FINGER_COLORS[3],
      width: 13,
    },
    // Pinky
    {
      joints: [{ x: 148, y: 90 }, { x: 150, y: 68 }, { x: 152, y: 52 }, { x: 154, y: 40 }],
      color: FINGER_COLORS[4],
      width: 11,
    },
  ];

  // Build bent finger path — rotate each segment around its base joint
  function buildFingerPath(def: typeof fingerDefs[0], bend: number) {
    const pts = [def.joints[0]]; // start at knuckle (fixed)
    
    for (let i = 1; i < def.joints.length; i++) {
      const base = pts[i - 1];
      const straight = def.joints[i];
      
      // Vector from base to straight tip
      const dx = straight.x - def.joints[i - 1].x;
      const dy = straight.y - def.joints[i - 1].y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      
      // Straight angle of this segment
      const straightAngle = Math.atan2(dy, dx);
      
      // Add cumulative bend — each segment bends more than previous
      const bendAngle = straightAngle + bend * (Math.PI / 2) * (i * 0.5);
      
      pts.push({
        x: base.x + Math.cos(bendAngle) * segLen,
        y: base.y + Math.sin(bendAngle) * segLen,
      });
    }
    return pts;
  }

  return (
    <div style={{
      width: "100%", height: "100vh", background: "#070711",
      display: "flex", flexDirection: "column",
      fontFamily: "'Space Mono', monospace", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 24px", borderBottom: "1px solid rgba(99,102,241,0.2)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(7,7,17,0.98)", zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: connected ? "#22c55e" : "#6366f1",
            boxShadow: connected ? "0 0 10px #22c55e" : "0 0 10px #6366f1",
          }} />
          <span style={{ color: "#e2e8f0", fontSize: 12, letterSpacing: 3 }}>
            BRIDGE — HAND VISUALIZER
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "rgba(99,102,241,0.7)", fontSize: 10, letterSpacing: 2 }}>
            {status.toUpperCase()}
          </span>
          {!connected && (
            <button onClick={connect} style={{
              padding: "6px 18px", background: "transparent",
              border: "1px solid #6366f1", borderRadius: 3,
              color: "#6366f1", fontSize: 10, letterSpacing: 2, cursor: "pointer",
            }}>CONNECT</button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Hand viewport */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
        }}>
          {/* Grid background */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <defs>
              <pattern id="sg" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(99,102,241,0.05)" strokeWidth="0.5"/>
              </pattern>
              <pattern id="lg" width="120" height="120" patternUnits="userSpaceOnUse">
                <rect width="120" height="120" fill="url(#sg)"/>
                <path d="M 120 0 L 0 0 0 120" fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#lg)"/>
          </svg>

          {/* Hand SVG */}
          <svg viewBox="0 0 200 260" width="340" height="442"
            style={{ position: "relative", zIndex: 2, overflow: "visible", filter: "drop-shadow(0 0 20px rgba(99,102,241,0.3))" }}>
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <linearGradient id="palmg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#252550"/>
                <stop offset="100%" stopColor="#14142e"/>
              </linearGradient>
            </defs>

            {/* Palm shape */}
            <path
              d="M 55 155 
                 C 40 155 28 145 25 130 
                 L 20 95 
                 C 18 82 25 72 38 72
                 L 42 72
                 C 48 72 55 68 60 62
                 L 64 54
                 C 68 46 78 44 84 50
                 L 86 52
                 C 90 46 98 44 104 50
                 L 106 52
                 C 110 46 120 45 125 52
                 L 127 55
                 C 132 50 142 52 145 60
                 L 152 80
                 C 158 92 155 108 145 114
                 L 145 155
                 C 145 165 137 172 127 172
                 L 73 172
                 C 63 172 55 165 55 155 Z"
              fill="url(#palmg)"
              stroke="#6366f1"
              strokeWidth="1.5"
              strokeOpacity="0.5"
            />

            {/* Wrist */}
            <path
              d="M 68 172 L 62 220 C 62 228 70 234 80 234 L 120 234 C 130 234 138 228 138 220 L 132 172 Z"
              fill="#14142e"
              stroke="#6366f1"
              strokeWidth="1"
              strokeOpacity="0.3"
            />

            {/* Render each finger */}
            {fingerDefs.map((def, fi) => {
              const pts = buildFingerPath(def, bends[fi]);
              const w = def.width;
              const color = def.color;

              return (
                <g key={fi} filter="url(#glow)">
                  {/* Draw segments as rounded rectangles between joints */}
                  {pts.slice(0, -1).map((pt, si) => {
                    const next = pts[si + 1];
                    const dx = next.x - pt.x;
                    const dy = next.y - pt.y;
                    const len = Math.sqrt(dx*dx + dy*dy);
                    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                    const segW = w - si * 1.5;
                    return (
                      <g key={si} transform={`translate(${pt.x}, ${pt.y}) rotate(${angle})`}>
                        <rect
                          x={0} y={-segW / 2}
                          width={len} height={segW}
                          rx={segW / 2}
                          fill={color}
                          fillOpacity={0.75 - si * 0.05}
                          stroke={color}
                          strokeWidth={0.5}
                          strokeOpacity={0.5}
                        />
                      </g>
                    );
                  })}
                  {/* Joint circles */}
                  {pts.map((pt, ji) => (
                    <circle key={ji} cx={pt.x} cy={pt.y}
                      r={ji === 0 ? w/2 + 1 : w/2 - ji}
                      fill={color} fillOpacity={ji === pts.length - 1 ? 0.9 : 0.6}
                      stroke={color} strokeWidth={0.5} strokeOpacity={0.4}
                    />
                  ))}
                  {/* Glowing fingertip */}
                  <circle
                    cx={pts[pts.length-1].x} cy={pts[pts.length-1].y}
                    r={w/2 - (pts.length - 2)}
                    fill={color} fillOpacity={0.5}
                    filter="url(#glow)"
                  />
                </g>
              );
            })}

            {/* Knuckle detail lines on palm */}
            <line x1="68" y1="148" x2="145" y2="148" stroke="rgba(99,102,241,0.15)" strokeWidth="1" strokeDasharray="2,4"/>
          </svg>

          {/* Big letter ghost behind */}
          {detectedGesture && (
            <div style={{
              position: "absolute", fontSize: 200, fontWeight: 700,
              color: "#6366f1", opacity: 0.06, userSelect: "none",
              pointerEvents: "none", lineHeight: 1,
            }}>
              {detectedGesture}
            </div>
          )}
        </div>

        {/* Side panel */}
        <div style={{
          width: 240, background: "rgba(7,7,17,0.97)",
          borderLeft: "1px solid rgba(99,102,241,0.12)",
          padding: "24px 18px", display: "flex", flexDirection: "column", gap: 24,
        }}>
          <div style={{ textAlign: "center", paddingBottom: 20, borderBottom: "1px solid rgba(99,102,241,0.1)" }}>
            <div style={{ fontSize: 9, color: "rgba(99,102,241,0.5)", letterSpacing: 4, marginBottom: 12 }}>
              DETECTED SIGN
            </div>
            <div style={{
              fontSize: 80, fontWeight: 700, lineHeight: 1,
              color: detectedGesture ? "#6366f1" : "rgba(99,102,241,0.1)",
              textShadow: detectedGesture ? "0 0 40px rgba(99,102,241,0.6)" : "none",
              transition: "all 0.3s ease",
            }}>
              {detectedGesture || "—"}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 9, color: "rgba(99,102,241,0.5)", letterSpacing: 4, marginBottom: 2 }}>
              FLEX SENSORS
            </div>
            {FINGER_NAMES.map((name, i) => {
              const pct = Math.round(
                rawToBendNormalized(fingers[i], calibStraight[i], calibBent[i]) *
                  100
              );
              return (
                <div key={name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>
                      {name.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 10, color: FINGER_COLORS[i], fontWeight: 600 }}>
                      {pct}%
                    </span>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.04)", borderRadius: 2 }}>
                    <div style={{
                      height: "100%", width: `${pct}%`,
                      background: FINGER_COLORS[i], borderRadius: 2,
                      transition: "width 0.08s ease",
                      boxShadow: `0 0 6px ${FINGER_COLORS[i]}88`,
                    }}/>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              paddingTop: 8,
              borderTop: "1px solid rgba(99,102,241,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: "rgba(99,102,241,0.5)",
                letterSpacing: 4,
              }}
            >
              CALIBRATION
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 9,
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.35)",
              }}
            >
              Hold your hand flat, then curled. Saves per finger in this browser.
            </p>
            <button
              type="button"
              disabled={!connected}
              onClick={captureStraight}
              style={{
                padding: "8px 12px",
                background: connected ? "rgba(99,102,241,0.12)" : "transparent",
                border: "1px solid rgba(99,102,241,0.35)",
                borderRadius: 3,
                color: connected ? "#a5b4fc" : "rgba(99,102,241,0.25)",
                fontSize: 10,
                letterSpacing: 1,
                cursor: connected ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              Set straight (open hand)
            </button>
            <button
              type="button"
              disabled={!connected}
              onClick={captureBent}
              style={{
                padding: "8px 12px",
                background: connected ? "rgba(99,102,241,0.12)" : "transparent",
                border: "1px solid rgba(99,102,241,0.35)",
                borderRadius: 3,
                color: connected ? "#a5b4fc" : "rgba(99,102,241,0.25)",
                fontSize: 10,
                letterSpacing: 1,
                cursor: connected ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              Set bent (fully curled)
            </button>
            <button
              type="button"
              onClick={resetCalibration}
              style={{
                padding: "6px 12px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 3,
                color: "rgba(255,255,255,0.35)",
                fontSize: 9,
                letterSpacing: 1,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Reset to defaults
            </button>
            {calibHint && (
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(34,197,94,0.85)",
                  lineHeight: 1.4,
                }}
              >
                {calibHint}
              </div>
            )}
          </div>

          {profiles.length > 0 && (
            <div style={{ marginTop: "auto" }}>
              <div style={{ fontSize: 9, color: "rgba(99,102,241,0.5)", letterSpacing: 4, marginBottom: 12 }}>
                KNOWN GESTURES
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {profiles.map((p) => (
                  <span key={p.id} style={{
                    padding: "4px 12px", border: "1px solid rgba(99,102,241,0.3)",
                    borderRadius: 3, fontSize: 12, color: "#6366f1", letterSpacing: 1,
                  }}>
                    {p.Label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}