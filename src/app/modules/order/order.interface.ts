import { Model, Types } from 'mongoose';
import { ICustomer } from '../customer/customer.interface';
import { IVendor } from '../vendor/vendor.interface';
import { IService } from '../service/service.interface';
import { IPackage } from '../package/package.interface';

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
    | 'cancelled'
    | 'rejected'
    | 'completed'
    | 'decline';
  preference: string;
  paymentId: Types.ObjectId;
  paymentStatus: 'pending' | 'half' | 'full';
  offeredAmount: number; //offer by customer
  deliveryLocation: {
    lat: number;
    lng: number;
  };
  isDeliveryDecline: boolean;

  deliveryDeclineMessage: string;
  deliveryAddress: string;
  // serviceDate: string;
  serviceStartDateTime: Date;
  serviceEndDateTime: Date;
  deliveryTime: string;
  deliveryFee: number;
  deliveryReceivingCode: string;
};

export type IOrderModel = Model<IOrder>;

export type IOrderFilter = {
  status?:
    | 'pending'
    | 'accepted'
    | 'ongoing'
    | 'cancelled'
    | 'rejected'
    | 'completed';
  // serviceDate: string;
  serviceStartDateTime?: string;
  serviceEndDateTime?: string;
};
