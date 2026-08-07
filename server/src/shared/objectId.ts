import { Types } from 'mongoose';
import { NotFoundError } from './errors';

/**
 * Turn an untrusted path parameter into an ObjectId.
 *
 * Without this, `Model.findOne({ _id: 'not-an-id' })` throws a Mongoose
 * CastError, which is neither a ZodError nor an AppError — so the error
 * handler reports a client mistake as 500 INTERNAL_ERROR. A malformed id and
 * an id that does not exist are the same thing to the caller: not found.
 */
export function toObjectId(value: string | undefined, label = 'Resource'): Types.ObjectId {
  if (!value || !Types.ObjectId.isValid(value)) {
    throw new NotFoundError(`${label} not found`);
  }
  return new Types.ObjectId(value);
}
