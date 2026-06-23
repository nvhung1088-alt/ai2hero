export function slugify(text: string) {
    if (!text) return '';
    return text.toString().toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/([^a-z0-9\s]+)/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

export function generateFilmUrl(slug: string, ep: number | string = 1) {
    if (!slug) slug = 'film';
    return `/film/${slug}-tap-${ep}`;
}

export function parseFilmUrl(slugPath: string) {
    const match = slugPath.match(/(.*)-tap-(\d+)$/);
    if (match) {
        return {
            slug: match[1],
            ep: parseInt(match[2], 10) || 1
        };
    }
    return {
        slug: slugPath,
        ep: 1
    };
}
