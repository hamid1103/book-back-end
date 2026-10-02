import {FastifyInstance} from "fastify";
import {Book} from "../Model/Book";
function parsePositiveInt(value: string | null, fallback: number): number {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
export default function BookController(fastify: FastifyInstance) {
    fastify.get('/books', async (req, res) => {
        // @ts-ignore
        const {qpage, qlimit} = req.query
        console.log(req.query);
        console.log(qpage)
        console.log(qlimit)
        const limit = parsePositiveInt(qlimit, 10);
        const page = parsePositiveInt(qpage, 1);

        console.log("pageing query " + page + " "+ limit)
        const books = await Book.find({})
            .skip((page-1)*limit)
            .limit(limit).exec()

        const totalBooks = await Book.countDocuments({})
        let meta = {
            total: totalBooks,
            page: page,
            limit: limit,
        };

        return {meta, books};
    })

    fastify.get('/books/:bookId', async (req, res) => {
        // @ts-ignore
        const { bookId } = req.params
        return await Book.findById(bookId)
    })
}