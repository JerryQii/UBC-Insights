// models/rooms/RoomParser.ts

import JSZip = require("jszip");
import { parse } from "parse5";
import { Room } from "./Rooms";
import { InsightError } from "../../controller/IInsightFacade";
import { findNodes, getTextContent } from "../utils/HtmlUtils";
import { fetchGeolocation } from "../utils/Geolocation";
import * as path from "path";

/**
 * Extracts room files from the provided ZIP object.
 * @param zip The JSZip object containing the dataset.
 * @returns An array of JSZip objects representing room files.
 */
export async function getRoomFiles(zip: JSZip): Promise<JSZip.JSZipObject[]> {
	const indexFile = zip.file("index.htm");
	if (!indexFile) {
		throw new InsightError("Missing index.htm in the dataset - Team 117");
	}

	const indexContent = await indexFile.async("text");
	const document = parse(indexContent);
	const buildingPaths = extractBuildingPaths(document);

	const roomFiles: JSZip.JSZipObject[] = [];
	for (const buildingPath of buildingPaths) {
		const normalizedPath = buildingPath.replace(/^\.\//, "").replace(/^\//, "");
		const file = zip.file(normalizedPath);
		if (file) {
			roomFiles.push(file);
		}
	}

	if (roomFiles.length === 0) {
		throw new InsightError("No building files found in the dataset - Team 117");
	}

	return roomFiles;
}

/**
 * Processes the room files to extract room data.
 * @param roomFiles An array of JSZip objects representing room files.
 * @returns A promise that resolves to an array of Room objects.
 */
export async function processRoomFiles(roomFiles: JSZip.JSZipObject[]): Promise<Room[]> {
	const rooms: Room[] = [];
	const buildingGeoCache: Record<string, { lat: number; lon: number }> = {};

	// Process all room files concurrently
	const filePromises = roomFiles.map(async (file) => {
		const buildingContent = await file.async("text");
		const document = parse(buildingContent);

		const buildingInfo = extractBuildingInfo(document, file.name);

		// Fetch geolocation if not already cached
		if (!buildingGeoCache[buildingInfo.address]) {
			try {
				const geo = await fetchGeolocation(buildingInfo.address);
				buildingGeoCache[buildingInfo.address] = geo;
			} catch {
				buildingGeoCache[buildingInfo.address] = { lat: 0, lon: 0 };
			}
		}

		const { lat, lon } = buildingGeoCache[buildingInfo.address];
		return extractRoomsFromBuilding(document, buildingInfo, lat, lon);
	});

	// Wait for all promises to resolve
	const results = await Promise.all(filePromises);

	// Flatten the results
	for (const buildingRooms of results) {
		rooms.push(...buildingRooms);
	}

	// Filter out invalid rooms (if any slipped through)
	const validRooms = filterRoom(rooms);

	if (validRooms.length === 0) {
		throw new InsightError("No valid rooms found in the dataset - Team 117");
	}

	return validRooms;
}

function filterRoom(rooms: Room[]): Room[] {
	return rooms.filter((room) => {
		return (
			room.fullname !== undefined &&
			room.shortname !== undefined &&
			room.number !== undefined &&
			room.name !== undefined &&
			room.address !== undefined &&
			room.lat !== undefined &&
			room.lon !== undefined &&
			room.seats !== undefined &&
			room.furniture !== undefined
			// Note: We removed `room.type` and `room.href` checks from the validation
		);
	});
}

/**
 * Extracts building paths from the index.htm document.
 * @param document The parsed HTML document of index.htm.
 * @returns An array of building file paths.
 */
function extractBuildingPaths(document: any): string[] {
	const buildingPaths: string[] = [];

	const tdNodes = findNodes(
		document,
		(node: any) =>
			node.nodeName === "td" &&
			node.attrs?.some((attr: any) => attr.name === "class" && attr.value.includes("views-field-title"))
	);

	for (const td of tdNodes) {
		const aNode = findNodes(td, (node: any) => node.nodeName === "a")[0];
		if (aNode) {
			const hrefAttr = aNode.attrs.find((attr: any) => attr.name === "href");
			if (hrefAttr) {
				const hrefValue = hrefAttr.value.replace(/^\.\//, "").replace(/^\//, "");
				buildingPaths.push(hrefValue);
			}
		}
	}

	return buildingPaths;
}

/**
 * Extracts building information from a building HTML document.
 * @param document The parsed HTML document of the building file.
 * @param filename The name of the building file.
 * @returns An object containing fullname, shortname, and address of the building.
 */
function extractBuildingInfo(
	document: any,
	filename: string
): { fullname: string; shortname: string; address: string } {
	let fullname = "";
	const shortname = path.basename(filename, ".htm").toUpperCase();
	let address = "";

	const buildingInfoNode = findNodes(
		document,
		(node: any) =>
			node.nodeName === "div" && node.attrs?.some((attr: any) => attr.name === "id" && attr.value === "building-info")
	)[0];

	if (buildingInfoNode) {
		const h2Node = findNodes(buildingInfoNode, (node: any) => node.nodeName === "h2")[0];
		if (h2Node) {
			fullname = getTextContent(h2Node).trim();
		}

		const addressNode = findNodes(
			buildingInfoNode,
			(node: any) =>
				node.nodeName === "div" &&
				node.attrs?.some((attr: any) => attr.name === "class" && attr.value === "building-field")
		)[0];
		if (addressNode) {
			address = getTextContent(addressNode).trim();
		}
	}

	if (!fullname || !shortname || !address) {
		throw new InsightError("Failed to extract building information - Team 117");
	}

	return { fullname, shortname, address };
}

/**
 * Extracts rooms from a building HTML document.
 * @param document The parsed HTML document of the building file.
 * @param buildingInfo The building information object.
 * @param lat The latitude of the building.
 * @param lon The longitude of the building.
 * @returns An array of Room objects.
 */
function extractRoomsFromBuilding(
	document: any,
	buildingInfo: { fullname: string; shortname: string; address: string },
	lat: number,
	lon: number
): Room[] {
	const rooms: Room[] = [];

	const roomTable = findNodes(
		document,
		(node: any) =>
			node.nodeName === "table" &&
			node.attrs?.some((attr: any) => attr.name === "class" && attr.value.includes("views-table"))
	)[0];

	if (!roomTable) {
		return rooms; // Building has no rooms
	}

	const tbody = findNodes(roomTable, (node: any) => node.nodeName === "tbody")[0];
	if (!tbody) {
		return rooms;
	}

	const rows = findNodes(tbody, (node: any) => node.nodeName === "tr");

	for (const row of rows) {
		const room = parseRoomRow(row, buildingInfo, lat, lon);
		if (room) {
			rooms.push(room);
		}
	}

	return rooms;
}

/**
 * Parses a table row to extract room information.
 * @param row The table row node.
 * @param buildingInfo The building information object.
 * @param lat The latitude of the building.
 * @param lon The longitude of the building.
 * @returns A Room object or null if parsing fails.
 */
function parseRoomRow(
	row: any,
	buildingInfo: { fullname: string; shortname: string; address: string },
	lat: number,
	lon: number
): Room | null {
	const cells = findNodes(row, (node: any) => node.nodeName === "td");

	if (cells.length === 0) {
		return null;
	}

	// Extract room details from the cells
	const roomNumber = extractRoomNumber(cells);
	const roomSeats = extractRoomSeats(cells);
	const roomType = extractRoomType(cells); // This could be an empty string
	const roomFurniture = extractRoomFurniture(cells);
	const roomHref = extractRoomHref(cells);

	// Check if core room details are present
	if (roomNumber && roomSeats && roomFurniture) {
		const roomName = `${buildingInfo.shortname}_${roomNumber}`;
		const roomData = {
			fullname: buildingInfo.fullname,
			shortname: buildingInfo.shortname,
			number: roomNumber,
			name: roomName,
			address: buildingInfo.address,
			lat: lat,
			lon: lon,
			seats: roomSeats,
			type: roomType || "", // Default to "Unknown" if roomType is not provided
			furniture: roomFurniture,
			href: roomHref ?? "", // If href is not present, default to an empty string
		};
		return new Room(roomData);
	} else {
		return null;
	}
}

/**
 * Helper function to extract room number from cells.
 * @param cells An array of cell nodes.
 * @returns The room number as a string.
 */
function extractRoomNumber(cells: any[]): string {
	for (const cell of cells) {
		const classValue = cell.attrs?.find((attr: any) => attr.name === "class")?.value;
		const cellContent = getTextContent(cell).trim();

		if (classValue?.includes("views-field-field-room-number")) {
			const aTag = findNodes(cell, (node: any) => node.nodeName === "a")[0];
			return aTag ? getTextContent(aTag).trim() : cellContent;
		}
	}
	return "";
}

/**
 * Helper function to extract room seats from cells.
 * @param cells An array of cell nodes.
 * @returns The number of seats as a number.
 */
function extractRoomSeats(cells: any[]): number {
	for (const cell of cells) {
		const classValue = cell.attrs?.find((attr: any) => attr.name === "class")?.value;
		const cellContent = getTextContent(cell).trim();

		if (classValue?.includes("views-field-field-room-capacity")) {
			return parseInt(cellContent, 10);
		}
	}
	return 0;
}

/**
 * Helper function to extract room type from cells.
 * @param cells An array of cell nodes.
 * @returns The room type as a string.
 */
function extractRoomType(cells: any[]): string {
	for (const cell of cells) {
		const classValue = cell.attrs?.find((attr: any) => attr.name === "class")?.value;
		const cellContent = getTextContent(cell).trim();

		if (classValue?.includes("views-field-field-room-type")) {
			return cellContent;
		}
	}
	return "";
}

/**
 * Helper function to extract room furniture from cells.
 * @param cells An array of cell nodes.
 * @returns The room furniture as a string.
 */
function extractRoomFurniture(cells: any[]): string {
	for (const cell of cells) {
		const classValue = cell.attrs?.find((attr: any) => attr.name === "class")?.value;
		const cellContent = getTextContent(cell).trim();

		if (classValue?.includes("views-field-field-room-furniture")) {
			return cellContent;
		}
	}
	return "";
}

/**
 * Helper function to extract room href from cells.
 * @param cells An array of cell nodes.
 * @returns The room href as a string.
 */
function extractRoomHref(cells: any[]): string {
	for (const cell of cells) {
		const classValue = cell.attrs?.find((attr: any) => attr.name === "class")?.value;

		if (classValue?.includes("views-field-field-room-number")) {
			const href = findNodes(cell, (node: any) => node.nodeName === "a")[0]?.attrs?.find(
				(attr: any) => attr.name === "href"
			)?.value;
			return href ?? "";
		}
	}
	return "";
}
