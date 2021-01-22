declare interface Guid extends String {}

declare interface Array<T> {
	sortBy(func: (item: string | Record<string, unknown>) => T[]): T[]
}
