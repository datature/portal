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
import { TagColours } from "../../../constants/annotation";
import CustomTooltip from "./customtooltip";

type ImageTag = {
  id: number;
  name: string;
};
interface ImageAnalyticsBarProps {
  data: any;
  confidenceThreshold: number;
}

const getImageTags = (data: any, confidenceThreshold: number): ImageTag[] => {
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

const addCharAscii = (str: string): number => {
  let sum = 0;
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i);
  }
  return sum;
};

const ImageAnalyticsBar = ({
  data,
  confidenceThreshold,
}: ImageAnalyticsBarProps): JSX.Element => {
  const allImageTags = getImageTags(data, confidenceThreshold);
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
            const tagColor = TagColours[addCharAscii(tag) % TagColours.length];
            return <Cell key={tag} fill={tagColor} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ImageAnalyticsBar;
