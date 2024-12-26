import { ICustomer } from './customer.interface';

const requiredCustomerFields = [
  'contact',
  'isContactVerified',
  'profileImg',
  'address',
  'location', // Newly added field
];

export const calculateCustomerProfileCompletion = (
  customer: ICustomer
): number => {
  let completedFields = 0;

  for (const field of requiredCustomerFields) {
    const fieldValue = customer[field as keyof ICustomer];

    if (fieldValue !== undefined && fieldValue !== null) {
      switch (field) {
        case 'isContactVerified':
          // Ensure verifiable field is `true`
          if (fieldValue === true) {
            completedFields += 1;
          }
          break;

        case 'address':
          // Ensure address is a valid object and not empty
          if (
            typeof fieldValue === 'object' &&
            Object.keys(fieldValue).length > 0
          ) {
            completedFields += 1;
          }
          break;

        case 'location':
          // Ensure location is a valid GeoJSON object
          if (
            typeof fieldValue === 'object' &&
            'type' in fieldValue &&
            fieldValue.type === 'Point' &&
            'coordinates' in fieldValue &&
            Array.isArray(fieldValue.coordinates) &&
            fieldValue.coordinates.length === 2
          ) {
            completedFields += 1;
          }
          break;

        default:
          // Count all other fields if they have a value
          completedFields += 1;
      }
    }
  }

  const percentage = (completedFields / requiredCustomerFields.length) * 100;
  return Math.round(percentage);
};
