import { Request, Response } from 'express';
import { CartServices } from './cart.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

const manageCart = catchAsync(
    async (req: Request, res: Response) => {
        const user = req.user;
        const { productId, quantity, vendorId } = req.body;
        await CartServices.manageCartProduct(user, productId, quantity, vendorId);
        sendResponse(res, {
            success: true,
            statusCode: StatusCodes.OK,
            message: 'Cart managed successfully',
        });
    }
);

const getCart = catchAsync(
    async (req: Request, res: Response) => {
        const user = req.user;
        const result = await CartServices.getCart(user);
        sendResponse(res, {
            success: true,
            statusCode: StatusCodes.OK,
            message: 'Cart retrieved successfully',
            data: result,
        });
    }
);

const deleteCart = catchAsync(
    async (req: Request, res: Response) => {
        const user = req.user;
        await CartServices.deleteCart(user);
        sendResponse(res, {
            success: true,
            statusCode: StatusCodes.OK,
            message: 'Cart deleted successfully',
        });
    }
);

export const CartController = { manageCart, getCart, deleteCart };
