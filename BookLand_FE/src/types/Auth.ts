export interface LoginRequest {
    email: string;
    password?: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
}

export interface RefreshRequest {
    token: string;
}

export interface AuthenticationResponse {
    token: string;
    authenticated: boolean;
}

export interface LogoutRequest {
    token: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password?: string;
}
