import { Injectable } from '@angular/core'
import { NgqFieldConfig } from '@quebble/formly'
import { hasValue } from '@quebble/scripts'

import { TranslationTypes } from '../../../common/services/translation/models/translation-type.enum'
import { TransLinkService } from '../../../common/services/translation/service/translink.service'
import { Translation, TranslationArrayItem } from '../models/translation.model'

@Injectable()
export class TransnamicService {
	constructor(private translate: TransLinkService) {}

	public formFields(): NgqFieldConfig[] {
		return [
			{
				key: 'translationArray',
				type: 'repeat-toggle',
				templateOptions: {
					inputVisible: true,
				},
				modelOptions: {
					updateOn: 'blur',
				},
				fieldArray: {
					type: 'translation',
					wrappers: ['translation-row'],
					fieldGroup: [
						{
							className: 'translation-row',
							type: 'input',
							key: 'value',
							wrappers: ['label-top', 'form-field'],
							templateOptions: {
								type: 'text',
							},
							expressionProperties: {
								'templateOptions.label': (model: TranslationArrayItem) =>
									model.keypath,
							},
						},
						{
							type: 'input',
							key: 'semantic.singular',
							wrappers: ['label-top', 'form-field'],
							templateOptions: {
								required: true,
								type: 'text',
							},
							expressionProperties: {
								'templateOptions.label': (model: TranslationArrayItem) =>
									model.semantickey + '.singular',
							},
						},
						{
							type: 'input',
							key: 'semantic.plural',
							wrappers: ['label-top', 'form-field'],
							templateOptions: {
								required: true,
								type: 'text',
							},
							expressionProperties: {
								'templateOptions.label': (model: TranslationArrayItem) =>
									model.semantickey + '.plural',
							},
						},
					],
				},
			},
		]
	}

	private createNullValues(a: any): any {
		const b: any = {}

		for (const key in a) {
			if (key === 'operationId') continue
			const isobj = typeof a[key] === 'object'
			const isarr = Array.isArray(a[key])
			if (!isobj && !isarr) b[key] = null
			else if (isarr) {
				b[key] = a[key].map(() => null)
			} else if (isobj) {
				b[key] = this.createNullValues(a[key])
			}
		}

		return b
	}

	private matchProperties(a: any, b: any): any {
		for (const key in a) {
			const isobj = typeof a[key] === 'object'
			const isarr = Array.isArray(a[key])

			if (!(key in b)) {
				if (!isobj && !isarr) b[key] = null
				else if (isarr) {
					b[key] = a[key].map(() => null)
				} else if (isobj) {
					b[key] = this.createNullValues(a[key])
				}
			} else {
				if (isobj && !isarr) b[key] = this.matchProperties(a[key], b[key])
				else if (isarr) {
					b[key] = a[key].map((item) => (b[key].includes(item) ? item : null))
				}
			}
		}

		return b
	}

	public translationTypeCompare(object: Translation): Translation {
		const types = TranslationTypes
		const key = types[object.type]
		if (!key) return object
		const stored = this.translate.instant(key)
		object.origin = stored

		if (typeof stored === 'string') return object

		if (object.translation[key])
			object.translation[key] = this.matchProperties(stored, object.translation[key])
		else {
			object.translation[key] = this.createNullValues(stored)
		}

		return object
	}

	private removeNullValues(a: any): any {
		const b: any = {}

		for (const key in a) {
			const isobj = typeof a[key] === 'object'
			const isarr = Array.isArray(a[key])
			if (hasValue(a[key])) {
				if (!isobj && !isarr) b[key] = a[key]
				else if (isarr) {
					b[key] = a[key].map((item) => (hasValue(item) ? item : null))
				} else if (isobj) {
					const cleaned = this.removeNullValues(a[key])
					if (hasValue(cleaned)) b[key] = cleaned
				}
			}
		}

		if (Object.entries(b).length > 0) {
			return b
		}
		return
	}

	public cleanTranslation(object: any): any {
		const obj = this.removeNullValues(object)

		return obj ?? {}
	}
}
