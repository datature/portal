import React from 'react';
import Chart from 'react-apexcharts';


interface VideoData {
  annotationID: string;
  bound: number[][];
  boundType: string;
  confidence: number;
  tag: {
    id: number;
    name: string;
  }
}

interface AnalyticsBarProp {
  data: {
    fps: number;
    frames: VideoData[][];
  };
  confidence: number;
}

type analayticsDataDict = {
  [key: string]: number[];
}

export function AnalyticsBar({ data, confidence }: AnalyticsBarProp) {
  // get all the tag names, store in an array
  const tagNames: string[] = []
  for (let key in data['frames']) {
    for (let j = 0; j < data['frames'][key].length; j++) {
      let name = data['frames'][key][j]['tag']['name']
      if (!tagNames.includes(name)) {
        tagNames.push(name);
      }
    }
  }

  // dict with tag names as keys, each is an array of 0 of length 'num frames'
  const analyticsDataDict: analayticsDataDict = {}
  const numFrames = Object.keys(data['frames']).length;
  for (let i = 0; i < tagNames.length; i++) {
    analyticsDataDict[tagNames[i]] = Array(numFrames).fill(0);
  }

  // analyticsDataDict[key][frame] display the number of 'key' tag name in frame 'frame'
  let counter = 0
  for (let key in data['frames']) {
    for (let j = 0; j < data['frames'][key].length; j++) {
      const instance = data['frames'][key][j]
      if (instance['confidence'] >= confidence) {
        const tagNameKey = instance['tag']['name'];
        analyticsDataDict[tagNameKey][counter] += 1;
      }
    }
    counter += 1
  }

  // generate graphData array to fill in 'series' attribute in chart component
  const graphData = []
  for (let tagNameKey in analyticsDataDict) {
    for (let frameKey in analyticsDataDict[tagNameKey]) {
      if (analyticsDataDict[tagNameKey][frameKey] > 0) {
        graphData.push({
          x: tagNameKey,
          y: [Number(frameKey) / data['fps'], (Number(frameKey) + 1) / data['fps']]
        })
      }
    }
  }
  // console.log(graphData)

  const options: ApexCharts.ApexOptions = {
    colors: ['#fff'],
    chart: {
      height: 350,
      type: 'rangeBar'
    },
    plotOptions: {
      bar: {
        horizontal: true
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: {
          colors: '#fff'
        }
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: '#fff'
        }
      }
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const series: ApexCharts.ApexAxisChartSeries = [
    {
      data: graphData
    }
  ];

  return (
    <>
    {data['fps'] === 0 ? (
      <div>
        Please select and analyze a video item first!
      </div>
    ) : (
      <div>
        {graphData.length === 0 ? 'No Data' : (
          <Chart options={options} series={series} type="rangeBar" height={120} />
        )}
      </div>
    )}
    </>
  )
}

export default AnalyticsBar;
