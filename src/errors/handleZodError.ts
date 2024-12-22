import { ZodError } from 'zod';
import { IErrorMessage } from '../types/errors.types';
import { StatusCodes } from 'http-status-codes';

const handleZodError = (error: ZodError) => {
  const errorMessages: IErrorMessage[] = error.errors.map(el => {
    return {
      path: el.path[el.path.length - 1],
      message: el.message,
    };
  });

  const statusCode = StatusCodes.BAD_REQUEST;

  // Determine dynamic message based on error type or first error
  let message = 'Zod Validation Error';
  if (error.errors.length > 0) {
    const firstError = error.errors[0];

    if (firstError.message.includes('Required')) {
      message = firstError.path[1] + ' is ' + firstError.message;
    } else if (firstError.message.includes('invalid')) {
      message = firstError.path[1] + ' is ' + firstError.message;
    } else {
      message = firstError.path[1] + ' ' + firstError.message; // Fallback to the first error message
    }
  }

  return {
    statusCode,
    message,
    errorMessages,
  };
};

export default handleZodError;
