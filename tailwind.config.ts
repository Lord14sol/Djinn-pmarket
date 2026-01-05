import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Su rosa exclusivo para Djinn
                'djinn-pink': '#FF8FAB',

                // Colores oscuros de soporte (por si los necesita)
                dark: {
                    DEFAULT: "#0D0D0D",
                    100: "#1A1A1A",
                    200: "#262626",
                },
            },
        },
    },
    plugins: [],
};
export default config;