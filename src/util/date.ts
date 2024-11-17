export const getStartDate = (range: string) => {
  console.log(range);
  const now = new Date();
  switch (range) {
    case 'weekly':
      return new Date(now.setDate(now.getDate() - 7));
    case 'quarterly':
      return new Date(now.setMonth(now.getMonth() - 0.5));
    case 'monthly':
      return new Date(now.setMonth(now.getMonth() - 1));
    default:
      throw new Error('Invalid range type');
  }
};
