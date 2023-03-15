import { Icon } from "@blueprintjs/core";
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
import classes from "./analyticsbar.module.css";
interface AnalyticsBarProps {
  videoAnalyticsData: Array<any>;
  confidenceThreshold: number;
  videoElementData: HTMLVideoElement | undefined;
  clickAnalyticsCallback: () => void;
}

const getUniqueTags = (
  videoAnalyticsData: Array<any>,
  confidenceThreshold: number
) => {
  return Object.values(videoAnalyticsData).reduce(
    (uniqueTagID, currentValues) => {
      //console.log("currentValues", currentValues);
      currentValues.forEach((value: any) => {
        if (value.confidence >= confidenceThreshold) {
          const tagData = JSON.stringify(value.tag);
          if (!JSON.stringify(uniqueTagID).includes(tagData)) {
            uniqueTagID.push(value.tag);
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
            newFrameData[annotate.tag.name] = 1;
          } else {
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
  clickAnalyticsCallback,
}: AnalyticsBarProps) => {
  //console.log("videoAnalyticsData", videoAnalyticsData);
  const videoData = getVideoData(videoAnalyticsData, confidenceThreshold);
  //console.log("videoData", videoData);
  const uniqueTags = getUniqueTags(videoAnalyticsData, confidenceThreshold);
  //console.log("uniqueTags", uniqueTags);
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
          data={videoData[0]}
          margin={{
            top: 5,
            right: 10,
            left: 5,
            bottom: 5,
          }}
          onClick={e => {
            if (videoElementData != null && e != null) {
              const v = e.activeLabel!.replace(":", ".");
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
            //console.log("tagData", tagData);
            return (
              <Line
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
