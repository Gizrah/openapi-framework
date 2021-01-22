import { Inject, Injectable } from '@angular/core'
import {
	DEFAULT_LANGUAGE,
	MissingTranslationHandler,
	TranslateCompiler,
	TranslateLoader,
	TranslateParser,
	TranslateService,
	TranslateStore,
	USE_DEFAULT_LANG,
	USE_EXTEND,
	USE_STORE,
} from '@ngx-translate/core'
import { INgqSemantics } from 'app/common/formly/classes/formly.extend'
import { cloneDeep as clone } from 'lodash-es'
import { filter, first } from 'rxjs/operators'

import { TranslationType, TranslationTypes } from '../models/translation-type.enum'

@Injectable({
	providedIn: 'root',
})
export class TransLinkService extends TranslateService {
	private _prefix = new RegExp(/^#\//g)
	private _origin: any = {}
	private _linked: any = {}
	private _semantics: { [key: string]: Map<string, any> } = {}

	constructor(
		public store: TranslateStore,
		public currentLoader: TranslateLoader,
		public compiler: TranslateCompiler,
		public parser: TranslateParser,
		public missingTranslationHandler: MissingTranslationHandler,
		@Inject(USE_DEFAULT_LANG) useDefaultLang: boolean = true,
		@Inject(USE_STORE) isolate: boolean = false,
		@Inject(USE_EXTEND) extend: boolean = false,
		@Inject(DEFAULT_LANGUAGE) defaultLanguage: string,
	) {
		super(
			store,
			currentLoader,
			compiler,
			parser,
			missingTranslationHandler,
			useDefaultLang,
			isolate,
			extend,
			defaultLanguage,
		)

		this.onDefaultLangChange
			.pipe(
				filter((event) => !!event && !!event.translations),
				first(),
			)
			.subscribe(() => {
				this.init()
			})
	}

	get semantic() {
		return {
			get: (key: string, lang = this.currentLang) => {
				return this._semantics[lang].get(key)
			},
			set: (key: string, value: INgqSemantics, lang = this.currentLang) => {
				const map = this._semantics[lang]
				map.set(key, value)
			},
			delete: (key: string, lang = this.currentLang) => {
				const map = this._semantics[lang]
				map.delete(key)
			},
		}
	}

	get linked() {
		return {
			key: (key: string, origin?: boolean, lang = this.currentLang): string => {
				return this.extractLink(key) as string
			},
		}
	}

	private init(): void {
		if (!this._origin[this.currentLang]) {
			this._origin[this.currentLang] = clone(this.translations[this.currentLang])
			this._linked[this.currentLang] = clone(this.translations[this.currentLang])
		}
		this.update(
			this._linked[this.currentLang],
			this.translations[this.currentLang],
			this.currentLang,
		)
	}

	public origin(type: string): any {
		return clone(this._origin[this.currentLang][type])
	}

	public updateType(type: TranslationType, data: any, lang = this.currentLang): void {
		const typename = TranslationTypes[type]
		if (!typename) return
		if (!this._linked[this.currentLang]) {
			this._linked[this.currentLang] = this.recurse(
				this._linked[this.currentLang],
				this.translations[this.currentLang],
			)
		}

		const updater = { [typename]: data }
		this.update(updater, this._linked[lang], lang)
	}

	private update(translations: any, origin: any, lang: string): void {
		if (translations) {
			const parsed = this.recurse(clone(translations), clone(origin))
			this._linked[lang] = parsed
			this.setTranslation(lang, parsed)

			if (parsed.semantic) {
				this._semantics[lang] = new Map()
				this.objectKeyPath(parsed.semantic, 'semantic', lang)
			}
		}
	}

	private recurse(tl: any, origin: any): any {
		if (!tl) return tl

		for (const key in tl) {
			const prop = tl[key]
			if (this.isLink(prop)) {
				const ref = this.extractLink(prop) as string
				const arr = ref.split('.')
				let inobj: any = origin[arr[0]]

				arr.forEach((item, index) => {
					if (index > 0) {
						if (inobj[item]) inobj = inobj[item]
					}
				})

				if (typeof inobj === 'object' && inobj !== null) {
					tl[key] = this.recurse(inobj, origin)
				} else tl[key] = inobj
			} else if (typeof prop === 'object' && prop !== null) {
				if (!Array.isArray(prop)) {
					tl[key] = this.recurse(tl[key], origin)
				}
			}
		}

		return tl
	}

	private objectKeyPath(obj: any, keypath: string, lang: string): void {
		if (obj.plural || obj.singular) {
			this._semantics[lang].set(keypath, obj)
		} else if (typeof obj === 'object') {
			for (const key in obj) {
				const newkey = keypath + '.' + key
				this.objectKeyPath(obj[key], newkey, lang)
			}
		}
	}

	private extractLink(key: string | string[]): string | string[] {
		const link = (value: string): string => {
			if (!value) return value
			if (typeof value === 'object') return value
			const matched = value.match(this._prefix)
			if (!matched) return value
			const noprefix = value.replace(matched[0], '')
			const replaced = noprefix.replace(/\//gi, '.')
			return replaced
		}

		return Array.isArray(key) ? key.map((item) => link(item)) : link(key)
	}

	private isLink(value: string): boolean {
		return typeof value !== 'string' ? false : !!value.match(this._prefix)
	}
}
