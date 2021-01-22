import { ComponentObject } from './component.interface'
import { ExternalDocumentObject } from './externaldocument.interface'
import { InfoObject } from './info.interface'
import { PathsObject } from './paths.interface'
import { SecurityRequirementObject } from './securityrequirement.interface'
import { ServerObject } from './server.interface'
import { TagObject } from './tag.interface'

export interface OpenApiObject {
	openapi: string
	info: InfoObject
	servers?: ServerObject[]
	paths: PathsObject
	components?: ComponentObject
	security?: SecurityRequirementObject
	tags?: TagObject[]
	externalDocs?: ExternalDocumentObject
}
