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

  // count the number of times each tag appears
  const tagCount: Map<string, number> = allImageTags.reduce(
    (acc, e) => acc.set(e.id, (acc.get(e.id) || 0) + 1),
    new Map()
  );

  // convert map to array
  const tagCountMapEntries: [string, number][] = [...tagCount.entries()];

  // create array of objects for recharts
  const imageDataDistribution: ImageDataDistribution[] = tagCountMapEntries.map(
    ([id, count]) => ({ id, count, name: `${id} (${count})` })
  );

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
