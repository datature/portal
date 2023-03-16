import React, { useCallback, useEffect, useRef, useState } from "react";
import Chart from 'react-apexcharts';
import debounce from 'lodash/debounce';
import { IconButton } from "./button";

interface Coordinate {
  x: number;
  y: number;
};

interface AnalyticsPopUpProps {
  closeCallback: () => void;
  graphData: {
    x: string;
    y: number[];
  }[];
  fps: number;
  videoElement: any;
  // updateTimeStamp: (timeStamp: number) => void;
};

export function AnalyticsPopUp({ closeCallback, graphData, fps, videoElement }: AnalyticsPopUpProps) {
  const [startPos, setStartPos] = useState<Coordinate>({x: 50, y: 100,});
  const [relativePos, setRelativePos] = useState<Coordinate>({x: 0, y: 0,});
  const [divSize, setDivSize] = useState<Coordinate>({x: 800, y: 500,});
  const [isDrag, setIsDrag] = useState<boolean>(false);
  const dragRef = useRef<HTMLDivElement>(document.createElement("div"));
  const [curChartX, setCurChartX] = useState<number>(-1);

  const handleResize = useCallback(
    debounce(() => {setDivSize({
        x: dragRef.current.clientWidth,
        y: dragRef.current.clientHeight,
      });
    }, 500), []
  );

  useEffect(() => {
    const divElement = dragRef.current;
    if (!divElement) return;
    const observer = new ResizeObserver(() => {
      handleResize();
    });
    observer.observe(divElement);
    return () => {observer.unobserve(divElement)};
  }, [handleResize]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsDrag(true);
    setRelativePos({
      x: event.clientX - startPos.x,
      y: event.clientY - startPos.y,
    });
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isDrag) {
      setStartPos({
        x: event.clientX - relativePos.x,
        y: event.clientY - relativePos.y,
      })
    }
  };

  const options: ApexCharts.ApexOptions = {
    colors: ['#0088cc'],
    tooltip: {
      enabled: true,
      custom: ({ series, seriesIndex, dataPointIndex, w }) => {
        const dataPoint = w.config.series[0].data[dataPointIndex]
        const timeStamp = series[0][dataPointIndex];
        return `<div style="color: black; background-color: aquamarine; padding: 3px;">
          Tag: ${dataPoint.x}<br>
          Count: ${dataPoint.count}<br>
          Frame: ${Math.round(timeStamp * fps)}<br>
          Time Stamp: ${dataPoint.y[0].toFixed(3)} second<br>
        </div>`
      }
    },
    chart: {
      height: 350,
      type: 'rangeBar',
      events: {
        dataPointSelection: (_, __, config) => {
          let currPoint = config.selectedDataPoints[0];
          let timeStamp = config.w.config.series[0].data[currPoint].y[0];
          videoElement.currentTime = timeStamp;
          setCurChartX(timeStamp * fps);
        },
      }
    },
    plotOptions: {
      bar: {
        horizontal: true
      }
    },
    xaxis: {
      type: 'datetime',
      title: {
        text: 'Time (seconds)'
      },
      labels: {
        style: {
          colors: '#333'
        }
      },
    },
    yaxis: {
      title: {
        text: 'Tags'
      },
      labels: {
        style: {
          colors: '#333'
        }
      }
    },
  };
  const series = [
    {
      data: graphData
    }
  ];

  return (
    <div 
      ref={dragRef}
      onMouseUp={() => setIsDrag(false)}
      style={{
        position: "absolute",
        left: startPos.x,
        top: startPos.y,
        width: 800,
        height: 500,
        backgroundColor: "rgba(135, 149, 161, 1)",
        border: "3px solid rgba(20, 20, 60, 0.9)",
        borderRadius: "5px",
        resize: "both",
        overflow: "auto",
        zIndex: 100,
        minWidth: "300px",
        minHeight: "200px",
    }}>
      {curChartX !== -1 ? (
        <div style={{
          margin: "5px",
        }}>
          Frame: {curChartX + 1}, Time: {(curChartX * (1 / fps)).toFixed(3)} second
        </div>
      ) : ''}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsDrag(false)}
        style={{
          backgroundColor: "rgba(16, 22, 26, 0.15)",
          height: 32,
          width: 32,
          position: "absolute",
          top: 3,
          right: 70,
        }}
        >
        <IconButton stroke="code-bracket-square" style={{
          cursor: "move",
        }} />
      </div>
      <div
        style={{
          backgroundColor: "rgba(16, 22, 26, 0.15)",
          height: 32,
          width: 32,
          position: "absolute",
          top: 3,
          right: 18,
        }}
        >
        <IconButton stroke="x-mark" onClick={() => closeCallback()} />
      </div>
      <div
        style={{
          backgroundColor: "rgba(200, 200, 200, 0.8)",
          position: "absolute",
          height: divSize.y - 65,
          width: divSize.x - 15,
          top: 48,
          left: 5,
        }}
        >
          {series[0].data.length === 0 ? (
            <div style={{
              padding: "5px",
              color: "black",
            }}>
              No Data. Please select and analyze a video to show video analytics graph.
              Note that only the latest video analyzed is displayed here.
            </div>
          ) : (
            <Chart
              options={options}
              series={series}
              type="rangeBar"
              height={divSize.y - 70}
            />
          )}
      </div>
    </div>
  )
}
