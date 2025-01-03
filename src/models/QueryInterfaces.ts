import { Section } from "../models/Sections"; // Import the Section class

export interface Query {
	WHERE: Filter;
	OPTIONS: Options;
	TRANSFORMATIONS?: Transformation;
}

export interface Filter {
	//USED ONLY FOR QUERY TYPE ASSERTION
	//KEY NEED TO BE USED FOR FILTER CALCULATION
	//SO IT SHOULD BE A PROPERTY (CalFilter)
	//LOGICCOMPARISON
	AND?: Filter[];
	OR?: Filter[];
	//MCOMPARISON
	LT?: MkeyNumber;
	GT?: MkeyNumber;
	EQ?: MkeyNumber;
	//SCOMPARISON
	IS?: SkeyString;
	//NEGATION
	NOT?: Filter;
}

export interface Options {
	COLUMNS: string[]; //string of keys (need to check key ENBF)
	ORDER?: string | Oobject; // (need to check key ENBF)
}

export interface Oobject {
	dir: string;
	keys: string[];
}

export interface Transformation {
	GROUP: string[];
	APPLY: Apply[]; // can be empty
}

export type Apply = Record<string, Record<string, string>>;

export type Comparator = "AND" | "OR" | "LT" | "GT" | "EQ" | "IS" | "NOT";

export interface CalFilter {
	//Filter interface used for filter calculation,
	comparator: Comparator;
}

export interface LCalFilter extends CalFilter {
	//logic filter
	lcomparator: CalFilter[];
}

export interface FinalCalFilter extends CalFilter {
	key: string; //skey or mkey
	val: string | number; // the content used in comparison
}

export type MkeyNumber = Record<string, number>;

export type SkeyString = Record<string, string>;

export interface ParsedQuery {
	kind: string;
	dataset: Section[];
	filter?: CalFilter;
	options: Options;
	transformation?: Transformation;
}
