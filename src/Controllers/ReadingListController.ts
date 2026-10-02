import {FastifyInstance, FastifyReply, FastifyRequest} from "fastify";
import UnauthorizedError from "../Types/Errors/UnauthorizedError";
import BadRequestError from "../Types/Errors/BadRequestError";
import {readingList} from "../Model/ReadingList";
import {isValidObjectId, Types} from "mongoose";
import {Book} from "../Model/Book";
import NotFoundError from "../Types/Errors/NotFoundError";

interface GetReadingListQuery {
    onlyId: boolean;
}

export default function ReadingListController(fastify: FastifyInstance)
{
    //This design goes against regular REST-API conventions... - Claude Review
    //I DO NOT CARE! LESS CALLS! LESS CALLS! - Dev
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
        if(onlyId){
            //ObjectIds have to be turned into strings, otherwise the serializer matches them against Book#
            await res.send({...UserReadingList.toObject(), book: UserReadingList.book.map(id => id.toString())});
            return;
        }
        await readingList.populate(UserReadingList, { path: 'book'});
        console.log(UserReadingList);
        await res.send(UserReadingList);
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
        //TS-IGNORING the userID. Something is causing it to error in the IDE and compile checks.
        // @ts-ignore
        let UserReadingList = await readingList.findOneAndUpdate({userID: request.user.userid}, {book: bookIds});
        await readingList.populate(UserReadingList, { path: 'book'});
        await res.send(UserReadingList);
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
                        }
                    }
                }
            }
    }, async (req, res) => {
        if (!req.user) {
            throw new UnauthorizedError("YOU AIN'T LOGGED IN YO!");
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
        let UserReadingList = await readingList.findOneAndUpdate(
            // @ts-ignore same userID typing issue as the PUT route
            {userID: req.user.userid},
            {$addToSet: {book: req.body.book}},
            {new: true, upsert: true}
        );
        if(req.body.onlyId){
            //ObjectIds have to be turned into strings, otherwise the serializer matches them against Book#
            //upsert + new guarantees a document, the cast is needed because of the @ts-ignore above
            const plainList = UserReadingList!.toObject() as {book: Types.ObjectId[]};
            await res.send({...plainList, book: plainList.book.map(id => id.toString())});
            return;
        }
        await readingList.populate(UserReadingList, { path: 'book'});
        await res.send(UserReadingList);
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
            // @ts-ignore same userID typing issue as the PUT route
            {userID: req.user.userid},
            {$pull: {book: req.body.book}},
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
        console.log("-----------");
        console.log(req.body.onlyId);
        console.log("-----------");
        if(req.body.onlyId){
            //ObjectIds have to be turned into strings, otherwise the serializer matches them against Book#
            //the cast is needed because of the @ts-ignore on the userID filter
            const plainList = UserReadingList.toObject() as {book: Types.ObjectId[]};
            await res.send({...plainList, book: plainList.book.map(id => id.toString())});
            return;
        }
        await readingList.populate(UserReadingList, { path: 'book'});
        await res.send(UserReadingList);
    })

}