import { hasValue } from './hasvalue'
import { isPrimitive } from './isprimitive'

export const noNull = (a: any): any => {
	if (Array.isArray(a)) {
		const mapped = a.map((v) => noNull(v)).filter((v) => !!v)
		return mapped.length ? mapped : undefined
	}
	if (isPrimitive(a)) return a
	if (typeof a === 'function') return

	const b: any = {}

	for (const key in a) {
		const isobj = typeof a[key] === 'object'
		const isarr = Array.isArray(a[key])
		if (hasValue(a[key])) {
			if (!isobj && !isarr) b[key] = a[key]
			else if (isarr) {
				b[key] = a[key].map((item) => (hasValue(item) ? item : null))
			} else if (isobj) {
				const cleaned = noNull(a[key])
				if (hasValue(cleaned)) b[key] = cleaned
			}
		}
	}

	if (Object.entries(b).length > 0) {
		return b
	}
	return
}

export const toNull = (a: any): any => {
	if (Array.isArray(a)) {
		const mapped = a.map((v) => toNull(v)).filter((v) => !!v)
		return mapped.length ? mapped : undefined
	}
	if (isPrimitive(a)) return null
	if (!hasValue(a)) return null
	if (typeof a === 'function') return

	const b: any = {}

	for (const key in a) {
		const isobj = typeof a[key] === 'object'
		const isarr = Array.isArray(a[key])

		if (!isobj && !isarr) b[key] = null
		else if (isarr) {
			b[key] = []
		} else if (isobj) {
			const cleaned = toNull(a[key])
			b[key] = cleaned
		}
	}

	if (Object.entries(b).length > 0) {
		return b
	}

	return null
}
