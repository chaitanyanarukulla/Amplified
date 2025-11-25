/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                amber: {
                    400: '#FFCA28', // Adjusted for better visibility
                    500: '#FFB74D', // Brand Amber
                    600: '#FFA000',
                },
                slate: {
                    800: '#263238', // Brand Dark Slate
                    900: '#1a2327',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
