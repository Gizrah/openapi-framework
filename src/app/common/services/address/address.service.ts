import { Injectable } from '@angular/core'
import { environment } from '@quebble/environment'
import { OpenApi } from '@quebble/openapi'
import { asArray, hasValue } from '@quebble/scripts'
import { EMPTY, Observable, of } from 'rxjs'
import { map } from 'rxjs/operators'

import { OpenApiService } from '../openapi/service/openapi.service'
import { TransLinkService } from '../translation/service/translink.service'
import { WebService } from '../web/web.service'

interface IAddress {
	zipcode: string
	number: number
	letter?: string
	addition?: any
}

export interface ICountry {
	id: number
	name: string
	alpha2: string
	alpha3: string
}

export interface IBAG {
	street: string
	number: number
	letter: string
	addition: string
	zipcode: string
	city: string
	municipality: string
	province: string
	rdX: number
	rdY: number
	latitude: number
	longitude: number

	postal_code?: string
	street_number?: any
	street_number_additional?: any
}

export interface AddressObject {
	street: any
	street_number: any
	street_number_additional?: any
	postal_code: string
	city: string
	province: string
}

@Injectable()
export class AddressService {
	private _last: IAddress = {
		zipcode: null,
		number: null,
		letter: null,
		addition: null,
	}

	private _response: AddressObject[] = []

	private _post: OpenApi.SchemaObject
	private _body: OpenApi.SchemaObject
	private _countries: Record<string, ICountry[]> = {}

	constructor(
		private openapi: OpenApiService,
		private web: WebService,
		private translate: TransLinkService,
	) {
		const schemas = this.openapi.getSchemas('Postcode')
		schemas.forEach((schema) => {
			const props = schema.properties
			if ('zipcode' in props && 'pattern' in props['zipcode']) {
				this._post = schema
			} else {
				if (Array.isArray(schema.required) && schema.required.length > 7)
					this._body = schema
			}
		})
	}

	/**
	 * @summary
	 * Check if the supplied values match the stored values ad verbatim and
	 * return a boolean representing this. Update the last known values to the
	 * new ones if the request was different
	 *
	 * @param zip zipcode
	 * @param num number
	 * @param ltr letter
	 * @param add additional
	 *
	 * @returns boolean
	 */
	private last(zip, num, ltr, add): boolean {
		const { zipcode, number, letter, addition } = this._last
		if (zip === zipcode && num === number && ltr === letter && add === addition) return true
		else {
			this._last = { zipcode: zip, number: num, letter: ltr, addition: add }
			return false
		}
	}

	/**
	 * @summary
	 * Get a list of AddressObjects based on the supplied parameters.
	 *
	 * @param zipcode postal code
	 * @param number house number
	 * @param letter house letter
	 * @param addition addition to house number
	 *
	 * @returns Observable<AddressObject[]>
	 */
	public get(zipcode?, number?, letter?, addition?): Observable<AddressObject[]> {
		if (!hasValue(zipcode) || !hasValue(number)) return EMPTY
		letter = hasValue(letter) ? letter : null
		addition = hasValue(addition) ? addition : null

		const convert = (
			value: IBAG | AddressObject | IBAG[] | AddressObject[],
		): AddressObject[] => {
			const items: (IBAG | AddressObject)[] = asArray(value)

			return items.map((value: IBAG | AddressObject) => {
				if ('postal_code' in value || 'street_number' in value)
					return value as AddressObject
				const { street, number, addition, city, zipcode, province } = value as IBAG

				return {
					street,
					street_number: number,
					street_number_additional: addition,
					city,
					postal_code: zipcode,
					province,
				}
			})
		}

		if (this.last(zipcode, number, letter, addition)) return of(convert(this._response))

		const payload: IAddress = {
			zipcode,
			number,
			letter,
			addition,
		}

		const local = !environment.test && !environment.production
		// const url = local ? ['..', 'zipcode'] : ['zipcode', '1.0', 'nl']
		const url = ['..', 'zipcode']
		const call = this.web.post(url, payload) as Observable<IBAG[]>

		this._last = payload

		return call.pipe(
			map((value) => {
				const parsed = convert(value)
				this._response = parsed

				return parsed
			}),
		)
	}

	/**
	 * @summary
	 * Async/await promise-based request to fetch the countries.json file and
	 * return a filtered list of countries based on the supplied search string.
	 *
	 * Uses the language as set in the TranslationService
	 *
	 * @param search country name to search for
	 *
	 * @todo
	 * Multi-lang.
	 */
	public async country(search: string): Promise<ICountry[]> {
		let cc = this.translate.currentLang
		if (!cc || cc !== 'nl') cc = 'nl'

		const searchFor = (list: ICountry[]) => {
			const items = asArray(list)
			const str = String(search).toLocaleUpperCase()

			return items.filter((item) => {
				const name = String(item.name).toLocaleUpperCase()
				return name.includes(str)
			})
		}

		if (!hasValue(this._countries[cc])) {
			const call = await (this.web.get<ICountry[]>([
				'http',
				`/assets/countries/${cc}/countries.json`,
			]) as Observable<ICountry[]>).toPromise()

			this._countries[cc] = asArray(call)
		}
		return Promise.resolve(searchFor(this._countries[cc]))
	}
}
