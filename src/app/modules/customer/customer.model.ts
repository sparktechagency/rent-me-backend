import { model, Schema } from 'mongoose';
import { ICustomer, CustomerModel } from './customer.interface';

const customerSchema = new Schema<ICustomer, CustomerModel>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    contact: {
      type: String,
    },
    profileImg: {
      type: String,
    },
    address: {
      type: String,
    },
    location: {
      type: {
        lat: {
          type: Number,
        },
        lng: {
          type: Number,
        },
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

export const Customer = model<ICustomer, CustomerModel>(
  'Customer',
  customerSchema
);
