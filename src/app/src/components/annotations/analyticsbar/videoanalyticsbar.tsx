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
  // get all image tags for each frame
  const allFramesArray = Object.values(data.frames);
  const allFrameTags = allFramesArray.map(frame =>
    getFrameImageTags(frame, confidenceThreshold)
  );

  // count the number of times each tag appears for each frame
  const allTagCount: Map<string, number>[] = allFrameTags.map(imageTags =>
    imageTags.reduce(
      (acc, e) => acc.set(e.id, (acc.get(e.id) || 0) + 1),
      new Map()
    )
  );

  // get an array of frame names
  const videoDataFrames: string[] = Object.keys(data.frames);

  // convert map array to array of tag count entries
  const allTagCountEntries: [string, number][][] = allTagCount.map(tagCount => [
    ...tagCount.entries(),
  ]);

  // create array of objects for recharts
  const allTagCountDistribition: any[] = allTagCountEntries.map(
    (tagCount, i) => {
      return tagCount.reduce(
        (acc, [id, count]) => {
          acc[id] = count;
          return acc;
        },
        {
          name: videoDataFrames[i],
        } as any
      );
    }
  );

  return allTagCountDistribition;
};

const getVideoUniqueImageTagNames = (
  data: any,
  confidenceThreshold: number
): string[] => {
  const allFramesArray = Object.values(data.frames);
  // get all image tags for each frame
  const frameImageTagsArray = allFramesArray.map(frame =>
    getFrameImageTags(frame, confidenceThreshold)
  );

  // flatten array of arrays and remove duplicates
  const allFrameTags = frameImageTagsArray.reduce(
    (acc, imageTags) => [...acc, ...imageTags.map(tag => tag.name)],
    [] as string[]
  );

  return [...new Set(allFrameTags)];
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
