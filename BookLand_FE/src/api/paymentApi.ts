import axiosClient from "./axiosClient";
import type { ApiResponse } from "../types/api";

interface PaymentResponse {
    status: string;
    message: string;
    url: string;
}

const paymentApi = {
    createPayment: (billId: number, bankCode: string = "NCB") => {
        return axiosClient.post<any, ApiResponse<PaymentResponse>>(`/api/online-payment/create-payment?billId=${billId}&bankCode=${bankCode}&amount=10000&language=vn`);
    },

    getPaymentInfo: (params: string) => {
        return axiosClient.get<any, ApiResponse<any>>(`/api/online-payment/payment_infor?${params}`);
    }
};

export default paymentApi;
