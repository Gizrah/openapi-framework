export { isNaB, parseBool } from './boolean'
export { hasValue } from './hasvalue'
export { Methods } from './methods'
export { dolog } from './log'
export { asArray } from './asarray'
export { noNull, toNull } from './nulling'
export { isPrimitive } from './isprimitive'
export { isGuid } from './isguid'
export { isLink } from './islink'
export { childOf } from './childof'
export { rndStr, rndNum } from './random'
import * as faker_ from './faker'
import { Faker } from './faker.interface'

faker_.locale = 'nl'
// export { faker }
export const faker: Faker = faker_
