import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Su rosa exclusivo de la captura 9:33 AM
                primary: "#F492B7",
                "djinn-pink": "#F492B7",
            },
            fontFamily: {
                serif: ['var(--font-adriane)', 'serif'],
            },
        },
    },
    plugins: [],
};
export default config;