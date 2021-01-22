export enum TranslationType {
	None,
	Generic,
	Common,
	Enum,
	Schema,
	Operation,
	Response,
}

export const TranslationTypes = Object.keys(TranslationType)
	.filter((item) => isNaN(parseInt(item)))
	.map((item) => item.toLowerCase())
