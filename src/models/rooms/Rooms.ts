// models/rooms/Room.ts

export class Room {
	public readonly fullname: string;
	public readonly shortname: string;
	public readonly number: string;
	public readonly name: string;
	public readonly address: string;
	public readonly lat: number;
	public readonly lon: number;
	public readonly seats: number;
	public readonly type: string;
	public readonly furniture: string;
	public readonly href: string;
	[key: string]: any;

	constructor(roomData: any) {
		this.fullname = roomData.fullname;
		this.shortname = roomData.shortname;
		this.number = roomData.number;
		this.name = roomData.name;
		this.address = roomData.address;
		this.lat = roomData.lat;
		this.lon = roomData.lon;
		this.seats = roomData.seats;
		this.type = roomData.type;
		this.furniture = roomData.furniture;
		this.href = roomData.href;
	}
}
