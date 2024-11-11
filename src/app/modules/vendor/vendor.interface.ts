import { Model } from 'mongoose';

interface Point {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export type IVendor = {
  id: string;
  name: string;
  email: string;
  contact?: string;
  profileImg?: string;
  address?: string;
  rating?: number;
  totalReviews: number;
  location: Point; // [longitude, latitude]

  orderCompleted?: number;
  isAvailable?: boolean; // order < 10 ? true : false
  businessTitle?: string;
  description?: string;
  shopVisited: number;
  businessImages?: string[];
};

export type VendorModel = Model<IVendor>;

export type IVendorFilterableFields = {
  searchTerm?: string;
  id?: string;
  name?: string;
  businessTitle?: string;
  address?: string;
  email?: string;
  minRating?: number;
  maxRating?: number;
  totalReviews?: number;
  orderCompleted?: number;
  isAvailable?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  minOrderCompleted?: number;
  maxOrderCompleted?: number;
  minReviews?: number;
  maxReviews?: number;

  // schedule
  serviceDate?: string;
  serviceTime?: string;

  //budget
  minBudget?: number;
  maxBudget?: number;

  //distance
  radius?: number;
  customerLat?: number;
  customerLng?: number;
};
