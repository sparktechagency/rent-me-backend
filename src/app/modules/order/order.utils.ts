import { Order } from './order.model';

const getLastOrderId = async () => {
  const lastOrderId = await Order.findOne({}).sort({ createdAt: -1 }).lean();
  console.log(lastOrderId?.orderId, 'L');
  return lastOrderId?.orderId ? lastOrderId.orderId : undefined;
};

export const generateCustomOrderId = async () => {
  const currentId = (await getLastOrderId()) || (0).toString().padStart(5, '0');
  console.log(currentId);
  let incrementedId = (parseInt(currentId) + 1).toString().padStart(5, '0');
  incrementedId = `${incrementedId}`;

  return incrementedId;
};
