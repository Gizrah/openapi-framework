import { ChangeDetectorRef, Injectable, Pipe, PipeTransform } from '@angular/core'
import { OpenApi } from '@quebble/openapi'
import { hasValue, isNaB } from '@quebble/scripts'

import { TranslinkPipe } from '../../services/translation/pipe/translink.pipe'
import { TransLinkService } from '../../services/translation/service/translink.service'

@Injectable()
@Pipe({
	name: 'valuemap',
})
export class ValuemapPipe extends TranslinkPipe implements PipeTransform {
	private _tl: TransLinkService
	private _cd: ChangeDetectorRef

	constructor(translate: TransLinkService, cdRef: ChangeDetectorRef) {
		super(translate, cdRef)
		this._tl = translate
		this._cd = cdRef
	}

	public transform(value: string, ...args: unknown[]): unknown {
		if (!value) return super.transform(value, ...args)
		if (!isNaB(value)) return super.transform(`generic.${String(value)}`)

		if (hasValue(args[0]) && args.length) {
			const obj = args[0] as object // eslint-disable-line
			if (typeof obj !== 'object') return super.transform(value, ...args)

			if (obj['schema'] && obj['property']) {
				const schema = obj['schema'] as OpenApi.SchemaObject
				const prop = obj['property'] as string
				if (schema.enum) {
					return super.transform(`enum.${prop}.${value}`, ...args)
				} else {
					return super.transform(value, ...args)
				}
			} else {
				return super.transform(value, ...args)
			}
		}

		return super.transform(value, ...args)
	}
}
