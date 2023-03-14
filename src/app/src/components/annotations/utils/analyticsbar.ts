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
  const filteredFrameTags = data.filter(
    (item: { confidence: number }) => item.confidence <= confidenceThreshold
  );
  return filteredFrameTags.map((item: { tag: ImageTag }) => item.tag);
};

const addCharAscii = (str: string): number => {
  return str.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
};

export const getTagColor = (tag: string) =>
  TagColours[addCharAscii(tag) % TagColours.length];
