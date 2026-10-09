import JWT from 'jsonwebtoken';

type TokenPayload = {
    id: string;
    tenantId: string;
    role: string;
    name: string;
};

const SECRET = process.env.JWT_SECRET_KEY as string;

export const generateToken = (payload: TokenPayload) => {
    return JWT.sign(payload, SECRET, { expiresIn: '1d' });
};

export const decodeToken = (token: string): TokenPayload | undefined => {
    try {
        const user = JWT.verify(token, SECRET);
        return user as TokenPayload;
    } catch (error) {
        console.log('Falha JWT: ', error);
    }
};