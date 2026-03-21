import { SignJWT, jwtVerify } from "jose";
import { type Request, type Response, type NextFunction } from "express";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "fallback_secret_for_local_dev"
);

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
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token =
  req.cookies?.GigLoop_session ||
  req.cookies?.giggity_session ||
  req.cookies?.Giggity_session;
  
  if (!token) {
    console.log("AUTH FAIL: missing cookie", {
      path: req.path,
      cookies: req.cookies,
    });
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userId = await verifySession(token);

  if (!userId) {
    console.log("AUTH FAIL: invalid token", {
      path: req.path,
    });
    return res.status(401).json({ message: "Unauthorized" });
  }

  (req as any).userId = userId;
  next();
}