"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCognitoToken = validateCognitoToken;
exports.createUnauthorizedResponse = createUnauthorizedResponse;
exports.createErrorResponse = createErrorResponse;
exports.createSuccessResponse = createSuccessResponse;
const aws_jwt_verify_1 = require("aws-jwt-verify");
const verifier = aws_jwt_verify_1.CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    tokenUse: 'access',
    clientId: process.env.COGNITO_CLIENT_ID,
});
async function validateCognitoToken(authHeader) {
    if (!authHeader?.startsWith('Bearer ')) {
        console.warn('Missing or invalid Authorization header format');
        return null;
    }
    try {
        const token = authHeader.substring(7);
        const payload = await verifier.verify(token);
        return {
            id: payload.sub,
            email: payload.email || '',
            username: payload.username
        };
    }
    catch (error) {
        console.error('Token validation failed:', error);
        return null;
    }
}
function createUnauthorizedResponse() {
    return {
        statusCode: 401,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ error: 'Unauthorized' })
    };
}
function createErrorResponse(statusCode, message, details) {
    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
            error: message,
            ...(details && { details })
        })
    };
}
function createSuccessResponse(data) {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify(data)
    };
}
