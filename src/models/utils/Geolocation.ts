// Geolocation.ts

import * as http from "http";
import { InsightError } from "../../controller/IInsightFacade";

export async function fetchGeolocation(
	address: string,
	httpGet: typeof http.get = http.get
): Promise<{ lat: number; lon: number }> {
	const encodedAddress = encodeURIComponent(address);
	const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team117/${encodedAddress}`;

	return new Promise<{ lat: number; lon: number }>((resolve, reject) => {
		httpGet(url, (res) => {
			let rawData = "";

			res.on("data", (chunk) => {
				rawData += chunk;
			});

			res.on("end", () => {
				try {
					const parsedData = JSON.parse(rawData);
					if (parsedData.error) {
						reject(new InsightError(`Geolocation error: ${parsedData.error}`));
					} else if (parsedData.lat !== undefined && parsedData.lon !== undefined) {
						resolve({ lat: parsedData.lat, lon: parsedData.lon });
					} else {
						reject(new InsightError("Invalid geolocation response"));
					}
				} catch (e: any) {
					reject(new InsightError(`Failed to parse geolocation response: ${e.message}`));
				}
			});
		}).on("error", (e) => {
			reject(new InsightError(`Geolocation request failed: ${e.message}`));
		});
	});
}
