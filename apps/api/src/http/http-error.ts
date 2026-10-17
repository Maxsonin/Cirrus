// Thrown from services, turned into a JSON response by the error handler.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
