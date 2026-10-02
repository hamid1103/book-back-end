import {FastifyInstance} from "fastify";
import {Book} from "../Model/Book";

export default function BookAdviceController(fastify: FastifyInstance) {
    fastify.get<{Querystring: {amount: number}}>('/advice', {
        schema: {
            summary: "Get book advice",
            description: "Get a list of recommended books. Currently returns 5 random books",
            tags: ['books'],
            querystring: {
                type: 'object',
                properties: {
                    amount: {type: 'number', default: 5},
                }
            },
            response: {
                200: {type: 'array', items: {$ref: "Book#"}},
            }
        }
    }, async (req, res) => {
        const { amount } = req.query;
        //Proof Of Concept Implementation just fetches 5 random books;
        const books = await Book.aggregate([
            {$sample: {size: amount}}
        ])
        console.log(books)
        return books;
    })

}
