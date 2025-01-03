import JSZip = require("jszip");
import { InsightError } from "../controller/IInsightFacade";

const OVERALL_YEAR = 1900;

export class Section {
	public readonly uuid: string; // Corresponds to "id" (identifier for the section)
	public readonly id: string; // Corresponds to "Course" (course identifier)
	public readonly title: string; // Corresponds to "Title" (name of the course)
	public readonly instructor: string; // Corresponds to "Professor" (instructor name)
	public readonly dept: string; // Corresponds to "Subject" (department)
	public readonly year: number; // Corresponds to "Year" (year of the section)
	public readonly avg: number; // Corresponds to "Avg" (average grade)
	public readonly pass: number; // Corresponds to "Pass" (number of students who passed)
	public readonly fail: number; // Corresponds to "Fail" (number of students who failed)
	public readonly audit: number; // Corresponds to "Audit" (number of students who audited)
	[key: string]: any;

	constructor(sectionData: any) {
		// Validate and assign the required fields
		if (!this.isValidSectionData(sectionData)) {
			throw new Error("Invalid section data");
		}

		this.uuid = String(sectionData.id); // Mapping "id" to "uuid"
		this.id = sectionData.Course; // Mapping "Course" to "id"
		this.title = sectionData.Title; // Mapping "Title" to "title"
		this.instructor = sectionData.Professor; // Mapping "Professor" to "instructor"
		this.dept = sectionData.Subject; // Mapping "Subject" to "dept"
		// Check if the Year is "overall", and replace it with OVERALL_YEAR if so
		this.year = sectionData.Section === "overall" ? OVERALL_YEAR : Number(sectionData.Year);
		this.avg = Number(sectionData.Avg); // Mapping "Avg" to "avg"
		this.pass = Number(sectionData.Pass); // Mapping "Pass" to "pass"
		this.fail = Number(sectionData.Fail); // Mapping "Fail" to "fail"
		this.audit = Number(sectionData.Audit); // Mapping "Audit" to "audit"
	}

	private isValidSectionData(sectionData: any): boolean {
		const requiredFields = [
			"id", // Corresponds to "uuid"
			"Course", // Corresponds to "id"
			"Title", // Corresponds to "title"
			"Professor", // Corresponds to "instructor"
			"Subject", // Corresponds to "dept"
			"Year", // Corresponds to "year"
			"Avg", // Corresponds to "avg"
			"Pass", // Corresponds to "pass"
			"Fail", // Corresponds to "fail"
			"Audit", // Corresponds to "audit"
		];
		for (const field of requiredFields) {
			if (!(field in sectionData)) {
				return false;
			}
		}
		return true;
	}
}

// Helper function to get course files from the zip
export function getCourseFiles(zip: JSZip): JSZip.JSZipObject[] {
	const courseFolder = "courses/";
	const courseFiles: JSZip.JSZipObject[] = [];

	zip.folder(courseFolder)?.forEach((_, file) => {
		if (!file.dir) {
			courseFiles.push(file);
		}
	});

	if (courseFiles.length === 0) {
		throw new InsightError("No course files found in the dataset - Team 117");
	}

	return courseFiles;
}

// Helper function to process course files
export async function processCourseFiles(courseFiles: JSZip.JSZipObject[]): Promise<Section[]> {
	const sectionPromises = courseFiles.map(async (file) => {
		try {
			const fileData = await file.async("text");
			const jsonData = JSON.parse(fileData);
			const resultSections = jsonData.result;
			const fileSections: Section[] = [];

			if (Array.isArray(resultSections)) {
				for (const sectionData of resultSections) {
					try {
						const section = new Section(sectionData);
						fileSections.push(section);
					} catch {
						// Skip invalid sections
					}
				}
			}

			return fileSections;
		} catch {
			// Ignore invalid files
			return [];
		}
	});

	const sectionsArrays = await Promise.all(sectionPromises);
	const sections = sectionsArrays.flat();

	if (sections.length === 0) {
		throw new InsightError("No valid sections found in the dataset - Team 117");
	}

	return sections;
}
