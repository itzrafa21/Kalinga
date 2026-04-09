import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: [
    'resources/css/app.css', 
    'resources/js/app.js',
    'resources/js/volunteer.js',
    'resources/js/auth-guard.js',
    'resources/js/organization-logout.js',
    'resources/js/firebase.js'
],
            refresh: true,
        }),
        tailwindcss(),
    ],
});