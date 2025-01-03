import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
	//ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

use(chaiAsPromised);

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let campus: string;
	//let sectionsnot64: string;
	let sectionsjson: string;
	let sectionswrongfoldername: string;
	let sectionsnocourse: string;
	let sectionsnofolder: string;
	let sectionsnotjson: string;
	let sectionstrash: string;
	let sectionsmisspass: string;
	let sectionsingle: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		campus = await getContentFromArchives("campus.zip");
		//sectionsnot64 = await getContentFromArchives("singlecousenot64.zip");
		sectionsjson = await getContentFromArchives("singlecousejsonwformat.zip");
		sectionswrongfoldername = await getContentFromArchives("singlecousenotcourses.zip");
		sectionsnocourse = await getContentFromArchives("nocourse.zip");
		sectionsnofolder = await getContentFromArchives("nofolder.zip");
		sectionsnotjson = await getContentFromArchives("notjson.zip");
		sectionstrash = await getContentFromArchives("coursetrash.zip");
		sectionsmisspass = await getContentFromArchives("invalidsectionmissingpass.zip");
		sectionsingle = await getContentFromArchives("singlecouse.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("AddDataset", function () {
		beforeEach(function () {
			facade = new InsightFacade();
		});

		afterEach(async function () {
			await clearDisk();
		});

		it("should reject with invalid section missing pass", function () {
			const result = facade.addDataset("abc", sectionsmisspass, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with invalid course content", function () {
			const result = facade.addDataset("abc", sectionstrash, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with not json file in folder", function () {
			const result = facade.addDataset("abc", sectionsnotjson, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with no folder", function () {
			const result = facade.addDataset("abc", sectionsnofolder, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with empty courses folder", function () {
			const result = facade.addDataset("abc", sectionsnocourse, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with wrong folder name", function () {
			const result = facade.addDataset("abc", sectionswrongfoldername, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should pass", function () {
			const result = facade.addDataset("abc", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.have.members(["abc"]);
		});

		it("should pass case sensitive", async function () {
			await facade.addDataset("XYZ", sections, InsightDatasetKind.Sections);
			const result = await facade.addDataset("xyz", sections, InsightDatasetKind.Sections);
			return expect(result).to.include.members(["xyz"]);
		});

		it("should reject with an empty dataset id", function () {
			const result = facade.addDataset("", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with a dataset id that contains underscore", function () {
			const result = facade.addDataset("abc_", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with a dataset id that's the same as the id of an already added dataset", async function () {
			await facade.addDataset("abc", sections, InsightDatasetKind.Sections);
			const result = facade.addDataset("abc", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with a dataset kind that is not Sections", function () {
			const result = facade.addDataset("abc", sections, InsightDatasetKind.Rooms);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with a dataset that has wrong json format trailing comma", function () {
			const result = facade.addDataset("abc", sectionsjson, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with empty dataset", function () {
			const result = facade.addDataset("abc", "", InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should add a valid rooms dataset", async function () {
			const result = await facade.addDataset("rooms", campus, InsightDatasetKind.Rooms);
			expect(result).to.include("rooms");
		});

		it("should reject adding a rooms dataset with an existing ID", async function () {
			await facade.addDataset("rooms", campus, InsightDatasetKind.Rooms);
			const result = facade.addDataset("rooms", campus, InsightDatasetKind.Rooms);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject a rooms dataset missing index.htm", async function () {
			const invalidCampus = await getContentFromArchives("missingIndex.zip");
			const result = facade.addDataset("rooms", invalidCampus, InsightDatasetKind.Rooms);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject a rooms dataset with invalid content", async function () {
			const invalidRooms = await getContentFromArchives("noValidRooms.zip");
			const result = facade.addDataset("rooms", invalidRooms, InsightDatasetKind.Rooms);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
	});

	describe("RemoveDataset", function () {
		beforeEach(function () {
			facade = new InsightFacade();
		});

		afterEach(async function () {
			await clearDisk();
		});
		it("should pass add remove add", async function () {
			await facade.addDataset("abcde", sections, InsightDatasetKind.Sections);
			await facade.removeDataset("abcde");
			const result = await facade.addDataset("abcde", sections, InsightDatasetKind.Sections);
			return expect(result).to.include.members(["abcde"]);
		});

		it("should reject because removing a dataset that doesn't exist", function () {
			const result = facade.removeDataset("abcd");
			return expect(result).to.eventually.be.rejectedWith(NotFoundError);
		});

		it("should reject because invalid id only whitespace", function () {
			const result = facade.removeDataset("    ");
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject because invalid id underscore", function () {
			const result = facade.removeDataset("ab_c");
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
	});

	describe("ListDatasets", function () {
		beforeEach(function () {
			facade = new InsightFacade();
		});

		afterEach(async function () {
			await clearDisk();
		});

		it("should list an empty dataset", function () {
			const result = facade.listDatasets();
			return expect(result).to.eventually.deep.equal([]);
		});

		it("should list one dataset", async function () {
			await facade.addDataset("abc", sections, InsightDatasetKind.Sections);
			const result = facade.listDatasets();
			return expect(result).to.eventually.deep.equal([
				{ id: "abc", kind: InsightDatasetKind.Sections, numRows: 64612 },
			]);
		});

		it("should list one dataset single row", async function () {
			await facade.addDataset("abcd", sectionsingle, InsightDatasetKind.Sections);
			const result = facade.listDatasets();
			return expect(result).to.eventually.deep.equal([{ id: "abcd", kind: InsightDatasetKind.Sections, numRows: 1 }]);
		});

		it("should list both rooms and sections datasets", async function () {
			await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
			await facade.addDataset("rooms", campus, InsightDatasetKind.Rooms);
			const result = await facade.listDatasets();
			expect(result).to.deep.include.members([
				{ id: "sections", kind: InsightDatasetKind.Sections, numRows: 64612 },
				{ id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 364 },
			]);
		});

		it("should list rooms dataset when only rooms dataset is added", async function () {
			await facade.addDataset("rooms", campus, InsightDatasetKind.Rooms);
			const result = await facade.listDatasets();
			expect(result).to.deep.equal([{ id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 364 }]);
		});
	});

	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		async function checkQuery(this: Mocha.Context): Promise<any> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			let result: InsightResult[];

			try {
				result = await facade.performQuery(input);
			} catch (err) {
				if (!errorExpected) {
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				//return expect(err).to.deep.equal(expected); // TODO: replace with your assertions
				if (err instanceof InsightError) {
					return expect(expected).to.deep.equal("InsightError");
				} else if (err instanceof ResultTooLargeError) {
					return expect(expected).to.deep.equal("ResultTooLargeError");
				} else {
					return expect.fail();
				}
				//return expect.fail();
			}
			if (errorExpected) {
				expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
			}
			return expect(result).to.deep.equal(expected); // TODO: replace with your assertions
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("rooms", campus, InsightDatasetKind.Rooms),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.

		// it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		// it("[valid/chunksimple.json] chunky query test", checkQuery);

		it("[valid/wildcardleft.json] wildcardleft", checkQuery);
		it("[valid/wildcardright.json] wildcardright", checkQuery);
		it("[valid/wildcardboth.json] wildcardboth", checkQuery);
		it("[valid/superbulk.json] super chunky query", checkQuery);

		it("[invalid/invalid.json] Query missing WHERE", checkQuery);
		it("[invalid/toolargeresult.json] returning > 5000 results", checkQuery);
		it("[invalid/auditformat.json] invalid audit format", checkQuery);
		it("[invalid/avgformat.json] invalid avg format", checkQuery);
		it("[invalid/deptformat.json] invalid dept format", checkQuery);
		it("[invalid/failformat.json] invalid fail format", checkQuery);
		it("[invalid/idformat.json] invalid id format", checkQuery);
		it("[invalid/instructorformat.json] invalid instructor format", checkQuery);
		it("[invalid/ismkey.json] IS followed by mkey", checkQuery);
		it("[invalid/mcomparatorskey.json] mcomparator followed by skey", checkQuery);
		it("[invalid/nobody.json] missing body", checkQuery);
		it("[invalid/nooption.json] missing option", checkQuery);
		it("[invalid/noquery.json] missing whole query", checkQuery);
		it("[invalid/ordernotincolumns.json] order key not in columns", checkQuery);
		it("[invalid/passformat.json] invalid pass format", checkQuery);
		it("[invalid/titleformat.json] invalid title format", checkQuery);
		it("[invalid/uuidformat.json] invalid uuid format", checkQuery);
		it("[invalid/wrongidstring.json] invalid id string", checkQuery);
		it("[invalid/wronglogic.json] invalid logic", checkQuery);
		it("[invalid/wrongmcomparator.json] invalid mcomparator", checkQuery);
		it("[invalid/wrongmkey.json] invalid mkey", checkQuery);

		it("[invalid/wrongwildcard.json] should fail cuz invalid use of wildcards", checkQuery);
		it("[invalid/yearformat.json] invalid year format", checkQuery);

		it("[invalid/casesensitive.json] test case sensitive", checkQuery);

		it("[invalid/orwrongbucket.json] wrong bucket", checkQuery);

		it("[valid/iSMultiTests.json] TESTING THE IS ", checkQuery);

		it("[valid/room/validroomeasy.json] room easy", checkQuery);
		it("[valid/room/roomchunk.json] room chunk", checkQuery);
		it("[valid/room/roommultigroup.json] room multi group", checkQuery);
		it("[invalid/room/roomcolumntrans.json] column key invalid", checkQuery);
		it("[invalid/room/orderkeymustcolumn.json] column key must be in column", checkQuery);

		it("[valid/room/findTheMinimumRoomCapacityPerBuilding.json] findTheMinimumRoomCapacityPerBuilding", checkQuery);
		it("[valid/room/countUniqueFurnitureTypesPerBuilding.json] countUniqueFurnitureTypesPerBuilding", checkQuery);
		it("[valid/room/findRoomsNorthOfLatitude49.26.json] findRoomsNorthOfLatitude49.26", checkQuery);
		it("[valid/room/validRandom.json] valid random", checkQuery);
		it(
			"[valid/room/findMaxRoomCapacityPerBuildingAndFurnitureType.json] findMaxRoomCapacityPerBuildingAndFurnitureType",
			checkQuery
		);
		it("[valid/room/calculateTotalSeatsPerBuilding.json] calculateTotalSeatsPerBuilding", checkQuery);
		it(
			"[valid/room/averageRoomCapacityWestOfLongitude-123.25.json] averageRoomCapacityWestOfLongitude-123.25",
			checkQuery
		);
		it("[valid/room/maximumSeatsPerBuilding.json] maximumSeatsPerBuilding", checkQuery);
		it("[valid/room/minimumRoomCapacityForEachRoomType.json] minimumRoomCapacityForEachRoomType", checkQuery);
		it("[invalid/room/missingDirKey.json] missingDirKey", checkQuery);
		it("[invalid/room/duplicateAPPLYKeys.json] missingDirKey", checkQuery);
	});
});
