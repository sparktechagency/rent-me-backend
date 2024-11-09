import { Model, Types } from 'mongoose';
import { IVendor } from '../vendor/vendor.interface';
import { IService } from '../service/service.interface';

export type IPackage = {
  title: string;
  features: string[];
  type: string;
  vendorId: Types.ObjectId | IVendor;
  serviceId: Types.ObjectId | IService;
};

export type IPackageModel = Model<IPackage>;
