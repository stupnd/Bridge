/**
 * The team's task list for the To-do page.
 *
 * Sources: Midterm Report (Oct 23, 2026) sections 5–8, the Oct 20 team meeting
 * notes, documentation/Bridge-midterm-breakdown.md, and glove testing on Oct 24.
 *
 * To update: change a task's `status` (or add a task) and commit. `needs` lists
 * the ids of tasks that must be done first; the page uses it to work out what
 * is ready to start, what is blocked, and which tasks unblock the most work.
 */

export const ROADMAP_UPDATED = "2026-10-24";

export type Status = "done" | "doing" | "todo";

export type Area = "glove" | "body" | "data" | "model" | "app" | "testing";

export const AREAS: Record<Area, string> = {
  glove: "Glove hardware",
  body: "Body unit (Pi)",
  data: "Data",
  model: "Recognition",
  app: "Web app",
  testing: "Testing and report",
};

export type Task = {
  id: string;
  title: string;
  area: Area;
  status: Status;
  owners: string[];
  /** Month it's due, e.g. "Nov 2026". */
  due?: string;
  /** Ids of tasks that have to be done first. */
  needs?: string[];
  /** Why it matters, or what "done" means. */
  note?: string;
};

export const TEAM = ["Aidan", "Gauthier", "Krisha", "Somana", "Stuti", "William"];

export const TASKS: Task[] = [
  // ── Glove hardware ──
  {
    id: "glove1-flex",
    title: "Glove 1: flex sensors in boning tape with 10 kΩ dividers",
    area: "glove",
    status: "done",
    owners: ["Krisha", "Somana"],
  },
  {
    id: "glove1-imu",
    title: "Glove 1: 9-axis sensor reading reliably and axes mapped",
    area: "glove",
    status: "done",
    owners: ["Stuti"],
    note: "Oct 24: reads 1 g at rest, stays connected while moving. Palm down = Z −1000, fingers up = Y −1000, forearm twist = gyro Y.",
  },
  {
    id: "glove1-wiring",
    title: "Glove 1: solder and strain-relieve every wire",
    area: "glove",
    status: "doing",
    owners: ["Somana", "Stuti"],
    due: "Oct 2026",
    note: "The ring finger reads 0 whenever the hand moves (fine when still), and loose IMU wires froze the board on Oct 24. Every recording depends on this.",
  },
  {
    id: "glove1-mount",
    title: "Glove 1: fix the 9-axis sensor in one orientation and mark it",
    area: "glove",
    status: "todo",
    owners: ["Somana"],
    due: "Oct 2026",
    note: "Remounting it rotated the axes 90° on Oct 24, which makes older motion recordings disagree with newer ones. Draw an arrow toward the fingertips.",
  },
  {
    id: "glove1-protoboard",
    title: "Glove 1: finish the wrist protoboard with battery and power switch",
    area: "glove",
    status: "doing",
    owners: ["Somana", "Aidan"],
    due: "Nov 2026",
    needs: ["glove1-wiring"],
  },
  {
    id: "firmware-recover",
    title: "Firmware: recover from a stuck I2C bus without a power cycle",
    area: "glove",
    status: "todo",
    owners: ["Stuti"],
    due: "Nov 2026",
    note: "Today a wire glitch freezes the whole glove until USB is unplugged. It should cost one dropout instead.",
  },
  {
    id: "glove2",
    title: "Build glove 2 to the same design",
    area: "glove",
    status: "doing",
    owners: ["Somana", "Aidan"],
    due: "Nov 2026",
    needs: ["glove1-protoboard"],
  },

  // ── Body unit ──
  {
    id: "pi-tts",
    title: "Pi: DietPi, file transfer, Piper speech through the USB speaker",
    area: "body",
    status: "done",
    owners: ["William", "Gauthier"],
  },
  {
    id: "pi-ble",
    title: "Pi: receive glove packets over Bluetooth reliably",
    area: "body",
    status: "doing",
    owners: ["William", "Gauthier"],
    due: "Nov 2026",
    note: "Packet format is shared with the app: <9f5i, 56 bytes.",
  },
  {
    id: "body-imu",
    title: "Pi: body 9-axis sensor as a reference for hand position",
    area: "body",
    status: "doing",
    owners: ["Gauthier"],
    due: "Nov 2026",
  },
  {
    id: "body-mount",
    title: "Body unit: 3D-printed belt mount, assembled",
    area: "body",
    status: "doing",
    owners: ["Aidan"],
    due: "Nov 2026",
    note: "Planned for reading week at the Makerspace.",
  },
  {
    id: "pi-model",
    title: "Pi: run the recognizer and speak the result, no laptop",
    area: "body",
    status: "todo",
    owners: ["William", "Stuti"],
    due: "Nov 2026",
    needs: ["pi-ble", "word-model"],
  },
  {
    id: "sync",
    title: "Synchronize both gloves with the body unit",
    area: "body",
    status: "todo",
    owners: ["Gauthier", "William"],
    due: "Nov 2026",
    needs: ["glove2", "pi-ble"],
  },

  // ── Data ──
  {
    id: "collect-page",
    title: "Collect page: frame-by-frame recording, CSV export, team upload",
    area: "data",
    status: "done",
    owners: ["Krisha"],
  },
  {
    id: "data-jiz",
    title: "First motion dataset: J, I and Z, 10 each",
    area: "data",
    status: "done",
    owners: ["Stuti"],
    note: "Oct 24. Flex alone confuses J with I (5 of 10); with the 9-axis, 29 of 29 are told apart (one session, so optimistic).",
  },
  {
    id: "upload-e2e",
    title: "Test team upload end to end from the deployed site",
    area: "data",
    status: "doing",
    owners: ["Krisha"],
    due: "Oct 2026",
  },
  {
    id: "sign-list",
    title: "Choose the 50–100 signs Bridge will support",
    area: "data",
    status: "doing",
    owners: ["Aidan"],
    due: "Oct 2026",
    note: "Start with one-handed signs with distinct motion (YES, NO, HELLO, THANK YOU, PLEASE, SORRY, WHERE); two-handed ones wait for glove 2.",
  },
  {
    id: "data-second-session",
    title: "Record J, I, Z again on another day",
    area: "data",
    status: "todo",
    owners: ["Stuti"],
    due: "Oct 2026",
    needs: ["glove1-mount"],
    note: "Re-wearing the glove is the honest accuracy test; one session overstates it.",
  },
  {
    id: "data-letters",
    title: "Record 24 letters × 5 reps from 3–5 people",
    area: "data",
    status: "todo",
    owners: ["Krisha", "Somana", "Stuti"],
    due: "Nov 2026",
    needs: ["glove1-wiring", "upload-e2e"],
    note: "The letter model still uses one sample per letter from one person.",
  },
  {
    id: "data-words",
    title: "Record the first word signs, 10+ reps each, plus REST",
    area: "data",
    status: "todo",
    owners: ["Krisha", "Stuti"],
    due: "Nov 2026",
    needs: ["sign-list", "glove1-wiring", "glove1-mount"],
  },

  // ── Recognition ──
  {
    id: "letter-model",
    title: "Recognize the 24 static letters (nearest neighbour)",
    area: "model",
    status: "done",
    owners: ["Stuti"],
  },
  {
    id: "jz-translate",
    title: "Recognize J and Z on the Translate page using the 9-axis",
    area: "model",
    status: "todo",
    owners: ["Stuti"],
    due: "Nov 2026",
    needs: ["data-jiz"],
    note: "The data shows it works: twist on gyro Y = J, side-to-side on gyro Z = Z. The current 60° J rule would miss 8 of 10 real Js.",
  },
  {
    id: "imu-lookalikes",
    title: "Use hand orientation to separate G/Q, K/P and H/U",
    area: "model",
    status: "todo",
    owners: ["Stuti"],
    due: "Nov 2026",
    needs: ["data-letters"],
  },
  {
    id: "train-pipeline",
    title: "Compare models with leave-one-person-out testing",
    area: "model",
    status: "todo",
    owners: ["Stuti", "Krisha"],
    due: "Nov 2026",
    needs: ["data-letters"],
    note: "k-NN vs random forest vs a small neural net; test on a person the model hasn't seen.",
  },
  {
    id: "word-model",
    title: "Recognize word signs from the whole movement (sequence model)",
    area: "model",
    status: "todo",
    owners: ["Stuti"],
    due: "Nov 2026",
    needs: ["data-words", "jz-translate"],
    note: "Dynamic time warping first: it works with ~10 samples per sign. Builds on the J/Z segmentation.",
  },

  // ── Web app ──
  {
    id: "app-pages",
    title: "Translate, Learn, Glove, Collect and Lab pages; deployed on Vercel",
    area: "app",
    status: "done",
    owners: ["Stuti"],
  },
  {
    id: "mount-calibration",
    title: "Add a quick motion-sensor calibration (palm down, fingers up)",
    area: "app",
    status: "todo",
    owners: ["Stuti"],
    due: "Nov 2026",
    note: "So the app learns how the sensor sits instead of assuming it never moves.",
  },
  {
    id: "logging",
    title: "Log recognized signs for debugging and evaluation",
    area: "app",
    status: "todo",
    owners: ["Stuti"],
    due: "Nov 2026",
    note: "Requirement in the midterm report, Table 6.",
  },

  // ── Testing and report ──
  {
    id: "test-accuracy",
    title: "Accuracy test: 10 reps per sign, target ≥ 90%",
    area: "testing",
    status: "todo",
    owners: ["Krisha", "Stuti"],
    due: "Nov 2026",
    needs: ["train-pipeline"],
  },
  {
    id: "test-ble",
    title: "Glove streams 5 minutes with no drops (formal test)",
    area: "testing",
    status: "todo",
    owners: ["William"],
    due: "Nov 2026",
    needs: ["glove1-protoboard"],
  },
  {
    id: "test-battery",
    title: "Battery runtime: glove and Pi on battery only",
    area: "testing",
    status: "todo",
    owners: ["Somana", "Gauthier"],
    due: "Nov 2026",
    needs: ["glove1-protoboard", "body-mount"],
  },
  {
    id: "test-latency",
    title: "Stopwatch test: sign to text, and sign to speech",
    area: "testing",
    status: "todo",
    owners: ["William"],
    due: "Nov 2026",
    needs: ["pi-model"],
  },
  {
    id: "test-login",
    title: "Record the invalid-login test",
    area: "testing",
    status: "todo",
    owners: ["Stuti"],
    due: "Nov 2026",
  },
  {
    id: "full-test",
    title: "Full system test: both gloves, body unit, speech",
    area: "testing",
    status: "todo",
    owners: ["Aidan", "Gauthier", "Krisha", "Somana", "Stuti", "William"],
    due: "Dec 2026",
    needs: ["sync", "pi-model", "test-accuracy"],
  },
  {
    id: "final-demo",
    title: "Final report and demo preparation",
    area: "testing",
    status: "todo",
    owners: ["Aidan", "Gauthier", "Krisha", "Somana", "Stuti", "William"],
    due: "Dec 2026",
    needs: ["full-test"],
  },
];
