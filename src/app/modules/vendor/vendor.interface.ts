import { Model } from 'mongoose';

export type IVendor = {
  id: string;
  name: string;
  email: string;
  contact?: string;
  profileImg?: string;
  address?: string;
  rating?: number;
  totalReviews: number;
  location: {
    lat: number;
    lng: number;
  };
  orderCompleted?: number;
  isAvailable?: boolean; // order < 10 ? true : false
  businessTitle?: string;
  description?: string;
  shopVisited: number;
  businessImages?: string[];
};

export type VendorModel = Model<IVendor>;
