import React from "react";
import Chart from "react-apexcharts";

interface IAnalyticsBar {
  analyticsResult: any;
  videoOverlay: any;
}

export default function AnalyticsBar(props: IAnalyticsBar) {
  const options = {
    chart: {
      height: 350,
      type: "rangeBar",
      events: {
        dataPointSelection: function(event: any) {
          const currentMiliSec = event.target.dataset.rangeY1;
          props.videoOverlay.currentTime = parseInt(currentMiliSec) / 1000;
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
      },
    },
    xaxis: {
      type: "datetime",
      labels: {
        format: "mm:ss:fff",
      },
    },
    tooltip: {
      custom: function({ dataPointIndex, w }: any) {
        const itemCountMap = w.globals.initialSeries[0].data.reduce(function(
          r: { [index: string]: number },
          e: any
        ) {
          r[e.x + e.y[0]] = (r[e.x + e.y[0]] || 0) + 1;
          return r;
        },
        {});
        return (
          "<div>" +
          "<span>Total: " +
          itemCountMap[
            w.globals.initialSeries[0].data[dataPointIndex].x +
              w.globals.initialSeries[0].data[dataPointIndex].y[0]
          ] +
          "</span>" +
          "</div>"
        );
      },
      x: {
        show: true,
        format: "mm:ss:fff",
        formatter: undefined,
      },
      y: {
        show: true,
        formatter: undefined,
        format: "mm:ss:fff",
      },
    },
  };
  const series = [
    {
      data: props.analyticsResult,
    },
  ];

  return (
    <div style={{ width: "100%" }}>
      <Chart options={options} series={series} type={"rangeBar"} height={350} />
    </div>
  );
}
