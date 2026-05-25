import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
                'resources/js/mission-create.js',
                'resources/js/mission-dashboard.js',
                'resources/js/auth-guard.js',
                'resources/js/organization-dashboard.js',
                'resources/js/organization-logout.js',
                'resources/js/organization-profile.js',
                'resources/js/admin-dashboard.js',
                'resources/js/admin-config.js',
                'resources/js/admin-hotlines.js',
                'resources/js/volunteer.js',
                'resources/js/volunteer-details.js',
            ],
            refresh: true,
        }),
        tailwindcss(),
    ],
});
