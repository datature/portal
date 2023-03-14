import React from "react";

import { AnalyticsData } from "../annotator";
import ImageAnalyticsBar from "./imageanalyticsbar";
import VideoAnalyticsBar from "./videoanalyticsbar";

interface AnalyticsBarProps {
  analyticsData: AnalyticsData;
  confidenceThreshold: number;
  fastForward: (frame: number) => void;
}

const AnalyticsBar = ({
  analyticsData,
  confidenceThreshold,
  fastForward,
}: AnalyticsBarProps): JSX.Element => {
  const ImageAnalyticsBarComponent = () => (
    <ImageAnalyticsBar
      data={analyticsData.data}
      confidenceThreshold={confidenceThreshold}
    />
  );

  const VideoAnalyticsBarComponent = () => (
    <VideoAnalyticsBar
      data={analyticsData.data}
      confidenceThreshold={confidenceThreshold}
      fastForward={fastForward}
    />
  );

  if (analyticsData.type === "image") {
    return ImageAnalyticsBarComponent();
  }
  return VideoAnalyticsBarComponent();
};

export default AnalyticsBar;
