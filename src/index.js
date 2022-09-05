import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
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

const messagesSchema = joi.object({
	to: joi.string().empty().required(),
	text: joi.string().empty().required(),
	type: joi.alternatives().try("message", "private_message"),
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

app.get("/participants", async (request, response) => {
	try {
		const participants = await db.collection("users").find().toArray();
		return response.send(participants);
	} catch (error) {
		console.log(error);
		return response.sendStatus(500);
	}
});

app.post("/messages", async (request, response) => {
	try {
		const { to, text, type } = request.body;
		const validation = messagesSchema.validate(
			{
				to,
				text,
				type,
			},
			{ abortEarly: false }
		);
		if (validation.error) {
			return response
				.status(422)
				.send(validation.error.details.map((item) => item.message));
		}

		const from = request.headers.user;
		const fromCheck = await db.collection("users").findOne({ name: from });
		if (!fromCheck) {
			return response.status(422).send({
				message: "Participante não existente na lista de participantes!",
			});
		}
		await db.collection("messages").insertOne({
			from,
			to,
			text,
			type,
			time: dayjs().format("HH:mm:ss"),
		});
		return response.sendStatus(201);
	} catch (error) {
		console.log(error);
		return response.sendStatus(500);
	}
});

app.get("/messages", async (request, response) => {
	try {
		const { limit } = request.query;
		const { user } = request.headers;

		const messages = await db.collection("messages").find().toArray();
		const userMessages = messages.filter(
			(item) =>
				item.type === "message" ||
				item.type === "status" ||
				(item.type === "private_message" && item.from === user) ||
				(item.type === "private_message" && item.to === user)
		);

		if (limit) {
			return response.send(userMessages.slice(-limit));
		}
		return response.send(userMessages);
	} catch (error) {
		console.log(error);
		return response.sendStatus(500);
	}
});

app.post("/status", async (request, response) => {
	try {
		const { user } = request.headers;
		const userCheck = await db.collection("users").findOne({ name: user });
		if (!userCheck) {
			return response.sendStatus(404);
		}
		await db
			.collection("users")
			.updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
		return response.sendStatus(200);
	} catch (error) {
		console.log(error);
		return response.sendStatus(500);
	}
});

app.delete("/messages/:ID_DA_MENSAGEM", async (req, res) => {
	try {
		const { user } = req.headers;
		console.log(user);
		const { ID_DA_MENSAGEM } = req.params;
		console.log(ID_DA_MENSAGEM);

		const messageCheck = await db.collection("messages").findOne({
			_id: ObjectId(ID_DA_MENSAGEM),
		});
		console.log(messageCheck);
		if (!messageCheck) {
			return res.sendStatus(404);
		}

		if (messageCheck.from !== user) {
			return res.sendStatus(401);
		}

		await db
			.collection("messages")
			.deleteOne({ _id: ObjectId(ID_DA_MENSAGEM) });

		return res.status(200).send({ message: "Mensagem deletada com sucesso!" });
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

app.put("/messages/:ID_DA_MENSAGEM", async (req, res) => {
	try {
		const { to, text, type } = req.body;
		const { user } = req.headers;
		const { ID_DA_MENSAGEM } = req.params;

		const validation = messagesSchema.validate(
			{
				to,
				text,
				type,
			},
			{ abortEarly: false }
		);
		if (validation.error) {
			return res
				.status(422)
				.send(validation.error.details.map((item) => item.message));
		}
		const fromCheck = await db.collection("users").findOne({ name: user });
		if (!fromCheck) {
			return res.status(422).send({
				message: "Participante não existente na lista de participantes!",
			});
		}

		const messageCheck = await db.collection("messages").findOne({
			_id: ObjectId(ID_DA_MENSAGEM),
		});
		console.log(messageCheck);
		if (!messageCheck) {
			return res.sendStatus(404);
		}

		if (messageCheck.from !== user) {
			return res.sendStatus(401);
		}

		const updateMessage = await db
			.collection("messages")
			.updateOne(
				{ _id: ObjectId(ID_DA_MENSAGEM) },
				{ $set: { to: to, text: text, type: type } }
			);

		return res
			.status(200)
			.send({ message: "Mensagem modificada com sucesso!" });
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

setInterval(async function () {
	try {
		const participants = await db.collection("users").find().toArray();

		participants.map((participant) => {
			let deltaTime = Date.now() - participant.lastStatus;
			if (deltaTime > 10000) {
				const deleted = db
					.collection("users")
					.deleteOne({ _id: participant._id });
				const byeMessage = db.collection("messages").insertOne({
					from: participant.name,
					to: "Todos",
					text: "sai da sala...",
					type: "status",
					time: dayjs().format("HH:mm:ss"),
				});
			}
		});
	} catch (error) {
		console.log(error);
		return response.sendStatus(500);
	}
}, 15000);

app.listen(5000, () => console.log("Listening on port 5000..."));
