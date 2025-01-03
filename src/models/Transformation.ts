import Decimal from "decimal.js";
import { InsightError } from "../controller/IInsightFacade";
import { DATASETID, KIND } from "../controller/InsightFacade";
//import { Section } from "./Sections";

import { ParsedQuery } from "./QueryInterfaces";

// export const applyKeys: string[] = [];
const APPLYTOKENS = ["MAX", "MIN", "AVG", "COUNT", "SUM"];

export function ApplyTransformation(query: ParsedQuery, data: any[]): { transformedData: any[]; applyKeys: string[] } {
	if (query.transformation === undefined) {
		return { transformedData: data, applyKeys: [] };
	}
	const applyKeys = IsTransformationValid(query);
	const group = ApplyGroup(query, data);
	const applied = ApplyApply(query, group, applyKeys);
	return { transformedData: applied, applyKeys };
}

export function IsTransformationValid(query: ParsedQuery): string[] {
	const transformation = query.transformation;
	const applyKeys: string[] = [];

	if (transformation !== undefined) {
		validateGroupAndApply(transformation);
		processApplyRules(transformation, applyKeys);
		validateGroupKeys(transformation);
	}

	return applyKeys;
}

// Helper function to validate GROUP and APPLY presence
function validateGroupAndApply(transformation: any): void {
	if (transformation.GROUP === null || transformation.APPLY === null) {
		throw new InsightError("GROUP and APPLY MUST BE PRESENTED");
	} else if (transformation.GROUP.length === 0) {
		throw new InsightError("EMPTY GROUP");
	}
}

// Helper function to process APPLY rules and update applyKeys
function processApplyRules(transformation: any, applyKeys: string[]): void {
	for (const applyobject of transformation.APPLY) {
		const applykey = Object.keys(applyobject)[0];
		validateApplyKey(applykey, applyKeys);

		const applyToken = Object.keys(applyobject[applykey])[0];
		const key = applyobject[applykey][applyToken];

		validateApplyTokenAndKey(applyToken, key);
		applyKeys.push(applykey);
	}
}

// Helper function to validate APPLY key
function validateApplyKey(applykey: string, applyKeys: string[]): void {
	if (applykey.includes("_")) {
		throw new InsightError("APPLY KEY INCLUDE UNDERSCORE");
	}
	if (applyKeys.includes(applykey)) {
		throw new InsightError("APPLY KEY MUST BE UNIQUE");
	}
}

// Helper function to validate APPLY token and key
function validateApplyTokenAndKey(applyToken: string, key: string): void {
	if (!APPLYTOKENS.includes(applyToken)) {
		throw new InsightError("INVALID APPLY TOKEN");
	}
	if (key.split("_")[0] !== DATASETID || !IsFieldValidKind(key.split("_")[1])) {
		throw new InsightError("INVALID KEY IN APPLY KEY OBJECT");
	}
}

// Helper function to validate GROUP keys
function validateGroupKeys(transformation: any): void {
	for (const key of transformation.GROUP) {
		if (!key.includes("_") || !IsFieldValidKind(key.split("_")[1])) {
			throw new InsightError("invalid group key");
		}
	}
}

export function ApplyGroup(query: ParsedQuery, datas: any[]): any {
	if (!query.transformation) {
		throw new InsightError("Transformation is undefined - Team 117");
	}

	const groupKeys = query.transformation.GROUP; // Keys with prefixes
	const groupedData: Record<string, any[]> = {};

	for (const data of datas) {
		const keyValues = groupKeys.map((gkey: string) => {
			const fieldName = gkey.includes("_") ? gkey.split("_")[1] : gkey;
			return data[fieldName];
		});
		const groupKey = keyValues.join("_"); // Create a unique key for the group
		if (!groupedData[groupKey]) {
			groupedData[groupKey] = [];
		}
		groupedData[groupKey].push(data);
	}

	return groupedData;
}

export function ApplyApply(query: any, Gobject: any, applyKeys: string[]): any[] {
	const apply = query.transformation.APPLY;
	const result: any[] = [];
	if (apply.length === 0) {
		for (const key in Gobject) {
			const single = Gobject[key][0];
			result.push(single);
		}
		return result;
	} else {
		return ApplyLong(query, Gobject, applyKeys);
	}
}

function ApplyLong(query: any, Gobject: any, applyKeys: string[]): any[] {
	const result: any[] = [];
	const apply = query.transformation.APPLY;
	if (apply.length > 0) {
		for (const key in Gobject) {
			const single = { ...Gobject[key][0] }; // Create a copy to avoid mutating original data
			for (let i = 0; i < apply.length; i++) {
				const applykey = applyKeys[i];
				const applyobject = apply[i];
				const applyTokenObj = applyobject[applykey];
				const applyToken = Object.keys(applyTokenObj)[0];
				const keyValue = applyTokenObj[applyToken];
				const fieldkey = keyValue.split("_")[1];
				//APPLYRULE ::= '{' applykey ': {' APPLYTOKEN ':' KEY '} }'
				if (applyToken === "MAX" && IsMFieldValidKind(fieldkey)) {
					single[applykey] = applyMax(Gobject[key], fieldkey);
				} else if (applyToken === "MIN" && IsMFieldValidKind(fieldkey)) {
					single[applykey] = applyMin(Gobject[key], fieldkey);
				} else if (applyToken === "AVG" && IsMFieldValidKind(fieldkey)) {
					single[applykey] = applyAvg(Gobject[key], fieldkey);
				} else if (applyToken === "COUNT" && IsFieldValidKind(fieldkey)) {
					single[applykey] = applyCount(Gobject[key], fieldkey);
				} else if (applyToken === "SUM" && IsMFieldValidKind(fieldkey)) {
					single[applykey] = applySum(Gobject[key], fieldkey);
				} else {
					throw new InsightError("INVALID TOKEN OR FIELD NAME");
				}
			}
			result.push(single);
		}
		return result;
	}
	throw new InsightError("APPLY BLOCK IS INVALID OR EMPTY");
}

function applyMax(list: any[], fieldkey: string): number {
	//list is a list of section/room objects
	const maxitem = list.reduce((prev, current) => {
		return current[fieldkey] > prev[fieldkey] ? current : prev;
	});
	return maxitem[fieldkey];
}

function applyMin(list: any[], fieldkey: string): number {
	const values = list.map((item) => item[fieldkey]).filter((value) => value !== undefined && value !== null);
	if (values.length === 0) {
		throw new InsightError("No valid values for MIN calculation");
	}
	return Math.min(...values);
}

const FIXEDDIGITS = 2;

function applyAvg(list: any[], fieldkey: string): number {
	//list is a list of section/room objects
	const numRows = list.length;
	let total = new Decimal(0);
	for (const object of list) {
		const value = new Decimal(object[fieldkey]);
		total = Decimal.add(total, value);
	}
	const avg = total.toNumber() / numRows;

	return Number(avg.toFixed(FIXEDDIGITS));
}

function applySum(list: any[], fieldkey: string): number {
	//list is a list of section/room objects
	let total = new Decimal(0);
	for (const object of list) {
		const value = new Decimal(object[fieldkey]);
		total = Decimal.add(total, value);
	}
	return Number(total.toFixed(FIXEDDIGITS));
}

function applyCount(list: any[], fieldkey: string): number {
	//list is a list of section/room objects
	const result: any = [];
	for (const object of list) {
		result.push(object[fieldkey]);
	}
	return new Set(result).size;
}

export function IsFieldValidKind(field: string): Boolean {
	const sectionfields = ["avg", "pass", "fail", "audit", "year", "dept", "id", "instructor", "title", "uuid"];
	const roomfields = [
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
	const kind = KIND;
	if (kind === "sections") {
		return sectionfields.includes(field);
	} else if (kind === "rooms") {
		return roomfields.includes(field);
	}
	throw new InsightError("INVALID DATASET KIND");
}

export function IsMFieldValidKind(field: string): Boolean {
	const sectionMfields = ["avg", "pass", "fail", "audit", "year"];
	const roomMfields = ["lat", "lon", "seats"];
	const kind = KIND;
	if (kind === "sections") {
		return sectionMfields.includes(field);
	} else if (kind === "rooms") {
		return roomMfields.includes(field);
	}
	throw new InsightError("INVALID DATASET KIND");
}

export function IsSFieldValidKind(field: string): Boolean {
	const sectionSfields = ["dept", "id", "instructor", "title", "uuid "];
	const roomSfields = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
	const kind = KIND;
	if (kind === "sections") {
		return sectionSfields.includes(field);
	} else if (kind === "rooms") {
		return roomSfields.includes(field);
	}
	throw new InsightError("INVALID DATASET KIND");
}
