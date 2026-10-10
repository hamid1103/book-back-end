import {FastifyInstance} from "fastify";
import UnauthorizedError from "../Types/Errors/UnauthorizedError";
import BadRequestError from "../Types/Errors/BadRequestError";
import {readingList, ReadingStatus} from "../Model/ReadingList";
import {isValidObjectId} from "mongoose";
import {Book} from "../Model/Book";
import NotFoundError from "../Types/Errors/NotFoundError";

interface GetReadingListQuery {
    onlyId: boolean;
}

type ReadingListDocument = InstanceType<typeof readingList>;

//Book id -> ReadingStatus, every book on the list gets an entry
export const statusResponseProperty = {
    type: 'object',
    additionalProperties: {type: 'string', enum: Object.values(ReadingStatus)},
} as const;

//Shared response builder so every route returns the same shape, including a status for every book
export async function toResponse(list: ReadingListDocument, onlyId?: boolean) {
    const bookIds = list.book.map(id => id.toString());
    const status: Record<string, string> = {};
    for (const id of bookIds) {
        status[id] = list.status?.get(id) ?? ReadingStatus.NotRead;
    }
    if (onlyId) {
        //ObjectIds have to be turned into strings, otherwise the serializer matches them against Book#
        return {...list.toObject(), book: bookIds, status};
    }
    await list.populate('book');
    return {...list.toObject(), status};
}

export default function ReadingListController(fastify: FastifyInstance)
{
    //This design goes against regular REST-API conventions... - Claude Review
    //Corvo (Hamid): Don't matter. Saves on another call to create an empty reading list
    fastify.get<{
        Querystring: GetReadingListQuery,
    }>("/readinglist",
        { schema: {
            summary: "Fetch User's reading list",
            description: "Fetch User's reading list. Auth needed. Use ?onlyId=true to only get the book IDs",
            querystring: {
                type: 'object',
                properties: {
                    onlyId: {type: 'boolean', default: false},
                }
            },
            response: {
                '2xx': {
                    type: 'object',
                    properties: {
                        userID: {type: 'integer'},
                        _id: {type: 'string'},
                        //Book IDs when onlyId=true, full Book objects otherwise
                        book: {type: 'array', items: {anyOf: [{type: 'string'}, {$ref: "Book#"}]}},
                        status: statusResponseProperty,
                    }
                },
                401: {
                    type: 'object',
                    properties: {
                        statusCode: {type: 'string'},
                        message: {type: 'string'},
                    }
                }
            }
        },
    }, async (req, res) => {
        const { onlyId } = req.query;
        if(!req.user)
        {
            throw new UnauthorizedError("You are not logged in");
        }
        let UserReadingList = await readingList.findOne().where({userID: req.user.userid})
        if (!UserReadingList){
            //create new ReadingList
            UserReadingList = new readingList({
                userID: req.user.userid,
            });
            await UserReadingList.save()
        }
        await res.send(await toResponse(UserReadingList, onlyId));
    })

    interface ReadingListBody {
        userID?: string;
        book: [string];
    }

    fastify.put<{Body: ReadingListBody}>("/readinglist", {
        schema: {
            summary: "Update Reading List",
            description: "Update Reading List. Auth Required",
            body: {
                type: "object",
                required: ["book"],
                properties: {
                    userID: {type: "string"},
                    book: {type: "array", items: {type: "string"}},
                }
            },
            response: {
                '2xx': {
                    type: 'object',
                    properties: {
                        userID: {type: "string"},
                        book: {type: "array", items:
                            {$ref: "Book#"}
                        },
                        status: statusResponseProperty,
                    }
                }
            }
        }
    }, async (request, res) => {
        if(!request.user)
        {
            throw new UnauthorizedError("You are not logged in");
        }

        const bookIds = request.body.book;
        //userid is a string on the request, userID a Number in the schema
        const userID = Number(request.user.userid);
        const UserReadingList = await readingList.findOne({userID}) ?? new readingList({userID});
        UserReadingList.set('book', bookIds);
        //Drop the statuses of books that are no longer on the list
        UserReadingList.status?.forEach((_, id) => {
            if (!bookIds.includes(id)) UserReadingList.status!.delete(id);
        });
        await UserReadingList.save();
        await res.send(await toResponse(UserReadingList));
    })

    fastify.post<{Body: {book: string, onlyId?: boolean}}>("/readinglist", {
        schema:
            {
                summary: "Add a book to reading list",
                description: "Add a single book to the user's reading list. Auth Required. Set onlyId to true to only get the book IDs back",
                body: {
                    type: "object",
                    required: ["book"],
                    properties: {
                        book: {type: "string"},
                        onlyId: {type: "boolean", default: false},
                    }
                },
                response: {
                    '2xx': {
                        type: 'object',
                        properties: {
                            userID: {type: "string"},
                            //Book IDs when onlyId=true, full Book objects otherwise
                            book: {type: "array", items:
                                {anyOf: [{type: 'string'}, {$ref: "Book#"}]}
                            },
                            status: statusResponseProperty,
                        }
                    }
                }
            }
    }, async (req, res) => {
        if (!req.user) {
            throw new UnauthorizedError("Invalid Authorization");
        }
        if (!isValidObjectId(req.body.book)) {
            throw new BadRequestError("Invalid book id");
        }
        const book = await Book.findById(req.body.book);
        if(!book)
        {
            throw new NotFoundError("Book does not exist");
        }
        //$addToSet skips duplicates, upsert creates the ReadingList if the user doesn't have one yet
        const UserReadingList = await readingList.findOneAndUpdate(
            {userID: Number(req.user.userid)},
            {$addToSet: {book: req.body.book}},
            {new: true, upsert: true}
        );
        //upsert + new guarantees a document
        await res.send(await toResponse(UserReadingList!, req.body.onlyId));
    })

    fastify.delete<{Body: {book: string, onlyId?: boolean}}>("/readinglist", {
        schema:
            {
                summary: "Remove a book from reading list",
                description: "Remove a single book from the user's reading list. Auth Required. Set onlyId to true to only get the book IDs back",
                body: {
                    type: "object",
                    required: ["book"],
                    properties: {
                        book: {type: "string"},
                        onlyId: {type: "boolean", default: false},
                    }
                },
                response: {
                    '2xx': {
                        type: 'object',
                        properties: {
                            userID: {type: "string"},
                            //Book IDs when onlyId=true, full Book objects otherwise
                            book: {type: 'array', items: {anyOf: [{type: 'string'}, {$ref: "Book#"}]}},
                        status: statusResponseProperty,
                        }
                    }
                }
            }
    }, async (req, res) => {
        if (!req.user) {
            throw new UnauthorizedError("You are not logged in");
        }
        if (!isValidObjectId(req.body.book)) {
            throw new BadRequestError("Invalid book id");
        }
        //$pull removes the id if present, upsert creates an empty ReadingList if the user doesn't have one yet
        let UserReadingList = await readingList.findOneAndUpdate(
            {userID: Number(req.user.userid)},
            {$pull: {book: req.body.book}, $unset: {[`status.${req.body.book}`]: ""}},
            {new: true, upsert: true}
        );
        //This shouldn't be needed but...
        if (!UserReadingList){
            //create new ReadingList
            UserReadingList = new readingList({
                userID: req.user.userid,
            });
            await UserReadingList.save()
        }
        await res.send(await toResponse(UserReadingList, req.body.onlyId));
    })

    interface ReadingStatusBody {
        book: string;
        status: ReadingStatus;
        onlyId?: boolean;
    }

    fastify.patch<{Body: ReadingStatusBody}>("/readinglist", {
        schema:
            {
                summary: "Set the reading status of a book",
                description: "Mark a book as NotRead, Reading or Read. Adds the book to the reading list if it isn't on it yet. Auth Required. Set onlyId to true to only get the book IDs back",
                body: {
                    type: "object",
                    required: ["book", "status"],
                    properties: {
                        book: {type: "string"},
                        status: {type: "string", enum: Object.values(ReadingStatus)},
                        onlyId: {type: "boolean", default: false},
                    }
                },
                response: {
                    '2xx': {
                        type: 'object',
                        properties: {
                            userID: {type: "string"},
                            //Book IDs when onlyId=true, full Book objects otherwise
                            book: {type: 'array', items: {anyOf: [{type: 'string'}, {$ref: "Book#"}]}},
                            status: statusResponseProperty,
                        }
                    }
                }
            }
    }, async (req, res) => {
        if (!req.user) {
            throw new UnauthorizedError("You are not logged in");
        }
        if (!isValidObjectId(req.body.book)) {
            throw new BadRequestError("Invalid book id");
        }
        const book = await Book.findById(req.body.book);
        if (!book) {
            throw new NotFoundError("Book does not exist");
        }
        //$addToSet puts the book on the list if needed, upsert creates the ReadingList if the user doesn't have one yet
        const UserReadingList = await readingList.findOneAndUpdate(
            {userID: Number(req.user.userid)},
            {$addToSet: {book: req.body.book}, $set: {[`status.${req.body.book}`]: req.body.status}},
            {new: true, upsert: true}
        );
        //upsert + new guarantees a document
        await res.send(await toResponse(UserReadingList!, req.body.onlyId));
    })

}