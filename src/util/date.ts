export const getStartDate = (range: string) => {
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

export const convertTo24HourFormat = (time12h: string) => {
  const [time, modifier] = time12h.split(' '); // Split time and AM/PM
  // eslint-disable-next-line prefer-const
  let [hours, minutes] = time.split(':').map(Number); // Extract hours and minutes

  // Convert hours to 24-hour format
  if (modifier === 'PM' && hours !== 12) {
    hours += 12;
  } else if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }

  // Format with leading zeros if needed
  const hoursFormatted = hours.toString().padStart(2, '0');
  const minutesFormatted = minutes.toString().padStart(2, '0');

  return `${hoursFormatted}:${minutesFormatted}`;
};
