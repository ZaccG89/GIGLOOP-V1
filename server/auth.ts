import { SignJWT, jwtVerify } from "jose";
import { type Request, type Response, type NextFunction } from "express";

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback_secret_for_local_dev");

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("14d")
    .sign(SECRET);
  return token;
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.userId as string;
  } catch (e) {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.giggity_session;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const userId = await verifySession(token);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  (req as any).userId = userId;
  next();
}