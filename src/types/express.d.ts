// types/express/index.d.ts
import { UserPayload } from "../../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}
