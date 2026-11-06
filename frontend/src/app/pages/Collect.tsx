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
    <Page width="max-w-6xl">
      <PageHeader
        title="Collect data"
        description='Record labelled glove samples: static letters, moving signs and a "none" class. Download them as CSV, or let them upload to the team dataset.'
      />
      <div className="space-y-8">
        <DataCollector onDataChange={setData} />
        <MotionLab recordings={recordings} />
      </div>
    </Page>
  );
}
