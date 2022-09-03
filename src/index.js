import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect(() => {
	db = mongoClient.db("bate_papo");
});

const participantsSchema = joi.object({
	name: joi.string().empty("").required(),
});

app.post("/participants", async (request, response) => {
	try {
		const { name } = request.body;

		const validation = participantsSchema.validate(
			{ name },
			{ abortEarly: false }
		);
		if (validation.error) {
			return response
				.status(422)
				.send(validation.error.details.map((item) => item.message));
		}
		//FALTA VERIFICAR SE JÁ TEM UM NOME EXISTENTE
		const nameCheck = await db.collection("users").findOne({ name });

		if (nameCheck) {
			return response.status(409).send({ message: "Nome já está em uso!" });
		}

		const partipantResult = await db.collection("users").insertOne({
			name,
			lastStatus: Date.now(),
		});

		const enterMessage = await db.collection("messages").insertOne({
			from: name,
			to: "Todos",
			text: "entra na sala...",
			type: "status",
			time: dayjs().format("HH:mm:ss"),
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
