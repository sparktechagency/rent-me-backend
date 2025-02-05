import { Model, Types } from 'mongoose';

export type ICartProduct = {
  product: Types.ObjectId;
  quantity: number;
};

export type ICart = {
  _id: Types.ObjectId;
  items: Array<{
    vendorId: Types.ObjectId;
    products: ICartProduct[];
  }>;
  customerId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type CartModel = Model<ICart>;


