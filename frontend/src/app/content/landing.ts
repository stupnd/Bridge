/**
 * Every visible string on the landing page. Facts only: .bunshin/harvest/facts.md.
 * Anything unknown is marked TODO and stays generic on the page.
 */

export const site = {
  name: "Bridge",
  course: "CEG 4913 Computer Engineering Design Project II",
  school: "University of Ottawa",
  term: "Fall 2026",
  group: "Group 4",
  // TODO(client): confirm the repository is public before showing this link.
  codeUrl: "https://github.com/stupnd/Bridge",
  team: ["Gauthier Balemba", "Aidan Brin", "Somana Debnath", "William Mallette", "Stuti Pandya", "Krisha Veera"],
};

export const hero = {
  title: "A glove that reads your hand, one letter at a time.",
  lead: "Bridge is a sensor glove built by six engineering students. It reads how each finger bends and turns American Sign Language letters into text, with speech coming from a small computer worn at the waist.",
  primary: "Open the app",
  primaryNote: "Needs Chrome or Edge on a computer and the glove.",
  secondary: "Try it without the glove",
  // The hero spells this with real handshapes recorded by the team.
  spell: "BRIDGE",
  replay: "Spell it again",
  links: [
    { label: "How it works", href: "#how" },
    { label: "What it can't do yet", href: "#limits" },
    { label: "Source code", href: "codeUrl" },
  ],
};

export const how = {
  title: "From a bent finger to a spoken letter",
  lead: "Five lines, one per finger, carry the signal the whole way.",
  steps: [
    {
      key: "sign",
      title: "Sign",
      body: "You form a letter with your hand. Flex sensors held in boning tape along each finger bend with it.",
      fact: "5 flex sensors, one per finger",
    },
    {
      key: "sense",
      title: "Sense",
      body: "An Arduino Nano ESP32 at the wrist reads all five fingers and a 9-axis motion sensor, then sends them over Bluetooth.",
      fact: "About 50 readings a second",
    },
    {
      key: "recognise",
      title: "Recognise",
      body: "The app compares your hand with handshapes the team recorded and picks the closest letter. If two letters are too close to call, it says so instead of guessing.",
      fact: "24 letters that don't move",
    },
    {
      key: "speak",
      title: "Show and speak",
      body: "The letter appears as text after you hold it for 0.7 seconds. A Raspberry Pi worn on a belt speaks text aloud with an offline voice.",
      fact: "About 1 second from handshape to text",
    },
  ],
};

export const tryIt = {
  title: "Try it without the glove",
  lead: "Move the sliders to bend each finger. The same recogniser the glove uses reads the hand you make.",
  presets: "Start from a letter",
  unsure: (a: string, b: string) => `Not sure: ${a} or ${b}?`,
  none: "No letter yet",
  closest: "Closest letters",
  note: "Recognises the 24 ASL letters that are a held handshape. J and Z are traced in the air, so they need motion.",
};

export const hard = {
  title: "Why some letters are hard",
  lead: "Several letters bend the fingers almost the same way and differ only in where the thumb sits or which way the hand faces. Flex sensors can't see that.",
  groupLabel: "These five are all closed fists",
  group: ["E", "M", "N", "S", "T"],
  distance: (a: string, b: string, pct: number) => `${a} and ${b} differ by about ${pct}% per finger in the team's recordings.`,
  next: "That's why the glove also carries a motion sensor, and why the next step is a model trained on many people's recordings.",
};

export const status = {
  title: "Where Bridge is today",
  works: {
    title: "Works today",
    items: [
      "The first glove streams five finger bends and hand motion over Bluetooth.",
      "The app recognises 24 static ASL letters and types them.",
      "Learn teaches the alphabet with live per-finger hints.",
      "The Raspberry Pi receives the glove's data and speaks text offline.",
    ],
  },
  next: {
    title: "Next",
    items: [
      "A second glove, same design (November 2026).",
      "J and Z, which are traced in the air, using the motion sensor.",
      "Common word signs, from a list of 50 to 100, with a model that reads the whole movement.",
      "Recognition on the Raspberry Pi, so no laptop is needed.",
    ],
  },
  limits: {
    title: "What it can't do",
    items: [
      "Read the face or body. ASL grammar lives there too, and a glove only sees the hands.",
      "Translate in both directions. It turns signs into text; it does not sign back.",
      "Replace an interpreter. It is a student prototype for fingerspelling.",
    ],
  },
  scorecard: {
    title: "Requirements",
    columns: ["Requirement", "Target", "Now"],
    rows: [
      { req: "Text appears after a sign", target: "Within 5 to 10 s", now: "About 1 s by design", state: "met" },
      { req: "Recognition accuracy", target: "90% or better, 10 tries per sign", now: "Not measured on people yet", state: "pending" },
      { req: "Signs recognised", target: "About 75 signs", now: "24 static letters", state: "partial" },
      { req: "Speech output", target: "Spoken through a speaker", now: "Works on the Raspberry Pi", state: "partial" },
    ],
    noise: "In a simulation that jitters each recorded letter by up to 10% per finger, 90% of tries are read correctly, 7% are marked unsure and 3% come out as the wrong letter. That is a test of how far apart the letters are, not real-world accuracy.",
  },
};

export const learn = {
  title: "The other half of the conversation",
  lead: "Most people who meet a signer don't sign. Learn teaches the ASL alphabet with the glove on: it shows the handshape, then tells you which finger to bend or straighten until it reads right.",
  cta: "Open Learn",
};

export const team = {
  title: "Who built it",
  lead: "Bridge is Group 4's design project for CEG 4913 at the University of Ottawa, Fall 2026.",
};

export const faq = {
  title: "Questions",
  items: [
    {
      q: "Does it translate full sentences?",
      a: "No. Today it reads the 24 ASL letters that are a held handshape. Word signs need movement over time and are the next phase.",
    },
    {
      q: "How accurate is it?",
      a: "It hasn't been tested on many people yet, so there is no real-world accuracy figure. The only number is a simulation, explained above, and it is labelled that way.",
    },
    {
      q: "Why a glove and not a camera?",
      a: "A glove works without good lighting, a camera angle or line of sight. The trade-off is that it can't see facial expressions, which carry part of ASL grammar.",
    },
    {
      q: "Can I try it without the glove?",
      a: "Yes. The demo above runs the same recogniser on a hand you make with sliders. The full app needs the glove and Chrome or Edge on a computer.",
    },
  ],
};

export const footer = {
  line: "Bridge, a student design project. Not a medical or interpreting device.",
};
