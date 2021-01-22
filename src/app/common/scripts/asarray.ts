import { hasValue } from './hasvalue'

export const asArray = (item) => {
	return hasValue(item) ? (Array.isArray(item) ? item : [item]) : []
}
