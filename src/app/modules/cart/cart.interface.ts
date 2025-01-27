import { Model, Types } from 'mongoose';

type ICartProduct = {
  productId: Types.ObjectId;
  quantity: number;
};

export type ICart = {
  _id: Types.ObjectId;
  customerId: Types.ObjectId;
  products: ICartProduct[];
  createdAt: Date;
  updatedAt: Date;

};

export type CartModel = Model<ICart>;
