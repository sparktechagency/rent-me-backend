export function convertTo24Hour(time: string): string {
  const [hours, modifier] = time
    .toLowerCase()
    .split(/(am|pm)/)
    .filter(Boolean);
  let [hour, minutes] = hours.split(':').map(Number);
  if (modifier === 'pm' && hour !== 12) hour += 12;
  if (modifier === 'am' && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${
    minutes ? minutes.toString().padStart(2, '0') : '00'
  }`;
}
