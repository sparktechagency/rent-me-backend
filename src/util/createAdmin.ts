import mongoose from 'mongoose';
import { logger } from '../shared/logger';
import { Admin } from '../app/modules/admin/admin.model';
import { User } from '../app/modules/user/user.model';
import { generateCustomIdBasedOnRole } from '../app/modules/user/user.utils';
import { USER_ROLES } from '../enums/user';

export const createAdmin = async (payload: {
  email: string;
  password: string;
  name: string;
}) => {
  const session = await mongoose.startSession(); // Start the session

  try {
    session.startTransaction(); // Begin transaction

    // Check if the user already exists
    const isExistUser = await User.findOne(
      { email: payload.email, status: { $in: ['active', 'restricted'] } },
    ).session(session); // Alternatively, you can chain .session(session)

    if (isExistUser) {
      return; // Exit if the user already exists
    }

    // Generate custom ID for admin
    const id = await generateCustomIdBasedOnRole(USER_ROLES.ADMIN);

    // Create new admin
    const newAdmin = await Admin.create([{ ...payload, id: id, profile:'https://rentmee.s3.us-east-1.amazonaws.com/png+Y.png' }], { session });

    if (!newAdmin?.length) {
      logger.error('Failed to create admin');
      throw new Error('Failed to create admin'); // Throw error to trigger transaction rollback
    }

    // Create user linked to admin
    await User.create([{ ...payload, admin: newAdmin[0]._id,id: id }], { session });

    // Commit transaction
    await session.commitTransaction();
    logger.info('Admin created successfully');
  } catch (error) {
    // Abort transaction if there's an error
    await session.abortTransaction();
    logger.error('Failed to create admin', error);
  } finally {
    // End the session regardless of success or failure
    session.endSession();
  }
};