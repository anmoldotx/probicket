export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    public readonly details?: unknown
  ) {
    super(errorCode);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
