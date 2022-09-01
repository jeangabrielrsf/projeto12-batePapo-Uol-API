import express, { response } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect(() => {
	db = mongoClient.db("bate_papo");
});

app.post("/participants", async (request, response) => {
	try {
		const { name } = request.body;
		//FALTA VALIDAR COM A BIBLIOTECA JOY
		//FALTA VERIFICAR SE JÁ TEM UM NOME EXISTENTE
		const result = await db.collection("users").insertOne({
			name,
			lastStatus: Date.now,
		});

		return response.sendStatus(201);
	} catch (error) {
		console.log(error);
		return response.sendStatus(500);
	}
});

app.post("/messages", async (request, response) => {
	try {
		const { to, text, type } = request.body;
		const from = request.headers.user;
		return response.sendStatus(201);
	} catch (error) {
		console.log(error);
		return response.sendStatus(500);
	}
});

app.get("/messages", async (request, response) => {
	try {
		const messages = await db.collection("messages").find().toArray();
		return response.send(messages);
	} catch (error) {
		console.log(error);
		return response.sendStatus(500);
	}
});

app.post("/status", async (request, response) => {
	try {
		const participant = request.headers.user;
	} catch (error) {
		console.log(error);
		return response.sendStatus(500);
	}
});

app.listen(5000, () => console.log("Listening on port 5000..."));
