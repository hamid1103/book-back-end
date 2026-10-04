import {FastifyInstance} from "fastify";
import {Book} from "../Model/Book";
import {ReadingProfile} from "../Model/ReadingProfile";
import {AdviceProfile, anonymousAdvice, pickAdvice} from "../Services/AdviceService";

export default function BookAdviceController(fastify: FastifyInstance) {
    fastify.get<{Querystring: {amount: number}}>('/advice', {
        schema: {
            summary: "Get book advice",
            description: "Get a list of recommended books, each with a motivation. " +
                "Logged in users with a reading profile get books matched to their profile, everyone else gets random books.",
            tags: ['books'],
            querystring: {
                type: 'object',
                properties: {
                    amount: {type: 'integer', minimum: 1, maximum: 20, default: 5},
                }
            },
            response: {
                200: {
                    type: 'array',
                    items: {
                        allOf: [
                            {$ref: "Book#"},
                            {type: 'object', properties: {motivation: {type: 'string'}}},
                        ]
                    }
                },
            }
        }
    }, async (req, res) => {
        const { amount } = req.query;

        const profile = req.user
            ? await ReadingProfile.findOne({userID: Number(req.user.userid)}).lean<AdviceProfile>()
            : null;

        if (!profile) {
            const books = await Book.aggregate([
                {$sample: {size: amount}}
            ]);
            return anonymousAdvice(books);
        }

        //The catalogue is ~180 items, so scoring all of them in memory is fine for the Proof of Concept
        const books = await Book.find({}).lean();
        return pickAdvice(books, profile, amount);
    })

}
