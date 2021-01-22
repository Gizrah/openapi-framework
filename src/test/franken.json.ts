import { OpenApiObject } from 'app/common/services/openapi/barrel'

export const FrankenJson: OpenApiObject = {
	openapi: '3.0.2',
	info: { title: 'QNG Core', description: 'Quebble Next-Gen core', version: '0.1.0' },
	servers: [{ url: '/core' }],
	paths: {
		'/api/persons': {
			get: {
				tags: ['persons'],
				summary: 'Get Person List',
				description: 'Get list of persons',
				operationId: 'get_person_list',
				parameters: [
					{
						description:
							'Filter items where any field contains this value.Value can be a comma separated list to filter itemsmatching any of the list entries. Multiple filterparameters will be applied consecutively.',
						required: false,
						schema: {
							title: 'Filter',
							type: 'array',
							items: { type: 'string' },
							description:
								'Filter items where any field contains this value.Value can be a comma separated list to filter itemsmatching any of the list entries. Multiple filterparameters will be applied consecutively.',
						},
						name: 'filter',
						in: 'query',
					},
					{
						description: 'Sort by this field. Prefix with - for descending order',
						required: false,
						schema: {
							type: 'array',
							items: { $ref: '#/components/schemas/PersonAttributesSortEnum' },
							description: 'Sort by this field. Prefix with - for descending order',
						},
						name: 'sort',
						in: 'query',
					},
					{
						description: 'Page number when paged response is expected.',
						required: false,
						schema: {
							title: 'Page number',
							exclusiveMinimum: 0.0,
							type: 'integer',
							description: 'Page number when paged response is expected.',
						},
						name: 'page[number]',
						in: 'query',
					},
					{
						description: 'Page size when paged response is expected.',
						required: false,
						schema: {
							title: 'Page size',
							exclusiveMinimum: 0.0,
							type: 'integer',
							description: 'Page size when paged response is expected.',
						},
						name: 'page[size]',
						in: 'query',
					},
					{
						description: 'Offset in collection to use as start of page.',
						required: false,
						schema: {
							title: 'Page offset',
							minimum: 0.0,
							type: 'integer',
							description: 'Offset in collection to use as start of page.',
						},
						name: 'page[offset]',
						in: 'query',
					},
					{
						description: 'Page limit. Equivalent to page[size]',
						required: false,
						schema: {
							title: 'Page limit',
							exclusiveMinimum: 0.0,
							type: 'integer',
							description: 'Page limit. Equivalent to page[size]',
						},
						name: 'page[limit]',
						in: 'query',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/vnd.api+json': {
								schema: { $ref: '#/components/schemas/Collection_Person_' },
							},
						},
					},
					'422': {
						description: 'Validation Error',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/HTTPValidationError' },
							},
						},
					},
				},
				security: [{ OAuth2AuthorizationCodeBearer: [] }],
			},
		},
		'/api/persons/{id}': {
			get: {
				tags: ['persons'],
				summary: 'Get Person',
				description: 'Get provider with specified id',
				operationId: 'get_person',
				parameters: [
					{
						required: true,
						schema: { title: 'Id', type: 'string', format: 'uuid' },
						name: 'id',
						in: 'path',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/vnd.api+json': {
								schema: { $ref: '#/components/schemas/Data_Person_' },
							},
						},
					},
					'422': {
						description: 'Validation Error',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/HTTPValidationError' },
							},
						},
					},
				},
				security: [{ OAuth2AuthorizationCodeBearer: [] }],
			},
		},
		'/api/providers': {
			get: {
				tags: ['organization'],
				summary: 'Get Provider List',
				description: 'Get list of providers',
				operationId: 'get_provider_list',
				parameters: [
					{
						description:
							'Filter items where any field contains this value.Value can be a comma separated list to filter itemsmatching any of the list entries. Multiple filterparameters will be applied consecutively.',
						required: false,
						schema: {
							title: 'Filter',
							type: 'array',
							items: { type: 'string' },
							description:
								'Filter items where any field contains this value.Value can be a comma separated list to filter itemsmatching any of the list entries. Multiple filterparameters will be applied consecutively.',
						},
						name: 'filter',
						in: 'query',
					},
					{
						description: 'Sort by this field. Prefix with - for descending order',
						required: false,
						schema: {
							type: 'array',
							items: { $ref: '#/components/schemas/ProviderAttributesSortEnum' },
							description: 'Sort by this field. Prefix with - for descending order',
						},
						name: 'sort',
						in: 'query',
					},
					{
						description: 'Page number when paged response is expected.',
						required: false,
						schema: {
							title: 'Page number',
							exclusiveMinimum: 0.0,
							type: 'integer',
							description: 'Page number when paged response is expected.',
						},
						name: 'page[number]',
						in: 'query',
					},
					{
						description: 'Page size when paged response is expected.',
						required: false,
						schema: {
							title: 'Page size',
							exclusiveMinimum: 0.0,
							type: 'integer',
							description: 'Page size when paged response is expected.',
						},
						name: 'page[size]',
						in: 'query',
					},
					{
						description: 'Offset in collection to use as start of page.',
						required: false,
						schema: {
							title: 'Page offset',
							minimum: 0.0,
							type: 'integer',
							description: 'Offset in collection to use as start of page.',
						},
						name: 'page[offset]',
						in: 'query',
					},
					{
						description: 'Page limit. Equivalent to page[size]',
						required: false,
						schema: {
							title: 'Page limit',
							exclusiveMinimum: 0.0,
							type: 'integer',
							description: 'Page limit. Equivalent to page[size]',
						},
						name: 'page[limit]',
						in: 'query',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/vnd.api+json': {
								schema: { $ref: '#/components/schemas/Collection_Provider_' },
							},
						},
					},
					'422': {
						description: 'Validation Error',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/HTTPValidationError' },
							},
						},
					},
				},
				security: [{ OAuth2AuthorizationCodeBearer: [] }],
			},
			post: {
				tags: ['organization'],
				summary: 'Post Provider',
				description: 'Create a new provider',
				operationId: 'post_provider',
				requestBody: {
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/Data_Provider_' },
						},
					},
					required: true,
				},
				responses: {
					'201': {
						description: 'Successful Response',
						content: {
							'application/vnd.api+json': {
								schema: { $ref: '#/components/schemas/Data_Provider_' },
							},
						},
					},
					'422': {
						description: 'Validation Error',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/HTTPValidationError' },
							},
						},
					},
				},
				security: [{ OAuth2AuthorizationCodeBearer: [] }],
			},
		},
		'/api/providers/{id}': {
			get: {
				tags: ['organization'],
				summary: 'Get Provider',
				description: 'Get provider with specified id',
				operationId: 'get_provider',
				parameters: [
					{
						required: true,
						schema: { title: 'Id', type: 'string', format: 'uuid' },
						name: 'id',
						in: 'path',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/vnd.api+json': {
								schema: { $ref: '#/components/schemas/Data_Provider_' },
							},
						},
					},
					'422': {
						description: 'Validation Error',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/HTTPValidationError' },
							},
						},
					},
				},
				security: [{ OAuth2AuthorizationCodeBearer: [] }],
			},
			delete: {
				tags: ['organization'],
				summary: 'Delete Provider',
				description: 'Delete provider with specified id',
				operationId: 'delete_provider',
				parameters: [
					{
						required: true,
						schema: { title: 'Id', type: 'string', format: 'uuid' },
						name: 'id',
						in: 'path',
					},
				],
				responses: {
					'204': { description: 'Successful Response' },
					'422': {
						description: 'Validation Error',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/HTTPValidationError' },
							},
						},
					},
				},
				security: [{ OAuth2AuthorizationCodeBearer: [] }],
			},
			patch: {
				tags: ['organization'],
				summary: 'Patch Provider',
				description: 'Modify provider with specified id',
				operationId: 'patch_provider',
				parameters: [
					{
						required: true,
						schema: { title: 'Id', type: 'string', format: 'uuid' },
						name: 'id',
						in: 'path',
					},
				],
				requestBody: {
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/Data_Provider_' },
						},
					},
					required: true,
				},
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/vnd.api+json': {
								schema: { $ref: '#/components/schemas/Data_Provider_' },
							},
						},
					},
					'422': {
						description: 'Validation Error',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/HTTPValidationError' },
							},
						},
					},
				},
				security: [{ OAuth2AuthorizationCodeBearer: [] }],
			},
		},
		'/api/providers/{id}/relations/address': {
			get: {
				tags: ['organization'],
				summary: 'Get Provider Address',
				description: 'Get address of specified provider',
				operationId: 'get_provider_address',
				parameters: [
					{
						required: true,
						schema: { title: 'Id', type: 'string', format: 'uuid' },
						name: 'id',
						in: 'path',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/vnd.api+json': {
								schema: { $ref: '#/components/schemas/Data_Address_' },
							},
						},
					},
					'422': {
						description: 'Validation Error',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/HTTPValidationError' },
							},
						},
					},
				},
				security: [{ OAuth2AuthorizationCodeBearer: [] }],
			},
		},
		'/api/providers/{id}/relations/contact': {
			get: {
				tags: ['organization'],
				summary: 'Get Provider Contact',
				description: 'Get contact with specified provider',
				operationId: 'get_provider_contact',
				parameters: [
					{
						required: true,
						schema: { title: 'Id', type: 'string', format: 'uuid' },
						name: 'id',
						in: 'path',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/vnd.api+json': {
								schema: { $ref: '#/components/schemas/Data_Person_' },
							},
						},
					},
					'422': {
						description: 'Validation Error',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/HTTPValidationError' },
							},
						},
					},
				},
				security: [{ OAuth2AuthorizationCodeBearer: [] }],
			},
		},
		'/api/units': {
			get: {
				tags: ['organization'],
				summary: 'Get Unit List',
				description: 'Get list of providers',
				operationId: 'get_unit_list',
				parameters: [
					{
						description:
							'Filter items where any field contains this value.Value can be a comma separated list to filter itemsmatching any of the list entries. Multiple filterparameters will be applied consecutively.',
						required: false,
						schema: {
							title: 'Filter',
							type: 'array',
							items: { type: 'string' },
							description:
								'Filter items where any field contains this value.Value can be a comma separated list to filter itemsmatching any of the list entries. Multiple filterparameters will be applied consecutively.',
						},
						name: 'filter',
						in: 'query',
					},
					{
						description: 'Sort by this field. Prefix with - for descending order',
						required: false,
						schema: {
							type: 'array',
							items: { $ref: '#/components/schemas/UnitAttributesSortEnum' },
							description: 'Sort by this field. Prefix with - for descending order',
						},
						name: 'sort',
						in: 'query',
					},
					{
						description: 'Page number when paged response is expected.',
						required: false,
						schema: {
							title: 'Page number',
							exclusiveMinimum: 0.0,
							type: 'integer',
							description: 'Page number when paged response is expected.',
						},
						name: 'page[number]',
						in: 'query',
					},
					{
						description: 'Page size when paged response is expected.',
						required: false,
						schema: {
							title: 'Page size',
							exclusiveMinimum: 0.0,
							type: 'integer',
							description: 'Page size when paged response is expected.',
						},
						name: 'page[size]',
						in: 'query',
					},
					{
						description: 'Offset in collection to use as start of page.',
						required: false,
						schema: {
							title: 'Page offset',
							minimum: 0.0,
							type: 'integer',
							description: 'Offset in collection to use as start of page.',
						},
						name: 'page[offset]',
						in: 'query',
					},
					{
						description: 'Page limit. Equivalent to page[size]',
						required: false,
						schema: {
							title: 'Page limit',
							exclusiveMinimum: 0.0,
							type: 'integer',
							description: 'Page limit. Equivalent to page[size]',
						},
						name: 'page[limit]',
						in: 'query',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/vnd.api+json': {
								schema: { $ref: '#/components/schemas/Collection_Unit_' },
							},
						},
					},
					'422': {
						description: 'Validation Error',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/HTTPValidationError' },
							},
						},
					},
				},
				security: [{ OAuth2AuthorizationCodeBearer: [] }],
			},
		},
		'/api/units/{id}': {
			get: {
				tags: ['organization'],
				summary: 'Get Unit',
				description: 'Get provider with specified id',
				operationId: 'get_unit',
				parameters: [
					{
						required: true,
						schema: { title: 'Id', type: 'string', format: 'uuid' },
						name: 'id',
						in: 'path',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/vnd.api+json': {
								schema: { $ref: '#/components/schemas/Data_Unit_' },
							},
						},
					},
					'422': {
						description: 'Validation Error',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/HTTPValidationError' },
							},
						},
					},
				},
				security: [{ OAuth2AuthorizationCodeBearer: [] }],
			},
		},
	},
	components: {
		schemas: {
			Address: {
				title: 'Address',
				required: ['type', 'attributes'],
				type: 'object',
				properties: {
					meta: { $ref: '#/components/schemas/ModelMeta' },
					links: { $ref: '#/components/schemas/Links' },
					type: { title: 'Type', type: 'string' },
					id: { title: 'Id', type: 'string', format: 'uuid' },
					attributes: { $ref: '#/components/schemas/AddressAttributes' },
					relations: { $ref: '#/components/schemas/Relations' },
				},
				description: 'Parameterized model for returned objects',
			},
			AddressAttributes: {
				title: 'AddressAttributes',
				required: ['number'],
				type: 'object',
				properties: {
					street: { title: 'Street', type: 'string' },
					number: { title: 'Number', minimum: 1.0, type: 'integer' },
					numberSuffix: {
						title: 'Numbersuffix',
						maxLength: 8,
						pattern: '[\\w\\-]+',
						type: 'string',
					},
					postcode: {
						title: 'Postcode',
						maxLength: 6,
						minLength: 6,
						pattern: '^[1-9][0-9]{3}?\\s?(?!sa|sd|ss|SA|SD|SS)[A-Z]{2}$',
						type: 'string',
					},
					city: { title: 'City', type: 'string' },
					country: { title: 'Country', type: 'string', default: 'Nederland' },
				},
				description: 'Base class for model attributes',
			},
			AddressId: {
				title: 'AddressId',
				required: ['type'],
				type: 'object',
				properties: {
					type: { title: 'Type', type: 'string' },
					id: { title: 'Id', type: 'string', format: 'uuid' },
				},
				description: 'Model type and identifier',
			},
			CollectionLinks: {
				title: 'CollectionLinks',
				type: 'object',
				properties: {
					self: {
						title: 'Self',
						anyOf: [{ type: 'string' }, { $ref: '#/components/schemas/LinkWithMeta' }],
					},
					first: {
						title: 'First',
						anyOf: [{ type: 'string' }, { $ref: '#/components/schemas/LinkWithMeta' }],
					},
					prev: {
						title: 'Prev',
						anyOf: [{ type: 'string' }, { $ref: '#/components/schemas/LinkWithMeta' }],
					},
					next: {
						title: 'Next',
						anyOf: [{ type: 'string' }, { $ref: '#/components/schemas/LinkWithMeta' }],
					},
					last: {
						title: 'Last',
						anyOf: [{ type: 'string' }, { $ref: '#/components/schemas/LinkWithMeta' }],
					},
				},
			},
			Collection_Person_: {
				title: 'Collection[Person]',
				type: 'object',
				properties: {
					meta: { $ref: '#/components/schemas/Meta' },
					links: { $ref: '#/components/schemas/CollectionLinks' },
					data: {
						title: 'Data',
						type: 'array',
						items: { $ref: '#/components/schemas/Person' },
						default: [],
					},
				},
				description: 'Response object context: meta data and links',
			},
			Collection_Provider_: {
				title: 'Collection[Provider]',
				type: 'object',
				properties: {
					meta: { $ref: '#/components/schemas/Meta' },
					links: { $ref: '#/components/schemas/CollectionLinks' },
					data: {
						title: 'Data',
						type: 'array',
						items: { $ref: '#/components/schemas/Provider' },
						default: [],
					},
				},
				description: 'Response object context: meta data and links',
			},
			Collection_Unit_: {
				title: 'Collection[Unit]',
				type: 'object',
				properties: {
					meta: { $ref: '#/components/schemas/Meta' },
					links: { $ref: '#/components/schemas/CollectionLinks' },
					data: {
						title: 'Data',
						type: 'array',
						items: { $ref: '#/components/schemas/Unit' },
						default: [],
					},
				},
				description: 'Response object context: meta data and links',
			},
			Data_Address_: {
				title: 'Data[Address]',
				required: ['data'],
				type: 'object',
				properties: {
					meta: { $ref: '#/components/schemas/Meta' },
					links: { $ref: '#/components/schemas/Links' },
					data: { $ref: '#/components/schemas/Address' },
				},
				description: 'Response object context: meta data and links',
			},
			Data_Person_: {
				title: 'Data[Person]',
				required: ['data'],
				type: 'object',
				properties: {
					meta: { $ref: '#/components/schemas/Meta' },
					links: { $ref: '#/components/schemas/Links' },
					data: { $ref: '#/components/schemas/Person' },
				},
				description: 'Response object context: meta data and links',
			},
			Data_Provider_: {
				title: 'Data[Provider]',
				required: ['data'],
				type: 'object',
				properties: {
					meta: { $ref: '#/components/schemas/Meta' },
					links: { $ref: '#/components/schemas/Links' },
					data: { $ref: '#/components/schemas/Provider' },
				},
				description: 'Response object context: meta data and links',
			},
			Data_Unit_: {
				title: 'Data[Unit]',
				required: ['data'],
				type: 'object',
				properties: {
					meta: { $ref: '#/components/schemas/Meta' },
					links: { $ref: '#/components/schemas/Links' },
					data: { $ref: '#/components/schemas/Unit' },
				},
				description: 'Response object context: meta data and links',
			},
			Gender: {
				title: 'Gender',
				enum: ['female', 'male', 'other'],
				type: 'string',
				description: 'An enumeration.',
			},
			HTTPValidationError: {
				title: 'HTTPValidationError',
				type: 'object',
				properties: {
					detail: {
						title: 'Detail',
						type: 'array',
						items: { $ref: '#/components/schemas/ValidationError' },
					},
				},
			},
			LinkWithMeta: {
				title: 'LinkWithMeta',
				required: ['href'],
				type: 'object',
				properties: { href: { title: 'Href', type: 'string' }, meta: { title: 'Meta' } },
			},
			Links: {
				title: 'Links',
				type: 'object',
				properties: {
					self: {
						title: 'Self',
						anyOf: [{ type: 'string' }, { $ref: '#/components/schemas/LinkWithMeta' }],
					},
				},
			},
			Meta: { title: 'Meta', type: 'object', properties: {} },
			ModelMeta: {
				title: 'ModelMeta',
				type: 'object',
				properties: {
					modified: { title: 'Modified', type: 'string', format: 'date-time' },
				},
			},
			Person: {
				title: 'Person',
				required: ['type', 'attributes'],
				type: 'object',
				properties: {
					meta: { $ref: '#/components/schemas/ModelMeta' },
					links: { $ref: '#/components/schemas/Links' },
					type: { title: 'Type', type: 'string' },
					id: { title: 'Id', type: 'string', format: 'uuid' },
					attributes: { $ref: '#/components/schemas/PersonAttributes' },
					relations: { $ref: '#/components/schemas/PersonRelations' },
				},
				description: 'Parameterized model for returned objects',
			},
			PersonAttributes: {
				title: 'PersonAttributes',
				required: ['firstName', 'lastName'],
				type: 'object',
				properties: {
					firstName: { title: 'Firstname', type: 'string' },
					infix: { title: 'Infix', type: 'string' },
					lastName: { title: 'Lastname', type: 'string' },
					initials: { title: 'Initials', type: 'string' },
					birthdate: { title: 'Birthdate', type: 'string', format: 'date' },
					gender: { $ref: '#/components/schemas/Gender' },
					avatar: {
						title: 'Avatar',
						maxLength: 65536,
						minLength: 1,
						type: 'string',
						format: 'uri',
					},
					contactDetails: { title: 'Contactdetails', type: 'array', items: {} },
				},
				description: 'Base class for model attributes',
			},
			PersonAttributesSortEnum: {
				title: 'PersonAttributesSortEnum',
				enum: [],
				type: 'string',
				description: 'An enumeration.',
			},
			PersonId: {
				title: 'PersonId',
				required: ['type'],
				type: 'object',
				properties: {
					type: { title: 'Type', type: 'string' },
					id: { title: 'Id', type: 'string', format: 'uuid' },
				},
				description: 'Model type and identifier',
			},
			PersonRelations: {
				title: 'PersonRelations',
				type: 'object',
				properties: { address: { $ref: '#/components/schemas/Relation_AddressId_' } },
				description: 'Base class for model relations',
			},
			Provider: {
				title: 'Provider',
				required: ['type', 'attributes'],
				type: 'object',
				properties: {
					meta: { $ref: '#/components/schemas/ModelMeta' },
					links: { $ref: '#/components/schemas/ProviderLinks' },
					type: { title: 'Type', type: 'string' },
					id: { title: 'Id', type: 'string', format: 'uuid' },
					attributes: { $ref: '#/components/schemas/ProviderAttributes' },
					relations: { $ref: '#/components/schemas/ProviderRelations' },
				},
				description: 'Parameterized model for returned objects',
			},
			ProviderAttributes: {
				title: 'ProviderAttributes',
				required: ['name'],
				type: 'object',
				properties: {
					name: { title: 'Name', type: 'string' },
					description: {
						title: 'Description',
						type: 'string',
						format: 'multiline',
						default: '',
					},
				},
				description: 'Base class for model attributes',
			},
			ProviderAttributesSortEnum: {
				title: 'ProviderAttributesSortEnum',
				enum: [],
				type: 'string',
				description: 'An enumeration.',
			},
			ProviderId: {
				title: 'ProviderId',
				required: ['type'],
				type: 'object',
				properties: {
					type: { title: 'Type', type: 'string' },
					id: { title: 'Id', type: 'string', format: 'uuid' },
				},
				description: 'Model type and identifier',
			},
			ProviderLinks: {
				title: 'ProviderLinks',
				type: 'object',
				properties: {
					self: {
						title: 'Self',
						anyOf: [{ type: 'string' }, { $ref: '#/components/schemas/LinkWithMeta' }],
					},
				},
			},
			ProviderRelations: {
				title: 'ProviderRelations',
				type: 'object',
				properties: {
					address: { $ref: '#/components/schemas/Relation_AddressId_' },
					contact: { $ref: '#/components/schemas/Relation_PersonId_' },
				},
				description: 'Base class for model relations',
			},
			Relation_AddressId_: {
				title: 'Relation[AddressId]',
				required: ['data'],
				type: 'object',
				properties: {
					meta: { $ref: '#/components/schemas/Meta' },
					links: { $ref: '#/components/schemas/Links' },
					data: { $ref: '#/components/schemas/AddressId' },
				},
				description: 'Response object context: meta data and links',
			},
			Relation_PersonId_: {
				title: 'Relation[PersonId]',
				required: ['data'],
				type: 'object',
				properties: {
					meta: { $ref: '#/components/schemas/Meta' },
					links: { $ref: '#/components/schemas/Links' },
					data: { $ref: '#/components/schemas/PersonId' },
				},
				description: 'Response object context: meta data and links',
			},
			Relation_ProviderId_: {
				title: 'Relation[ProviderId]',
				required: ['data'],
				type: 'object',
				properties: {
					meta: { $ref: '#/components/schemas/Meta' },
					links: { $ref: '#/components/schemas/Links' },
					data: { $ref: '#/components/schemas/ProviderId' },
				},
				description: 'Response object context: meta data and links',
			},
			Relation_UnitId_: {
				title: 'Relation[UnitId]',
				required: ['data'],
				type: 'object',
				properties: {
					meta: { $ref: '#/components/schemas/Meta' },
					links: { $ref: '#/components/schemas/Links' },
					data: { $ref: '#/components/schemas/UnitId' },
				},
				description: 'Response object context: meta data and links',
			},
			Relations: {
				title: 'Relations',
				type: 'object',
				properties: {},
				description: 'Base class for model relations',
			},
			Unit: {
				title: 'Unit',
				required: ['type', 'attributes'],
				type: 'object',
				properties: {
					meta: { $ref: '#/components/schemas/ModelMeta' },
					links: { $ref: '#/components/schemas/Links' },
					type: { title: 'Type', type: 'string' },
					id: { title: 'Id', type: 'string', format: 'uuid' },
					attributes: { $ref: '#/components/schemas/UnitAttributes' },
					relations: { $ref: '#/components/schemas/UnitRelations' },
				},
				description: 'Parameterized model for returned objects',
			},
			UnitAttributes: {
				title: 'UnitAttributes',
				required: ['name'],
				type: 'object',
				properties: {
					name: { title: 'Name', type: 'string' },
					description: {
						title: 'Description',
						type: 'string',
						format: 'multiline',
						default: '',
					},
					avatar: {
						title: 'Avatar',
						maxLength: 65536,
						minLength: 1,
						type: 'string',
						format: 'uri',
					},
					lrkId: { title: 'Lrkid', type: 'integer' },
					kvkNo: { title: 'Kvkno', type: 'string' },
					typeOko: { title: 'Typeoko', type: 'string' },
					bagId: { title: 'Bagid', type: 'string' },
				},
				description: 'Base class for model attributes',
			},
			UnitAttributesSortEnum: {
				title: 'UnitAttributesSortEnum',
				enum: [],
				type: 'string',
				description: 'An enumeration.',
			},
			UnitId: {
				title: 'UnitId',
				required: ['type'],
				type: 'object',
				properties: {
					type: { title: 'Type', type: 'string' },
					id: { title: 'Id', type: 'string', format: 'uuid' },
				},
				description: 'Model type and identifier',
			},
			UnitRelations: {
				title: 'UnitRelations',
				required: ['provider'],
				type: 'object',
				properties: {
					address: { $ref: '#/components/schemas/Relation_AddressId_' },
					contact: { $ref: '#/components/schemas/Relation_PersonId_' },
					provider: { $ref: '#/components/schemas/Relation_ProviderId_' },
					container: { $ref: '#/components/schemas/Relation_UnitId_' },
				},
				description: 'Base class for model relations',
			},
			ValidationError: {
				title: 'ValidationError',
				required: ['loc', 'msg', 'type'],
				type: 'object',
				properties: {
					loc: { title: 'Location', type: 'array', items: { type: 'string' } },
					msg: { title: 'Message', type: 'string' },
					type: { title: 'Error Type', type: 'string' },
				},
			},
		},
		securitySchemes: {
			OAuth2AuthorizationCodeBearer: {
				type: 'oauth2',
				flows: {
					authorizationCode: {
						scopes: {},
						authorizationUrl:
							'https://auth.quebble.com/auth/realms/Quebble/protocol/openid-connect/auth',
						tokenUrl:
							'https://auth.quebble.com/auth/realms/Quebble/protocol/openid-connect/token',
					},
				},
			},
		},
	},
}
