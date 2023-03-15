import { TagColours } from "@portal/constants/annotation";
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
interface AnalyticsBarProps {
  videoAnalyticsData: Array<any>;
  confidenceThreshold: number;
  videoElementData: HTMLVideoElement | undefined;
}

const getUniqueTags = (
  videoAnalyticsData: Array<any>,
  confidenceThreshold: number
) => {
  return Object.values(videoAnalyticsData).reduce(
    (uniqueTagID, currentValues) => {
      currentValues.forEach((value: any) => {
        if (value.confidence >= confidenceThreshold) {
          const tagName = value.tag.name;
          if (!uniqueTagID.includes(tagName)) {
            uniqueTagID.push(tagName);
          }
        }
      });
      return uniqueTagID;
    },
    []
  );
};
const formatTime = (timestamp: string) => {
  const seconds = Math.floor(Number(timestamp) / 1000);
  const milliseconds = Number(timestamp) % 1000;
  //console.log("milliseconds", milliseconds);
  return `${seconds.toLocaleString("en-US", {
    minimumIntegerDigits: 2,
    maximumSignificantDigits: 2,
  })}:${milliseconds
    .toLocaleString("en-US", {
      minimumIntegerDigits: 2,
    })
    .slice(0, 2)}`;
};
const getVideoData = (
  videoAnalyticsData: Array<any>,
  confidenceThreshold: number
) => {
  const videoData = [];
  videoData.push(
    Object.entries(videoAnalyticsData).map(([key, value]) => {
      const formattedTimestamp = formatTime(key);
      const newFrameData: any = {
        timestamp: formattedTimestamp,
      };
      value.map((annotate: any) => {
        if (annotate.confidence >= confidenceThreshold) {
          if (!newFrameData[annotate.tag.name]) {
            // console.log("annotate to create: ", annotate);
            newFrameData[annotate.tag.name] = 1;
          } else {
            // console.log("annotate to add on: ", annotate);
            newFrameData[annotate.tag.name] += 1;
          }
        }
      });
      // console.log("newFrameData", newFrameData);
      return newFrameData;
    })
  );
  //console.log("videoData", videoData);
  return videoData;
};

const AnalyticsBar = ({
  confidenceThreshold,
  videoAnalyticsData,
  videoElementData,
}: AnalyticsBarProps) => {
  console.log("videoAnalyticsData", videoAnalyticsData);
  const videoData = getVideoData(videoAnalyticsData, confidenceThreshold);
  //console.log("videoData", videoData);
  const uniqueTags = getUniqueTags(videoAnalyticsData, confidenceThreshold);
  console.log("uniqueTags", uniqueTags);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        width={500}
        height={500}
        data={videoData[0]}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
        onClick={e => {
          if (videoElementData != null && e != null) {
            const v = e.activeLabel!.replace(":", ".");

            console.log(v);
            videoElementData.currentTime = parseFloat(v);
          }
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Tooltip />
        <Legend />
        {uniqueTags.map((tagData: any) => {
          return (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey={tagData}
              stroke="#8884d8"
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default AnalyticsBar;
