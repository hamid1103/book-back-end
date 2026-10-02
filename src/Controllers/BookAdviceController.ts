import {FastifyInstance} from "fastify";
import {Book} from "../Model/Book";

export default function BookAdviceController(fastify: FastifyInstance) {
    fastify.get('/advice', {
        schema: {
            summary: "Get book advice",
            description: "Get a list of recommended books. Currently returns 5 random books",
            tags: ['books'],
            response: {
                200: {type: 'array', items: {$ref: "Book#"}},
            }
        }
    }, async (req, res) => {
        //Proof Of Concept Implementation just fetches 5 random books;
        const books = await Book.aggregate([
            {$sample: {size: 5}}
        ])
        console.log(books)
        return books;
    })

}
