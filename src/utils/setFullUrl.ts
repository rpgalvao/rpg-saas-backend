export const setFullURL = (path: string) => {
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
        return path;
    }

    const cleanedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanedPath = path.startsWith('/') ? path : `/${path}`;

    return `${cleanedBase}${cleanedPath}`;
};