/**
 * @summary
 * Uses Node.compareDocumentPosition() to check for the existence
 * and type of child element in relation to the parent, instead
 * of DOM-traversal. The possible bitmask values are:
 *
 * Name											Value
 * DOCUMENT_POSITION_DISCONNECTED				1
 * DOCUMENT_POSITION_PRECEDING					2
 * DOCUMENT_POSITION_FOLLOWING					4
 * DOCUMENT_POSITION_CONTAINS					8
 * DOCUMENT_POSITION_CONTAINED_BY				16
 * DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC	32
 *
 * For anything contained somewhere in the parent, the value will
 * be either 16 or 20 (heaven knows why) and for anything Angular
 * adds and/or removes it's going to be either 35 or 37.
 * Why these values? ... No clue, the documentation is not really
 * complete on MDN.
 *
 * @param container element that should hold the child element
 * @param comparator possible child element to check container for
 *
 * @returns boolean of it being a child element
 */
export const childOf = (
	container: Element | Node,
	comparator: Element | Node,
	ignoreIS?: boolean,
): boolean => {
	if (!container || !comparator) return false
	if (!container.compareDocumentPosition) return false

	const pos = container?.compareDocumentPosition(comparator) ?? 0

	// Comparator must at least be contained by
	if (pos >= 16) {
		// And less than 24, otherwise weird stuff is found
		if (pos <= 24) return true

		// Ignore Implementation Specific?
		if (ignoreIS) return false

		// Otherwise, if it's a custom component (i.e. Angular component)
		if (pos >= 32) {
			// Which can range from 32 to 37-ish
			if (pos <= 37) return true
		}
	}

	// None of those matched, so nope, no kid.
	return false
}
