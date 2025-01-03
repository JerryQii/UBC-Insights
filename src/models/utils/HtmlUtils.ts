// models/utils/HtmlUtils.ts

export function findNodes(node: any, predicate: (node: any) => boolean): any[] {
	let result: any[] = [];

	if (predicate(node)) {
		result.push(node);
	}

	if (node.childNodes) {
		for (const child of node.childNodes) {
			result = result.concat(findNodes(child, predicate));
		}
	}

	return result;
}

export function getTextContent(node: any): string {
	let text = "";

	if (node.nodeName === "#text") {
		text += node.value;
	}

	if (node.childNodes) {
		for (const child of node.childNodes) {
			text += getTextContent(child);
		}
	}

	return text;
}
