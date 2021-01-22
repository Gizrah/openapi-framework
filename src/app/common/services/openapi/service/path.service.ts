import { Injectable } from '@angular/core'
import { ExMap, List } from '@quebble/models'
import { asArray, hasValue } from '@quebble/scripts'

import { JsonApi } from '../interfaces/jsonapi.namespace'
import { OpenApiObject } from '../interfaces/openapi.interface'
import { OperationObject } from '../interfaces/operation.interface'
import { PathItemObject } from '../interfaces/pathitem.interface'
import { ReferenceObject } from '../interfaces/reference.interface'
import { ResponseObject } from '../interfaces/response.interface'
import { ResponsesObject } from '../interfaces/responses.interface'
import {
	OperationId,
	OperationType,
	OperationTypes,
	Path,
	PathMenuItem,
	SchemaType,
	ServerTag,
	SubPath,
} from '../types/openapi.types'
import { OpenApiCoreService } from './core.service'
import { OpenApiSchemaService } from './schema.service'

type OperationMap = Map<OperationType, OperationId>
type SubPathMap = ExMap<SubPath[], OperationMap>
type PathMap = ExMap<Path, SubPathMap>

@Injectable({
	providedIn: 'root',
})
export class OpenApiPathService {
	/**
	 * _paths
	 * Map of path string, e.g. 'providers', 'users', etc., and an ExMap,
	 * storing the entire path split by forward slash `/` and stores the
	 * associated operation types and operationIds
	 */
	private _paths: PathMap = new ExMap()

	/**
	 * Map with operation types and a list of all operation objects associated
	 * to the type
	 */
	private _pathItems: ExMap<OperationId, OperationObject> = new ExMap()

	/**
	 * List of all tags that are found in each operation
	 */
	private _tagList: List<ServerTag[]> = new List()

	/**
	 * Paths arrays
	 * Lists of tags with nested operations that are used to create a menu by
	 * parsing the various different options
	 */
	private _defaultPaths: PathMenuItem[] = []
	private _passPaths: PathMenuItem[] = []

	constructor(private core: OpenApiCoreService, private schema: OpenApiSchemaService) {}

	get map() {
		return this._paths
	}

	/**
	 * @summary
	 * Return a list of PathMenuItem that are available to the user
	 *
	 * @returns the current _defaultPaths
	 */
	get paths(): PathMenuItem[] {
		return this._defaultPaths
	}

	/**
	 * @summary
	 * Return a list of PathMenuItem that can be accessed without logging in
	 *
	 * @returns the current _passPaths
	 */
	get passing(): PathMenuItem[] {
		return this._passPaths
	}

	/**
	 * @summary
	 * Standard initializer function used by the OpenApiService. Can be called
	 * seperately. Supply a valid OpenApiObject and toggle reinit to true to
	 * restart the service.
	 *
	 * @param openapi
	 * @param reinit
	 */
	public async init(openapi: OpenApiObject, reinit?: boolean): Promise<any> {
		if (!openapi?.paths) return Promise.resolve(['Paths could not find OpenAPI Spec'])
		if (reinit) this.clear()

		const errors = []
		const paths = await this.setPathMaps(openapi)
		if (!paths) errors.push(`Paths could not find endpoints`)
		const menus = await this.getValidMenuItems()
		if (!menus) errors.push(`Paths could not create a menu`)

		return Promise.resolve(errors)
	}

	private clear(): void {
		this._paths.clear()
		this._defaultPaths = []
		this._passPaths = []
	}

	/**
	 * @summary
	 * Convert the PathsObject to a map with the primary part of the path as its
	 * key, and an ExMap as a value. The ExMap will have the full path as an
	 * array as the key and a map with the operation's type and id as its value.
	 *
	 * For each operation that is found, the operation's id and OperationObject
	 * are stored in the _pathItems map.
	 *
	 * @param spec OpenApiObject
	 *
	 * @returns boolean Promise
	 */
	private setPathMaps(spec: OpenApiObject): Promise<boolean> {
		if (!spec?.paths) return Promise.resolve(false)

		// Create a map for the paths. This map will be used to overwrite the
		// internal map. Prevents duplication and/or combining of OpenApiObjects
		// when the init function is called
		const paths: PathMap = new ExMap()
		// Similarly create a map for the pathItems that will do the same
		const pathItems: ExMap<OperationId, OperationObject> = new ExMap()
		// List of tags to expand
		const serverTags: ServerTag[][] = []

		// We'll return a Promise immediately, doing the logic inside
		return new Promise<boolean>((resolve) => {
			// First, make an ExMap from the paths object
			const pathmap: ExMap<string, PathItemObject> = new ExMap(spec.paths)
			// Prepare a map for all PathItemObjects that only hold $ref strings
			// to parse when all other paths are set
			const refs: Map<string, string> = new Map()

			pathmap
				.filter((m) => typeof m !== 'string')
				.forEach((method: PathItemObject, path: string) => {
					// If it's a ref, store it for later and return
					if (hasValue(method.$ref)) {
						refs.set(path, method.$ref)
						return
					}

					// Cleanup the path key
					const cleaned: string = this.cleanupPathKey(path)
					// Create the SubPath
					const subpath: SubPath[] = cleaned.split('/')
					// Get the base of the path
					const base: Path = subpath[0]
					// Check if there's an actual base, otherwise yeet thyself
					if (!hasValue(base)) return
					// Check if paths already has a base, otherwise set it
					if (!paths.has(base)) paths.set(base, new ExMap())

					// Get the subpaths map
					const subs: SubPathMap = paths.get(base)
					// Check if subs already has the subpath, otherwise set it
					if (!subs.has(subpath)) subs.set(subpath, new Map())

					// Get the operation map
					const opmap: OperationMap = subs.get(subpath)
					// Create a map with all operation types and the operation
					// objects associated
					const methodmap: ExMap<string, OperationObject> = new ExMap(method)

					// Parse the method map and set the operation map, as well
					// as the pathItems map with the supplied data.
					methodmap
						.filter((o, type) => OperationTypes.includes(type))
						.forEach((operation, type: OperationType) => {
							const { operationId, tags } = operation
							// Sort the tags
							const ordered = asArray(tags).sort()
							// Overwrite the original tags with the sorted
							operation.tags = ordered
							// Add the tags for this operation to the list
							if (hasValue(ordered)) serverTags.push(ordered)
							// Store the operation type and id
							opmap.set(type, operationId)
							// Store the oparation id and object
							pathItems.set(operationId, operation)
						})
				})

			// Overwrite class maps with internal maps
			this._paths = paths
			this._pathItems = pathItems
			this._tagList = new List(serverTags, true)

			// If they're empty, something broke.
			// TODO: Human-readable error should be given to the end-user
			if (!paths.size || !pathItems.size) resolve(false)
			else resolve(true)
		})
	}

	/**
	 * @summary
	 * Uses the _pathItems map to get a list of all GET operations and parses
	 * those for relations and connected paths, to create a menu structure for
	 * the different menu types.
	 *
	 * @returns boolean Promise
	 */
	private async getValidMenuItems(): Promise<boolean> {
		if (!this._pathItems.size) return Promise.resolve(false)

		// Create a list for the root operation ids of the menu
		const rootlist = new List<[ServerTag | ServerTag[], OperationId]>()

		// Create a map for all main/sub menu items
		const menumap = new ExMap<OperationId, List<OperationId>>()

		/**
		 * Determine validity of menu item (i.e. it returns an array)
		 *
		 * @param operationId operation id to check for
		 */
		const validMenuItem = (operationId: OperationId): boolean => {
			if (!operationId) return false
			const operation = this._pathItems.get(operationId)
			if (!operation) return false
			const { responses } = operation
			const types = this.getResponseType(responses)
			return types.has('array')
		}

		// Filter the current paths for items that have an actual root item
		// and then loop through those
		//
		// TODO:
		// 🤔 find the _shortest_ items that return a valid menu item and
		// then parse those results instead of just the [root]
		const withroot = this._paths.filter((submap, path) => submap?.has([path]))
		withroot.forEach((submap, path) => {
			// Get the root item from the submap
			const first: OperationMap = submap?.get([path])
			// TODO: Error handling. Shouldn't happen, but you never know.
			// Only happens when the filter breaks for some reason
			if (!first) return
			// If no GET operation is found, skip.
			if (!first.has('get')) return
			// Get the operation id
			const getop: OperationId = first.get('get')
			// Get the operation object
			const opob: OperationObject = this._pathItems.get(getop)
			// Destructure the object to get the operation id
			const { operationId, tags } = opob ?? {}
			// No operation object? Skip.
			// TODO: Error handling, since this _shouldn't_ happen.
			if (!operationId) return
			// Create the base path (used lated)
			const basepath: SubPath[] = [path]
			// Get the closest tag(s)
			const closest = this.getClosestTag(asArray(tags))
			// Add the tag and operationId to the root items
			rootlist.add([closest, operationId])
			// Add the operation id and a new List to the menumap
			menumap.set(getop, new List())

			// Map the submap to a sorted-by-length list of subpaths that
			// isn't the [path] item
			const subpaths: SubPath[][] = submap
				?.filter((opmap) => opmap.has('get'))
				.map((m, subpath) => {
					if (subpath.length === 1 && subpath[0] === path) return null
					return subpath
				})
				.filter((a) => !!a)
				.sort((a, b) => a.length - b.length)

			// Quick regexp test for /{path_param}/
			const isPathParam = (param: string): boolean => {
				return /{[\w]+}/g.test(param)
			}

			/**
			 * Get the given subpath, check if it has a GET operation and
			 * check if it is a valid menu item. Return true if succesful
			 * or false if not.
			 *
			 * @param subpath subpath to use
			 * @param operationId operation id to add
			 *
			 * @returns boolean
			 */
			const getCheckAdd = (subpath: SubPath[], operationId: OperationId): boolean => {
				if (!hasValue(subpath) || !operationId) return false
				const exists = submap.get(subpath)
				// Check for a GET operation
				const depid = exists?.get('get')
				// If it exists, we depend.
				if (depid) {
					// Check if the operation id returns an array
					if (!validMenuItem(depid)) return false
					// Check if the menumap has the id, or add it
					if (!menumap.has(depid)) menumap.set(depid, new List())
					// Get the list of operation ids
					const deplist = menumap.get(depid)
					// Add the operation id to the list of ids for this
					// depender
					deplist.add(operationId)
					// Return success
					return true
				}
				// No bueno
				return false
			}

			/**
			 * Reverse-loop through the subpath to match the nearest part
			 * that is a path parameter and check if it is a valid subpath
			 * in the submap. If so add it as a dependency and return true.
			 * Otherwise false.
			 *
			 * @param subpath subpath to start from
			 * @param operationId operation id to add
			 *
			 * @returns boolean
			 */
			const matchNearest = (subpath: SubPath[], operationId: OperationId): boolean => {
				if (!hasValue(subpath) || !operationId) return false
				for (let i = subpath.length - 1; i >= 0; i--) {
					if (i === subpath.length - 1) continue
					const param = isPathParam(subpath[i])
					if (param) {
						// Create a slice from the current subpath
						const frankenpath = subpath.slice(0, i + 1)
						// Check if item could be found and added to the
						// menu and return true if so.
						const valid = getCheckAdd(frankenpath, operationId)
						if (valid) return true
					}
				}
				// Return failure
				return false
			}

			// Loop through the subpaths and split them by path content and
			// length
			subpaths.forEach((subpath, index) => {
				const opmap = submap.get(subpath)
				const opid = opmap?.get('get')
				// Make sure there's an operation id for GET, otherwise just
				// return since it's unusable
				if (!opid) return
				// If it can't be a menu item, cancel
				if (!validMenuItem(opid)) return
				// Get the previous subpath
				const previous = index > 0 ? subpaths[index - 1] : []
				// Determine if the current path is of equal length to the
				// previous path or not
				const length = subpath.length - previous?.length
				// If the length is any value above 0, check if this
				// continues on the previous one
				if (length > 0 && hasValue(previous)) {
					// Remove all doubles
					const diff = subpath.filter((a) => !previous.includes(a))
					// Diff - length should be the same, or current path
					// isn't continuing on from the previous
					if (length === diff.length) {
						// Add the item to the menu if it's a valid submenu
						// item for the previous route
						getCheckAdd(previous, opid)
					} else matchNearest(subpath, opid)
				}
				// If the subpath is of equal length as the previous subpath
				// or if it's the first item
				else {
					// It's the first, so
					if (index === 0) {
						// Check if it can be added and do it, if so.
						getCheckAdd(basepath, opid)
					} else {
						// Find the earliest dependency
						const matched = matchNearest(subpath, opid)
						// If none found, try if subpath itself is valid
						if (!matched) getCheckAdd(basepath, opid)
					}
				}
			})
		})

		const menus = await this.setMenuTypes(rootlist, menumap)
		return Promise.resolve(menus)
	}

	/**
	 * @summary
	 * Create menu items for each of the items in the menu map and add them to
	 * the layer above. Parse the rootlist and get the operation id from the
	 * menumap to complete the menu building.
	 *
	 * @param rootlist Root menu operation ids and their tags
	 * @param menumap All operation ids with submenus
	 *
	 * @returns boolean Promise
	 */
	private setMenuTypes(
		rootlist: List<[ServerTag | ServerTag[], OperationId]>,
		menumap: ExMap<OperationId, List<OperationId>>,
	): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			// Create the menu items that need no login
			const noSecItems: PathMenuItem[] = []

			// All menu items
			const menuItems: PathMenuItem[] = []

			/**
			 * Make a menu item for the given operation id. Gets the operation
			 * object associated with the operation id, checks if there are
			 * security schemes and gets the list of operation ids that are
			 * stored in the menumap (if any) to find sub items for this menu
			 * item.
			 *
			 * @param operationId operation id
			 *
			 * @returns
			 * PathMenuItem
			 */
			const makeMenuItem = (operationId: OperationId, noSec?: boolean): PathMenuItem => {
				// Get the operation object or, if not found, return
				const operation = this._pathItems.get(operationId)
				if (!operation) return null
				// Get the security schemes object
				const { security, tags } = operation
				// If we don't want items that have a login wall, return null if
				// there are schemes for this operation
				if (noSec && !!security) return null
				// Find the closest tag(s)
				const closest = this.getClosestTag(asArray(tags))
				// Create a menu item
				const menuItem: PathMenuItem = [closest, operationId, !!security]
				// Get the list of sub menu operation ids from the menumap
				const subs = menumap.get(operationId) ?? new List()
				// If there are items
				if (subs.size) {
					// Map the operation ids to PathMenuItems and filter the
					// null values. If any are left, add to the menu item
					const submenus: PathMenuItem[] = subs
						.map((opid) => makeMenuItem(opid, noSec))
						.filter((a) => !!a)
					if (submenus.length) menuItem.push(submenus)
				}
				// All is well, return the item
				return menuItem
			}

			// Loop through the rootlist and create menu items
			rootlist.forEach(([tags, opid]) => {
				// Menu item with login requirement
				const withSec = makeMenuItem(opid)
				if (withSec) menuItems.push(withSec)
				// Menu item without login requirement
				const noSec = makeMenuItem(opid, true)
				if (noSec) noSecItems.push(noSec)
			})

			// If there are menu items of any kind, set and resolve
			if (menuItems.length || noSecItems.length) {
				this._defaultPaths = menuItems
				this._passPaths = noSecItems
				resolve(true)
			} else resolve(false)
		})
	}

	/**
	 * @summary
	 * Browse the _tagList and return the first matching tag that's (a part of)
	 * the tags supplied. This is used as a base for grouping menu items and sub
	 * menu items.
	 *
	 * @param serverTags
	 *
	 * @returns ServerTag or ServerTag[]
	 */
	private getClosestTag(serverTags: ServerTag[]): ServerTag | ServerTag[] {
		const tags = []
		// Loop through the tags and return the first tag that's [tag] in the
		// tagList
		for (const tag of serverTags) {
			const only = [tag]
			if (this._tagList.has(only)) return tag
		}

		// If no [tag] is found, we'll [1,2] it up
		for (const tag of serverTags) {
			tags.push(tag)
			if (this._tagList.has(tags)) return tags
		}

		return
	}

	/**
	 * @summary
	 * Find the response that returns a valid object or array of objects and
	 * return the SchemaType that it matches
	 *
	 * @param responses ResponsesObject
	 *
	 * @returns 'array' or 'object' SchemaType
	 *
	 * @todo
	 * Expand with relation checks for content that may reference items or paths
	 * that return array values (e.g. get_provider -> get_unit_list)
	 */
	private getResponseType(responses: ResponsesObject): List<SchemaType> {
		if (!responses) return null
		const types = new List<SchemaType>()

		for (const key in responses) {
			const http = parseInt(key)
			// Only succesful operations count, so anything between 200 and 210
			if (isNaN(http) || http < 200 || http > 210) continue

			const { content } = responses[key] as ResponseObject
			if (!content) {
				// TODO: manage $ref
				// but should we? Can be found in components/responses if so
				const { $ref } = responses[key] as ReferenceObject
				continue
			}

			// Loop through all mime-types of the content
			for (const mime in content) {
				const { schema } = content[mime]

				if (mime === JsonApi.MediaType) {
					// assume JsonApi structure
					// Get the ref
					const { $ref } = schema ?? {}
					// Get the schema for this ref
					const inschema = this.schema.getSchema($ref)
					if (inschema) {
						// If found, cast the properties to DataSchema
						// since we can assume the content from here
						const props: JsonApi.DataSchema = inschema.properties
						// Get the data property
						const { data } = props
						// Or continue
						if (!data) continue

						// Get the data type (implicit in array-type)
						const { type, items } = data
						// If not no items are set _and_ no type is set, return
						// the schema's type
						if (!items && !type) types.add(inschema.type)
						// Otherwise return the new type
						else types.add(type)
					}
				} else {
					// assume OpenApi structure
					const { $ref, items } = schema
					if ($ref) types.add('object')
					else if (items) types.add('array')
					continue
				}
			}
		}

		return types
	}

	/**
	 * @summary
	 * Clean the path string of the apiPrefix and trailing
	 * forward slashes
	 *
	 * @param key the full path string
	 *
	 * @returns a string
	 */
	private cleanupPathKey(key: string): string {
		let prefix: string = this.core.settings.apiPrefix
		if (this.core?._openapi?.servers) {
			const srv = asArray(this.core._openapi.servers)[0]
			const url = srv?.url ?? null
			if (url) {
				prefix = this.core.settings.apiPrefix.replace(url, '')
			}
		}

		let path = key.replace(prefix, '')
		if (path.startsWith('/api/')) path = path.replace('/api/', '')
		path = path.replace(/\/$/, '')

		return path
	}
}
