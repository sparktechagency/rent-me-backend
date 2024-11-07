import { Model } from 'mongoose';

export type ICustomer = {
  id: string;
  name: string;
  email: string;
  contact?: string;
  profileImg?: string;
  address?: string;
  location: {
    lat: number;
    lng: number;
  };
};

export type CustomerModel = Model<ICustomer>;
