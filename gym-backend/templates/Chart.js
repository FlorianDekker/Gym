const labels = data.map(item => item.date);        // dates as labels on x-axis
const volumes = data.map(item => item.total_volume); // total volumes on y-axis

const ctx = document.getElementById('myChart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: labels,
    datasets: [{
      label: 'Total Volume',
      data: volumes,
      borderColor: 'blue',
      fill: false,
      tension: 0.1,
    }]
  },
  options: {
    scales: {
      x: { type: 'time', time: { unit: 'day' } },
      y: { beginAtZero: true }
    }
  }
});
