// Helper function to select evenly distributed data points
export const getEvenlyDistributedData = (data: any, numPoints: number) => {
  // If there are fewer data points than the requested points, return all
  if (data.length <= numPoints) {
    return data;
  }

  // Calculate the interval for evenly distributing data points
  const interval = Math.floor(data.length / numPoints);
  const selectedData = [];

  for (let i = 0; i < numPoints; i++) {
    const index = i * interval;
    selectedData.push(data[index]);
  }

  return selectedData;
};
