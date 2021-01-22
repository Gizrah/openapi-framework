import { ContactObject } from './contact.interface'
import { LicenseObject } from './license.interface'

export interface InfoObject {
	title: string
	description?: string
	termsOfService?: string
	contact?: ContactObject
	license?: LicenseObject
	version: string
}
