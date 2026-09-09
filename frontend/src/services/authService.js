import {
    setTokens,
    getToken,
    getRefreshToken,
    removeToken,
    isAuthenticated
} from "../utils/token";


// Save JWT tokens
export function saveAuthTokens(accessToken, refreshToken) {
    setTokens(accessToken, refreshToken);
}


// Get access token
export function getAccessToken() {
    return getToken();
}


// Get refresh token
export function getStoredRefreshToken() {
    return getRefreshToken();
}


// Check whether user is logged in
export function checkAuthentication() {
    return isAuthenticated();
}


// Logout
export function logout() {
    removeToken();
}