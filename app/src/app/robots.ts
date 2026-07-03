import type { MetadataRoute } from "next";

// App/auth areas are kept out of the index; everything public is crawlable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/admin",
          "/preview",
          "/cancel",
          "/reset-password",
          "/auth/",
        ],
      },
    ],
    sitemap: "https://robertbot.co.il/sitemap.xml",
  };
}
