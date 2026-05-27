import type { User } from '../types/User';
import { UserStatus } from '../types/User';
import { mockRoles } from './mockMasterData';
import type { Address } from '../types/Address';

const adminRole = mockRoles.find(r => r.name === 'ADMIN') || mockRoles[0];
const staffRole = mockRoles.find(r => r.name === 'STAFF') || mockRoles[1];
const customerRole = mockRoles.find(r => r.name === 'CUSTOMER') || mockRoles[2];

export const mockUsers: User[] = [
    {
        id: 1,
        username: 'admin',
        email: 'admin@bookland.com',
        firstName: 'System',
        lastName: 'Admin',
        status: UserStatus.ENABLE,
        roles: [adminRole]
    },
    {
        id: 2,
        username: 'customer1',
        email: 'customer@test.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '0987654321',
        status: UserStatus.ENABLE,
        roles: [customerRole],
        createdAt: '2023-01-15T08:00:00Z'
    },
    {
        id: 3,
        username: 'manager_alice',
        email: 'alice@bookland.com',
        firstName: 'Alice',
        lastName: 'Smith',
        status: UserStatus.ENABLE,
        roles: [staffRole],
        createdAt: '2023-02-01T09:00:00Z'
    },
    {
        id: 4,
        username: 'new_user_bob',
        email: 'bob@test.com',
        firstName: 'Bob',
        lastName: 'Jones',
        status: UserStatus.ENABLE,
        roles: [customerRole],
        createdAt: '2023-05-20T14:30:00Z'
    }
];

// Need to link addresses to users.
// Since User interface has addresses[] and Address has user, it's circular.
// In mock data, we usually just define one side or use partials, but Typescript might complain.
// Let's create addresses first, then assign.

export const mockAddresses: Address[] = [
    {
        id: 1,
        user: mockUsers[1], // customer1
        contactPhone: '0987654321',
        addressDetail: '123 Main St, Hanoi',
        isDefault: true
    },
    {
        id: 2,
        user: mockUsers[1], // customer1
        contactPhone: '0987654322',
        addressDetail: '456 Side St, Danang',
        isDefault: false
    },
    {
        id: 3,
        user: mockUsers[3], // Bob
        contactPhone: '0909090909',
        addressDetail: '789 High Way, HCM City',
        isDefault: true
    }
];

// bi-directional assignment
mockUsers[1].addresses = [mockAddresses[0], mockAddresses[1]];
mockUsers[3].addresses = [mockAddresses[2]];
