export const PER_PAGE = 5;

export function totalPages(size: number) {
    return Math.ceil(size / PER_PAGE);
}

export function paginateMeta(rawPage: number | string = 1) {
    const page = typeof rawPage === 'string' ? parseInt(rawPage) : rawPage;
    const start = (page - 1) * PER_PAGE;

    return {
        page,
        start,
    }
}
