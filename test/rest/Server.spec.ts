import { expect } from "chai";
import request, { Response } from "supertest";
import { StatusCodes } from "http-status-codes";
import Log from "@ubccpsc310/folder-test/build/Log";
import Server from "../../src/rest/Server";
import * as fs from "fs";
import * as path from "path";

describe("Facade C3", function () {
	const port = 4321;
	let server: Server;
	const SERVER_URL = "http://localhost:4321";

	before(async function () {
		server = new Server(port);
		await server.start();
	});

	after(async function () {
		await server.stop();
	});

	beforeEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	// Sample on how to format PUT requests
	it("PUT test for courses dataset", async function () {
		const ENDPOINT_URL = "/dataset/mysection/sections";
		const zipFilePath = path.join(__dirname, "../resources/archives/pair.zip");
		const ZIP_FILE_DATA = await fs.promises.readFile(zipFilePath);

		return request(SERVER_URL)
			.put(ENDPOINT_URL)
			.send(ZIP_FILE_DATA)
			.set("Content-Type", "application/x-zip-compressed")
			.then(function (res: Response) {
				Log.info(`Response: ${JSON.stringify(res.body)}`);
				expect(res.status).to.be.equal(StatusCodes.OK);
			})
			.catch(function (err: any) {
				Log.error(err);
				expect.fail();
			});
	});

	it("POST test for valid query", async function () {
		const query = {
			WHERE: {
				GT: {
					mysection_avg: 97,
				},
			},
			OPTIONS: {
				COLUMNS: ["mysection_dept", "mysection_avg"],
				ORDER: "mysection_avg",
			},
		};

		return request(SERVER_URL)
			.post("/query")
			.send(query)
			.set("Content-Type", "application/json")
			.then(function (res: Response) {
				Log.info(`Response: ${JSON.stringify(res.body)}`);
				expect(res.status).to.be.equal(StatusCodes.OK);
			})
			.catch(function (err: any) {
				Log.error(err);
				expect.fail();
			});
	});

	it("POST test with invalid query", async function () {
		const invalidQuery = {
			// Missing WHERE clause
			OPTIONS: {
				COLUMNS: ["mysection_dept", "mysection_avg"],
			},
		};

		return request(SERVER_URL)
			.post("/query")
			.send(invalidQuery)
			.set("Content-Type", "application/json")
			.then(function (res: Response) {
				Log.info(`Response: ${JSON.stringify(res.body)}`);
				expect(res.status).to.be.equal(StatusCodes.BAD_REQUEST);
				expect(res.body).to.have.property("error");
			})
			.catch(function (err: any) {
				Log.error(err);
				expect.fail();
			});
	});

	it("GET test for list of datasets", async function () {
		return request(SERVER_URL)
			.get("/datasets")
			.then(function (res: Response) {
				Log.info(`Response: ${JSON.stringify(res.body)}`);
				expect(res.status).to.be.equal(StatusCodes.OK);
				expect(res.body.result).to.be.an("array");
			})
			.catch(function (err: any) {
				Log.error(err);
				expect.fail();
			});
	});

	it("DELETE test for existing dataset", async function () {
		const ENDPOINT_URL = "/dataset/mysection";
		return request(SERVER_URL)
			.delete(ENDPOINT_URL)
			.then(function (res: Response) {
				Log.info(`Response: ${JSON.stringify(res.body)}`);
				expect(res.status).to.be.equal(StatusCodes.OK);
			})
			.catch(function (err: any) {
				Log.error(err);
				expect.fail();
			});
	});

	it("PUT test with invalid dataset id (only whitespace)", async function () {
		const ENDPOINT_URL = "/dataset/    /sections"; // ID with only whitespace
		const zipFilePath = path.join(__dirname, "../resources/archives/pair.zip");
		const ZIP_FILE_DATA = await fs.promises.readFile(zipFilePath);

		return request(SERVER_URL)
			.put(ENDPOINT_URL)
			.send(ZIP_FILE_DATA)
			.set("Content-Type", "application/x-zip-compressed")
			.then(function (res: Response) {
				Log.info(`Response: ${JSON.stringify(res.body)}`);
				expect(res.status).to.be.equal(StatusCodes.BAD_REQUEST);
				expect(res.body).to.have.property("error");
			})
			.catch(function (err: any) {
				Log.error(err);
				expect.fail();
			});
	});

	it("DELETE test for non-existent dataset", async function () {
		const ENDPOINT_URL = "/dataset/nonexistent";
		return request(SERVER_URL)
			.delete(ENDPOINT_URL)
			.then(function (res: Response) {
				Log.info(`Response: ${JSON.stringify(res.body)}`);
				expect(res.status).to.be.equal(StatusCodes.NOT_FOUND);
				expect(res.body).to.have.property("error");
			})
			.catch(function (err: any) {
				Log.error(err);
				expect.fail();
			});
	});
});
