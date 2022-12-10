/* eslint-disable no-restricted-syntax */
import React from "react";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CategoricalChartState } from "recharts/types/chart/generateCategoricalChart";
import { TagColours } from "../../../constants/annotation";
import { getFrameImageTags, addCharAscii } from "../utils/analyticsbar";
import CustomTooltip from "./customtooltip";

interface VideoAnalyticsBarProps {
  data: any;
  confidenceThreshold: number;
  fastForward: (frame: number) => void;
}

const getVideoDataDistribution = (
  data: any,
  confidenceThreshold: number
): any[] => {
  const output: any[] = [];
  // eslint-disable-next-line guard-for-in
  for (const frame in data.frames) {
    const frameDataDistribution: any = {
      name: frame,
    };
    const allFrameImageTags = getFrameImageTags(
      data.frames[frame],
      confidenceThreshold
    );
    const uniqueFrameImageTagName = [
      ...new Set(allFrameImageTags.map(item => item.name)),
    ];

    for (const key of uniqueFrameImageTagName) {
      frameDataDistribution[key] = 0;
    }

    for (const key of allFrameImageTags) {
      frameDataDistribution[key.name] += 1;
    }
    output.push(frameDataDistribution);
  }

  return output;
};

const getVideoUniqueImageTagNames = (
  data: any,
  confidenceThreshold: number
): string[] => {
  let output: string[] = [];
  // eslint-disable-next-line guard-for-in
  for (const frame in data.frames) {
    const allFrameImageTags = getFrameImageTags(
      data.frames[frame],
      confidenceThreshold
    );
    output.push(...new Set(allFrameImageTags.map(item => item.name)));
  }
  output = [...new Set(output)];
  return output;
};

const VideoAnalyticsBar = ({
  data,
  confidenceThreshold,
  fastForward,
}: VideoAnalyticsBarProps): JSX.Element => {
  const allFramesDataDistribution = getVideoDataDistribution(
    data,
    confidenceThreshold
  );
  const allUniqueVideoImageTagNames = getVideoUniqueImageTagNames(
    data,
    confidenceThreshold
  );

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart
        onClick={(e: CategoricalChartState) =>
          fastForward(parseInt(e?.activeLabel ?? "0", 10))
        }
        data={allFramesDataDistribution}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        {allUniqueVideoImageTagNames.map((tag: string) => {
          const tagColor = TagColours[addCharAscii(tag) % TagColours.length];
          return <Line key={tag} dataKey={tag} stroke={tagColor} dot={false} />;
        })}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default VideoAnalyticsBar;
