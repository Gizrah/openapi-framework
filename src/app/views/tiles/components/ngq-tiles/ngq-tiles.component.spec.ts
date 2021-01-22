import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing'
import { MatRippleModule } from '@angular/material/core'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { ActivatedRoute, RouterModule } from '@angular/router'
import { RouterTestingModule } from '@angular/router/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { NgqButtonComponent, NgqCardComponent, NgqDescriptionComponent } from '@quebble/components'
import { environment } from '@quebble/environment'
import { OpenApiService } from '@quebble/services'
import { NgqPaginationComponent } from 'app/common/components/ngq-pagination/ngq-pagination.component'
import { HttpLoaderFactory } from 'app/common/factories/ngx-translate.factory'
import { OpenApiFactory } from 'app/common/factories/openapi.factory'
import {
	WebServiceConfigProvider,
	WebServiceProvider,
} from 'app/common/factories/webservice.factory'
import { Chunk } from 'app/common/services/openapi/models/chunk.model'
import { OpenApiChunkService } from 'app/common/services/openapi/service/chunk.service'
import { OpenApiCoreService } from 'app/common/services/openapi/service/core.service'
import {
	GeneratorOptions,
	GeneratorService,
} from 'app/common/services/openapi/service/generator.service'
import { openApiJson } from 'test/openapi.json'
import { ResponseDirective } from 'app/common/services/response/directive/response.directive'
import { TranslinkPipe } from 'app/common/services/translation/pipe/translink.pipe'
import { NgqTileComponent } from '../ngq-tile/ngq-tile.component'
import { NgqTilesComponent } from './ngq-tiles.component'

describe('NgqTilesComponent', () => {
	let component: NgqTilesComponent
	let fixture: ComponentFixture<NgqTilesComponent>
	let openApiService: OpenApiService
	let chunkService: OpenApiChunkService
	let generatorService: GeneratorService

	beforeEach(fakeAsync(() => {
		TestBed.configureTestingModule({
			declarations: [
				NgqTilesComponent,
				NgqTilesComponent,
				NgqTileComponent,
				NgqPaginationComponent,
				ResponseDirective,
				NgqCardComponent,
				NgqButtonComponent,
				NgqDescriptionComponent,
				TranslinkPipe,
			],
			imports: [
				RouterTestingModule,
				HttpClientTestingModule,
				MatRippleModule,
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
				{
					provide: ActivatedRoute,
					useValue: {},
				},
				TranslateLoader,
				OpenApiService,
				WebServiceConfigProvider,
				WebServiceProvider,
				...OpenApiFactory,
			],
		})

		environment.generate = true

		openApiService = TestBed.inject(OpenApiService)
		generatorService = TestBed.inject(GeneratorService)

		fixture = TestBed.createComponent(NgqTilesComponent)
		component = fixture.componentInstance

		fixture.detectChanges()

		const init = openApiService.init(true, openApiJson as any, true)
		tick()

		expect(init).toBeTruthy()

		chunkService = TestBed.inject(OpenApiChunkService)
		tick()
	}))

	it('should be created', () => {
		expect(component).toBeTruthy()
	})

	it('should be filled with an array of items', fakeAsync(() => {
		const chunkgroup = chunkService.getChunkGroup(['tiles', 'providers'], 'get', 'view')
		const last = chunkgroup.views.last
		const view = last ? last.view : ({} as any)
		const operation = view.operation || ({} as any)
		const schemas = operation.schemas
		const schema = schemas ? schemas.get('get') : ({} as any)

		const options: GeneratorOptions = {
			rangeMin: 1,
			rangeMax: 10,
		}
		const array = generatorService.generateSchemaData(schema, options, true)

		component.chunk = view
		component.array = array

		expect(component.array.length).toBeGreaterThan(0)
		expect(component.schema).toBeTruthy()
		expect(component.prefix).toBeTruthy()
	}))
})
