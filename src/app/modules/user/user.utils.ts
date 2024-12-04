import { User } from './user.model';

// Helper function to get the length of the ID based on the last user ID
const getLastIdBasedOnRole = async (role: string) => {
  const lastCustomId = await User.findOne({ role: role }, { id: 1, _id: 0 })
    .sort({ createdAt: -1 })
    .lean();

  return lastCustomId?.id ? lastCustomId.id : undefined;
};

// Function to generate the next custom ID based on the role
export const generateCustomIdBasedOnRole = async (role: string) => {
  switch (role) {
    case 'CUSTOMER':
      return await generateCustomCustomerId();
    case 'VENDOR':
      return await generateCustomVendorId();
    case 'ADMIN':
      return await generateCustomAdminId();
  }
};

// Generates custom ID for vendors
const generateCustomVendorId = async () => {
  const lastId = await getLastIdBasedOnRole('VENDOR');
  const newId = await generateCustomId('VD', lastId);
  return newId;
};

// Generates custom ID for customers
const generateCustomCustomerId = async () => {
  const lastId = await getLastIdBasedOnRole('CUSTOMER');
  const newId = await generateCustomId('CS', lastId);
  return newId;
};

// Generates custom ID for admins
const generateCustomAdminId = async () => {
  const lastId = await getLastIdBasedOnRole('ADMIN');
  const newId = await generateCustomId('AD', lastId);
  return newId;
};

// Helper function to generate the new ID by checking if we need to increase the length
const generateCustomId = async (prefix: string, lastId: string | undefined) => {
  let currentId = lastId ? lastId.substring(2) : '0'; // Remove prefix (e.g., 'VD' or 'CS')

  // Determine the current ID length
  let currentIdLength = currentId.length;

  // Check the maximum value for the current ID length (e.g., 99999 for 5 digits)
  const maxValue = Math.pow(10, currentIdLength) - 1;

  // If the current ID is equal to the maximum value, increase the ID length
  if (parseInt(currentId) >= maxValue) {
    currentIdLength += 1; // Increment length to handle more digits
    currentId = '0'; // Start from zero for the new length
  }

  // Increment the current ID by 1 and pad it to the required length
  const incrementedId = (parseInt(currentId) + 1)
    .toString()
    .padStart(currentIdLength, '0');
  return `${prefix}${incrementedId}`;
};
