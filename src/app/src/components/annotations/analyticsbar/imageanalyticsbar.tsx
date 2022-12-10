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

interface ImageAnalyticsBarProps {
  data: any;
  confidenceThreshold: number;
}

const ImageAnalyticsBar = ({
  data,
  confidenceThreshold,
}: ImageAnalyticsBarProps): JSX.Element => {
  const allImageTags = getFrameImageTags(data, confidenceThreshold);
  const uniqueImageTagName = [...new Set(allImageTags.map(item => item.name))];

  const imageDataDistribution: any = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const key of uniqueImageTagName) {
    imageDataDistribution.push({ count: 0, id: key, name: `${key} (${0})` });
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const key of allImageTags) {
    const item = imageDataDistribution.find(
      (tag: { count: number; name: string; id: string }) => tag.id === key.name
    );
    // eslint-disable-next-line no-plusplus
    item.count++;
    item.name = `${key.name} (${item.count})`;
  }

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
