export type KeyType = 'key' | 'row' | 'object' | 'value' | 'description'
export interface DisplayItem {
	type: KeyType
	label: string
	value: any
}
