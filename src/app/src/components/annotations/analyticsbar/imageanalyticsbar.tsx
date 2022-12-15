import React from "react";
import {
  BarChart,
  CartesianGrid,
  YAxis,
  XAxis,
  Bar,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { getFrameImageTags, getTagColor } from "../utils/analyticsbar";
import CustomTooltip from "./customtooltip";

interface ImageDataDistribution {
  count: number;
  id: string;
  name: string;
}

interface ImageAnalyticsBarProps {
  data: any;
  confidenceThreshold: number;
}

const ImageAnalyticsBar = ({
  data,
  confidenceThreshold,
}: ImageAnalyticsBarProps): JSX.Element => {
  const allImageTags = getFrameImageTags(data, confidenceThreshold);
  const uniqueImageTagName = [...new Set(allImageTags.map(tag => tag.name))];

  // Create initial data distribution
  const imageDataDistribution: ImageDataDistribution[] = uniqueImageTagName.map(
    tag => {
      return { count: 0, id: tag, name: `${tag} (0)` };
    }
  );

  // Populate data distribution
  allImageTags.map(tag => {
    const dataPoint = imageDataDistribution.find(
      (point: ImageDataDistribution) => point.id === tag.name
    );

    if (!dataPoint) return "";

    dataPoint.count += 1;
    dataPoint.name = `${tag.name} (${dataPoint.count})`;
    return "";
  });

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={imageDataDistribution}>
        <CartesianGrid strokeDasharray="1 2" />
        <YAxis />
        <XAxis dataKey="name" />
        <Tooltip cursor={{ fill: "transparent" }} content={<CustomTooltip />} />
        <Bar dataKey="count">
          {uniqueImageTagName.map(tag => {
            const tagColor = getTagColor(tag);
            return <Cell key={tag} fill={tagColor} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ImageAnalyticsBar;
