import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

const handler = toNextJsHandler(async (req: Request) => (await getAuth()).handler(req));
export const { GET, POST } = handler;
