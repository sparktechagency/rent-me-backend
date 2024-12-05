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
    | 'ongoing'
    | 'rejected'
    | 'completed'
    | 'confirmed'
    | 'declined';
  preference: string;
  paymentId: Types.ObjectId;
  paymentStatus: 'pending' | 'half' | 'full';
  offeredAmount: number; //offer by customer
  isDeliveryDecline: boolean;
  isInstantTransfer: boolean;
  deliveryDeclineMessage: string;
  deliveryAddress: string;
  deliveryLocation: Point;

  serviceStartDateTime: Date;
  serviceEndDateTime: Date;
};

export type IOrderModel = Model<IOrder>;

export type IOrderFilter = {
  status?: 'pending' | 'accepted' | 'ongoing' | 'rejected' | 'completed';
  paymentStatus?: 'pending' | 'half' | 'full';
  serviceStartDateTime?: string;
  serviceEndDateTime?: string;
  serviceDate?: string;
};
