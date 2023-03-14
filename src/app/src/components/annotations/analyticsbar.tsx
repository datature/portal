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
    (uniqueNames, currentValues) => {
      currentValues.map((value: any) => {
        if (value.confidence >= confidenceThreshold) {
          const tagName = value.tag.name;
          if (!uniqueNames.includes(tagName)) {
            uniqueNames.push(tagName);
          }
        }
      });
      return uniqueNames;
    },
    []
  );
};

const getVideoData = (
  videoAnalyticsData: Array<any>,
  confidenceThreshold: number
) => {};

const AnalyticsBar = ({
  confidenceThreshold,
  videoAnalyticsData,
}: AnalyticsBarProps) => {
  console.log("videoAnalyticsData", videoAnalyticsData);
  const timeframe = [Object.keys(videoAnalyticsData)];

  //const videoData = getVideoData(videoAnalyticsData, confidenceThreshold);
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
