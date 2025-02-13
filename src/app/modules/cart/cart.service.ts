import { JwtPayload } from "jsonwebtoken";
import { Cart } from "./cart.model";

import ApiError from "../../../errors/ApiError";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import {  ICartPayload,  } from "./cart.interface";


const addOrUpdateCart = async (user:JwtPayload, payload:ICartPayload) => {
    // Destructure the payload
    const { vendorId, products } = payload;
  
    // Find the existing cart for the customer
    const existingCart = await Cart.findOne({ customerId: user.userId });
  
    if (!existingCart) {
      //create new cart
      const cartData = await Cart.create({
        customerId: user.userId,
        items: [{
          vendorId: new Types.ObjectId(vendorId),
          products
        }]
      });
      return cartData;
    }
  
    // Check if the vendor already exists in the cart
    const vendorIndex = existingCart.items.findIndex(
      (item) => item.vendorId.toString() === vendorId
    );
  
    if (vendorIndex === -1) {
      // If the vendor does not exist, add a new vendor entry
      existingCart.items.push({
        vendorId: new Types.ObjectId(vendorId),
        products,
      });
    } else {
      // If the vendor exists, update the products
      const existingVendor = existingCart.items[vendorIndex];
  
      // Loop through the products in the payload
      products.forEach((newProduct) => {
        const productIndex = existingVendor.products.findIndex(
          (existingProduct) =>
            existingProduct.product.toString() === newProduct.product.toString()
        );
  
        if (productIndex === -1) {
          // If the product does not exist, add it
          existingVendor.products.push({
            product: new Types.ObjectId(newProduct.product),
            quantity: newProduct.quantity,
          });
        } else {
          // If the product exists, update the quantity
          if (newProduct.quantity === 0) {
            // Remove the product if the quantity is 0
            existingVendor.products.splice(productIndex, 1);
          } else {
            // Update the quantity
            existingVendor.products[productIndex].quantity = newProduct.quantity;
          }
        }
      });
  
      // Remove the vendor entry if no products are left
      if (existingVendor.products.length === 0) {
        existingCart.items.splice(vendorIndex, 1);
      }
    }
  
    // Save the updated cart
    const updatedCart = await existingCart.save();
  
    if (!updatedCart) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update cart');
    }
  
    return updatedCart;
  };




const getCart = async (user: JwtPayload) => {
    const isCartExist = await Cart.findOne({ customerId: user.userId })
        .populate('items.products.product') // ✅ Corrected product path
        .populate('items.vendorId', { businessContact: 1, name: 1, businessTitle: 1, profileImg: 1, businessAddress: 1 });

    
    return isCartExist || [];
};

// const manageCartProduct = async (user:JwtPayload, payload:{vendorId: string, products: {productId: string, quantity: number}[]}) => {
//     const isCartExist = await Cart.findOne({ customerId: user.userId });

//     if(!isCartExist) {
//         const cartData = await Cart.create({
//             customerId: user.userId,
//             items: [{
//                 vendorId: payload.vendorId,
//                 products: payload.products
//             }]
//         });

//         if(!cartData) {
//             throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create cart');
//         }
//         return;
//     }

//     const updateCart = isCartExist.items.map(item => {
//         if(item.vendorId.toString() === payload.vendorId) {
//             const products = item.products.filter(product => product.product.toString() !== payload.products[0].productId);
//             if(payload.products[0].quantity === 0) {
//                 return {
//                     vendorId: item.vendorId,
//                     products
//                 }
//             }
//             return {
//                 vendorId: item.vendorId,
//                 products: [
//                     ...products,
//                     {
//                         product: payload.products[0].productId,
//                         quantity: payload.products[0].quantity
//                     }
//                 ]
//             }
//         }
//         return item;
//     });

//     const cartData = await Cart.findOneAndUpdate({ customerId: user.userId }, { items: updateCart }, { new: true });

//     if(!cartData) {
//         throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update cart');
//     }

//     return;
// };


const deleteCart = async (user:JwtPayload) => {
    const isCartExist = await Cart.deleteOne({ customerId: user.userId });
    if(!isCartExist) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete cart');
    }
    return;
}
export const CartServices = { addOrUpdateCart, getCart, deleteCart };
