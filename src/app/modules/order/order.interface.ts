import { Model, Types } from 'mongoose';
import { ICustomer } from '../customer/customer.interface';
import { IVendor } from '../vendor/vendor.interface';
import { IService } from '../service/service.interface';
import { IPackage } from '../package/package.interface';

type Point = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};

export type IOrder = {
  orderId: string; // custom order id
  customerId: Types.ObjectId | ICustomer;
  vendorId: Types.ObjectId | IVendor;
  serviceId: Types.ObjectId | IService;
  packageId: Types.ObjectId | IPackage;
  amount: number; // final amount
  status:
    | 'pending'
    | 'accepted'
    | 'confirmed'
    | 'rejected'
    | 'declined'
    | 'cancelled'
    | 'on the way'
    | 'ongoing'
    | 'completed';
  preference: string;
  paymentId: Types.ObjectId;
  paymentStatus: 'pending' | 'done';
  offeredAmount: number;
  isDeliveryDecline: boolean;
  isInstantTransfer: boolean;
  deliveryDeclineMessage: string;
  deliveryAddress: string;
  deliveryLocation: Point;
  deliveryFee: number;
  isSetup: boolean;
  setupDuration: string;
  setupStartDateAndTime: Date;
  deliveryStartDateTime: Date;
  deliveryDateAndTime: Date;
};

export type IOrderModel = Model<IOrder>;

export type IOrderFilterableFields = {
  searchTerm?: string;
  status?:
    | 'pending'
    | 'accepted'
    | 'confirmed'
    | 'rejected'
    | 'declined'
    | 'cancelled'
    | 'on the way'
    | 'ongoing'
    | 'completed';
  paymentStatus?: 'pending' | 'half' | 'full';
  vendorId?: string;
  serviceDate?: string;
};
