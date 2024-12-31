export function convertTo24Hour(time: string): string {
  // Remove extra spaces and convert to lowercase
  time = time.trim().toLowerCase();

  // Extract hours, minutes, and modifier (am/pm)
  const match = time.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!match) {
    throw new Error(`Invalid time format: ${time}`);
  }

  const [_, hour, minutes, modifier] = match;
  let hourNumber = Number(hour);
  const minutesNumber = Number(minutes) || 0;

  // Convert to 24-hour format
  if (modifier === 'pm' && hourNumber !== 12) hourNumber += 12;
  if (modifier === 'am' && hourNumber === 12) hourNumber = 0;

  return `${hourNumber.toString().padStart(2, '0')}:${minutesNumber
    .toString()
    .padStart(2, '0')}`;
}
