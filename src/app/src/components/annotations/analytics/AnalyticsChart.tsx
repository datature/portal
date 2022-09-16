import React, { useState, useEffect } from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

export type Data = {
  label: "RBC" | "WBC" | "Platelets";
  data: {
    primary: string | number; // video time
    secondary: number; // number of `label`
  }[];
};

/**
 * Assume that the length of video won't be more than 60 seconds
 * @param frame {string} - to convert into time format
 * @returns {string} - seconds in string format
 */
const transformFrameToTime = (frame: string) => {
  const frameNumber = parseInt(frame) / 1000;
  return frameNumber <= 10 ? `0:0${frameNumber}` : `0:${frameNumber}`;
};

export const AnalyticsCharts = ({ data2, confidence, videoElement }: Props) => {
  const [options, setOptions] = useState<ApexOptions>({
    chart: {
      events: {
        click(event, chartContext, config) {
          if (videoElement) videoElement.currentTime = config.dataPointIndex; // handles video length when click on certain point on video
        },
      },
    },
    theme: { mode: "dark" },
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth" },
    xaxis: { categories: [] },
  });
  const [series, setSeries] = useState<ApexOptions["series"]>([
    { name: "RBC", data: [] },
    { name: "WBC", data: [] },
    { name: "Platelets", data: [] },
  ]);

  useEffect(() => {
    const categories: string[] = Object.keys(data2).filter(
      (frame: string) => parseInt(frame, 10) % 1000 === 0
    );
    const redBloodArrayCount: number[] = [];
    const whiteBloodArrayCount: number[] = [];
    const plateletArrayCount: number[] = [];

    const frameArray = Object.values(
      Object.fromEntries(
        Object.entries(data2).filter(([key]) => categories.includes(key))
      )
    );

    frameArray.forEach((frameData: FrameData[]) => {
      const filteredData = frameData.filter(
        (data: FrameData) => data.confidence > confidence
      );
      const redBloodCount = filteredData.filter(
        (data: FrameData) => data.tag.name === "RBC"
      ).length;
      const whiteBloodCount = filteredData.filter(
        (data: FrameData) => data.tag.name === "WBC"
      ).length;
      const plateletCount = filteredData.filter(
        (data: FrameData) => data.tag.name === "Platelets"
      ).length;

      redBloodArrayCount.push(redBloodCount);
      whiteBloodArrayCount.push(whiteBloodCount);
      plateletArrayCount.push(plateletCount);
    });

    setOptions(prevState => ({
      ...prevState,
      xaxis: { categories: categories.map(transformFrameToTime) },
    }));

    setSeries([
      {
        name: "RBC",
        data: redBloodArrayCount,
      },
      {
        name: "WBC",
        data: whiteBloodArrayCount,
      },
      {
        name: "Platelets",
        data: plateletArrayCount,
      },
    ]);
  }, [data2]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactApexChart
        options={options}
        series={series}
        type="area"
        width="100%"
        height="100%"
      />
    </div>
  );
};

type Props = {
  data2: any[];
  confidence: number;
  videoElement?: HTMLVideoElement;
};

type FrameData = {
  bound: any[];
  boundType: string;
  confidence: number;
  tag: {
    id: number;
    name: string;
  };
};
