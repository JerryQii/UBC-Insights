import express, { Application, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Log from "@ubccpsc310/folder-test/build/Log";
import * as http from "http";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";
import { InsightDatasetKind } from "../controller/IInsightFacade"; // Import the enum
import { InsightError, NotFoundError } from "../controller/IInsightFacade";
import * as path from "path";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private insightFacade: InsightFacade;

	constructor(port: number) {
		Log.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();
		this.insightFacade = new InsightFacade();

		this.registerMiddleware();
		this.registerRoutes();
	}

	public async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			Log.info("Server::start() - start");
			if (this.server !== undefined) {
				Log.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express
					.listen(this.port, () => {
						Log.info(`Server::start() - server listening on port: ${this.port}`);
						resolve();
					})
					.on("error", (err: Error) => {
						Log.error(`Server::start() - server ERROR: ${err.message}`);
						reject(err);
					});
			}
		});
	}

	public async stop(): Promise<void> {
		Log.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				Log.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					Log.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	private registerMiddleware(): void {
		// Serve static frontend files
		const staticPath = path.join(__dirname, "../../frontend/public");
		this.express.use(express.static(staticPath));

		// JSON parser
		this.express.use(express.json());
		// Raw parser
		this.express.use(express.raw({ type: "application/*", limit: "10mb" }));
		// CORS
		this.express.use(cors());
	}

	private registerRoutes(): void {
		this.express.get("/echo/:msg", Server.echo);
		this.express.put("/dataset/:id/:kind", this.addDataset.bind(this));
		this.express.delete("/dataset/:id", this.removeDataset.bind(this));
		this.express.post("/query", this.performQuery.bind(this));
		this.express.get("/datasets", this.listDatasets.bind(this));
	}

	private static echo(req: Request, res: Response): void {
		try {
			Log.info(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			res.status(StatusCodes.OK).json({ result: response });
		} catch (err) {
			res.status(StatusCodes.BAD_REQUEST).json({ error: err });
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}

	private async addDataset(req: Request, res: Response): Promise<void> {
		const id = req.params.id;
		const kindStr = req.params.kind;
		const data = req.body;

		let kind: InsightDatasetKind;
		if (kindStr === "sections") {
			kind = InsightDatasetKind.Sections;
		} else if (kindStr === "rooms") {
			kind = InsightDatasetKind.Rooms;
		} else {
			res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid dataset kind" });
			return;
		}

		try {
			const content = data.toString("base64");
			const result = await this.insightFacade.addDataset(id, content, kind);
			res.status(StatusCodes.OK).json({ result });
		} catch (error: any) {
			Log.error(`PUT /dataset - ERROR: ${error.message}`);
			res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
		}
	}

	private async removeDataset(req: Request, res: Response): Promise<void> {
		const id = req.params.id;

		try {
			const result = await this.insightFacade.removeDataset(id);
			res.status(StatusCodes.OK).json({ result });
		} catch (error: any) {
			Log.error(`DELETE /dataset - ERROR: ${error.message}`);

			if (error instanceof NotFoundError) {
				res.status(StatusCodes.NOT_FOUND).json({ error: error.message });
			} else if (error instanceof InsightError) {
				res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
			} else {
				res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "An unknown error occurred" });
			}
		}
	}

	private async performQuery(req: Request, res: Response): Promise<void> {
		const query = req.body;

		try {
			const result = await this.insightFacade.performQuery(query);
			res.status(StatusCodes.OK).json({ result });
		} catch (error: any) {
			Log.error(`POST /query - ERROR: ${error.message}`);
			res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
		}
	}

	private async listDatasets(_req: Request, res: Response): Promise<void> {
		try {
			const result = await this.insightFacade.listDatasets();
			res.status(StatusCodes.OK).json({ result });
		} catch (error: any) {
			Log.error(`GET /datasets - ERROR: ${error.message}`);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "An unknown error occurred" });
		}
	}
}
