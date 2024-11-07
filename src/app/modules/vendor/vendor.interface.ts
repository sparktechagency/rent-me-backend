import { Model } from 'mongoose';

export type IVendor = {
  id: string;
  name: string;
  email: string;
  contact?: string;
  profileImg?: string;
  address?: string;
  rating?: number;
  location: {
    lat: number;
    lng: number;
  };
  orderCompleted?: number;
  businessTitle?: string;
  description?: string;
  businessImages?: string[];
};

export type VendorModel = Model<IVendor>;
