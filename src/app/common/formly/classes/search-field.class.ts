import { Directive } from '@angular/core'
import { OpenApi } from '@quebble/openapi'
import { asArray, hasValue } from '@quebble/scripts'
import { TransLinkService } from '@quebble/services'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

import { NgqFieldType } from './formly.extend'

@Directive()
export abstract class SearchFieldClass extends NgqFieldType {
	public datastream$: Observable<any[]>
	public message$: Observable<string>
	public operation: OpenApi.Operation

	protected _param: OpenApi.ParameterObject
	protected _schema: OpenApi.SchemaObject
	protected _pattern: RegExp
	protected _wildcard: boolean
	protected _data: any[]

	constructor(protected openapi: OpenApi.OpenApiService, protected translate: TransLinkService) {
		super()
	}

	get data(): any[] {
		return this._data
	}

	public ngOnInit(nostore?: boolean): void {
		super.ngOnInit(nostore)

		this.setSearchOperation()
		if (!this.operation) this.setCustomData()
	}

	public ngAfterContentInit(): void {
		super.ngAfterContentInit()
	}

	/**
	 * Use ngqOptions to find an operationId and get the OperationModel. Find
	 * the right Parameter Objects in the model and set the local privates.
	 */
	private setSearchOperation(): void {
		const { operationId } = this.ngq
		if (!operationId) return

		const operation = this.openapi.getOperation(operationId)
		if (operation) {
			const param = operation.params.find((p) => p.name === 'search')
			const { schema } = param

			this._param = param
			this._schema = schema
			this.operation = operation

			if (schema) {
				// If a regex pattern is found, set it
				const { pattern } = schema as OpenApi.SchemaObject
				this.setRegExp(pattern as any)
			}

			// If an operation is found, set the local search message
			this.setSearchMessage()
		}
	}

	private setCustomData(): void {
		const { data } = this.ngq
		if (!data) return

		this.datastream$ = data
	}

	/**
	 * If the Schema Object from the Parameter Object has a pattern property,
	 * set the local variable with a new RegExp with that pattern.
	 *
	 * @param pattern regex pattern from Schema Object
	 */
	private setRegExp(pattern: string): void {
		if (!hasValue(pattern) || Array.isArray(pattern)) {
			this._pattern = undefined
			return
		}

		this._pattern = new RegExp(pattern)
	}

	/**
	 * Parse the added options in the Parameter Object to find which properties
	 * can be searched for and get the correct translations for each property.
	 * Combine those to create a message that is shown above the input field.
	 */
	private setSearchMessage(): void {
		if (!this._schema) return
		// Get the custom fields
		const fields = this.openapi.getCustomParamField(this._schema)
		if (!fields) return

		// If there's a wildcard involved in the search, set the local var
		this._wildcard = fields.wildcard ?? false

		// Determine the prefix based on (absence of) the schema in fields
		const prefix = fields.schema ? `schema.${fields.schema}.` : 'common.'
		// Map the properties in the field to create an array of translation
		// strings
		const props = asArray(fields.properties).map((prop) => prefix + prop)

		// Set the default message translation string
		const messagetl: string =
			'response.default.search.' + (this._wildcard ? 'wildcard' : 'properties')
		// Get the generic.or translation
		const genericortl = this.translate.instant('generic.or')
		// Get the operationId's translation
		const operationtl = this.translate.instant(`operation.operationId.${this.operation.id}`)
		// Map and filter the translation strings for each property to the
		// translated value and check for non-translated items
		const propstl = props
			.map((tlstring, index) => {
				const tl = this.translate.instant(tlstring)
				if (tl !== tlstring) return tl
				return null
			})
			.filter((a) => !!a)

		// If no prop translations are left, just return
		if (!propstl.length) {
			this.message$ = undefined
			return
		}

		// Set the first property as the initial value
		let properties = propstl[0]
		// Loop through all other values and join the properties string with
		// `, tl` or, if it's the last item, with `or tl`.
		propstl.forEach((tl, index) => {
			if (index > 0) {
				const l = propstl.length - 1
				if (index === l) properties += ` ${genericortl} ${tl}`
				else if (index < l) properties += `, ${tl}`
			}
		})

		// Set the message string as an observable
		// TODO: Make all observables? Or none?
		this.message$ = this.translate.get(messagetl, { operationId: operationtl, properties })
	}

	/**
	 * Get the data for the given search value, or return the data from the
	 * available datastream in the ngqOptions
	 *
	 * @param input value to search for
	 *
	 * @returns Observable web call
	 */
	protected getData<T>(input: string): Observable<T[]> {
		let observable: Observable<T[] | any[]>
		if (!this.operation) {
			// If no operation is set use the datastream as observable return
			observable = this.ngq.data
		} else {
			// Apply wildcard
			const value = this._wildcard ? `${input}*` : input
			// Create the query
			const query = input ? { [this._param?.name]: value } : null
			// Get the current view's route
			const route = this.openapi.chunkroute

			observable = this.openapi.operationActionByModel(this.operation, null, route, query)
		}

		// Make sure to prevent errors if no data is set
		// TODO: silent error, should be giving feedback
		if (!observable) return

		// Return the web call
		return observable.pipe(
			map((results) => {
				// Set the local data list, to find the selected item later
				this._data = results
				// Return the mapped items
				return results
			}),
		)
	}
}
