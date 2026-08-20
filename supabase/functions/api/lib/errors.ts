export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('INVALID_PARAMETER', message, 400)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', message, 404)
    this.name = 'NotFoundError'
  }
}

export class UpstreamError extends AppError {
  constructor(message: string) {
    super('UPSTREAM_UNAVAILABLE', message, 503)
    this.name = 'UpstreamError'
  }
}

export class AiError extends AppError {
  constructor(message: string) {
    super('AI_UNAVAILABLE', message, 502)
    this.name = 'AiError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string) {
    super('RATE_LIMITED', message, 429)
    this.name = 'RateLimitError'
  }
}
