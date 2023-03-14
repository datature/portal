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
}

const getUniqueTagNames = (
  videoAnalyticsData: Array<any>,
  confidenceThreshold: number
) => {
  return Object.values(videoAnalyticsData).reduce(
    (uniqueTagID, currentValues) => {
      currentValues.map((value: any) => {
        if (value.confidence >= confidenceThreshold) {
          const tagID = value.tag.id;
          if (!uniqueTagID.includes(tagID)) {
            uniqueTagID.push(tagID);
          }
        }
      });
      return uniqueTagID;
    },
    []
  );
};

const getVideoData = (
  videoAnalyticsData: Array<any>,
  confidenceThreshold: number
) => {
  const videoData = [];
  videoData.push(
    Object.entries(videoAnalyticsData).map(([key, value]) => {
      const newFrameData: any = {
        timestamp: key,
      };
      value.map((annotate: any) => {
        if (annotate.confidence >= confidenceThreshold) {
          if (!newFrameData[annotate.tag.id]) {
            // console.log("annotate to create: ", annotate);
            newFrameData[annotate.tag.id] = 1;
          } else {
            // console.log("annotate to add on: ", annotate);
            newFrameData[annotate.tag.id] += 1;
          }
        }
      });
      // console.log("newFrameData", newFrameData);
      return newFrameData;
    })
  );
  console.log("videoData", videoData);
  return videoData;
};

const AnalyticsBar = ({
  confidenceThreshold,
  videoAnalyticsData,
}: AnalyticsBarProps) => {
  // console.log("videoAnalyticsData", videoAnalyticsData);
  const timeframe = [Object.keys(videoAnalyticsData)];

  const videoData = getVideoData(videoAnalyticsData, confidenceThreshold);
  // console.log("videoData", videoData);
  const uniqueTags = getUniqueTagNames(videoAnalyticsData, confidenceThreshold);
  console.log("uniqueTags", uniqueTags);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        width={500}
        height={500}
        data={timeframe}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <XAxis dataKey="name" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="pv"
          stroke="#8884d8"
          activeDot={{ r: 8 }}
        />
        <Line yAxisId="right" type="monotone" dataKey="uv" stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default AnalyticsBar;
