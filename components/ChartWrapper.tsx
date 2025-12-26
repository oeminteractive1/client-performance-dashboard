

import React, { useEffect, useRef } from 'react';
import type { ChartConfiguration, ChartTypeRegistry } from 'chart.js';

// Since Chart.js is loaded from a CDN, we access it from the window object.
// We declare its type to keep TypeScript happy.
declare const Chart: any;

interface ChartWrapperProps {
  type: keyof ChartTypeRegistry;
  data: ChartConfiguration['data'];
  options: any;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({ type, data, options }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy previous chart instance before creating a new one
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: type,
      data: data,
      options: {
        ...options,
        animation: false,
        hover: {
          animationDuration: 0
        },
        responsiveAnimationDuration: 0,
        interaction: options?.interaction || {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          ...options?.plugins,
          tooltip: {
            ...options?.plugins?.tooltip,
            enabled: options?.plugins?.tooltip?.enabled ?? false
          }
        }
      },
    });

    // Cleanup function to destroy the chart on component unmount
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [type, data, options]); // Re-create chart if props change

  return <canvas ref={canvasRef}></canvas>;
};

export default ChartWrapper;