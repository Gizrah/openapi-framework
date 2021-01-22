import { NgqFieldConfig } from '@quebble/formly'
import { TranslationType } from '@quebble/models'

interface ITranslationArrayItem {
	key?: string
	path?: string
	value?: string
	originValue?: string
	showInput?: boolean
	overWritten?: boolean
	overwriteTranslation?: boolean
	type?: 'input' | 'object' | 'enum'
	tltype?: string
}

export class TranslationArrayItem {
	public key: string = null
	public path: string = null
	public originValue: string = null
	public semantic: TranslationPlurality
	public _value: string = null

	public originSemantic: TranslationPlurality

	public showInput = false
	public overWritten = false
	public overwriteTranslation = false
	public type: 'input' | 'object' | 'enum' = 'input'

	public tltype: string = null

	constructor(input?: ITranslationArrayItem) {
		if (!input) return
		for (const key in input) {
			switch (key) {
				case 'showInput':
				case 'overWritten':
					if (!input[key]) this[key] = false
					break
				case 'originValue':
					if (!input[key]) this[key] = ''
					break
				default:
					if (key in this) {
						this[key] = input[key]
					}
					break
			}
		}
	}

	get value(): string {
		return this._value ?? this.originValue
	}

	set value(value: string) {
		this._value = value
	}

	get hasLinked(): boolean {
		return String(this.originValue).startsWith('#') && !this.semantics
	}

	get semantics(): boolean {
		const str = String(this.value)
		return str.startsWith('#/semantic/') && /(plural|singular)$/gi.test(str) === false
	}

	get keypath(): string {
		const arr = [this.tltype]
		if (this.path) arr.push(this.path)
		arr.push(this.key)

		return arr.join('.')
	}

	get semantickey(): string {
		const kp = this.keypath.split('.').join('/')
		return `#/semantic/${kp}`
	}
}

export class TranslationPlurality {
	public singular?: string = ''
	public plural?: string = ''

	constructor(input?: TranslationPlurality) {
		this.singular = input.singular
		this.plural = input.plural
	}
}

export class Translation {
	public type: TranslationType = TranslationType.None
	public translation: any = {}
	public translationArray: TranslationArrayItem[] = []
	public formFields: NgqFieldConfig[] = []
	public key: string = null
	public origin: any = {}
	public semantics: any = {}

	constructor(input?) {
		if (!input) return
		this.type = input.type
		this.translation = input.translation
		this.translationArray = input.translationArray
		this.formFields = input.formFields
		this.semantics = input.semantics
	}
}
