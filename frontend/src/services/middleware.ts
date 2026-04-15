import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // "/" matlab Home page sabko dikhega, 
  // baaki sab protected rahenge jab tak hum naye routes add na karein.
  publicRoutes: ["/"], 
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};