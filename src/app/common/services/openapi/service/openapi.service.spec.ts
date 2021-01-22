import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { fakeAsync, TestBed, tick } from '@angular/core/testing'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { RouterTestingModule } from '@angular/router/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { HttpLoaderFactory } from 'src/app/common/factories/ngx-translate.factory'
import { OpenApiFactory } from 'src/app/common/factories/openapi.factory'
import {
	WebServiceConfigProvider,
	WebServiceProvider,
} from 'src/app/common/factories/webservice.factory'
import { openApiJson } from 'src/test/openapi.json'
import { OpenApiService } from './openapi.service'

describe('OpenApiService', () => {
	let service: OpenApiService

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [
				RouterTestingModule,
				HttpClientTestingModule,
				MatSnackBarModule,
				TranslateModule.forRoot({
					loader: {
						provide: TranslateModule,
						useFactory: HttpLoaderFactory,
						deps: [HttpClient],
					},
				}),
			],
			providers: [
				OpenApiService,
				WebServiceConfigProvider,
				WebServiceProvider,
				...OpenApiFactory,
				TranslateLoader,
			],
		})

		service = TestBed.inject(OpenApiService)
	})

	it('should be created', () => {
		expect(service).toBeTruthy()
	})

	it('should retrieve the provider schema', fakeAsync(() => {
		const init = service.init(false, openApiJson as any)
		tick()

		const schema = service.getSchema('Provider')
		expect(schema).toBeDefined()
	}))
})
