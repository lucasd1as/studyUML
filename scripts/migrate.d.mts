/** Applies pending migrations from `folder`; returns the tags it applied. */
export function migrate(databaseUrl: string, folder?: string): Promise<string[]>;
