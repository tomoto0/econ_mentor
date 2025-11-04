import { useEffect, useRef, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
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

export interface GraphData {
  type: string;
  title: string;
  description?: string;
  axes: {
    x: { label: string; unit?: string };
    y: { label: string; unit?: string };
  };
  series: GraphSeries[];
  annotations?: Array<{ x: number | string; y: number; text: string }>;
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
  const [error, setError] = useState<string | null>(null);
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    setError(null);
  }, [data]);

  try {
    if (!data || !data.series || data.series.length === 0) {
      return (
        <div className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-6 my-4">
          <p className="text-slate-400">グラフデータが利用できません</p>
        </div>
      );
    }

    // Validate series data
    const validSeries = data.series.filter(series => {
      if (!series.data || series.data.length === 0) {
        console.warn(`Series "${series.name}" has no data`);
        return false;
      }
      return true;
    });

    if (validSeries.length === 0) {
      return (
        <div className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-6 my-4">
          <p className="text-slate-400">有効なグラフデータがありません</p>
        </div>
      );
    }

    const chartType = validSeries[0]?.type || "line";

    // Prepare labels
    let labels: (string | number)[] = [];
    if (Array.isArray(validSeries[0]?.data?.[0])) {
      labels = (validSeries[0].data as Array<[number, number]>).map(
        (point) => point[0]
      );
    } else {
      labels = Array.from(
        { length: (validSeries[0]?.data as number[])?.length || 0 },
        (_, i) => i
      );
    }

    // Prepare datasets
    const datasets = validSeries.map((series) => {
      const color =
        colorMap[series.color || "blue"] || series.color || "rgb(59, 130, 246)";
      const dataValues = Array.isArray(series.data[0])
        ? (series.data as Array<[number, number]>).map((point) => point[1])
        : (series.data as number[]);

      return {
        label: series.name,
        data: dataValues,
        borderColor: color,
        backgroundColor: series.fill
          ? color.replace("rgb", "rgba").replace(")", ", 0.1)")
          : "transparent",
        fill: series.fill || false,
        tension: series.tension || 0.3,
        borderWidth: series.borderWidth || 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        pointBorderColor: color,
        pointBorderWidth: 2,
      };
    });

    const chartData = {
      labels,
      datasets,
    };

    const options = {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: data.title,
          font: {
            size: 16,
            weight: "bold" as const,
          },
          color: "rgba(255, 255, 255, 0.9)",
        },
        legend: {
          display: true,
          position: "top" as const,
          labels: {
            color: "rgba(255, 255, 255, 0.7)",
            font: { size: 12 },
            padding: 15,
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          padding: 12,
          titleFont: { size: 14 },
          bodyFont: { size: 12 },
          titleColor: "rgba(255, 255, 255, 0.9)",
          bodyColor: "rgba(255, 255, 255, 0.8)",
          borderColor: "rgba(255, 255, 255, 0.2)",
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: `${data.axes.x.label}${
              data.axes.x.unit ? ` (${data.axes.x.unit})` : ""
            }`,
            font: {
              size: 12,
              weight: "bold" as const,
            },
            color: "rgba(255, 255, 255, 0.8)",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
            drawBorder: true,
          },
          ticks: {
            color: "rgba(255, 255, 255, 0.7)",
            font: { size: 11 },
          },
        },
        y: {
          title: {
            display: true,
            text: `${data.axes.y.label}${
              data.axes.y.unit ? ` (${data.axes.y.unit})` : ""
            }`,
            font: {
              size: 12,
              weight: "bold" as const,
            },
            color: "rgba(255, 255, 255, 0.8)",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
            drawBorder: true,
          },
          ticks: {
            color: "rgba(255, 255, 255, 0.7)",
            font: { size: 11 },
          },
        },
      },
    };

    return (
      <div className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-6 my-4">
        <div className="mb-4">
          {data.description && (
            <p className="text-sm text-slate-300 mb-2">{data.description}</p>
          )}
        </div>

        <div className="relative h-96 w-full">
          <div key={chartKey} className="w-full h-full">
            {chartType === "line" && (
              <Line
                data={chartData as any}
                options={options as any}
                redraw={true}
              />
            )}
            {chartType === "bar" && (
              <Bar
                data={chartData as any}
                options={options as any}
                redraw={true}
              />
            )}
          </div>
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
  } catch (err) {
    console.error("Graph rendering error:", err);
    setError(
      err instanceof Error ? err.message : "グラフの描画に失敗しました"
    );
    return (
      <div className="w-full bg-slate-800/50 border border-red-700/50 rounded-lg p-6 my-4">
        <p className="text-red-400 text-sm">
          グラフの描画に失敗しました: {error}
        </p>
        <p className="text-slate-400 text-xs mt-2">
          別の質問を試してみてください
        </p>
      </div>
    );
  }
}
