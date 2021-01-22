import { OpenApiObject } from 'app/common/services/openapi/barrel'

export const openApiJson: OpenApiObject = {
	openapi: '3.0.2',
	info: { title: 'QNG Core', description: 'Quebble Next-Gen core', version: '0.1.0' },
	servers: [{ url: '/core' }],
	paths: {
		'/lrk_import': {
			get: {
				summary: 'Lrkimport',
				operationId: 'lrkimport',
				responses: {
					'200': {
						description: 'Successful Response',
						content: { 'application/json': { schema: {} } },
					},
				},
			},
		},
		'/_/health': {
			get: {
				summary: 'Health',
				operationId: 'health',
				responses: {
					'200': {
						description: 'Successful Response',
						content: { 'application/json': { schema: {} } },
					},
				},
			},
		},
		'/api/translations/{provider_id}': {
			get: {
				tags: ['tl'],
				summary: 'Get Translation List',
				operationId: 'get_translation_list',
				parameters: [
					{
						required: true,
						schema: { title: 'Provider Id', type: 'integer' },
						name: 'provider_id',
						in: 'path',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/json': {
								schema: {
									title:
										'Response Get Translation List Api Translations  Provider Id  Get',
									type: 'array',
									items: { $ref: '#/components/schemas/Translation' },
								},
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
				tags: ['tl'],
				summary: 'Post Translation',
				operationId: 'post_translation',
				parameters: [
					{
						required: true,
						schema: { title: 'Provider Id', type: 'integer' },
						name: 'provider_id',
						in: 'path',
					},
				],
				requestBody: {
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/TranslationPost' },
						},
					},
					required: true,
				},
				responses: {
					'201': {
						description: 'Successful Response',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/Translation' },
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
			head: {
				tags: ['tl'],
				summary: 'Head Translation List',
				operationId: 'head_translation_list',
				parameters: [
					{
						required: true,
						schema: { title: 'Provider Id', type: 'integer' },
						name: 'provider_id',
						in: 'path',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: { 'application/json': { schema: {} } },
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
		'/api/translations/{provider_id}/{type}': {
			get: {
				tags: ['tl'],
				summary: 'Get Translation',
				operationId: 'get_translation',
				parameters: [
					{
						required: true,
						schema: { title: 'Provider Id', type: 'integer' },
						name: 'provider_id',
						in: 'path',
					},
					{
						required: true,
						schema: { title: 'Type', type: 'integer' },
						name: 'type',
						in: 'path',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/Translation' },
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
				tags: ['tl'],
				summary: 'Delete Translation',
				description: 'Yeet those translations bruh.',
				operationId: 'delete_translation',
				parameters: [
					{
						required: true,
						schema: { title: 'Provider Id', type: 'integer' },
						name: 'provider_id',
						in: 'path',
					},
					{
						required: true,
						schema: { title: 'Type', type: 'integer' },
						name: 'type',
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
			head: {
				tags: ['tl'],
				summary: 'Head Translation',
				operationId: 'head_translation',
				parameters: [
					{
						required: true,
						schema: { title: 'Provider Id', type: 'integer' },
						name: 'provider_id',
						in: 'path',
					},
					{
						required: true,
						schema: { title: 'Type', type: 'integer' },
						name: 'type',
						in: 'path',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: { 'application/json': { schema: {} } },
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
			patch: {
				tags: ['tl'],
				summary: 'Patch Translation',
				operationId: 'patch_translation',
				parameters: [
					{
						required: true,
						schema: { title: 'Provider Id', type: 'integer' },
						name: 'provider_id',
						in: 'path',
					},
					{
						required: true,
						schema: { title: 'Type', type: 'integer' },
						name: 'type',
						in: 'path',
					},
				],
				requestBody: {
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/TranslationPatch' },
						},
					},
					required: true,
				},
				responses: {
					'200': {
						description: 'Successful Response',
						content: { 'application/json': { schema: {} } },
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
		'/api/zipcode/1.0/nl': {
			post: {
				summary: 'Postcode Legacy',
				description: 'Zipcode -> Address lookup using postcode.nl.',
				operationId: 'postcode_legacy',
				requestBody: {
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/PostcodeNLAddressModelIn' },
						},
					},
					required: true,
				},
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/PostcodeNLAddressModel' },
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
		'/api/units/{provider_id}': {
			get: {
				tags: ['provider', 'unit'],
				summary: 'Get Unit List',
				operationId: 'get_unit_list',
				parameters: [
					{
						required: true,
						schema: { title: 'Provider Id', type: 'integer' },
						name: 'provider_id',
						in: 'path',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/json': {
								schema: {
									title: 'Response Get Unit List Api Units  Provider Id  Get',
									type: 'array',
									items: { $ref: '#/components/schemas/UnitGet' },
								},
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
		'/api/unit/{id}': {
			get: {
				tags: ['provider', 'unit'],
				summary: 'Get Unit',
				operationId: 'get_unit',
				parameters: [
					{
						required: true,
						schema: { title: 'Id', type: 'integer' },
						name: 'id',
						in: 'path',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/UnitGet' },
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
				tags: ['provider', 'unit'],
				summary: 'Delete Unit',
				description: 'Press F to pay respects.',
				operationId: 'delete_unit',
				parameters: [
					{
						required: true,
						schema: { title: 'Id', type: 'integer' },
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
				tags: ['provider', 'unit'],
				summary: 'Patch Unit',
				operationId: 'patch_unit',
				parameters: [
					{
						required: true,
						schema: { title: 'Id', type: 'integer' },
						name: 'id',
						in: 'path',
					},
				],
				requestBody: {
					content: {
						'application/json': { schema: { $ref: '#/components/schemas/Unit' } },
					},
					required: true,
				},
				responses: {
					'200': {
						description: 'Successful Response',
						content: { 'application/json': { schema: {} } },
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
		'/api/unit/': {
			post: {
				tags: ['provider', 'unit'],
				summary: 'Post Unit',
				operationId: 'post_unit',
				requestBody: {
					content: {
						'application/json': { schema: { $ref: '#/components/schemas/Unit' } },
					},
					required: true,
				},
				responses: {
					'201': {
						description: 'Successful Response',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/UnitGet' },
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
		'/api/users/': {
			get: {
				tags: ['person', 'user'],
				summary: 'Get User List',
				operationId: 'get_user_list',
				parameters: [
					{
						required: false,
						schema: { title: 'Provider Id', minimum: 1.0, type: 'integer' },
						name: 'provider_id',
						in: 'query',
					},
					{
						description: 'Search users',
						required: false,
						schema: {
							title: 'Search',
							minLength: 2,
							pattern: '^[\\w|\\*]+$',
							type: 'string',
							additionalProperties: {
								'x-quebble': {
									params: {
										role: 'search',
										schema: 'User',
										properties: ['username', 'email'],
										wildcard: true,
									},
								},
							},
							description: 'Search users',
						},
						name: 'search',
						in: 'query',
					},
					{
						required: false,
						schema: { title: 'Limit', minimum: 1.0, type: 'integer', default: 10 },
						name: 'limit',
						in: 'query',
					},
					{
						required: false,
						schema: { title: 'Offset', minimum: 0.0, type: 'integer', default: 0 },
						name: 'offset',
						in: 'query',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/json': {
								schema: {
									title: 'Response Get User List Api Users  Get',
									type: 'array',
									items: { $ref: '#/components/schemas/UserGet' },
								},
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
		'/api/user/{id}': {
			get: {
				tags: ['person', 'user'],
				summary: 'Get User',
				operationId: 'get_user',
				parameters: [
					{
						required: true,
						schema: { title: 'Id', type: 'integer' },
						name: 'id',
						in: 'path',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/UserExtended' },
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
				tags: ['person', 'user'],
				summary: 'Delete User',
				description: 'Press F to pay respects.',
				operationId: 'delete_user',
				parameters: [
					{
						required: true,
						schema: { title: 'Id', type: 'integer' },
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
				tags: ['person', 'user'],
				summary: 'Patch User',
				operationId: 'patch_user',
				parameters: [
					{
						required: true,
						schema: { title: 'Id', type: 'integer' },
						name: 'id',
						in: 'path',
					},
				],
				requestBody: {
					content: {
						'application/json': { schema: { $ref: '#/components/schemas/User' } },
					},
					required: true,
				},
				responses: {
					'200': {
						description: 'Successful Response',
						content: { 'application/json': { schema: {} } },
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
		'/api/user/': {
			post: {
				tags: ['person', 'user'],
				summary: 'Post User',
				operationId: 'post_user',
				requestBody: {
					content: {
						'application/json': {
							schema: {
								title: 'Data',
								anyOf: [
									{ $ref: '#/components/schemas/UserExtended' },
									{ type: 'array', items: { $ref: '#/components/schemas/User' } },
								],
							},
						},
					},
					required: true,
				},
				responses: {
					'201': {
						description: 'Successful Response',
						content: {
							'application/json': {
								schema: {
									title: 'Response Post User Api User  Post',
									anyOf: [
										{ $ref: '#/components/schemas/UserGet' },
										{ type: 'array', items: { type: 'integer' } },
									],
								},
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
		'/api/providers/': {
			get: {
				tags: ['provider'],
				summary: 'Get Provider List',
				operationId: 'get_provider_list',
				parameters: [
					{
						description: 'Search providers',
						required: false,
						schema: {
							title: 'Search',
							minLength: 2,
							pattern: '^[\\w|\\*]+$',
							type: 'string',
							additionalProperties: {
								'x-quebble': {
									params: {
										role: 'search',
										schema: 'Provider',
										properties: ['name'],
										wildcard: true,
									},
								},
							},
							description: 'Search providers',
						},
						name: 'search',
						in: 'query',
					},
					{
						required: false,
						schema: { title: 'Limit', minimum: 1.0, type: 'integer', default: 10 },
						name: 'limit',
						in: 'query',
					},
					{
						required: false,
						schema: { title: 'Offset', minimum: 0.0, type: 'integer', default: 0 },
						name: 'offset',
						in: 'query',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/json': {
								schema: {
									title: 'Response Get Provider List Api Providers  Get',
									type: 'array',
									items: { $ref: '#/components/schemas/ProviderList' },
								},
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
		'/api/provider/{id}': {
			get: {
				tags: ['provider'],
				summary: 'Get Provider',
				operationId: 'get_provider',
				parameters: [
					{
						required: true,
						schema: { title: 'Id', type: 'integer' },
						name: 'id',
						in: 'path',
					},
				],
				responses: {
					'200': {
						description: 'Successful Response',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/ProviderGet' },
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
				tags: ['provider'],
				summary: 'Delete Provider',
				operationId: 'delete_provider',
				parameters: [
					{
						required: true,
						schema: { title: 'Id', type: 'integer' },
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
				tags: ['provider'],
				summary: 'Patch Provider',
				operationId: 'patch_provider',
				parameters: [
					{
						required: true,
						schema: { title: 'Id', type: 'integer' },
						name: 'id',
						in: 'path',
					},
				],
				requestBody: {
					content: {
						'application/json': { schema: { $ref: '#/components/schemas/Provider' } },
					},
					required: true,
				},
				responses: {
					'200': {
						description: 'Successful Response',
						content: { 'application/json': { schema: {} } },
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
		'/api/provider/': {
			post: {
				tags: ['provider'],
				summary: 'Post Provider',
				operationId: 'post_provider',
				requestBody: {
					content: {
						'application/json': { schema: { $ref: '#/components/schemas/Provider' } },
					},
					required: true,
				},
				responses: {
					'201': {
						description: 'Successful Response',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/ProviderGet' },
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
				type: 'object',
				properties: {
					street: { title: 'Street', type: 'string' },
					street_number: { title: 'Street Number', minimum: 1.0, type: 'integer' },
					street_number_additional: {
						title: 'Street Number Additional',
						maxLength: 4,
						pattern: '\\w+',
						type: 'string',
					},
					postal_code: {
						title: 'Postal Code',
						maxLength: 6,
						minLength: 6,
						pattern: '^[1-9][0-9]{3}?(?!sa|sd|ss|SA|SD|SS)[A-Z]{2}$',
						type: 'string',
					},
					city: { title: 'City', type: 'string' },
					province: { title: 'Province', type: 'string' },
					country: { title: 'Country', type: 'string' },
					phone: { title: 'Phone', type: 'string' },
				},
			},
			Gender: {
				title: 'Gender',
				enum: ['0', '1', '2', '3'],
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
			PostcodeNLAddressModel: {
				title: 'PostcodeNLAddressModel',
				required: [
					'street',
					'number',
					'zipcode',
					'city',
					'rdX',
					'rdY',
					'latitude',
					'longitude',
				],
				type: 'object',
				properties: {
					street: { title: 'Street', type: 'string' },
					number: { title: 'Number', type: 'integer' },
					letter: { title: 'Letter', type: 'string' },
					addition: { title: 'Addition', type: 'string' },
					zipcode: { title: 'Zipcode', type: 'string' },
					city: { title: 'City', type: 'string' },
					municipality: { title: 'Municipality', type: 'string' },
					province: { title: 'Province', type: 'string' },
					rdX: { title: 'Rdx', type: 'integer' },
					rdY: { title: 'Rdy', type: 'integer' },
					latitude: { title: 'Latitude', type: 'number' },
					longitude: { title: 'Longitude', type: 'number' },
				},
			},
			PostcodeNLAddressModelIn: {
				title: 'PostcodeNLAddressModelIn',
				required: ['zipcode', 'number'],
				type: 'object',
				properties: {
					zipcode: {
						title: 'Zipcode',
						maxLength: 6,
						minLength: 6,
						pattern: '^[1-9][0-9]{3}?(?!sa|sd|ss|SA|SD|SS)[A-Z]{2}$',
						type: 'string',
					},
					number: { title: 'Number', minimum: 1.0, type: 'integer' },
					letter: { title: 'Letter', maxLength: 4, pattern: '\\w+', type: 'string' },
					addition: { title: 'Addition', maxLength: 4, pattern: '\\w+', type: 'string' },
				},
				example: { zipcode: '2712PB', number: 47 },
			},
			Provider: {
				title: 'Provider',
				required: ['name', 'description', 'contact'],
				type: 'object',
				properties: {
					name: { title: 'Name', type: 'string' },
					description: {
						title: 'Description',
						type: 'string',
						additionalProperties: { 'x-quebble': { input: { type: 'textarea' } } },
					},
					address: { $ref: '#/components/schemas/Address' },
					contact: {
						title: 'Contact',
						allOf: [{ $ref: '#/components/schemas/User' }],
						additionalProperties: {
							'x-quebble': {
								link: {
									role: 'union',
									type: 'input',
									operationId: 'get_user_list',
								},
								input: {
									type: 'select',
									value: 'id',
									for: 'integer',
									keys: ['username', 'email', 'address'],
								},
							},
						},
					},
					units: {
						title: 'Units',
						type: 'array',
						items: { $ref: '#/components/schemas/Unit' },
					},
				},
			},
			ProviderGet: {
				title: 'ProviderGet',
				required: ['date_created', 'date_updated', 'name', 'description'],
				type: 'object',
				properties: {
					id: { title: 'Id', type: 'integer' },
					date_created: { title: 'Date Created', type: 'string', format: 'date-time' },
					date_updated: { title: 'Date Updated', type: 'string', format: 'date-time' },
					name: { title: 'Name', type: 'string' },
					description: {
						title: 'Description',
						type: 'string',
						additionalProperties: { 'x-quebble': { input: { type: 'textarea' } } },
					},
					address: { $ref: '#/components/schemas/Address' },
					contact: { $ref: '#/components/schemas/UserGet' },
					units: {
						title: 'Units',
						type: 'array',
						items: { $ref: '#/components/schemas/UnitGet' },
						additionalProperties: {
							'x-quebble': {
								display: {
									role: 'list',
									type: 'tree',
									operationId: 'get_unit_list',
								},
							},
						},
						default: [],
					},
				},
			},
			ProviderList: {
				title: 'ProviderList',
				required: ['date_created', 'date_updated', 'name', 'description'],
				type: 'object',
				properties: {
					id: { title: 'Id', type: 'integer' },
					date_created: { title: 'Date Created', type: 'string', format: 'date-time' },
					date_updated: { title: 'Date Updated', type: 'string', format: 'date-time' },
					name: { title: 'Name', type: 'string' },
					description: { title: 'Description', type: 'string' },
				},
			},
			Translation: {
				title: 'Translation',
				required: ['type', 'provider_id'],
				type: 'object',
				properties: {
					type: { $ref: '#/components/schemas/TranslationType' },
					provider_id: { title: 'Provider Id', type: 'integer' },
					translation: { title: 'Translation' },
					semantic: { title: 'Semantic' },
				},
			},
			TranslationPatch: {
				title: 'TranslationPatch',
				type: 'object',
				properties: {
					type: { title: 'Type', type: 'integer' },
					translation: { title: 'Translation' },
					semantic: { title: 'Semantic' },
					provider_id: { title: 'Provider Id', type: 'integer' },
				},
			},
			TranslationPost: {
				title: 'TranslationPost',
				required: ['type'],
				type: 'object',
				properties: {
					type: { $ref: '#/components/schemas/TranslationType' },
					translation: { title: 'Translation' },
					semantic: { title: 'Semantic' },
				},
			},
			TranslationType: {
				title: 'TranslationType',
				enum: [0, 1, 2, 3, 4, 5, 6],
				type: 'integer',
				description: 'An enumeration.',
			},
			Unit: {
				title: 'Unit',
				required: ['name', 'description', 'provider_id', 'contact'],
				type: 'object',
				properties: {
					name: { title: 'Name', type: 'string' },
					description: {
						title: 'Description',
						type: 'string',
						additionalProperties: { 'x-quebble': { input: { type: 'textarea' } } },
					},
					provider_id: { title: 'Provider Id', type: 'integer' },
					image: { title: 'Image', type: 'string' },
					address: { $ref: '#/components/schemas/Address' },
					contact: {
						title: 'Contact',
						allOf: [{ $ref: '#/components/schemas/User' }],
						additionalProperties: {
							'x-quebble': {
								link: {
									role: 'union',
									type: 'input',
									operationId: 'get_user_list',
								},
								input: {
									type: 'select',
									value: 'id',
									for: 'integer',
									keys: ['username', 'email', 'address'],
								},
							},
						},
					},
					lrk_id: { title: 'Lrk Id', type: 'string' },
					type_oko: { title: 'Type Oko', type: 'string' },
					bag_id: { title: 'Bag Id', type: 'string' },
				},
			},
			UnitGet: {
				title: 'UnitGet',
				required: ['date_created', 'date_updated', 'name', 'description', 'provider_id'],
				type: 'object',
				properties: {
					id: { title: 'Id', type: 'integer' },
					date_created: { title: 'Date Created', type: 'string', format: 'date-time' },
					date_updated: { title: 'Date Updated', type: 'string', format: 'date-time' },
					name: { title: 'Name', type: 'string' },
					description: {
						title: 'Description',
						type: 'string',
						additionalProperties: { 'x-quebble': { input: { type: 'textarea' } } },
					},
					provider_id: { title: 'Provider Id', type: 'integer' },
					image: { title: 'Image', type: 'string' },
					address: { $ref: '#/components/schemas/Address' },
					contact: { $ref: '#/components/schemas/UserGet' },
					lrk_id: { title: 'Lrk Id', type: 'string' },
					type_oko: { title: 'Type Oko', type: 'string' },
					bag_id: { title: 'Bag Id', type: 'string' },
				},
			},
			User: {
				title: 'User',
				required: ['username', 'email', 'active'],
				type: 'object',
				properties: {
					username: { title: 'Username', type: 'string' },
					email: { title: 'Email', type: 'string', format: 'email' },
					active: { title: 'Active', type: 'boolean' },
					gender: { $ref: '#/components/schemas/Gender' },
					address: { $ref: '#/components/schemas/Address' },
				},
			},
			UserExtended: {
				title: 'UserExtended',
				required: ['username', 'email', 'active'],
				type: 'object',
				properties: {
					username: { title: 'Username', type: 'string' },
					email: { title: 'Email', type: 'string', format: 'email' },
					active: { title: 'Active', type: 'boolean' },
					gender: { $ref: '#/components/schemas/Gender' },
					address: { $ref: '#/components/schemas/Address' },
					avatar: { title: 'Avatar', type: 'string' },
					providers: {
						title: 'Providers',
						type: 'array',
						items: { $ref: '#/components/schemas/ProviderList' },
						additionalProperties: {
							'x-quebble': {
								link: {
									role: 'list',
									type: 'input',
									operationId: 'get_provider_list',
								},
								input: {
									type: 'select',
									value: 'id',
									keys: [
										{ name: ['description'] },
										{
											address: [
												[
													'street',
													'street_number',
													'street_number_additional',
												],
												['postal_code', 'city'],
											],
										},
									],
								},
							},
						},
					},
				},
			},
			UserGet: {
				title: 'UserGet',
				required: ['date_created', 'date_updated', 'username', 'email', 'active'],
				type: 'object',
				properties: {
					id: { title: 'Id', type: 'integer' },
					date_created: { title: 'Date Created', type: 'string', format: 'date-time' },
					date_updated: { title: 'Date Updated', type: 'string', format: 'date-time' },
					username: { title: 'Username', type: 'string' },
					email: { title: 'Email', type: 'string', format: 'email' },
					active: { title: 'Active', type: 'boolean' },
					gender: { $ref: '#/components/schemas/Gender' },
					address: { $ref: '#/components/schemas/Address' },
					providers: {
						title: 'Providers',
						type: 'array',
						items: { $ref: '#/components/schemas/ProviderList' },
						additionalProperties: {
							'x-quebble': {
								link: {
									role: 'list',
									type: 'input',
									operationId: 'get_provider_list',
								},
								input: {
									type: 'select',
									value: 'id',
									keys: [
										{ name: ['description'] },
										{
											address: [
												[
													'street',
													'street_number',
													'street_number_additional',
												],
												['postal_code', 'city'],
											],
										},
									],
								},
							},
						},
					},
				},
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
