declare global {
  namespace Express {
    interface Request {
      authUser?: { id: string; email?: string; emailConfirmed: boolean }
    }
  }
}

export {}
