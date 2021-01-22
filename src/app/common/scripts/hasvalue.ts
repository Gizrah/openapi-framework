export const hasValue = (val: any, ignoreArray?: boolean): boolean => {
	if (typeof val === 'string' || (!ignoreArray && Array.isArray(val))) return val.length > 0
	return val !== undefined && val !== null && val !== ''
}
