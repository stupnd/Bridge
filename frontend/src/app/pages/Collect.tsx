import DataCollector from "../components/DataCollector";
import MotionLab from "../components/MotionLab";
import { Page, PageHeader } from "../components/common";

export default function Collect() {
  return (
    <Page>
      <PageHeader
        title="Collect data"
        description="Record labeled signs to train and test the recognition model."
      />
      <div className="space-y-6">
        <DataCollector />
        <MotionLab />
      </div>
    </Page>
  );
}
