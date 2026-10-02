import {FastifyInstance} from "fastify";
import {Book} from "../Model/Book";
import NotFoundError from "../Types/Errors/NotFoundError";

interface BooksQuery {
    qpage: number;
    qlimit: number;
}

const ErrorResponse = {
    type: 'object',
    properties: {
        statusCode: {type: 'integer'},
        error: {type: 'string'},
        message: {type: 'string'},
    }
} as const;

export default function BookController(fastify: FastifyInstance) {
    fastify.get<{Querystring: BooksQuery}>('/books', {
        schema: {
            summary: "Fetch books (paginated)",
            description: "Fetch a page of books together with paging metadata",
            tags: ['books'],
            querystring: {
                type: 'object',
                properties: {
                    qpage: {type: 'integer', minimum: 1, default: 1},
                    qlimit: {type: 'integer', minimum: 1, default: 10},
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: {
                            type: 'object',
                            properties: {
                                total: {type: 'integer'},
                                page: {type: 'integer'},
                                limit: {type: 'integer'},
                            }
                        },
                        books: {type: 'array', items: {$ref: "Book#"}},
                    }
                },
                400: ErrorResponse,
            }
        }
    }, async (req, res) => {
        //Schema validates and applies the defaults, so these are always positive integers
        const {qpage: page, qlimit: limit} = req.query;

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

    fastify.get<{Params: {bookId: string}}>('/books/:bookId', {
        schema: {
            summary: "Fetch a single book",
            description: "Fetch a single book by its id",
            tags: ['books'],
            params: {
                type: 'object',
                required: ['bookId'],
                properties: {
                    //MongoDB ObjectId
                    bookId: {type: 'string', pattern: '^[0-9a-fA-F]{24}$'},
                }
            },
            response: {
                200: {$ref: "Book#"},
                400: ErrorResponse,
                404: ErrorResponse,
            }
        }
    }, async (req, res) => {
        const { bookId } = req.params
        const book = await Book.findById(bookId)
        if (!book) {
            throw new NotFoundError("Book does not exist");
        }
        return book;
    })
}
