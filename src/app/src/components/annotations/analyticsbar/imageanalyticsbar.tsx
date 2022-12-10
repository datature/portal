import React from "react";
import {
  BarChart,
  CartesianGrid,
  YAxis,
  XAxis,
  Bar,
  Cell,
  ResponsiveContainer,
} from "recharts";

import { TagColours } from "../../../constants/annotation";

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
    imageDataDistribution.push({ score: 0, id: key, name: `${key} (${0})` });
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const key of allImageTags) {
    const item = imageDataDistribution.find(
      (tag: { score: number; name: string; id: string }) => tag.id === key.name
    );
    // eslint-disable-next-line no-plusplus
    item.score++;
    item.name = `${key.name} (${item.score})`;
  }

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={imageDataDistribution}>
        <CartesianGrid strokeDasharray="1 2" />
        <YAxis />
        <XAxis dataKey="name" />
        <Bar dataKey="score">
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
