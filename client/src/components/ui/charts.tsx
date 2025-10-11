import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

interface ChartData {
  labels?: string[];
  values?: number[];
  colors?: string[];
  datasets?: any[];
}

interface ChartsProps {
  type: "pie" | "bar" | "line" | "doughnut";
  data: ChartData;
  className?: string;
  height?: number;
}

export function Charts({ type, data, className, height = 300 }: ChartsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Configure chart data based on type
    let chartConfig: any = {
      type,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: type === "pie" || type === "doughnut" ? "bottom" : "top",
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                family: "'Noto Sans Arabic', 'Inter', sans-serif",
                size: 12,
              },
              generateLabels: function(chart: any) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label: string, i: number) => {
                    const dataset = data.datasets[0];
                    const backgroundColor = dataset.backgroundColor[i] || dataset.backgroundColor;
                    return {
                      text: label,
                      fillStyle: backgroundColor,
                      strokeStyle: backgroundColor,
                      pointStyle: 'circle',
                      hidden: false,
                      index: i
                    };
                  });
                }
                return [];
              }
            },
          },
          tooltip: {
            titleFont: {
              family: "'Noto Sans Arabic', 'Inter', sans-serif",
            },
            bodyFont: {
              family: "'Noto Sans Arabic', 'Inter', sans-serif",
            },
            callbacks: {
              label: function(context: any) {
                const label = context.label || '';
                const value = context.parsed || context.parsed.y;
                
                if (type === "pie" || type === "doughnut") {
                  const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${percentage}%`;
                }
                
                return `${label}: ${value}`;
              }
            }
          }
        },
        layout: {
          padding: 10,
        },
      },
    };

    // Handle different data formats
    if (data.datasets) {
      // Chart.js format with datasets
      chartConfig.data = {
        labels: data.labels || [],
        datasets: data.datasets.map((dataset: any) => ({
          ...dataset,
          borderRadius: type === "bar" ? 8 : 0,
          borderWidth: 1,
          borderColor: dataset.borderColor || dataset.backgroundColor,
        })),
      };
    } else {
      // Simple format with labels, values, colors
      const backgroundColor = data.colors || [
        "hsl(var(--primary))",
        "hsl(var(--chart-1))",
        "hsl(var(--chart-2))",
        "hsl(var(--chart-3))",
        "hsl(var(--chart-4))",
      ];

      chartConfig.data = {
        labels: data.labels || [],
        datasets: [
          {
            data: data.values || [],
            backgroundColor,
            borderColor: backgroundColor,
            borderWidth: type === "pie" || type === "doughnut" ? 0 : 1,
            borderRadius: type === "bar" ? 8 : 0,
          },
        ],
      };
    }

    // Type-specific configurations
    if (type === "line") {
      chartConfig.options.scales = {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              family: "'Noto Sans Arabic', 'Inter', sans-serif",
              size: 11,
            },
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              family: "'Noto Sans Arabic', 'Inter', sans-serif",
              size: 11,
            },
          },
        },
      };
    }

    if (type === "bar") {
      chartConfig.options.scales = {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              family: "'Noto Sans Arabic', 'Inter', sans-serif",
              size: 11,
            },
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              family: "'Noto Sans Arabic', 'Inter', sans-serif",
              size: 11,
            },
          },
        },
      };
    }

    if (type === "doughnut") {
      chartConfig.options.cutout = "60%";
    }

    // Create chart
    try {
      chartRef.current = new Chart(ctx, chartConfig);
    } catch (error) {
      console.error("Error creating chart:", error);
    }

    // Cleanup
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [type, data]);

  return (
    <div className={`relative ${className}`} style={{ height: `${height}px` }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        data-testid={`chart-${type}`}
      />
    </div>
  );
}
