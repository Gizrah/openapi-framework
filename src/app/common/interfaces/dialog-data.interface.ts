import { OpenApi } from '@quebble/openapi'

export interface DialogData {
	operation: OpenApi.Operation
	item: any
	subject?: string
	chunk?: OpenApi.Chunk
	valueMap?: Map<string, any>
}
