import { Model, Types } from 'mongoose';
type Point = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};

type IAddress = {
  street: string;
  apartmentOrSuite: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

type IDeliveryOption = 'Leave at the front door' | 'Call upon arrival';

export type ICustomer = {
  _id: Types.ObjectId;
  id: string;
  name: string;
  email: string;
  contact?: string;
  isContactVerified?: boolean;
  profileImg?: string;
  address: IAddress;
  deliveryOption: IDeliveryOption;
  receivePromotionalNotification: boolean;
  profileCompletion: number;
  verifiedFlag: boolean;
  location: Point;
};

export type CustomerModel = Model<ICustomer>;
