import {describe, test, expect} from 'bun:test';
import {registerUserSchema, loginUserSchema, updateUserSchema} from './user.schema';
import {validateBody} from '~/utils/validate';

const expectEmailErrors = (schema: any, body: unknown, messages: string[]) => {
    expect(() => validateBody(schema, body)).toThrow(expect.objectContaining({
        errorCode: 422,
        message: {errors: {email: messages}},
    }));
};

describe('registerUserSchema email', () => {
    const body = (email: unknown) => ({user: {email, username: 'jake', password: 'password123'}});

    test('accepts a valid email', () => {
        expect(validateBody(registerUserSchema, body('jake@jake.jake')).user.email).toBe('jake@jake.jake');
    });

    test('trims surrounding whitespace', () => {
        expect(validateBody(registerUserSchema, body('  jake@jake.jake  ')).user.email).toBe('jake@jake.jake');
    });

    test('reports only "can\'t be blank" for an empty email', () => {
        expectEmailErrors(registerUserSchema, body(''), ["can't be blank"]);
    });

    test('reports only "can\'t be blank" for a whitespace-only email', () => {
        expectEmailErrors(registerUserSchema, body('   '), ["can't be blank"]);
    });

    test('reports "is invalid" for an email without @', () => {
        expectEmailErrors(registerUserSchema, body('no-at-sign'), ['is invalid']);
    });

    test('reports "is invalid" for an email without a domain', () => {
        expectEmailErrors(registerUserSchema, body('user@'), ['is invalid']);
    });
});

describe('loginUserSchema email', () => {
    const body = (email: unknown) => ({user: {email, password: 'password123'}});

    test('accepts a valid email', () => {
        expect(validateBody(loginUserSchema, body('jake@jake.jake')).user.email).toBe('jake@jake.jake');
    });

    test('reports only "can\'t be blank" for an empty email', () => {
        expectEmailErrors(loginUserSchema, body(''), ["can't be blank"]);
    });

    test('reports "is invalid" for a malformed email', () => {
        expectEmailErrors(loginUserSchema, body('user@'), ['is invalid']);
    });
});

describe('updateUserSchema email', () => {
    test('accepts a body without an email', () => {
        expect(validateBody(updateUserSchema, {user: {bio: 'hello'}}).user.email).toBeUndefined();
    });

    test('accepts a valid email', () => {
        expect(validateBody(updateUserSchema, {user: {email: 'jake@jake.jake'}}).user.email).toBe('jake@jake.jake');
    });

    test('reports only "can\'t be blank" for an empty email', () => {
        expectEmailErrors(updateUserSchema, {user: {email: ''}}, ["can't be blank"]);
    });

    test('reports "is invalid" for a malformed email', () => {
        expectEmailErrors(updateUserSchema, {user: {email: 'not-an-email'}}, ['is invalid']);
    });

    test('rejects a null email', () => {
        expect(() => validateBody(updateUserSchema, {user: {email: null}})).toThrow(expect.objectContaining({
            errorCode: 422,
        }));
    });
});
