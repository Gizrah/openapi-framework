import { Injectable, Input } from '@angular/core'
import { JsonApi, OpenApi } from '@quebble/openapi'
import { hasValue } from '@quebble/scripts'

import { List } from '../models/list.class'
import { IPropDef } from '../services/openapi/barrel'

/**
 * Options for which operations and properties to choose when parsing a Chunk
 *
 * * `noDelete`: hide delete operation (trash can) on the current selected item
 * * `noPost`: hide post operation (+) on the current selected item
 * * `useGetOp`: sets the operation to the chunk operation and getop to the get
 * 		operation in any of the operations or childops in the chunk
 * * `propsSkipDates`: hide `date_created` and `date_updated` from view
 * * `propsFlatList`: don't fragment nested objects into their own cards
 * * `propsIgnoreKeys`: array of keys to (also) hide from view
 */
export interface SetupChunkOptions {
	noDelete?: boolean
	noPost?: boolean
	useGetOp?: boolean
	noProps?: boolean
	propsSkipDates?: boolean
	propsFlatList?: boolean
	propsIgnoreKeys?: any[]
}

@Injectable()
export class DefaultComponentClass {
	@Input() set array(items: any | any[]) {
		this._array = items
		this.avatar = this.avatar ?? this.openapi.getImageProperty(this.getop, items)

		this.setupArray(items)
	}
	get array() {
		if (!hasValue(this._array)) return this._array
		return 'data' in this._array ? this._array.data : this._array
	}

	@Input() set object(item: any) {
		this._object = item
		this.setupObject(item)
	}
	get object() {
		if (this._object?.data) {
			const { data } = this._object
			const { attributes } = data
			return attributes
		}
		return this._object
	}

	@Input() set header(item: any) {
		this._header = item
		this.setupHeader(item)
	}
	get header() {
		if (this._header?.data) {
			const { data } = this._header
			const { attributes } = data
			return attributes
		}
		return this._header
	}

	@Input() set chunk(chunk: OpenApi.Chunk) {
		this._chunk = chunk
		this.setupChunk(chunk)
	}
	get chunk() {
		return this._chunk
	}

	/**
	 * Current view's main operation. Used to determine links, content, allowed
	 * actions, required fields, et cetera.
	 */
	public operation: OpenApi.Operation
	/**
	 * If the view's main operation does not determine the content of the view
	 * at that moment, the getop will differ. This is then used to supply the
	 * underlying components with the right association for links, content and
	 * actions.
	 *
	 * E.g. the SidebarCards view has a main view that is an array, but when the
	 * header is set and nothing is selected, the header is selected instead.
	 * This is not part of the main view's operation (an array for the content
	 * of the list) and instead uses the header's operation to supply the right
	 * content.
	 */
	public getop: OpenApi.Operation
	/**
	 * All operations that are allowed for this view, that are not the current
	 * operation. Determines whether or not certain UI elements are displayed,
	 * for actions like edit, delete and add.
	 */
	public operations: OpenApi.Operation[]
	/**
	 * Object definitions, split by nested object. Used to supply child
	 * components with information on how to and what to display. These are (re)
	 * set each time the view component is loaded, since not all data has been
	 * set. Definitions that have no content in the data are not shown.
	 */
	public objectDefs: OpenApi.ObjectDef[] = []

	/**
	 * Avatar/image property name, used by some nested components
	 */
	public avatar: string

	/**
	 * Locally stored content
	 */
	protected _array: any[] | JsonApi.Data
	protected _object: any | JsonApi.Data
	protected _header: any | JsonApi.Data
	protected _chunk: OpenApi.Chunk

	constructor(protected openapi: OpenApi.OpenApiService) {}

	/**
	 * If the current object is a JSONApi object with data and attributes, the
	 * ID isn't inside the attributes and instead one layer up.
	 *
	 * @returns id value
	 */
	get objectId(): any {
		if (this._object?.data) return this._object.data.id
		if (this._object?.id) return this._object.id
	}

	/**
	 * If the current header is a JSONApi object with data and attributes, the
	 * ID isn't inside the attributes and instead one layer up.
	 *
	 * @returns id value
	 */
	get headerId(): any {
		if (this._header?.data) return this._header.data.id
		if (this._header?.id) return this._header.id
	}

	/**
	 * @summary
	 * Methods that can be accessed from the inherited classes, which are called
	 * by the related input setters/getters. Used for manipulating data for
	 * specific view needs.
	 */
	protected setupArray(items: any | any[]): void {}
	protected setupObject(item: any): void {}
	protected setupHeader(item: any): void {}

	/**
	 * @summary
	 * Uses the current view's Chunk to set the operations partaining to the
	 * necessary actions and options in the view. Checks for the different type
	 * of (view) Chunks -- header, object and array -- and determines from
	 * there what to set as the operation and get-operation (getop).
	 *
	 * @param chunk Current chunk
	 * @param options Additional view-specific options
	 */
	protected setupChunk(chunk: OpenApi.Chunk, options?: SetupChunkOptions): void {
		if (!chunk) return

		const header: OpenApi.Chunk = chunk.viewchunks.get('header')
		const object: OpenApi.Chunk = chunk.viewchunks.get('object')
		const array: OpenApi.Chunk = chunk.viewchunks.get('array')
		const fromarray = array ?? header?.viewchunks.get('array')
		const arrayops = [...(fromarray?.linkops ?? []), ...(fromarray?.operations ?? [])]

		let operation: OpenApi.Operation
		let getop: OpenApi.Operation
		let operations: OpenApi.Operation[] = []

		if (object) {
			operation = object.operation
			operations = options?.noDelete
				? object.operations.filter((item) => item.type !== 'delete')
				: object.operations
		} else if (header) {
			operation = arrayops.find((op) => op.type === 'get')
			getop = header.operation
			operations = header.operations.filter((op) => op.type !== 'get' && op.type !== 'post')
			if (!options?.noPost) {
				const poster = arrayops.find((op) => op.type === 'post')
				if (poster) operations.push(poster)
			}
		} else {
			operation = arrayops.find((op) => op.type === 'get')
			operations = arrayops.filter((op) => op.type !== 'get')
		}

		if (options?.useGetOp) {
			operation = chunk.operation
			getop = arrayops.find((op) => op.type === 'get')
		}

		this.getop = getop ?? operation
		this.operation = operation
		this.operations = operations
		this.avatar = this.avatar ?? this.openapi.getImageProperty(this.getop)

		this.setupObjectDefinitions(this.object ?? this.header, options)
	}

	/**
	 * @summary
	 * Fill the objectDefs list of the component with ObjectDefs for the given
	 * item. Optionally takes a SetupChunkOptions object containing the keys to
	 * ignore and hide, from the propIgnoreKeys array.
	 *
	 * @param item object of type 'any'
	 * @param options Optional SetupChunkOptions object
	 *
	 * @todo
	 * Implement error handling.
	 */
	protected async setupObjectDefinitions(item: any, options?: SetupChunkOptions): Promise<void> {
		if (!this.getop || !item) return Promise.resolve() // TODO: log when getop is undefined

		const hide = new List<string>(options?.propsIgnoreKeys ?? [])
		if (options?.propsSkipDates) {
			hide.add('date_created')
			hide.add('date_updated')
		}

		/**
		 * Filter function used for filtering a list of PropDef objects. Used
		 * when creating the main ObjectDef, and when creating objectDefs for
		 * nested objects in the createObjectDef function. Putting filtering
		 * conditions in this funciton keeps the code DRY.
		 *
		 * @param propDef IPropDef object that will be checked.
		 * @param propValue value of the property in the item
		 * @param hide current list of properties to hide
		 *
		 * @returns boolean
		 */
		const filterPropDef = (propDef: IPropDef, propValue: any, hide: List<string>): boolean => {
			if (options?.propsFlatList && (propDef.type === 'array' || propDef.type === 'object'))
				return false
			if (hide.has(propDef.prop)) return false
			if (!hasValue(propValue)) return false
			return true
		}

		/**
		 * hideDuplicateProps is used to create a list of props that should be
		 * hidden because they contain the subject property of the schema. This
		 * hide list is used to prevent the subject from being displayed
		 * multiple times in ngq-object.
		 *
		 * The switch block contains cases for all the props that cause the
		 * schema subject to be shown in the template of ngq-object.
		 *
		 * @param objectDef ObjectDef with subject to use
		 * @param propDefs IPropDef array used to check the ObjectDef subject
		 * @param hide current list of properties to hide
		 *
		 * @returns List<string> with keys to hide
		 */
		const hideDuplicateProps = (
			objectDef: OpenApi.ObjectDef,
			propDefs: IPropDef[],
			hide: List<string>,
		): List<string> => {
			const hideExtended = new List<string>(hide)
			const { subject, title } = objectDef ?? {}
			if (hasValue(subject) && title === subject) hideExtended.add(subject)
			propDefs.forEach((propDef) => {
				const { prop } = propDef
				switch (prop) {
					case 'avatar':
						hideExtended.add(subject)
						break
					default:
						break
				}
			})
			return hideExtended
		}

		const getopPropDefs = this.openapi.getPropDefsForSchema(this.getop.schema)

		const objectDefs: OpenApi.ObjectDef[] = [
			{
				key: null,
				title: this.getop.subject,
				refs: null,
				data: item,
				subject: this.getop.subject,
				info: this.getop.info,
			},
		]
		const mainObjectHide = hideDuplicateProps(objectDefs[0], getopPropDefs, hide)
		objectDefs[0].refs = getopPropDefs.filter((propDef) =>
			filterPropDef(propDef, item[propDef.prop], mainObjectHide),
		)

		/**
		 * Recursively build an ObjectDef list for a given item and its propDefs
		 * by iterating through the given propDef list. For each nested propDef
		 * an ObjectDef is created and added to the objectDefs list, but only if
		 * that propDef references a valid schema.
		 *
		 * @param item of type any containing the data
		 * @param propDefs IPropDef array from the Operation's current Schema
		 * @param keyPrefix (dot seperated) key string from all previous object
		 * keys of earlier nested objects
		 */
		const createObjectDef = (item: any, propDefs: IPropDef[], keyPrefix?: string) => {
			if (!hasValue(item)) return
			propDefs
				.filter((propDef) => propDef.type !== 'keyvalue' && propDef.type !== 'address')
				.forEach((propDef) => {
					if (propDef.ref && propDef.schema && !hide.has(propDef.prop)) {
						const schemaRef = this.openapi.getSchemaRefForSchema(propDef.schema)
						if (!schemaRef) return
						const key = keyPrefix ? `${keyPrefix}.${propDef.prop}` : propDef.prop
						const objectDef: OpenApi.ObjectDef = {
							key,
							title: propDef.tlstring
								? `schema.${propDef.tlstring}.${propDef.prop}`
								: propDef?.subject,
							refs: null,
							data: item[propDef.prop],
							subject: propDef?.subject,
							info: propDef?.info,
						}

						const hideExtended = hideDuplicateProps(objectDef, schemaRef.propDefs, hide)
						objectDef.refs = schemaRef.propDefs.filter((def) =>
							filterPropDef(def, item[propDef.prop], hideExtended),
						)

						if (objectDef.refs.length === 0) return
						objectDefs.push(objectDef)
						createObjectDef(item[propDef.prop], schemaRef.propDefs, key)
					}
				})
		}

		if (!options?.propsFlatList) createObjectDef(item, getopPropDefs)

		this.objectDefs = objectDefs
		return Promise.resolve()
	}
}
