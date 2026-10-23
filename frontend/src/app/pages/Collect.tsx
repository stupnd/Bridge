import { useMemo, useState } from "react";
import DataCollector from "../components/DataCollector";
import MotionLab from "../components/MotionLab";
import { Page, PageHeader } from "../components/common";
import type { CollectData } from "../lib/collectData";
import { recordingsFromCollectData } from "../lib/recordings";

export default function Collect() {
  const [data, setData] = useState<CollectData>({ sessions: [], samples: [] });
  const recordings = useMemo(() => recordingsFromCollectData(data), [data]);

  return (
    <Page>
      <PageHeader
        title="Collect data"
        description='Record labeled glove samples (static letters, moving signs, and a "none" class) and export them as CSV.'
      />
      <div className="space-y-6">
        <DataCollector onDataChange={setData} />
        <MotionLab recordings={recordings} />
      </div>
    </Page>
  );
}
