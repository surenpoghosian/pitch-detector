import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import Chart from 'chart.js/auto';

export const StreamChart = ({ pitchValues }) => {
  const [chartData, setChartData] = useState({
    labels: [], 
    datasets: [
      {
        label: 'Pitch',
        data: [],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  });


  const options = {
    scales: {
      y: { 
        min: 0,
        max: 700   ,
      }
    },
    animation: {
        duration: 0,
      },
  };

  useEffect(() => {
    setChartData({
      labels: pitchValues.map((_, index) => index),
      datasets: [
        {
          ...chartData.datasets[0],
          data: pitchValues,
        },
      ],
    });
  }, [pitchValues]);

  return < Line style={{height:'200px', width: '100px'}} data={chartData} options={options} height={200}/>;
};
