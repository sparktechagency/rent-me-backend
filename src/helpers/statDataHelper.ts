
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getEvenlyDistributedData = (data: any, numPoints: number) => {
  // If there are fewer data points than the requested points, return all
  if (data.length <= numPoints) {
    return data;
  }

  const selectedData = [];
  const step = data.length / numPoints;

  // Loop through the range of points and select data points at the interval 'step'
  for (let i = 0; i < numPoints; i++) {
    // Calculate the index to pick from the data array based on the step
    const index = Math.round(i * step);
    selectedData.push(data[index]);
  }

  return selectedData;
};
