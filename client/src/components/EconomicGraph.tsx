import { useEffect, useRef } from "react";
import { Line, Bar, Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface GraphSeries {
  name: string;
  type: "line" | "bar" | "scatter";
  data: Array<[number, number]> | number[];
  color?: string;
  fill?: boolean;
  borderWidth?: number;
  tension?: number;
}

export interface GraphAnnotation {
  x: number | string;
  y: number;
  text: string;
}

export interface GraphData {
  type: string;
  title: string;
  description?: string;
  axes: {
    x: { label: string; unit?: string };
    y: { label: string; unit?: string };
  };
  series: GraphSeries[];
  annotations?: GraphAnnotation[];
}

interface EconomicGraphProps {
  data: GraphData;
}

const colorMap: Record<string, string> = {
  blue: "rgb(59, 130, 246)",
  red: "rgb(239, 68, 68)",
  green: "rgb(34, 197, 94)",
  purple: "rgb(147, 51, 234)",
  orange: "rgb(249, 115, 22)",
  pink: "rgb(236, 72, 153)",
  indigo: "rgb(99, 102, 241)",
  cyan: "rgb(34, 211, 238)",
};

export function EconomicGraph({ data }: EconomicGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine if we should use Line or Bar chart
  const chartType = data.series[0]?.type || "line";

  // Prepare chart data
  const chartData = {
    labels: Array.isArray(data.series[0]?.data[0])
      ? data.series[0].data.map((point: any) => point[0])
      : Array.from({ length: data.series[0]?.data.length || 0 }, (_, i) => i),
    datasets: data.series.map((series) => {
      const color = colorMap[series.color || "blue"] || series.color || "rgb(59, 130, 246)";

      const baseDataset = {
        label: series.name,
        data: Array.isArray(series.data[0])
          ? series.data.map((point: any) => point[1])
          : series.data,
        borderColor: color,
        backgroundColor: series.fill
          ? color.replace("rgb", "rgba").replace(")", ", 0.1)")
          : undefined,
        fill: series.fill || false,
        tension: series.tension || 0.3,
        borderWidth: series.borderWidth || 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
      };

      return baseDataset;
    }),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      title: {
        display: true,
        text: data.title,
        font: {
          size: 16,
          weight: "bold" as const,
        },
      },
      legend: {
        display: true,
        position: "top" as const,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: `${data.axes.x.label}${data.axes.x.unit ? ` (${data.axes.x.unit})` : ""}`,
          font: {
            size: 12,
            weight: "bold" as const,
          },
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
        },
      },
      y: {
        title: {
          display: true,
          text: `${data.axes.y.label}${data.axes.y.unit ? ` (${data.axes.y.unit})` : ""}`,
          font: {
            size: 12,
            weight: "bold" as const,
          },
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
        },
      },
    },
  };

  return (
    <div
      ref={containerRef}
      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-6 my-4"
    >
      <div className="mb-4">
        {data.description && (
          <p className="text-sm text-slate-300 mb-2">{data.description}</p>
        )}
      </div>

      <div className="relative h-96 w-full">
        {chartType === "line" && (
          <Line data={chartData} options={options as any} />
        )}
        {chartType === "bar" && (
          <Bar data={chartData} options={options as any} />
        )}
        {chartType === "scatter" && (
          <Scatter data={chartData} options={options as any} />
        )}
      </div>

      {data.annotations && data.annotations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-xs font-semibold text-slate-400 mb-2">注釈：</p>
          <ul className="space-y-1">
            {data.annotations.map((annotation, index) => (
              <li key={index} className="text-xs text-slate-400">
                • {annotation.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
