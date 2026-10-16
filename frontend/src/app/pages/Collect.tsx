import DataCollector from "../components/DataCollector";

export default function Collect() {
  return (
    <div className="max-w-4xl mx-auto p-6 pb-24 md:pb-6">
      <div className="mb-6">
        <h1 className="text-3xl mb-2">Data Collection</h1>
        <p className="text-gray-600">
          Record labeled glove samples (static letters, moving signs, and a "none" class) and
          export them as CSV.
        </p>
      </div>

      <DataCollector />
    </div>
  );
}
