import { Schema, model } from 'mongoose';
import { ICart, CartModel } from './cart.interface'; 

const cartSchema = new Schema<ICart, CartModel>({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  products: [
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    },
  ],
  
},{timestamps:true});

export const Cart = model<ICart, CartModel>('Cart', cartSchema);
