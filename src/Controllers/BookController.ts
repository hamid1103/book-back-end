import {FastifyInstance} from "fastify";
import {Book} from "../Model/Book";

export default function BookController(fastify: FastifyInstance) {
    fastify.get('/books', async (req, res) => {
        const books = await Book.find({}, 'title author _id').limit(20).exec()
        return books;
    })

    fastify.get('/books/:bookId', async (req, res) => {
        // @ts-ignore
        const { bookId } = req.params
        return await Book.findById(bookId)
    })
}