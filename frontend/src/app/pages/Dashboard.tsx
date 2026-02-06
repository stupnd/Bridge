import { useState, useEffect } from "react";
import { motion } from "motion/react";

const mockTranslations = [
  "HELLO",
  "THANK YOU",
  "GOODBYE",
  "PLEASE",
  "HELP",
  "YES",
  "NO",
];

type RecognitionState = "listening" | "recognized" | "paused";

export default function Dashboard() {
  const [currentWord, setCurrentWord] = useState("HELLO");
  const [recognitionState, setRecognitionState] = useState<RecognitionState>("listening");

  useEffect(() => {
    if (recognitionState === "paused") return;

    // Simulate real-time translation updates
    const interval = setInterval(() => {
      // Briefly show "recognized" state
      setRecognitionState("recognized");
      
      setTimeout(() => {
        const randomWord = mockTranslations[Math.floor(Math.random() * mockTranslations.length)];
        setCurrentWord(randomWord);
        setRecognitionState("listening");
      }, 800);
    }, 4000);

    return () => clearInterval(interval);
  }, [recognitionState]);

  const getStatusConfig = () => {
    switch (recognitionState) {
      case "listening":
        return { color: "bg-green-500", label: "Listening", pulse: true };
      case "recognized":
        return { color: "bg-yellow-500", label: "Processing", pulse: false };
      case "paused":
        return { color: "bg-gray-400", label: "Paused", pulse: false };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-8">
      <div className="w-full max-w-4xl">
        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="relative">
            {statusConfig.pulse && (
              <motion.div
                className={`absolute inset-0 ${statusConfig.color} rounded-full`}
                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            )}
            <div className={`relative w-3 h-3 rounded-full ${statusConfig.color}`} />
          </div>
          <p className="text-gray-600">{statusConfig.label}</p>
        </div>

        {/* Translation Display */}
        <motion.div
          key={currentWord}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-3xl shadow-xl p-6 sm:p-12 md:p-16 mb-8 border border-gray-100"
        >
          <div className="text-center">
            <p className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-wider text-indigo-600 mb-4 break-words">
              {currentWord}
            </p>
            <div className="inline-block px-4 py-2 bg-indigo-50 rounded-full">
              <p className="text-sm text-indigo-700">ASL → Text (Live)</p>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setRecognitionState(recognitionState === "paused" ? "listening" : "paused")}
            className={`px-6 py-3 rounded-lg transition-colors ${
              recognitionState === "paused"
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <div className="flex flex-col items-center">
              <span>{recognitionState === "paused" ? "Start Listening" : "Pause Listening"}</span>
              <span className="text-xs opacity-75 mt-0.5">
                {recognitionState === "paused" ? "Resume live input" : "Stops live input"}
              </span>
            </div>
          </button>
        </div>

        {/* Recent Translations */}
        <div className="mt-12">
          <h3 className="text-sm text-gray-500 mb-3">Recent translations</h3>
          <div className="flex flex-wrap gap-2">
            {mockTranslations.slice(0, 5).map((word, index) => (
              <div
                key={index}
                className="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-700"
              >
                {word}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}