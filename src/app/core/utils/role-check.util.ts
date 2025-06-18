export function hasRole(user: { role: string }, required: string | string[]): boolean {
    if (Array.isArray(required)) return required.includes(user.role);
    return user.role === required;
}
