# QuebbleFrontEnd

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Core API

To run the Quebble-Core API locally;

```bash
# niet clonen in de frontend map ;)
git clone git@git.quebble.com:microservices/quebble-core.git qcore
cd qcore
docker-compose up

cd ../frontend
ng serve
```

[localhost:4300/core/](http://localhost:4300/core/)

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io). Currently it is using Chrome to show all the test results. In the terminal you can see which tests are passing and which are failing.

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Running linting

Run `yarn lint` to execute ESLint.

# How does the application work (2021-01-22)

The AppComponent starts the different OpenApi services by initializing the
`OpenApiService.init()` method. Each of the services in the init handles a
different task. It also fires up the `OpenApiRouteService.init()` method in its
constructor.

## OpenApi Services:

The CoreService retrieves the json file from the backend and stores it so other
services can use it later on.

The SchemaService parses the json file's component section and extracts all the
available Schema Objects and stores them. It checks which paths also uses the
same schemas, so the application can do some comparisons later on. It also finds
which OpenApi specs need to be applied. Once these are set, the schemas are used
to create object definitions and property definitions. These are used in generic
components to determine how to display each property of the object they got.

The PathsService parses the paths section of the json file and does some
splitting and dividing, so there's a menu for the application. As a backup it
also stores the Operation Objects for each path, which is also used to create
proper menu items.

The SecurityService checks for path security and starts up the Keycloak class
if found. Each call will ask this service to check logged in state and to get
the current token.

The OperationService extracts available methods from the paths section of the
json file, converts it in to an Operation object that holds all the static info
for each operation id as specified by the json file. These Operation objects are
used throughout the application to parse dynamic data with known static info.

The ChunkService initially converts the given url to chunks of data, split by
each known operation. Each Chunk holds the actual data for that part of the
route, as well as information about route and links. Each Chunk is used to
determine the current view and content.

The GeneratorService creates and/or uses Schema Objects to create fake data
using Faker. It has some basic options to create certain ranges and parameters.
It has very basic support for searching in available generated data if a back-
end 'call' is made. The GeneratorService disables the SecurityService and re-
routes all calls to the backend.

## OpenApiRouteService:

The RouteService uses the Angular Router events to check for URL changes and
pokes the ChunkService to create an initial ChunkGroup. Each Chunk in the group
can be clicked via the NgqBarComponent (breadcrumb bar) which in turn switches
the view to the activated Chunk. Clicking on a link in the view will ask the
ChunkService to generate Chunks for the new route, based on the information
available in the Chunk.

The ViewComponent listens to the observable for the current view Chunk and
changes itself automatically.

## The Rest

It's based on the premise that the openapi json file can change according to the
roles and/or rights a user has. As such, there's no typed data classes for any
of the backend calls. Instead, the OpenApi Schema Object as defined in the json
file is used to match the content of the payload to when sending data. It is
also used to create forms using `ngx-formly` via the OpenApiFormlyService, which
is a heavily modified version of the JSONSchema service Formly provides.

View components don't care about the type of data that comes in and instead use
many layers of generic components to determine its content. Though some help is
provided by using the ObjectDefs and PropDefs to determine what and how to
display item properties.

The StorageService is the go-to for application caching and uses BehaviorSubject
objects from RxJs to store the latest information components need. Many services
that don't need self storage use the StorageService instead.

The ResponseService handles all kinds of errors. HTTP errors are displayed to
the user directly below the form. Any other error is sent to the custom Material
Snackbar component that displays a possible slew of information for the end
user.

The TranslinkService is an extended version of the `ngx-translate` Translation
Service, which allows for similar behavior as the OpenApi does when referencing
schemas with `#/components/schemas/Schema` instead of putting the same data in
each time. The translation file allows such linking as well and the custom
TranslinkService extracts these references when loading the file and fills in
the translation object with the extracted links. There was an attempt for
singular/plural, but that was put on hold earlier because of way lower priority
than... well anything.

The RouteParamsService has just been deprecated by the OpenApiRouteService, but
it was used to extract path parameters from the entire route easily in to a map,
but since the app doesn't use path parameters, it became obsolete quickly.

The AddressService is used to communicate with the address microservice.

The LoadingService generates a spinner on components that have it enabled.

The InterceptorService injects a custom error message that is used by the
ResponseService to create a proper error message.
