/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { TagColours } from "@portal/constants/annotation";

type ImageTag = {
  id: number;
  name: string;
};

export const getFrameImageTags = (
  data: any,
  confidenceThreshold: number
): ImageTag[] => {
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

export const addCharAscii = (str: string): number => {
  let sum = 0;
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i);
  }
  return sum;
};

export const getTagColor = (tag: string) =>
  TagColours[addCharAscii(tag) % TagColours.length];
