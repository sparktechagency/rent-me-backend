export const getStartDate = (range: string) => {
  console.log(range);
  const now = new Date();
  switch (range) {
    case '7d':
      return new Date(now.setDate(now.getDate() - 7));
    case '1m':
      return new Date(now.setMonth(now.getMonth() - 1));
    case '2m':
      return new Date(now.setMonth(now.getMonth() - 2));
    default:
      throw new Error('Invalid range type');
  }
};
