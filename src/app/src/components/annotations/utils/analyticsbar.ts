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
  for (let i = 0; i < data.length; i += 1) {
    // Continue is needed as a guard clause to prevent data that's greater than the confidence threshold from being added to the output array
    // eslint-disable-next-line no-continue
    if (confidenceThreshold > data[i].confidence) continue;
    const { tag } = data[i];
    output.push(tag);
  }
  return output;
};

const addCharAscii = (str: string): number => {
  return str.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
};

export const getTagColor = (tag: string) =>
  TagColours[addCharAscii(tag) % TagColours.length];
