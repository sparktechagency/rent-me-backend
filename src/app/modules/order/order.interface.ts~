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
  serviceId?: Types.ObjectId | IService;
  packageId?: Types.ObjectId | IPackage;
  isCustomOrder: boolean;
  products: [
    {
      product: Types.ObjectId;
      price: number;
      quantity: number;
    }
  ];
  amount: number; // final amount
  status: string;
  preference: string;
  paymentId: Types.ObjectId;
  paymentStatus: string;
  offeredAmount?: number;
  isDeliveryDecline?: boolean;
  isInstantTransfer: boolean;
  deliveryDeclineMessage: string;
  deliveryAddress: string;
  deliveryLocation: Point;
  deliveryFee: number;
  customOrderDuration: string;
  priceType: string;
  customOrderDescription: string;
  isSetup: boolean;
  setupFee: number;
  setupDuration: string;
  setupStartDateAndTime: Date;
  deliveryDateAndTime: Date;
  review: Types.ObjectId;
};

export type IOrderModel = Model<IOrder>;

export type IOrderFilterableFields = {
  searchTerm?: string;
  status?:
    | 'pending'
    | 'accepted'
    | 'rejected'
    | 'declined'
    | 'cancelled'
    | 'started'
    | 'ongoing'
    | 'completed';
  paymentStatus?: 'pending' | 'half' | 'full';
  vendorId?: string;
  serviceDate?: string;
};

export type IEnrichedOrder = {
  applicationChargeRate?: number;
  applicationCharge?: number;
  vendorReceivable?: number;
  customerCCChargeRate?: number;
  customerCCCharge?: number;
  instantTransferChargeRate?: number;
  instantTransferCharge?: number;
  subTotal?: number;
};
