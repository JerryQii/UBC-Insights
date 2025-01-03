// InsightFacade.ts

import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightResult,
	InsightError,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import JSZip = require("jszip"); // Import JSZip
import * as fs from "fs-extra"; // Import fs-extra
import * as path from "path"; // Import path
import { IsQueryValid, ParseQuery, ApplyOptions } from "../models/Query";
import { ApplyFilter } from "../models/Filter";
import { Query } from "../models/QueryInterfaces";
import { Section, getCourseFiles, processCourseFiles } from "../models/Sections"; // Import Section class and helpers
import { Room } from "../models/rooms/Rooms";
import { getRoomFiles, processRoomFiles } from "../models/rooms/RoomParser";
import { ApplyTransformation } from "../models/Transformation";
// remove above import of applykeys
//import { ApplyTransformation } from "../models/Transformation";

interface Dataset {
	kind: InsightDatasetKind;
	numRows: number;
	sections?: Section[];
	rooms?: Room[];
}

export let DATASETID: string;
export let KIND: string;

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasets = new Map<string, Dataset>();
	private dataDir: string;
	private ready: Promise<void>;

	constructor() {
		this.dataDir = path.join(process.cwd(), "data");
		this.ready = fs.ensureDir(this.dataDir).then(async () => {
			await this.loadDatasetsFromDisk();
		});
	}

	private async loadDatasetsFromDisk(): Promise<void> {
		try {
			const files = await fs.readdir(this.dataDir);
			const jsonFiles = files.filter((file) => file.endsWith(".json"));

			const datasetPromises = jsonFiles.map(async (file) => {
				const filePath = path.join(this.dataDir, file);
				try {
					const dataset = await fs.readJson(filePath);
					const id = path.basename(file, ".json");
					this.datasets.set(id, dataset);
				} catch {
					// Handle errors if necessary
				}
			});

			await Promise.all(datasetPromises);
		} catch {
			// Handle errors if necessary
		}
	}

	//////////////////////////////////////////////////////////////////
	////////////////////////// addDataset() //////////////////////////
	//////////////////////////////////////////////////////////////////

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let datasetAdded = false; // Flag to indicate if dataset was added during this call
		try {
			// Step 1: Validate inputs
			this.validateAddDatasetInputs(id, kind);

			// Step 2: Decode zip content
			const zip = await this.decodeZipContent(content);

			// Step 3: Process dataset based on the kind
			const dataset = await this.processDatasetByKind(kind, zip);

			// Step 4: Store the dataset
			this.datasets.set(id, dataset);
			datasetAdded = true; // Dataset has been added

			// Step 5: Persist the dataset to disk
			await this.persistDataset(id, dataset);

			// Step 6: Return list of dataset ids
			return Array.from(this.datasets.keys());
		} catch (e) {
			// Only remove the dataset if it was added during this call
			if (datasetAdded) {
				this.datasets.delete(id);
				// Also consider deleting the persisted file if necessary
				const filePath = path.join(this.dataDir, `${id}.json`);
				await fs.remove(filePath);
			}
			return Promise.reject(e);
		}
	}

	// Combined helper to process dataset by kind
	private async processDatasetByKind(kind: InsightDatasetKind, zip: JSZip): Promise<Dataset> {
		let dataset: Dataset;

		if (kind === InsightDatasetKind.Sections) {
			// Step 3a: Get course files
			const courseFiles = getCourseFiles(zip);

			// Step 4a: Process course files
			const sections = await processCourseFiles(courseFiles);

			dataset = {
				kind: kind,
				sections: sections,
				numRows: sections.length,
			};
		} else if (kind === InsightDatasetKind.Rooms) {
			// Step 3b: Get room files
			const roomFiles = await getRoomFiles(zip);

			// Step 4b: Process room files
			const rooms = await processRoomFiles(roomFiles);

			dataset = {
				kind: kind,
				rooms: rooms,
				numRows: rooms.length,
			};
		} else {
			throw new InsightError("Unsupported dataset kind - Team 117");
		}

		return dataset;
	}

	//////////////////////////////////////////////////////////////////
	///////////////////////// removeDataset() ////////////////////////
	//////////////////////////////////////////////////////////////////

	public async removeDataset(id: string): Promise<string> {
		// Validate id
		if (!this.isValidId(id)) {
			return Promise.reject(new InsightError("Invalid id - Team 117"));
		}

		// Check if dataset exists in memory
		if (!this.datasets.has(id)) {
			// Try to check if the dataset exists on disk
			const filePath = path.join(this.dataDir, `${id}.json`);
			try {
				await fs.access(filePath);
			} catch {
				// Dataset does not exist
				return Promise.reject(new NotFoundError(`Dataset with id "${id}" not found - Team 117`));
			}
		}

		// Remove the dataset file from disk
		try {
			const filePath = path.join(this.dataDir, `${id}.json`);
			await fs.unlink(filePath);
		} catch {
			return Promise.reject(new InsightError(`Failed to remove dataset file - Team 117`));
		}

		// Remove the dataset from the in-memory Map
		this.datasets.delete(id);

		// Return the id of the removed dataset
		return Promise.resolve(id);
	}

	//////////////////////////////////////////////////////////////////
	////////////////////////// listDatasets() ////////////////////////
	//////////////////////////////////////////////////////////////////

	public async listDatasets(): Promise<InsightDataset[]> {
		await this.ready; // Ensure datasets are loaded
		const datasetsList: InsightDataset[] = [];

		for (const [id, dataset] of this.datasets) {
			datasetsList.push({
				id: id,
				kind: dataset.kind,
				numRows: dataset.numRows,
			});
		}

		return datasetsList;
	}

	//////////////////////////////////////////////////////////////////
	///////////////////////// performQuery() /////////////////////////
	//////////////////////////////////////////////////////////////////

	public async performQuery(uquery: unknown): Promise<InsightResult[]> {
		await this.ready; // Ensure datasets are loaded
		IsQueryValid(uquery); // Format check
		const query = uquery as Query;
		DATASETID = query.OPTIONS.COLUMNS[0].split("_")[0];

		// Load the dataset lazily
		const dataset = await this.getDataset(DATASETID);

		// Determine if the dataset is sections or rooms
		let dataToQuery: any[];
		if (dataset.kind === InsightDatasetKind.Sections && dataset.sections) {
			dataToQuery = dataset.sections;
			KIND = "sections";
		} else if (dataset.kind === InsightDatasetKind.Rooms && dataset.rooms) {
			dataToQuery = dataset.rooms;
			KIND = "rooms";
		} else {
			throw new InsightError("Dataset does not exist or has invalid kind");
		}

		const queryObject = ParseQuery(query, dataToQuery, KIND); // Parse query to a query object
		const filteredData = ApplyFilter(queryObject);
		const { transformedData, applyKeys } = ApplyTransformation(queryObject, filteredData);
		const finalResult = ApplyOptions(queryObject, transformedData, applyKeys);

		const maximumNumber = 5000;
		if (finalResult.length > maximumNumber) {
			throw new ResultTooLargeError("more than 5000 results");
		}
		return finalResult;
	}

	//////////////////////////////////////////////////////////////////
	///////////////////////////// Helpers ////////////////////////////
	//////////////////////////////////////////////////////////////////

	private isValidId(id: string): boolean {
		if (!id || id.trim().length === 0) {
			return false;
		}
		// id cannot contain whitespace
		if (/\s/.test(id)) {
			return false;
		}
		// id cannot contain underscores
		if (/_/.test(id)) {
			return false;
		}
		return true;
	}

	private validateAddDatasetInputs(id: string, kind: InsightDatasetKind): void {
		if (!this.isValidId(id)) {
			throw new InsightError("Invalid id - Team 117");
		}

		if (kind !== InsightDatasetKind.Sections && kind !== InsightDatasetKind.Rooms) {
			throw new InsightError("Invalid kind: Only 'sections' and 'rooms' are supported - Team 117");
		}

		if (this.datasets.has(id)) {
			throw new InsightError("Dataset with this id already exists - Team 117");
		}
	}

	private async decodeZipContent(content: string): Promise<JSZip> {
		let zipData: Buffer;
		try {
			zipData = Buffer.from(content, "base64");
		} catch (e) {
			throw new InsightError(`Failed to decode base64 content - Team 117. Error is ${e}`);
		}

		let zip: JSZip;
		try {
			zip = await JSZip.loadAsync(zipData);
		} catch (e) {
			throw new InsightError(`Failed to load zip content - Team 117. Error is ${e}`);
		}

		return zip;
	}

	private async persistDataset(id: string, dataset: any): Promise<void> {
		const filePath = path.join(this.dataDir, `${id}.json`);
		try {
			await fs.writeJson(filePath, dataset);
		} catch (e) {
			throw new InsightError(`Failed to persist dataset to disk: ${e}`);
		}
	}

	private async getDataset(id: string): Promise<Dataset> {
		const dataset = this.datasets.get(id);
		if (dataset) {
			return dataset; // Return the dataset if it's found in memory
		}

		// If the dataset is not in memory, try to load it from disk
		const filePath = path.join(this.dataDir, `${id}.json`);
		try {
			const datasetFromDisk = await fs.readJson(filePath);

			// Validate the dataset structure
			if (datasetFromDisk.kind && datasetFromDisk.numRows !== undefined) {
				this.datasets.set(id, datasetFromDisk); // Cache it in memory
				return datasetFromDisk;
			} else {
				throw new InsightError(`Dataset with id "${id}" has invalid structure. - Team 117`);
			}
		} catch {
			throw new InsightError(`Dataset with id "${id}" not found on disk. - Team 117`);
		}
	}
}
