import { JwtPayload } from "jsonwebtoken";
import { Cart } from "./cart.model";

import ApiError from "../../../errors/ApiError";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { ICartProduct } from "./cart.interface";


const manageCartProduct = async (user: JwtPayload, productId: Types.ObjectId, quantity: number, vendorId: Types.ObjectId) => {
    let cart = await Cart.findOne({ customerId: user.userId });

    if (!cart) {
        // Create new cart
        cart = await Cart.create({
            customerId: user.userId,
            items: [{
                vendorId,
                products: [{ product: productId, quantity }]
            }]
        });

        if (!cart) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create cart');
        }
        return cart; // ✅ Return newly created cart
    }

    let vendorExists = false;

    const updatedItems = cart.items.map(item => {
        if (item.vendorId === vendorId) {
            vendorExists = true;
            const products = item.products.filter(p => p.product !== productId);

            if (quantity > 0) {
                products.push({ product: productId , quantity });
            }

            return products.length > 0 ? { vendorId: item.vendorId, products } : null;
        }
        return item;
    }).filter(Boolean); // Remove null values (vendors with no products)

    // If vendor doesn't exist, add new vendor with product
    if (!vendorExists && quantity > 0) {
        updatedItems.push({ vendorId, products: [{ product: productId, quantity }] });
    }

    // Update the cart in DB
    const updatedCart = await Cart.findOneAndUpdate(
        { customerId: user.userId },
        { items: updatedItems },
        { new: true }
    );

    if (!updatedCart) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update cart');
    }

    return updatedCart; // ✅ Return the updated cart
};

const removeProductFromCart = async (
    user: JwtPayload,
    productId: Types.ObjectId,
    vendorId: Types.ObjectId
  ) => {
    const cart = await Cart.findOne({ customerId: user.userId });
  
    if (!cart) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Cart not found');
    }
  
    // Filter out the product from the vendor
    const updatedItems = cart.items
      .map((item) => {
        if (item.vendorId.toString() === vendorId.toString()) {
          const products = item.products.filter(
            (p) => p.product.toString() !== productId.toString()
          );
          return products.length > 0 ? { vendorId: item.vendorId, products } : null;
        }
        return item;
      })
      .filter((item): item is { vendorId: Types.ObjectId; products: ICartProduct[] } => item !== null); // Type assertion to fix TypeScript error
  
    // Assign the updated items to the cart
    cart.items = updatedItems;
  
    // Save the updated cart
    const updatedCart = await cart.save();
    if (!updatedCart) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update cart');
    }
  
    return updatedCart;
  };



const getCart = async (user: JwtPayload) => {
    const isCartExist = await Cart.findOne({ customerId: user.userId })
        .populate('items.products.product') // ✅ Corrected product path
        .populate('items.vendorId', { businessContact: 1, name: 1, businessTitle: 1 });

    if (!isCartExist) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Cart not found');
    }
    return isCartExist;
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
export const CartServices = { manageCartProduct, getCart, deleteCart, removeProductFromCart };
