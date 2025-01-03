import { InsightError, InsightResult } from "../controller/IInsightFacade";
// import { DATASETID } from "../controller/InsightFacade";
import { GetCalFilter } from "./Filter";
//import { Section } from "./Sections";
import { Query, Options, Comparator, MkeyNumber, SkeyString, ParsedQuery } from "./QueryInterfaces";
// import { applyKeys } from "./Transformation";

export const querystructure = ["WHERE", "OPTIONS"];
export const transtructure = ["WHERE", "OPTIONS", "TRANSFORMATIONS"];
export const optionstructure = ["COLUMNS", "ORDER"];

//QUERY VALIDATION FORMAT, other details will be checked later
export function IsQueryValid(uquery: unknown): boolean {
	const query = uquery as Query;
	//check the QUERY level of ENBF
	if (typeof query !== "object" || query === null || query === undefined) {
		throw new InsightError("invalid query");
	}
	if (Object.keys(query).length !== querystructure.length && Object.keys(query).length !== transtructure.length) {
		//console.log(Object.keys(query));
		throw new InsightError("INVALID STRUCTURE");
	}
	// Ensure that the top-level keys are all uppercase
	for (const key of Object.keys(query)) {
		if (!transtructure.includes(key)) {
			throw new InsightError(`Unexpected key: ${key}. Expected keys: WHERE, OPTIONS, TRANSFORMATIONS.`);
		}
	}

	if (typeof query.WHERE !== "object" || query.WHERE === null || query.WHERE === undefined) {
		throw new InsightError("WHERE is invalid");
	}

	if (Object.keys(query.WHERE).length > 1) {
		throw new InsightError("more than one filter in WHERE");
	}

	if (typeof query.OPTIONS !== "object" || query.OPTIONS === null || query.OPTIONS === undefined) {
		throw new InsightError("OPTIONS is invalid");
	}

	IsQueryValidpart2(uquery);

	//Object.keys of string[] will print the list so we dont check

	return true; //either return true or throw error
}

export function IsQueryValidpart2(uquery: unknown): void {
	const query = uquery as Query;
	if (Object.keys(query.OPTIONS).length > optionstructure.length) {
		throw new InsightError("more than two components in OPTIONS");
	}

	if (
		typeof query.OPTIONS.COLUMNS !== "object" ||
		query.OPTIONS.COLUMNS === null ||
		query.OPTIONS.COLUMNS === undefined
	) {
		// typeof string[] is object
		throw new InsightError("COLUMN is invalid");
	}

	if (query.TRANSFORMATIONS !== undefined) {
		if (
			typeof query.TRANSFORMATIONS !== "object" ||
			Object.keys(query.TRANSFORMATIONS).length !== optionstructure.length
		) {
			throw new InsightError("Transformation is invalid");
		}
	}
}

export function ParseQuery(query: Query, dataset: any[], kind: string): ParsedQuery {
	const options = GetOptions(query);
	const transformation = query.TRANSFORMATIONS;

	if (Object.keys(query.WHERE).length === 0) {
		if (transformation === undefined) {
			return {
				kind: kind,
				dataset: dataset,
				options: options,
			};
		} else if (typeof transformation === "object") {
			return {
				kind: kind,
				dataset: dataset,
				options: options,
				transformation: transformation,
			};
		}
		throw new InsightError("Transformation is invalid");
	}
	return ParseQuerypart2(query, dataset, kind);
}

export function ParseQuerypart2(query: Query, dataset: any[], kind: string): ParsedQuery {
	const options = GetOptions(query);
	const datasetid = query.OPTIONS.COLUMNS[0].split("_")[0];
	const transformation = query.TRANSFORMATIONS;
	const filter = GetCalFilter(query.WHERE, dataset, datasetid);
	if (transformation === undefined) {
		return {
			kind: kind,
			dataset: dataset,
			filter: filter,
			options: options,
		};
	} else if (typeof transformation === "object") {
		return {
			kind: kind,
			dataset: dataset,
			options: options,
			filter: filter,
			transformation: transformation,
		};
	}
	throw new InsightError("Transformation is invalid");
}

//GET OPTIONS OBJECT FOR PARSED QUERY AND VALIDATION
//!!!!!!!!!! NEED ORDER FIX
function GetOptions(query: Query): Options {
	const columns: string[] = query.OPTIONS.COLUMNS; // Keep columns as-is
	const order = query.OPTIONS.ORDER;

	// Extract dataset IDs from columns
	const idStrings: string[] = columns
		.map((str) => (str.includes("_") ? str.split("_")[0] : undefined))
		.filter((id): id is string => id !== undefined);

	if (!idStrings.every((id) => id === idStrings[0])) {
		throw new InsightError("Multiple dataset IDs in columns");
	}

	// Validate ORDER
	if (order !== undefined) {
		if (typeof order === "string") {
			// ORDER is a string
			if (!columns.includes(order)) {
				throw new InsightError("ORDER key not in COLUMNS");
			}
		} else if (typeof order === "object") {
			// ORDER is an object
			const orderKeys: string[] = order.keys;
			for (const orderKey of orderKeys) {
				if (!columns.includes(orderKey)) {
					throw new InsightError("ORDER key not in COLUMNS");
				}
			}
		} else {
			throw new InsightError("Invalid ORDER");
		}
	}

	return {
		COLUMNS: columns, // Keep columns as-is with prefixes
		ORDER: order,
	};
}

const mfields = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
const sfields = [
	"dept",
	"id",
	"instructor",
	"title",
	"uuid",
	"fullname",
	"shortname",
	"number",
	"name",
	"address",
	"type",
	"furniture",
	"href",
];

export function IsValidKeyNumber(keynumber: MkeyNumber | SkeyString, comparator: Comparator, datasetid: string): void {
	//keynumber validation
	if (Object.keys(keynumber).length !== 1) {
		throw new InsightError("invalid filter m/skey field");
	}
	const mskey = Object.keys(keynumber)[0]; //mkey or skey
	const keycontent = keynumber[mskey]; // number or input string
	const idstring = mskey.split("_")[0]; //idstring aka dataset id
	if (idstring !== datasetid) {
		throw new InsightError("invalid dataset id");
	}
	const msfield = mskey.split("_")[1]; // mfield or sfield

	if (["LT", "GT", "EQ"].includes(comparator)) {
		if (!mfields.includes(msfield)) {
			throw new InsightError("invalid key in LT GT EQ");
		}

		if (mfields.includes(msfield) && typeof keycontent !== "number") {
			throw new InsightError("invalid key content in LT GT EQ");
		}
	}

	if (comparator === "IS") {
		if (!sfields.includes(msfield)) {
			throw new InsightError("invalid key in IS ");
		}

		if (sfields.includes(msfield) && typeof keycontent !== "string") {
			throw new InsightError("invalid key content in IS");
		}

		if (sfields.includes(msfield) && typeof keycontent === "string") {
			IsWildcardValid(keycontent);
		}
	}

	if (!mfields.includes(msfield) && !sfields.includes(msfield)) {
		throw new InsightError("invalid key in comparator block");
	}
}

export function wildcardcheck(val: string, content: string): boolean {
	// IsWildcardValid should have been called before this function
	const startsWithWildcard = val.startsWith("*");
	const endsWithWildcard = val.endsWith("*");
	const innerVal = val.substring(startsWithWildcard ? 1 : 0, endsWithWildcard ? val.length - 1 : val.length);

	if (startsWithWildcard && endsWithWildcard) {
		// Contains
		return content.includes(innerVal);
	} else if (startsWithWildcard) {
		// Ends with
		return content.endsWith(innerVal);
	} else if (endsWithWildcard) {
		// Starts with
		return content.startsWith(innerVal);
	} else {
		// Exact match
		return content === val;
	}
}

export function IsWildcardValid(val: string): boolean {
	if (val.includes("*")) {
		const inner = val.slice(1, -1);
		if (inner.includes("*")) {
			throw new InsightError("Invalid wildcard");
		}
	}
	return true;
}
const validfield = [
	"avg",
	"pass",
	"fail",
	"audit",
	"year",
	"dept",
	"id",
	"instructor",
	"title",
	"uuid",
	"lat",
	"lon",
	"seats",
	"fullname",
	"shortname",
	"number",
	"name",
	"address",
	"type",
	"furniture",
	"href",
];

export function ApplyOptions(pquery: ParsedQuery, sections: any[], applyKeys: string[]): InsightResult[] {
	const trans = pquery.transformation;
	const options = pquery.options;
	const columns: string[] = options.COLUMNS;
	const order = options.ORDER;

	// Validate columns
	validateColumns(columns, trans, applyKeys);

	// Generate results based on sections and columns
	const result = generateResults(sections, columns, applyKeys);

	// Apply ORDER if present
	return ApplyOrder(order, result);
}

// Helper function to validate COLUMNS against GROUP and APPLY keys
function validateColumns(columns: string[], trans: any, applyKeys: string[]): void {
	if (trans !== undefined) {
		const groupKeys = trans.GROUP;
		for (const colKey of columns) {
			if (!groupKeys.includes(colKey) && !applyKeys.includes(colKey)) {
				throw new InsightError("Keys in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS is present");
			}
		}
	} else {
		for (const colKey of columns) {
			const field = colKey.includes("_") ? colKey.split("_")[1] : colKey;
			if (!validfield.includes(field)) {
				throw new InsightError("Invalid key in OPTIONS COLUMNS" + "_" + field);
			}
		}
	}
}

// Helper function to generate result objects
function generateResults(sections: any[], columns: string[], applyKeys: string[]): Record<string, any>[] {
	const result: Record<string, any>[] = [];

	sections.forEach((element) => {
		const iresult: Record<string, any> = {};
		columns.forEach((colKey) => {
			let fieldName: string;
			if (applyKeys.includes(colKey)) {
				fieldName = colKey;
			} else {
				fieldName = colKey.includes("_") ? colKey.split("_")[1] : colKey;
			}
			const value = element[fieldName];
			iresult[colKey] = value;
		});
		result.push(iresult);
	});

	return result;
}

function ApplyOrder(order: any, result: InsightResult[]): InsightResult[] {
	//console.log(order);
	//console.log("BEGIN order");
	//console.log("type of order is " + typeof order);
	if (order === undefined) {
		return result as InsightResult[];
	} else if (typeof order === "string") {
		return result.sort((a, b): any => {
			return a[order] > b[order] ? 1 : -1;
			// zero indicate same value so cannot just use >
		});
	} else if (typeof order === "object") {
		if (order.dir !== "UP" && order.dir !== "DOWN") {
			throw new InsightError("INVALID DIR");
		}
		if (order.keys === undefined || typeof order.keys !== "object") {
			throw new InsightError("INVALID ORDER KEYS");
		}
		//console.log(order);
		return result.sort((a, b): any => {
			for (const key of order.keys) {
				if (a[key] > b[key]) {
					//console.log(a[key] + "_" + b[key]);
					return order.dir === "DOWN" ? -1 : 1;
				} else if (a[key] < b[key]) {
					//console.log(a[key] + "_" + b[key]);
					return order.dir === "DOWN" ? 1 : -1;
				}
			}
		});
	}
	throw new InsightError("");
}
