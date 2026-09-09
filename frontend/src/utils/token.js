const ACCESS_TOKEN_KEY = "pillsync_access_token";
const REFRESH_TOKEN_KEY = "pillsync_refresh_token";


// Save both JWT tokens
export const setTokens = (accessToken, refreshToken) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};


// Get access token
export const getToken = () => {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
};


// Get refresh token
export const getRefreshToken = () => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
};


// Remove both tokens during logout
export const removeToken = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};


// Check whether user is authenticated
export const isAuthenticated = () => {
    return getToken() !== null;
};