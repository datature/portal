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
import { getFrameImageTags, getTagColor } from "../utils/analyticsbar";
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

  // Frame will always exist therefore there is no need for a guard
  // eslint-disable-next-line guard-for-in
  for (const frame in data.frames) {
    const frameDataDistribution: any = {
      name: frame,
    };
    const frameImageTags = getFrameImageTags(
      data.frames[frame],
      confidenceThreshold
    );
    const uniqueFrameImageTagName = [
      ...new Set(frameImageTags.map(tag => tag.name)),
    ];

    // create initial unique tags for frameDataDistribution with 0
    for (const uniqueTag of uniqueFrameImageTagName) {
      frameDataDistribution[uniqueTag] = 0;
    }

    // populate frameDataDistribution
    for (const key of frameImageTags) {
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

  // Frame will always exist therefore there is no need for a guard
  // eslint-disable-next-line guard-for-in
  for (const frame in data.frames) {
    const frameImageTags = getFrameImageTags(
      data.frames[frame],
      confidenceThreshold
    );
    output.push(...new Set(frameImageTags.map(tag => tag.name)));
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
          const tagColor = getTagColor(tag);
          return <Line key={tag} dataKey={tag} stroke={tagColor} dot={false} />;
        })}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default VideoAnalyticsBar;
