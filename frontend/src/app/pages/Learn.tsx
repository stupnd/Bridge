import { useState } from "react";
import { Search, Eye } from "lucide-react";

const signLibrary = [
  { id: 1, word: "Hello", category: "Greetings", description: "Wave your hand with palm facing forward" },
  { id: 2, word: "Thank You", category: "Greetings", description: "Touch fingers to chin, then move hand forward" },
  { id: 3, word: "Please", category: "Greetings", description: "Rub hand in circular motion on chest" },
  { id: 4, word: "Goodbye", category: "Greetings", description: "Wave hand with palm facing down, closing fingers" },
  { id: 5, word: "Yes", category: "Basic", description: "Make fist and nod it forward like a head nod" },
  { id: 6, word: "No", category: "Basic", description: "Snap index and middle finger with thumb twice" },
  { id: 7, word: "Help", category: "Basic", description: "Place fist on flat palm and lift both together" },
  { id: 8, word: "Sorry", category: "Basic", description: "Make fist and rub in circle on chest" },
  { id: 9, word: "Water", category: "Food & Drink", description: "Form 'W' with three fingers and tap chin twice" },
  { id: 10, word: "Food", category: "Food & Drink", description: "Touch fingers to mouth in small movements" },
  { id: 11, word: "Home", category: "Places", description: "Touch fingers to mouth then to side of face" },
  { id: 12, word: "School", category: "Places", description: "Clap hands twice" },
];

const categories = ["All", "Greetings", "Basic", "Food & Drink", "Places"];

export default function Learn() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedWord, setSelectedWord] = useState<typeof signLibrary[0] | null>(null);

  const filteredSigns = signLibrary.filter((sign) => {
    const matchesSearch = sign.word.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || sign.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 pb-24 md:pb-6">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Learn Sign Language</h1>
        <p className="text-gray-600">Learn and practice signs without using the glove</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for a word..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              selectedCategory === category
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Sign Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSigns.map((sign) => (
          <div
            key={sign.id}
            onClick={() => setSelectedWord(sign)}
            className="bg-white rounded-xl shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-100"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-xl mb-1">{sign.word}</h3>
                <span className="inline-block px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded">
                  {sign.category}
                </span>
              </div>
              <button 
                className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center hover:bg-indigo-200 transition-colors group relative"
                title="View details"
              >
                <Eye className="w-4 h-4 text-indigo-600" />
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  View details
                </span>
              </button>
            </div>
            <p className="text-sm text-gray-600">{sign.description}</p>
          </div>
        ))}
      </div>

      {filteredSigns.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No signs found matching your search.</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedWord && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedWord(null)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <h2 className="text-3xl mb-2">{selectedWord.word}</h2>
              <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-full">
                {selectedWord.category}
              </span>
            </div>

            <div className="bg-gray-100 rounded-xl p-8 mb-6 flex items-center justify-center h-48">
              <p className="text-gray-500">Video demonstration</p>
            </div>

            <p className="text-gray-700 mb-6">{selectedWord.description}</p>

            <button
              onClick={() => setSelectedWord(null)}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}