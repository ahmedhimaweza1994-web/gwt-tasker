import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title } from 'chart.js';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title
);

// Chart.js defaults for RTL and Arabic
ChartJS.defaults.font.family = 'Noto Sans Arabic, system-ui, sans-serif';
ChartJS.defaults.color = 'hsl(157, 10%, 45%)'; // muted-foreground

export const chartColors = {
  primary: '#10B981',
  secondary: '#059669',
  accent: '#047857',
  success: '#10B981',
  warning: '#F59E0B',
  destructive: '#EF4444',
};

export const auxStatusColors = {
  ready: chartColors.success,
  working: chartColors.primary,
  personal: chartColors.warning,
  break: chartColors.destructive,
};

export function createAuxDistributionChart(canvas: HTMLCanvasElement, data: any[]) {
  return new ChartJS(canvas, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        data: data.map(d => d.value),
        backgroundColor: data.map(d => auxStatusColors[d.status as keyof typeof auxStatusColors]),
        borderWidth: 2,
        borderColor: 'hsl(0, 0%, 100%)',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false, // We'll create custom legend
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${percentage}%`;
            }
          },
          titleFont: {
            family: 'Noto Sans Arabic',
          },
          bodyFont: {
            family: 'Noto Sans Arabic',
          },
          rtl: true,
        }
      }
    }
  });
}

export function createProductivityChart(canvas: HTMLCanvasElement, data: any[]) {
  return new ChartJS(canvas, {
    type: 'line',
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        label: 'الإنتاجية',
        data: data.map(d => d.productivity),
        borderColor: chartColors.primary,
        backgroundColor: chartColors.primary + '20',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: chartColors.primary,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          titleFont: {
            family: 'Noto Sans Arabic',
          },
          bodyFont: {
            family: 'Noto Sans Arabic',
          },
          rtl: true,
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            },
            font: {
              family: 'Noto Sans Arabic',
            }
          },
          grid: {
            color: 'hsl(151, 25%, 91%)',
          }
        },
        x: {
          ticks: {
            font: {
              family: 'Noto Sans Arabic',
            }
          },
          grid: {
            color: 'hsl(151, 25%, 91%)',
          }
        }
      }
    }
  });
}
