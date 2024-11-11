import { Model } from 'mongoose';
interface Point {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export type ICustomer = {
  id: string;
  name: string;
  email: string;
  contact?: string;
  profileImg?: string;
  address?: string;
  location: Point;
};

export type CustomerModel = Model<ICustomer>;
