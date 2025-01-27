import { JwtPayload } from "jsonwebtoken";
import { Cart } from "./cart.model";
import { ICart } from "./cart.interface";
import ApiError from "../../../errors/ApiError";
import { StatusCodes } from "http-status-codes";

const manageCart = async (user:JwtPayload, payload:ICart) => {
    const isCartExist = await Cart.findOne({ customerId: user.userId });

    if(!isCartExist) {
       const cartData = await Cart.create(payload);
        if(!cartData) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create cart');
        }
        return;
    }

    const cartData = await Cart.findOneAndUpdate({ customerId: user.userId }, payload, { new: true });
    if(!cartData) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update cart');
    }
    
    return;
};

const getCart = async (user:JwtPayload) => {
    const isCartExist = await Cart.findOne({ customerId: user.userId });
    if(!isCartExist) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Cart not found');
    }
    return isCartExist;
}


const deleteCart = async (user:JwtPayload) => {
    const isCartExist = await Cart.deleteOne({ customerId: user.userId });
    if(!isCartExist) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete cart');
    }
    return;
}
export const CartServices = { manageCart, getCart, deleteCart };
