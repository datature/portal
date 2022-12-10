/* eslint-disable no-restricted-syntax */
import { Card } from "@blueprintjs/core";
import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { CategoricalChartState } from "recharts/types/chart/generateCategoricalChart";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

import { TagColours } from "../../../constants/annotation";

type ImageTag = {
  id: number;
  name: string;
};

interface VideoAnalyticsBarProps {
  data: any;
  confidenceThreshold: number;
  fastForward: (frame: number) => void;
}

const addCharAscii = (str: string): number => {
  let sum = 0;
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i);
  }
  return sum;
};

const getFrameImageTags = (
  data: any,
  confidenceThreshold: number
): ImageTag[] => {
  const output: ImageTag[] = [];
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < data.length; i++) {
    // eslint-disable-next-line no-continue
    if (confidenceThreshold > data[i].confidence) continue;

    const { tag } = data[i];
    output.push(tag);
  }
  return output;
};

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

const CustomTooltip = ({
  active,
  payload,
}: TooltipProps<ValueType, NameType>): JSX.Element => {
  if (active && payload && payload.length >= 1) {
    return (
      <Card style={{ padding: 0, margin: 0 }}>
        <ul style={{ padding: "10px 20px" }}>
          {payload?.map(item => (
            <li key={item.dataKey} style={{ color: item.color }}>
              {item.name} : {item.value}
            </li>
          ))}
        </ul>
      </Card>
    );
  }
  return <></>;
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
