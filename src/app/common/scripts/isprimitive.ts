export const isPrimitive = (key: any): boolean => {
	const primitive =
		typeof key === 'string' ||
		typeof key === 'number' ||
		typeof key === 'bigint' ||
		typeof key === 'boolean' ||
		typeof key === 'undefined' ||
		typeof key === 'symbol'

	if (primitive) return true

	const notof = typeof key !== 'object' && typeof key !== 'function' && !Array.isArray(key)

	if (notof) return true

	return false
}
