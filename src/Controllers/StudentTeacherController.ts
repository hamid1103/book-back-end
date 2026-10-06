import {FastifyInstance} from "fastify";
import {isValidObjectId} from "mongoose";
import {User, Role} from "../Model/associations";
import {Book} from "../Model/Book";
import {readingList} from "../Model/ReadingList";
import {ReadingProfile} from "../Model/ReadingProfile";
import {getUserRole, requireRole, RoleTitle} from "../Services/RoleService";
import {statusResponseProperty, toResponse} from "./ReadingListController";
import BadRequestError from "../Types/Errors/BadRequestError";
import NotFoundError from "../Types/Errors/NotFoundError";
import ConflictError from "../Types/Errors/ConflictError";

const errorSchema = {
    type: "object",
    properties: {
        statusCode: {type: "integer"},
        error: {type: "string"},
        message: {type: "string"},
    }
} as const;

const userIdParam = (name: string) => ({
    type: "object",
    required: [name],
    properties: {
        [name]: {type: "integer", minimum: 1},
    }
});

const readingListResponse = {
    type: 'object',
    properties: {
        userID: {type: 'integer'},
        _id: {type: 'string'},
        //Book IDs when onlyId=true, full Book objects otherwise
        book: {type: 'array', items: {anyOf: [{type: 'string'}, {$ref: "Book#"}]}},
        status: statusResponseProperty,
    }
} as const;

//Teachers only get to see students that linked themselves to them
async function getLinkedStudent(teacherId: number, studentId: number): Promise<User> {
    const teacher = await User.findByPk(teacherId);
    const student = await User.findByPk(studentId, {attributes: ['id', 'userName', 'email']});
    if (!teacher || !student || !(await teacher.hasStudent(student))) {
        throw new NotFoundError("Student not found or not linked to you");
    }
    return student;
}

export default function StudentTeacherController(fastify: FastifyInstance) {
    // ---- Student side: a student links themselves to a teacher ----

    fastify.get("/teachers", {
        preHandler: requireRole(RoleTitle.Student),
        schema: {
            summary: "Fetch all teachers",
            description: "Fetch every teacher, with linked=true for the teachers the logged in student is linked to. Student role required",
            tags: ['student-teacher'],
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: {type: 'integer'},
                            userName: {type: 'string'},
                            linked: {type: 'boolean'},
                        }
                    }
                },
                401: errorSchema,
                403: errorSchema,
            }
        }
    }, async (req) => {
        const teachers = await User.findAll({
            attributes: ['id', 'userName'],
            include: {model: Role, attributes: [], where: {title: RoleTitle.Teacher}, through: {attributes: []}},
            order: [['userName', 'ASC']],
        });
        const student = await User.findByPk(req.user!.userid);
        const linkedIds = new Set((await student!.getTeachers({attributes: ['id']})).map(t => t.id));
        return teachers.map(t => ({id: t.id, userName: t.userName, linked: linkedIds.has(t.id)}));
    })

    fastify.post<{Params: {teacherId: number}}>("/teachers/:teacherId/link", {
        preHandler: requireRole(RoleTitle.Student),
        schema: {
            summary: "Link yourself to a teacher",
            description: "Link the logged in student to a teacher, so the teacher can view and add to their reading list. Student role required",
            tags: ['student-teacher'],
            params: userIdParam('teacherId'),
            response: {
                204: {type: 'null', description: "Linked"},
                401: errorSchema,
                403: errorSchema,
                404: errorSchema,
                409: errorSchema,
            }
        }
    }, async (req, res) => {
        const {teacherId} = req.params;
        if (await getUserRole(teacherId) !== RoleTitle.Teacher) {
            throw new NotFoundError("Teacher not found");
        }
        const student = await User.findByPk(req.user!.userid);
        const alreadyLinked = (await student!.getTeachers({where: {id: teacherId}, attributes: ['id']})).length > 0;
        if (alreadyLinked) {
            throw new ConflictError("You are already linked to this teacher");
        }
        await student!.addTeacher(teacherId);
        await res.code(204).send();
    })

    fastify.delete<{Params: {teacherId: number}}>("/teachers/:teacherId/link", {
        preHandler: requireRole(RoleTitle.Student),
        schema: {
            summary: "Unlink yourself from a teacher",
            description: "Remove the link between the logged in student and a teacher. Student role required",
            tags: ['student-teacher'],
            params: userIdParam('teacherId'),
            response: {
                204: {type: 'null', description: "Unlinked"},
                401: errorSchema,
                403: errorSchema,
                404: errorSchema,
            }
        }
    }, async (req, res) => {
        const {teacherId} = req.params;
        const student = await User.findByPk(req.user!.userid);
        const linked = (await student!.getTeachers({where: {id: teacherId}, attributes: ['id']})).length > 0;
        if (!linked) {
            throw new NotFoundError("You are not linked to this teacher");
        }
        await student!.removeTeacher(teacherId);
        await res.code(204).send();
    })

    // ---- Teacher side: only linked students are visible ----

    fastify.get<{Querystring: {profileOnly: boolean}}>("/students", {
        preHandler: requireRole(RoleTitle.Teacher),
        schema: {
            summary: "Fetch your linked students",
            description: "Fetch the students linked to the logged in teacher, together with their reading profile. " +
                "By default only students who filled in a reading profile are returned, use ?profileOnly=false to also get the others (readingProfile is then null). Teacher role required",
            tags: ['student-teacher'],
            querystring: {
                type: 'object',
                properties: {
                    profileOnly: {type: 'boolean', default: true},
                }
            },
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: {type: 'integer'},
                            userName: {type: 'string'},
                            email: {type: 'string'},
                            readingProfile: {anyOf: [{$ref: "ReadingProfile#"}, {type: 'null'}]},
                        }
                    }
                },
                401: errorSchema,
                403: errorSchema,
            }
        }
    }, async (req) => {
        const teacher = await User.findByPk(req.user!.userid);
        const students = await teacher!.getStudents({
            attributes: ['id', 'userName', 'email'],
            joinTableAttributes: [],
            order: [['userName', 'ASC']],
        });
        const profiles = await ReadingProfile.find({userID: {$in: students.map(s => s.id)}}).lean();
        //_id is stringified so the profile matches ReadingProfile# inside the anyOf
        const profileByUser = new Map(profiles.map(p => [p.userID, {...p, _id: p._id.toString()}]));

        return students
            .map(s => ({id: s.id, userName: s.userName, email: s.email, readingProfile: profileByUser.get(s.id) ?? null}))
            .filter(s => !req.query.profileOnly || s.readingProfile);
    })

    fastify.get<{Params: {studentId: number}, Querystring: {onlyId: boolean}}>("/students/:studentId/readinglist", {
        preHandler: requireRole(RoleTitle.Teacher),
        schema: {
            summary: "Fetch a linked student's reading list",
            description: "Fetch the reading list of a student linked to the logged in teacher. Use ?onlyId=true to only get the book IDs. Teacher role required",
            tags: ['student-teacher'],
            params: userIdParam('studentId'),
            querystring: {
                type: 'object',
                properties: {
                    onlyId: {type: 'boolean', default: false},
                }
            },
            response: {
                200: readingListResponse,
                401: errorSchema,
                403: errorSchema,
                404: errorSchema,
            }
        }
    }, async (req) => {
        const student = await getLinkedStudent(Number(req.user!.userid), req.params.studentId);
        //Don't create a list for the student just because the teacher looked, an empty one is returned instead
        const list = await readingList.findOne({userID: student.id}) ?? new readingList({userID: student.id});
        return toResponse(list, req.query.onlyId);
    })

    fastify.post<{Params: {studentId: number}, Body: {book: string, onlyId?: boolean}}>("/students/:studentId/readinglist", {
        preHandler: requireRole(RoleTitle.Teacher),
        schema: {
            summary: "Add a book to a linked student's reading list",
            description: "Add a catalogue item to the reading list of a student linked to the logged in teacher. Set onlyId to true to only get the book IDs back. Teacher role required",
            tags: ['student-teacher'],
            params: userIdParam('studentId'),
            body: {
                type: "object",
                required: ["book"],
                properties: {
                    book: {type: "string"},
                    onlyId: {type: "boolean", default: false},
                }
            },
            response: {
                200: readingListResponse,
                400: errorSchema,
                401: errorSchema,
                403: errorSchema,
                404: errorSchema,
            }
        }
    }, async (req) => {
        const student = await getLinkedStudent(Number(req.user!.userid), req.params.studentId);
        if (!isValidObjectId(req.body.book)) {
            throw new BadRequestError("Invalid book id");
        }
        if (!(await Book.exists({_id: req.body.book}))) {
            throw new NotFoundError("Book does not exist");
        }
        //$addToSet skips duplicates, upsert creates the ReadingList if the student doesn't have one yet
        const list = await readingList.findOneAndUpdate(
            {userID: student.id},
            {$addToSet: {book: req.body.book}},
            {new: true, upsert: true}
        );
        //upsert + new guarantees a document
        return toResponse(list!, req.body.onlyId);
    })
}
