import { Icon } from "@blueprintjs/core";
import { TagColours } from "@portal/constants/annotation";
import React, { useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import classes from "./analyticsbar.module.css";
interface AnalyticsBarProps {
  videoAnalyticsData: Array<any>;
  confidenceThreshold: number;
  videoElementData: HTMLVideoElement | undefined;
  clickAnalyticsCallback: () => void;
}
/**
 * Get unique tags from analytics data
 *
 * @param videoAnalyticsData Complete Analytics data for asset
 * @param confidenceThreshold Confidence threshold for tag to be included in unique tags
 * @returns Array of unique tags with name and id
 */
const getUniqueTags = (
  videoAnalyticsData: Array<any>,
  confidenceThreshold: number
) => {
  return Object.values(videoAnalyticsData).reduce(
    (uniqueTags, currentValues) => {
      currentValues.map((value: any) => {
        if (value.confidence >= confidenceThreshold) {
          const tagData = JSON.stringify(value.tag);
          if (!JSON.stringify(uniqueTags).includes(tagData)) {
            uniqueTags.push(value.tag);
          }
        }
      });
      return uniqueTags;
    },
    []
  );
};

/**
 * Format timestamp to mm:ss format
 *
 * @param timestamp Timestamp in milliseconds
 * @returns formatted timestamp in mm:ss format
 */

const formatTime = (timestamp: string) => {
  const seconds = Math.floor(Number(timestamp) / 1000);
  const milliseconds = Number(timestamp) % 1000;
  return `${seconds.toLocaleString("en-US", {
    minimumIntegerDigits: 2,
    maximumSignificantDigits: 2,
  })}:${milliseconds
    .toLocaleString("en-US", {
      minimumIntegerDigits: 2,
    })
    .slice(0, 2)}`;
};

/**
 * Retrieves and preprocess video data based on frames annotations that meets minimum
 * confidence threshold for timeseries chart display
 *
 * @param videoAnalyticsData Complete Analytics data for asset
 * @param confidenceThreshold Confidence threshold for tag to be included in video data
 * @returns An array of objects with timestamp and its corresponding annotation classes.
 */

const getVideoData = (
  videoAnalyticsData: Array<any>,
  confidenceThreshold: number
) => {
  return Object.entries(videoAnalyticsData).map(([key, value]) => {
    const formattedTimestamp = formatTime(key);
    const annotations = value.filter(
      (annotate: any) => annotate.confidence >= confidenceThreshold
    );
    const tagCounts = annotations.reduce(
      (acc: any, { tag }: any) => ({
        ...acc,
        [tag.name]: (acc[tag.name] || 0) + 1,
      }),
      {}
    );
    return {
      timestamp: formattedTimestamp,
      ...tagCounts,
    };
  });
};

const AnalyticsBar = ({
  confidenceThreshold,
  videoAnalyticsData,
  videoElementData,
  clickAnalyticsCallback,
}: AnalyticsBarProps) => {
  const videoData = getVideoData(videoAnalyticsData, confidenceThreshold);
  const uniqueTags = getUniqueTags(videoAnalyticsData, confidenceThreshold);

  const handleLineChartClick = useCallback(
    e => {
      if (videoElementData != null && e != null) {
        const v = e.activeLabel!.replace(":", ".");
        videoElementData.currentTime = parseFloat(v);
      }
    },
    [confidenceThreshold]
  );
  return (
    <div className={classes.body}>
      <Icon
        title="Back to Asset Viewer"
        onClick={() => clickAnalyticsCallback()}
        className={classes.backIcon}
        icon="caret-left"
        iconSize={40}
      />
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          width={500}
          height={500}
          data={videoData}
          margin={{
            top: 5,
            right: 10,
            left: 5,
            bottom: 5,
          }}
          onClick={handleLineChartClick}
        >
          <XAxis dataKey="timestamp" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip labelStyle={{ color: "black" }} />
          <Legend />
          {uniqueTags.map((tagData: any) => {
            return (
              <Line
                key={tagData.id}
                yAxisId="right"
                type="monotone"
                dataKey={tagData.name}
                stroke={TagColours[tagData.id % TagColours.length]}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnalyticsBar;
