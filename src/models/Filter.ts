import { InsightError } from "../controller/IInsightFacade";
import { IsValidKeyNumber, IsWildcardValid, wildcardcheck } from "./Query";
import {
	Filter,
	CalFilter,
	Comparator,
	LCalFilter,
	MkeyNumber,
	SkeyString,
	FinalCalFilter,
	ParsedQuery,
} from "./QueryInterfaces";

//GET CALFILTER OBJECT FOR PARSED QUERY AND VALIDATION USING RECURSION OVER FILTER

export function GetCalFilter(filter: Filter, dataset: any[], datasetid: string): CalFilter {
	if (Object.keys(filter).length !== 1) {
		//there should be only one filter object
		throw new InsightError("invalid filter");
	}
	if (filter.AND !== null && filter.AND !== undefined) {
		if (!Array.isArray(filter.AND) || (filter.AND as Filter[]).length === 0) {
			throw new InsightError("AND must be a non-empty array");
		}
		return GetLCalfilter(filter.AND, dataset, "AND", datasetid);
	}
	if (filter.OR !== null && filter.OR !== undefined) {
		if (!Array.isArray(filter.OR) || (filter.OR as Filter[]).length === 0) {
			throw new InsightError("OR must be a non-empty array");
		}
		return GetLCalfilter(filter.OR, dataset, "OR", datasetid);
	}
	if (filter.LT !== null && filter.LT !== undefined) {
		return GetFinalCalfilter(filter.LT, dataset, "LT", datasetid);
	}
	if (filter.GT !== null && filter.GT !== undefined) {
		return GetFinalCalfilter(filter.GT, dataset, "GT", datasetid);
	}
	if (filter.EQ !== null && filter.EQ !== undefined) {
		return GetFinalCalfilter(filter.EQ, dataset, "EQ", datasetid);
	}
	if (filter.IS !== null && filter.IS !== undefined) {
		return GetFinalCalfilter(filter.IS, dataset, "IS", datasetid);
	}
	if (filter.NOT !== null && filter.NOT !== undefined) {
		return NGetLCalfilter(filter.NOT, dataset, "NOT", datasetid);
	}
	throw new InsightError("comparator invalid"); // this line can only be reached by invalid comparator
}
function GetLCalfilter(filter: Filter[], dataset: any[], comparator: Comparator, datasetid: string): LCalFilter {
	const lcomparator: CalFilter[] = [];
	if (filter.length === 0) {
		throw new InsightError("empty filter list");
	}
	for (const f of filter) {
		lcomparator.push(GetCalFilter(f, dataset, datasetid));
	}

	return {
		comparator: comparator,
		lcomparator: lcomparator,
	};
}
function NGetLCalfilter(filter: Filter, dataset: any[], comparator: Comparator, datasetid: string): LCalFilter {
	// FOR NEGATION CUZ THE SINGLE FILTER AND TYPE UNION SUCKS
	if (filter === null || filter === undefined) {
		throw new InsightError("invalid filter");
	}
	const lcomparator: CalFilter[] = [];
	lcomparator.push(GetCalFilter(filter, dataset, datasetid));
	return {
		comparator: comparator,
		lcomparator: lcomparator,
	};
}
function GetFinalCalfilter(
	keynumber: MkeyNumber | SkeyString,
	dataset: any[],
	comparator: Comparator,
	datasetid: string
): FinalCalFilter {
	if (dataset === undefined) {
		throw new InsightError("empty dataset");
	}
	IsValidKeyNumber(keynumber, comparator, datasetid);
	const mskey = Object.keys(keynumber)[0]; //mkey or skey
	const keycontent = keynumber[mskey]; // number or input string
	const msfield = mskey.split("_")[1]; // mfield or sfield
	return {
		comparator: comparator,
		key: msfield,
		val: keycontent, //change
	};
}

export function ApplyFilter(parsedquery: ParsedQuery): any[] {
	if (parsedquery.filter === undefined) {
		return parsedquery.dataset;
	}
	const filter = parsedquery.filter;
	return parsedquery.dataset.filter((element) => FilterCalculation(element, filter)); // every section have to pass the filter to be added (filtered)
}

export function FilterCalculation(section: any, filter: CalFilter): boolean {
	let result = true;
	const lcalfilter = filter as LCalFilter;
	const fcalfilter = filter as FinalCalFilter;
	const comparator: string = filter.comparator;

	if (comparator === "AND") {
		result = true;
		lcalfilter.lcomparator.forEach((element) => (result = result && FilterCalculation(section, element)));
		return result;
	} else if (comparator === "OR") {
		result = false;
		lcalfilter.lcomparator.forEach((element) => (result = result || FilterCalculation(section, element)));
		return result;
	} else if (comparator === "NOT") {
		return !FilterCalculation(section, lcalfilter.lcomparator[0]); // not only have 1 filter
	} else if (comparator === "LT") {
		return section[fcalfilter.key] < fcalfilter.val;
	} else if (comparator === "GT") {
		return section[fcalfilter.key] > fcalfilter.val;
	} else if (comparator === "EQ") {
		return section[fcalfilter.key] === fcalfilter.val;
	} else if (comparator === "IS") {
		const valstring = fcalfilter.val.toString();
		const content = section[fcalfilter.key];
		// 'IsWildcardValid' will throw an error if the wildcard pattern is invalid
		if (IsWildcardValid(valstring)) {
			return wildcardcheck(valstring, content);
		}
	}
	throw new InsightError("invalid comparator");
}
