import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'
import { fakeAsync, TestBed, tick } from '@angular/core/testing'
import { OpenApiFactory } from 'src/app/common/factories/openapi.factory'
import {
	WebServiceConfigProvider,
	WebServiceProvider,
} from 'src/app/common/factories/webservice.factory'
import { IOpenApi } from '../interfaces'
import { OpenApiCoreService } from './core.service'
import { openApiJson } from 'src/test/openapi.json'

describe('OpenApiCoreService', () => {
	let service: OpenApiCoreService
	let httpMock: HttpTestingController

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule],
			providers: [
				OpenApiCoreService,
				WebServiceConfigProvider,
				WebServiceProvider,
				...OpenApiFactory,
			],
		})
		service = TestBed.inject(OpenApiCoreService)
		httpMock = TestBed.inject(HttpTestingController)
	})

	it('should be created', () => {
		expect(service).toBeTruthy()
	})

	it('should retrieve the openapi.json file', fakeAsync(() => {
		let retrievedJson: IOpenApi
		service.init().then((json) => (retrievedJson = json))

		const openapiRequest = httpMock.expectOne('/core/openapi.json')
		openapiRequest.flush(openApiJson)

		tick()
		expect(retrievedJson).toEqual(openApiJson as any)
	}))
})
