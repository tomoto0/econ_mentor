/**
 * Graph Generator for Economic Models
 * Generates realistic economic graph data based on user requests
 */

import { GraphData } from "../client/src/components/EconomicGraph";

/**
 * Generate supply and demand curve data
 */
export function generateSupplyDemandGraph(): GraphData {
  return {
    type: "supply_demand",
    title: "需要と供給曲線",
    description: "需要曲線（下降）と供給曲線（上昇）の交点が市場均衡点です",
    axes: {
      x: { label: "数量", unit: "単位" },
      y: { label: "価格", unit: "円" },
    },
    series: [
      {
        name: "需要曲線",
        type: "line",
        color: "blue",
        data: [
          [0, 100],
          [10, 90],
          [20, 80],
          [30, 70],
          [40, 60],
          [50, 50],
          [60, 40],
          [70, 30],
          [80, 20],
          [90, 10],
        ],
        tension: 0.4,
        borderWidth: 2,
      },
      {
        name: "供給曲線",
        type: "line",
        color: "red",
        data: [
          [0, 10],
          [10, 20],
          [20, 30],
          [30, 40],
          [40, 50],
          [50, 60],
          [60, 70],
          [70, 80],
          [80, 90],
          [90, 100],
        ],
        tension: 0.4,
        borderWidth: 2,
      },
    ],
    annotations: [
      {
        x: 50,
        y: 50,
        text: "市場均衡点 (Q=50, P=50)",
      },
    ],
  };
}

/**
 * Generate cost curves data
 */
export function generateCostCurvesGraph(): GraphData {
  return {
    type: "cost_curves",
    title: "費用曲線",
    description: "平均費用曲線（AC）と限界費用曲線（MC）の関係を示します",
    axes: {
      x: { label: "生産量", unit: "単位" },
      y: { label: "費用", unit: "円" },
    },
    series: [
      {
        name: "平均費用（AC）",
        type: "line",
        color: "blue",
        data: [
          [1, 100],
          [2, 60],
          [3, 45],
          [4, 40],
          [5, 42],
          [6, 48],
          [7, 56],
          [8, 65],
          [9, 75],
          [10, 85],
        ],
        tension: 0.4,
        borderWidth: 2,
      },
      {
        name: "限界費用（MC）",
        type: "line",
        color: "red",
        data: [
          [1, 100],
          [2, 20],
          [3, 15],
          [4, 20],
          [5, 30],
          [6, 45],
          [7, 60],
          [8, 75],
          [9, 90],
          [10, 105],
        ],
        tension: 0.4,
        borderWidth: 2,
      },
    ],
    annotations: [
      {
        x: 4,
        y: 40,
        text: "最小費用点（AC最小）",
      },
    ],
  };
}

/**
 * Generate inflation and unemployment trade-off (Phillips Curve)
 */
export function generatePhillipsCurveGraph(): GraphData {
  return {
    type: "phillips_curve",
    title: "フィリップス曲線",
    description: "インフレーション率と失業率の関係を示します",
    axes: {
      x: { label: "失業率", unit: "%" },
      y: { label: "インフレーション率", unit: "%" },
    },
    series: [
      {
        name: "フィリップス曲線",
        type: "line",
        color: "purple",
        data: [
          [1, 8],
          [2, 6],
          [3, 4.5],
          [4, 3],
          [5, 2],
          [6, 1.5],
          [7, 1],
          [8, 0.5],
          [9, 0],
          [10, -0.5],
        ],
        tension: 0.4,
        borderWidth: 2,
      },
    ],
    annotations: [
      {
        x: 5,
        y: 2,
        text: "自然失業率付近",
      },
    ],
  };
}

/**
 * Generate GDP growth data
 */
export function generateGDPGrowthGraph(): GraphData {
  const gdpData: Array<[number, number]> = [
    [2015, 500],
    [2016, 520],
    [2017, 545],
    [2018, 570],
    [2019, 590],
    [2020, 560], // COVID-19 impact
    [2021, 590],
    [2022, 620],
    [2023, 650],
    [2024, 680],
  ];

  return {
    type: "gdp_growth",
    title: "GDP成長",
    description: "実質GDPの推移を示します",
    axes: {
      x: { label: "年", unit: "年" },
      y: { label: "GDP", unit: "10億円" },
    },
    series: [
      {
        name: "実質GDP",
        type: "line",
        color: "green",
        data: gdpData as Array<[number, number]>,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
    annotations: [
      {
        x: 2020,
        y: 560,
        text: "COVID-19による景気後退",
      },
    ],
  };
}

/**
 * Generate indifference curves
 */
export function generateIndifferenceCurvesGraph(): GraphData {
  return {
    type: "indifference_curves",
    title: "無差別曲線",
    description: "消費者の効用が同じ商品の組み合わせを示します",
    axes: {
      x: { label: "商品X", unit: "単位" },
      y: { label: "商品Y", unit: "単位" },
    },
    series: [
      {
        name: "無差別曲線1",
        type: "line",
        color: "blue",
        data: [
          [1, 10],
          [2, 6],
          [3, 4],
          [4, 3],
          [5, 2.5],
          [6, 2],
          [7, 1.8],
          [8, 1.6],
          [9, 1.5],
          [10, 1.4],
        ],
        tension: 0.4,
        borderWidth: 2,
      },
      {
        name: "無差別曲線2",
        type: "line",
        color: "red",
        data: [
          [1, 20],
          [2, 12],
          [3, 8],
          [4, 6],
          [5, 5],
          [6, 4],
          [7, 3.6],
          [8, 3.2],
          [9, 3],
          [10, 2.8],
        ],
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  };
}

/**
 * Map user requests to graph generators
 */
export function generateGraphFromRequest(request: string): GraphData | null {
  const lowerRequest = request.toLowerCase();

  if (lowerRequest.includes("需要") && lowerRequest.includes("供給")) {
    return generateSupplyDemandGraph();
  }
  if (lowerRequest.includes("費用") || lowerRequest.includes("コスト")) {
    return generateCostCurvesGraph();
  }
  if (lowerRequest.includes("フィリップス") || (lowerRequest.includes("失業") && lowerRequest.includes("インフレ"))) {
    return generatePhillipsCurveGraph();
  }
  if (lowerRequest.includes("GDP") || lowerRequest.includes("成長")) {
    return generateGDPGrowthGraph();
  }
  if (lowerRequest.includes("無差別") || lowerRequest.includes("効用")) {
    return generateIndifferenceCurvesGraph();
  }

  return null;
}
