import { z } from 'zod';

// Zod runs every chained check and reports all failures, so `.min(1).email()` would report
// both messages for a blank email. Piping into `.email()` only runs it once `.min(1)` passes,
// so a blank email reports just "can't be blank" and a malformed one reports just "is invalid".
const emailSchema = z.string().trim().min(1, "can't be blank").pipe(z.string().email('is invalid'));

export const registerUserSchema = z.object({
    user: z.object({
        email: emailSchema,
        username: z.string().trim().min(1, "can't be blank"),
        password: z.string().trim().min(1, "can't be blank"),
        image: z.string().optional(),
        bio: z.string().optional(),
    }),
});

export const loginUserSchema = z.object({
    user: z.object({
        email: emailSchema,
        password: z.string().trim().min(1, "can't be blank"),
    }),
});

export const updateUserSchema = z.object({
    user: z.object({
        email: emailSchema.optional(),
        username: z.string().trim().min(1, "can't be blank").optional(),
        // NIST 800-63B section 5.1.1.2: memorized secrets must be at least 8 chars.
        password: z.string().trim().min(8, 'must be at least 8 characters long').optional(),
        image: z.string().nullable().optional().transform(v => v === '' ? null : v),
        bio: z.string().nullable().optional().transform(v => v === '' ? null : v),
    }),
});
