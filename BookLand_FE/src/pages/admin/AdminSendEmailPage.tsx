import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Search, Users, AlertCircle, Loader2 } from 'lucide-react';
import userService from '../../api/userService';
import type { User } from '../../types/User';
import Pagination from '../../components/admin/Pagination';
import { toast } from 'react-toastify';
import '../../styles/components/buttons.css';
import '../../styles/pages/admin-management.css';

const AdminSendEmailPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
    const [sendToAll, setSendToAll] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [itemsPerPage] = useState(5);

    const [emailData, setEmailData] = useState({
        subject: '',
        title: '',
        message: '',
        details: '',
        actionUrl: '',
        actionText: '',
    });

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: any = {
                page: currentPage - 1,
                size: itemsPerPage,
                keyword: searchTerm,
            };

            const response = await userService.getAllUsers(params);
            if (response.result) {
                setUsers(response.result.content);
                setTotalPages(response.result.totalPages);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Lỗi khi tải danh sách người dùng');
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, itemsPerPage, searchTerm]);

    // Use debounce for searching/fetching
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchUsers]);

    const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const newSet = new Set(selectedUserIds);
            users.forEach(u => newSet.add(u.id));
            setSelectedUserIds(newSet);
        } else {
            const newSet = new Set(selectedUserIds);
            users.forEach(u => newSet.delete(u.id));
            setSelectedUserIds(newSet);
        }
    };

    const handleSelectUser = (id: number) => {
        const newSet = new Set(selectedUserIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedUserIds(newSet);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEmailData(prev => ({ ...prev, [name]: value }));
    };

    const handleSendEmail = async () => {
        if (!emailData.subject.trim() || !emailData.title.trim() || !emailData.message.trim()) {
            toast.error('Vui lòng điền đầy đủ Tiêu đề, Chào hỏi và Nội dung email!');
            return;
        }

        if (!sendToAll && selectedUserIds.size === 0) {
            toast.error('Vui lòng chọn ít nhất 1 người dùng hoặc chọn "Gửi tất cả"');
            return;
        }

        setIsSending(true);
        try {
            await userService.adminSendCustomEmail({
                sendToAll,
                userIds: Array.from(selectedUserIds),
                ...emailData
            });
            toast.success('Đã gửi email thành công!');
            setEmailData({
                subject: '',
                title: '',
                message: '',
                details: '',
                actionUrl: '',
                actionText: '',
            });
            setSelectedUserIds(new Set());
            setSendToAll(false);
        } catch (error) {
            console.error('Error sending email:', error);
            toast.error('Có lỗi xảy ra khi gửi email');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="admin-container">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">Gửi Email Tuỳ Chỉnh</h1>
                    <p className="admin-subtitle">Gửi thông báo, sự kiện, khuyến mãi đến người dùng</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>
                {/* Email Form */}
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Mail size={20} /> Soạn Email
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Tiêu đề Email (Subject) *</label>
                            <input
                                type="text"
                                className="form-input"
                                name="subject"
                                value={emailData.subject}
                                onChange={handleInputChange}
                                placeholder="VD: Khuyến mãi đặc biệt 50%"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Tiêu đề / Chào hỏi trong Email *</label>
                            <input
                                type="text"
                                className="form-input"
                                name="title"
                                value={emailData.title}
                                onChange={handleInputChange}
                                placeholder="VD: Xin chào bạn thân mến,"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Nội dung chính *</label>
                            <textarea
                                className="form-input"
                                name="message"
                                value={emailData.message}
                                onChange={handleInputChange}
                                rows={4}
                                placeholder="Nhập nội dung thông điệp..."
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Chi tiết phụ (Không bắt buộc)</label>
                            <textarea
                                className="form-input"
                                name="details"
                                value={emailData.details}
                                onChange={handleInputChange}
                                rows={2}
                                placeholder="Các lưu ý, điều kiện áp dụng..."
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>URL Nút bấm (Không bắt buộc)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    name="actionUrl"
                                    value={emailData.actionUrl}
                                    onChange={handleInputChange}
                                    placeholder="https://..."
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Chữ trên Nút bấm</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    name="actionText"
                                    value={emailData.actionText}
                                    onChange={handleInputChange}
                                    placeholder="VD: Xem Ngay"
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                            <button
                                className="btn-primary"
                                style={{ width: '100%', padding: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                                onClick={handleSendEmail}
                                disabled={isSending}
                            >
                                {isSending ? <Loader2 className="animate-spin" size={20} /> : <Mail size={20} />}
                                {isSending ? 'Đang gửi...' : 'Gửi Email Ngay'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* User Selection */}
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={20} /> Chọn Người Nhận
                    </h3>

                    <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                            <input
                                type="checkbox"
                                checked={sendToAll}
                                onChange={(e) => setSendToAll(e.target.checked)}
                                style={{ width: '1rem', height: '1rem' }}
                            />
                            Gửi cho TẤT CẢ người dùng trong hệ thống
                        </label>
                        {sendToAll && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#c92127', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <AlertCircle size={14} /> Email sẽ được gửi đến mọi người dùng bỏ qua danh sách chọn bên dưới.
                            </div>
                        )}
                    </div>

                    <div style={{ position: 'relative', marginBottom: '1rem', opacity: sendToAll ? 0.5 : 1, pointerEvents: sendToAll ? 'none' : 'auto' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                            type="text"
                            className="form-input"
                            style={{ paddingLeft: '2.5rem', width: '100%' }}
                            placeholder="Tìm kiếm theo Email, Tên, Username..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1); // reset to page 1 on search
                            }}
                        />
                    </div>

                    <div style={{ opacity: sendToAll ? 0.5 : 1, pointerEvents: sendToAll ? 'none' : 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAllOnPage}
                                    checked={users.length > 0 && users.every(u => selectedUserIds.has(u.id))}
                                />
                                Chọn tất cả trên trang này
                            </label>
                            <span>Đã chọn tổng cộng: {selectedUserIds.size}</span>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', maxHeight: '400px' }}>
                            {isLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                    <Loader2 className="animate-spin" size={24} />
                                </div>
                            ) : users.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                    Không tìm thấy người dùng
                                </div>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {users.map(user => (
                                        <li key={user.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', padding: '0.75rem', cursor: 'pointer', gap: '0.75rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUserIds.has(user.id)}
                                                    onChange={() => handleSelectUser(user.id)}
                                                />
                                                <div>
                                                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{user.firstName} {user.lastName} ({user.username})</div>
                                                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{user.email}</div>
                                                </div>
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Pagination Area */}
                        {!isLoading && totalPages > 1 && (
                            <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSendEmailPage;
