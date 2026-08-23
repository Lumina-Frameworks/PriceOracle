import { defineConfig } from "vite";
import { resolve } from "path";

// ponytail: publicDir copies robots.txt/sitemap.xml/banner.png into dist/; swap for a
// real OG-image pipeline when banner.png gets replaced with a proper 1200x630 card.
export default defineConfig({
    publicDir: "public",
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                banner: resolve(__dirname, "banner.png"),
            },
        },
    },
});
