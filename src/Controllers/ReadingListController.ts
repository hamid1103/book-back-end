import {FastifyInstance, FastifyReply, FastifyRequest} from "fastify";
import UnauthorizedError from "../Types/Errors/UnauthorizedError";
import {readingList} from "../Model/ReadingList";

export default function ReadingListController(fastify: FastifyInstance)
{
    //This design goes against regular REST-API conventions... - Claude Review
    //I DO NOT CARE! LESS CALLS! LESS CALLS! - Dev
    fastify.get("/readinglist",{
        schema: {
            summary: "Fetch User's reading list",
            description: "Fetch User's reading list. Auth needed",
            response: {
                '2xx': {
                    type: 'object',
                    properties: {
                        userID: {type: 'integer'},
                        _id: {type: 'string'},
                        book: {type: 'array', items: {$ref: "Book#"}},
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
    }, async (req: FastifyRequest, res: FastifyReply) => {
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

}