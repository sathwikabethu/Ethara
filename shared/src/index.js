"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCommentSchema = exports.updateTaskSchema = exports.createTaskSchema = exports.TaskPriorityEnum = exports.TaskStatusEnum = exports.inviteMemberSchema = exports.updateProjectSchema = exports.createProjectSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.createProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Project name is required'),
    description: zod_1.z.string().optional(),
});
exports.updateProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Project name is required').optional(),
    description: zod_1.z.string().optional(),
});
exports.inviteMemberSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
});
exports.TaskStatusEnum = zod_1.z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);
exports.TaskPriorityEnum = zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
exports.createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required'),
    description: zod_1.z.string().optional(),
    status: exports.TaskStatusEnum.optional(),
    priority: exports.TaskPriorityEnum.optional(),
    assignedToId: zod_1.z.string().nullable().optional(),
    dueDate: zod_1.z.string().datetime().nullable().optional(),
});
exports.updateTaskSchema = exports.createTaskSchema.partial();
exports.createCommentSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, 'Comment cannot be empty'),
});
//# sourceMappingURL=index.js.map