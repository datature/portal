import { AssetAPIObject } from "@portal/api/annotation";
import ApexCharts from "apexcharts";
import React from "react";
// function renderChart() {
//     if (!chartData.length) {
//       return;
//     }
//     const options = {
//       chart: {
//         height: 350,
//         type: 'rangeBar',
//       },
//       plotOptions: {
//         bar: {
//           horizontal: true,
//           barHeight: '80%',
//         },
//       },
//       xaxis: {
//         type: 'datetime',
//         labels: {
//           datetimeFormatter: {
//             year: 'yyyy',
//             month: 'MMM \'yy',
//             day: 'dd MMM',
//             hour: 'HH:mm',
//           },
//         },
//       },
//       yaxis: {
//         labels: {
//           show: false,
//         },
//       },
//       tooltip: {
//         custom: ({ series, seriesIndex, dataPointIndex, w }) => {
//           const { duration } = series[seriesIndex][dataPointIndex];
//           return `
//             <div class="apexcharts-tooltip-duration">
//               Duration: ${moment.duration(duration).asSeconds()} seconds
//             </div>
//           `;
//         },
//       },
//     };
//     const chart = new ApexCharts(chartRef.current, { options, series: [{ data: chartData }] });
//     chart.render();
//   }

interface AnalyticsBarProps {
  assetList: Array<AssetAPIObject>;
  videoAnalyticsData: Array<any>;
}

const AnalyticsBar = ({ assetList, videoAnalyticsData }: AnalyticsBarProps) => {
  console.log("videoAnalyticsData", videoAnalyticsData);
  return (
    <div>
      <p>HELLO</p>
    </div>
  );
};

export default AnalyticsBar;
