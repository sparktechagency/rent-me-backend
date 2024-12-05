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
  const currentId = lastId ? lastId.substring(prefix.length) : '0'; // Extract numeric part from lastId
  let currentIdLength = currentId.length;

  if (currentIdLength < 5) currentIdLength = 5;
  // Calculate the maximum value for the current ID length
  const maxValue = Math.pow(10, currentIdLength) - 1;

  // If the current ID reaches the max value, increase its length
  if (parseInt(currentId) >= maxValue) {
    currentIdLength += 1; // Increment the length
  }

  // Increment the ID and pad it to the new length
  const incrementedId = (parseInt(currentId) + 1)
    .toString()
    .padStart(currentIdLength, '0');

  return `${prefix}${incrementedId}`;
};
