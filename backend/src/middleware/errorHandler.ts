import { Request, Response, NextFunction } from 'express';
export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}
export const errorHandler = (err: AppError, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ success: false, message: err.message || 'Internal Server Error' });
};
