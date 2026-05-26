import axiosClient from './axiosClient';
import type { ApiResponse } from '../types/api';

const homeService = {
    getHomeData: () => {
        return axiosClient.get<any, ApiResponse<string>>('/home');
    },
    getAdminHomeData: () => {
        return axiosClient.get<any, string>('/admin/home'); // API doc says schema type string, not wrapped in api response for admin home? actually check doc again.
        // Doc says: /admin/home 200 OK content string schema type string
    }
};

export default homeService;
